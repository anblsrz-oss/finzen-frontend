import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatMonthLabel } from '@/lib/dates'
import { useCards } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import type { TransactionRow } from '@/types/db'

// Las filas traen la categoría y el tipo de la tarjeta anidados (join). El tipo
// de tarjeta distingue un consumo a crédito (deuda) de un gasto con débito
// (efectivo real), que se contabilizan distinto.
type TxWithCategory = TransactionRow & {
  category?: { name: string | null; is_system: boolean | null } | null
  card?: { type: string | null } | null
}

// Un consumo/reembolso cargado a una tarjeta de CRÉDITO no mueve efectivo: es
// deuda. Un gasto con débito sí sale de la cuenta ligada, así que NO es crédito.
function isCreditCard(tx: TxWithCategory): boolean {
  return tx.card?.type === 'credit'
}

const SELECT_WITH_JOINS = '*, category:categories(name, is_system), card:cards(type)'

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
        .select(SELECT_WITH_JOINS)
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

      const txs = (data || []) as unknown as TxWithCategory[]

      // Totales en la moneda principal: usar base_amount (monto convertido);
      // fallback a amount para filas antiguas sin conversión.
      const val = (t: TxWithCategory) => t.base_amount ?? t.amount

      let income = 0
      // Consumo a crédito neto (deuda generada en el rango): consumos − reembolsos.
      let creditUsed = 0
      // Egreso de efectivo por cuenta/débito (sin pagos de tarjeta ni externas).
      let cashExpenseAccounts = 0
      // Transferencias a cuentas ajenas: sale dinero de verdad.
      let externalTransfers = 0
      // Pagos de tarjeta: es cuando el consumo a crédito se convierte en efectivo.
      let cardPayments = 0

      for (const t of txs) {
        const v = val(t)
        if (t.kind === 'income') {
          if (isCreditCard(t)) creditUsed -= v // reembolso: baja la deuda
          else income += v
        } else if (t.kind === 'expense') {
          if (isCreditCard(t)) creditUsed += v
          else cashExpenseAccounts += v
        } else if (t.kind === 'transfer') {
          if (t.is_external) externalTransfers += v
          // Transferencia entre cuentas propias: no es ingreso ni egreso.
        } else if (t.kind === 'card_payment') {
          cardPayments += v
        }
      }

      // Egreso de efectivo total y dos balances (ver plan): el de EFECTIVO
      // reconoce el gasto al pagar (incluye pago de tarjeta, no el consumo a
      // crédito); el ECONÓMICO lo reconoce al consumir (incluye crédito usado,
      // no el pago de tarjeta).
      const cashExpense = cashExpenseAccounts + externalTransfers + cardPayments
      const balanceCash = income - cashExpense
      const balanceEconomic =
        income - cashExpenseAccounts - externalTransfers - creditUsed

      return {
        totalIncome: income,
        totalExpense: cashExpense,
        creditUsed,
        balanceCash,
        balanceEconomic,
        transactions: txs as unknown as TransactionRow[],
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
        .select(SELECT_WITH_JOINS)
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

      const txs = (data || []) as unknown as TxWithCategory[]

      // Agrupar por mes: ingreso, egreso de efectivo y crédito usado.
      const byMonth: Record<
        string,
        { income: number; expense: number; credit: number }
      > = {}

      txs.forEach((tx) => {
        const month = tx.tx_date.slice(0, 7) // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { income: 0, expense: 0, credit: 0 }
        }
        const value = tx.base_amount ?? tx.amount
        const credit = isCreditCard(tx)
        if (tx.kind === 'income') {
          if (credit) byMonth[month].credit -= value // reembolso
          else byMonth[month].income += value
        } else if (tx.kind === 'expense') {
          if (credit) byMonth[month].credit += value
          else byMonth[month].expense += value
        } else if (tx.kind === 'transfer') {
          if (tx.is_external) byMonth[month].expense += value
        } else if (tx.kind === 'card_payment') {
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
      // Solo ingresos y egresos entran al desglose por tarjeta/cuenta. Las
      // transferencias y los pagos de tarjeta se contabilizan aparte.
      if (tx.kind !== 'income' && tx.kind !== 'expense') return
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
