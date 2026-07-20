import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatMonthLabel } from '@/lib/dates'
import { useCards } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import { BALANCE_ADJUSTMENT_CATEGORY } from '@/lib/charts'
import type { TransactionRow } from '@/types/db'

// Las filas traen la categoría anidada (join) para poder excluir los ajustes de
// saldo del flujo de efectivo.
type TxWithCategory = TransactionRow & {
  category?: { name: string | null; is_system: boolean | null } | null
}

// El ajuste por mensualidades MSI ya pagadas es un ingreso técnico que netea la
// deuda de la tarjeta, no dinero real que entró. Se excluye de los totales de
// reportes (pero NO de card_usage/credit_line_usage, que sí lo necesitan).
function isBalanceAdjustment(tx: TxWithCategory): boolean {
  const c = tx.category
  return !!c && !!c.is_system && c.name === BALANCE_ADJUSTMENT_CATEGORY
}

export interface ReportFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  cardId?: string
}

export function useTransactionsSummary(userId?: string, filters?: ReportFilters) {
  return useQuery({
    queryKey: ['transactions_summary', userId, filters],
    queryFn: async () => {
      if (!userId) return null

      let query = supabase
        .from('transactions')
        .select('*, category:categories(name, is_system)')
        .eq('user_id', userId)
        // Los gastos familiares no forman parte de las finanzas personales.
        .is('family_id', null)

      if (filters?.startDate) {
        query = query.gte('tx_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('tx_date', filters.endDate)
      }
      if (filters?.accountId) {
        query = query.eq('account_id', filters.accountId)
      }
      if (filters?.cardId) {
        query = query.eq('card_id', filters.cardId)
      }

      const { data, error } = await query
      if (error) throw error

      const txs = (data || []) as TxWithCategory[]

      // Totales en la moneda principal: usar base_amount (monto convertido).
      // Fallback a amount para filas antiguas sin conversión. Los ajustes de
      // saldo se excluyen: no son flujo de efectivo real.
      const totalIncome = txs
        .filter((t) => t.kind === 'income' && !isBalanceAdjustment(t))
        .reduce((sum, t) => sum + (t.base_amount ?? t.amount), 0)

      const totalExpense = txs
        .filter((t) => t.kind === 'expense' && !isBalanceAdjustment(t))
        .reduce((sum, t) => sum + (t.base_amount ?? t.amount), 0)

      const balance = totalIncome - totalExpense

      return {
        totalIncome,
        totalExpense,
        balance,
        transactions: txs,
      }
    },
    enabled: !!userId,
  })
}

export function useMonthlyTotals(userId?: string, filters?: ReportFilters) {
  return useQuery({
    queryKey: ['monthly_totals', userId, filters],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*, category:categories(name, is_system)')
        .eq('user_id', userId)
        .is('family_id', null)

      if (filters?.startDate) {
        query = query.gte('tx_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('tx_date', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error

      const txs = (data || []) as TxWithCategory[]

      // Agrupar por mes
      const byMonth: Record<string, { income: number; expense: number }> = {}

      txs.forEach((tx) => {
        // Los ajustes de saldo no son flujo real: fuera del histórico mensual.
        if (isBalanceAdjustment(tx)) return
        const month = tx.tx_date.slice(0, 7) // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { income: 0, expense: 0 }
        }
        const value = tx.base_amount ?? tx.amount
        if (tx.kind === 'income') {
          byMonth[month].income += value
        } else if (tx.kind === 'expense') {
          byMonth[month].expense += value
        }
      })

      // Convertir a array y ordenar
      return Object.entries(byMonth)
        .map(([month, data]) => ({
          month,
          monthLabel: formatMonthLabel(month),
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    },
    enabled: !!userId,
  })
}

// Desglose de ingresos y egresos por tarjeta y por cuenta.
//
// No abre una query propia: reutiliza el fetch de useTransactionsSummary. Con el
// mismo queryKey React Query devuelve la caché, así que la página no paga una
// cuarta petición a transactions.
export interface Breakdown {
  id: string
  name: string
  color?: string | null
  income: number
  expense: number
}

const UNASSIGNED = '__unassigned__'

export function useCardAccountTotals(userId?: string, filters?: ReportFilters) {
  const summaryQuery = useTransactionsSummary(userId, filters)
  const cardsQuery = useCards(userId)
  const accountsQuery = useAccounts(userId)

  const txs = summaryQuery.data?.transactions
  const cards = cardsQuery.data
  const accounts = accountsQuery.data

  const data = useMemo(() => {
    const cardById = new Map((cards || []).map((c) => [c.id, c]))
    const accountById = new Map((accounts || []).map((a) => [a.id, a]))

    const byCard = new Map<string, Breakdown>()
    const byAccount = new Map<string, Breakdown>()

    const bump = (
      target: Map<string, Breakdown>,
      id: string,
      name: string,
      color: string | null | undefined,
      kind: 'income' | 'expense',
      value: number,
    ) => {
      let row = target.get(id)
      if (!row) {
        row = { id, name, color, income: 0, expense: 0 }
        target.set(id, row)
      }
      row[kind] += value
    }

    ;(txs || []).forEach((tx) => {
      // Las transferencias mueven dinero entre cuentas propias: no son ingreso
      // ni egreso real, y contarlas inflaría ambos lados del desglose.
      if (tx.kind !== 'income' && tx.kind !== 'expense') return
      // Los ajustes de saldo no son flujo real: fuera del desglose.
      if (isBalanceAdjustment(tx as TxWithCategory)) return
      const value = tx.base_amount ?? tx.amount

      if (tx.card_id) {
        const card = cardById.get(tx.card_id)
        bump(byCard, tx.card_id, card?.name || 'Sin asignar', card?.color, tx.kind, value)
      } else {
        bump(byCard, UNASSIGNED, 'Sin asignar', null, tx.kind, value)
      }

      if (tx.account_id) {
        const acc = accountById.get(tx.account_id)
        bump(byAccount, tx.account_id, acc?.name || 'Sin asignar', null, tx.kind, value)
      } else {
        bump(byAccount, UNASSIGNED, 'Sin asignar', null, tx.kind, value)
      }
    })

    // Mayor movimiento primero, para que la gráfica lea de arriba abajo.
    const sorted = (m: Map<string, Breakdown>) =>
      Array.from(m.values()).sort(
        (a, b) => b.income + b.expense - (a.income + a.expense),
      )

    return { byCard: sorted(byCard), byAccount: sorted(byAccount) }
  }, [txs, cards, accounts])

  return {
    data,
    isLoading:
      summaryQuery.isLoading || cardsQuery.isLoading || accountsQuery.isLoading,
  }
}

export function useCategoryTotals(userId?: string, filters?: ReportFilters) {
  return useQuery({
    queryKey: ['category_totals', userId, filters],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', userId)
        .eq('kind', 'expense')
        .is('family_id', null)

      if (filters?.startDate) {
        query = query.gte('tx_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('tx_date', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error

      const txs = (data || []) as any[]

      // Agrupar por categoría
      const byCategory: Record<
        string,
        { name: string; icon: string; total: number; color: string }
      > = {}

      txs.forEach((tx) => {
        const catName = tx.categories?.name || 'Sin categoría'
        const catIcon = tx.categories?.icon || '•'
        if (!byCategory[catName]) {
          byCategory[catName] = {
            name: catName,
            icon: catIcon,
            total: 0,
            // Color propio de la categoría (editable en Categorías); si no tiene,
            // la gráfica lo rellena con la paleta elegida por índice.
            color: tx.categories?.color || '',
          }
        }
        byCategory[catName].total += tx.base_amount ?? tx.amount
      })

      return Object.values(byCategory)
        .sort((a, b) => b.total - a.total)
    },
    enabled: !!userId,
  })
}
