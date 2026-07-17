import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TransactionRow, TxKind } from '@/types/db'

interface TransactionFilter {
  kind?: TxKind
  accountId?: string
  cardId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
}

export function useTransactions(
  userId?: string,
  filter?: TransactionFilter,
  limit?: number,
) {
  return useQuery({
    queryKey: ['transactions', userId, filter, limit],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)

      if (filter?.kind) {
        query = query.eq('kind', filter.kind)
      }
      if (filter?.accountId) {
        if (filter.kind === 'transfer') {
          query = query.or(
            `account_id.eq.${filter.accountId},to_account_id.eq.${filter.accountId}`,
          )
        } else {
          query = query.eq('account_id', filter.accountId)
        }
      }
      if (filter?.cardId) {
        query = query.eq('card_id', filter.cardId)
      }
      if (filter?.categoryId) {
        query = query.eq('category_id', filter.categoryId)
      }
      if (filter?.startDate) {
        query = query.gte('tx_date', filter.startDate)
      }
      if (filter?.endDate) {
        query = query.lte('tx_date', filter.endDate)
      }

      query = query.order('tx_date', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as TransactionRow[]
    },
    enabled: !!userId,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      kind: TxKind
      amount: number
      currency: string
      concept?: string
      categoryId?: string
      accountId?: string
      toAccountId?: string
      cardId?: string
      txDate: string
      notes?: string
    }) => {
      const txData: Record<string, any> = {
        user_id: input.userId,
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        tx_date: input.txDate,
      }

      // Solo agregar campos opcionales si no están vacíos
      if (input.concept?.trim()) txData.concept = input.concept
      if (input.categoryId) txData.category_id = input.categoryId
      if (input.accountId) txData.account_id = input.accountId
      if (input.toAccountId) txData.to_account_id = input.toAccountId
      if (input.cardId) txData.card_id = input.cardId
      if (input.notes?.trim()) txData.notes = input.notes

      const { data, error } = await supabase
        .from('transactions')
        .insert([txData])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['transactions', input.userId],
      })
    },
  })
}

export function useInstallmentPlans(userId?: string) {
  return useQuery({
    queryKey: ['installment_plans', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

export function useCreateInstallmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      cardId: string
      transactionId: string
      description: string
      totalAmount: number
      currency: string
      months: number
      isInterestFree: boolean
      interestAmount: number
    }) => {
      const monthlyPayment =
        (input.totalAmount + input.interestAmount) / input.months
      const { data, error } = await supabase
        .from('installment_plans')
        .insert([
          {
            user_id: input.userId,
            card_id: input.cardId,
            transaction_id: input.transactionId,
            description: input.description,
            total_amount: input.totalAmount,
            currency: input.currency,
            months: input.months,
            is_interest_free: input.isInterestFree,
            interest_amount: input.interestAmount,
            monthly_payment: monthlyPayment,
          },
        ])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['installment_plans', input.userId],
      })
    },
  })
}
