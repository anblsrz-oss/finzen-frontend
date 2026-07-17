import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TransactionRow } from '@/types/db'

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
        .select('*')
        .eq('user_id', userId)

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

      const txs = (data || []) as TransactionRow[]

      // Calcular totales
      const totalIncome = txs
        .filter((t) => t.kind === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalExpense = txs
        .filter((t) => t.kind === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

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
        .select('*')
        .eq('user_id', userId)

      if (filters?.startDate) {
        query = query.gte('tx_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('tx_date', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error

      const txs = (data || []) as TransactionRow[]

      // Agrupar por mes
      const byMonth: Record<string, { income: number; expense: number }> = {}

      txs.forEach((tx) => {
        const month = tx.tx_date.slice(0, 7) // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { income: 0, expense: 0 }
        }
        if (tx.kind === 'income') {
          byMonth[month].income += tx.amount
        } else if (tx.kind === 'expense') {
          byMonth[month].expense += tx.amount
        }
      })

      // Convertir a array y ordenar
      return Object.entries(byMonth)
        .map(([month, data]) => ({
          month,
          monthLabel: new Date(month + '-01').toLocaleDateString('es-MX', {
            month: 'short',
            year: 'numeric',
          }),
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    },
    enabled: !!userId,
  })
}

export function useCategoryTotals(userId?: string, filters?: ReportFilters) {
  return useQuery({
    queryKey: ['category_totals', userId, filters],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*, categories(name, icon)')
        .eq('user_id', userId)
        .eq('kind', 'expense')

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
            color: getColorForCategory(catName),
          }
        }
        byCategory[catName].total += tx.amount
      })

      return Object.values(byCategory)
        .sort((a, b) => b.total - a.total)
    },
    enabled: !!userId,
  })
}

function getColorForCategory(categoryName: string): string {
  const colors: Record<string, string> = {
    Supermercado: '#f59e0b',
    Suscripciones: '#8b5cf6',
    Servicios: '#0ea5e9',
    Transporte: '#ef4444',
    Restaurantes: '#f97316',
    Salud: '#ec4899',
    'Tarjeta de crédito': '#6366f1',
    Gasolina: '#84cc16',
  }
  return colors[categoryName] || '#94a3b8'
}
