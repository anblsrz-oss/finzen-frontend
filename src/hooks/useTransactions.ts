import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthlyPayment } from '@/lib/installments'
import type { TransactionRow, TxKind, TxSource, TransactionDeletionRow } from '@/types/db'

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
        // Los gastos familiares viven en la sección Familia, no aquí.
        .is('family_id', null)

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
      fxRate?: number
      baseAmount?: number
      concept?: string
      categoryId?: string
      accountId?: string
      toAccountId?: string
      cardId?: string
      txDate: string
      notes?: string
      source?: TxSource
      externalId?: string
      familyId?: string
    }) => {
      const txData: Record<string, any> = {
        user_id: input.userId,
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        tx_date: input.txDate,
      }

      // Multimoneda: monto convertido a la moneda principal. Si no viene, el
      // trigger fill_tx_base_amount cae a fx=1 / base=amount.
      if (input.fxRate !== undefined) txData.fx_rate = input.fxRate
      if (input.baseAmount !== undefined) txData.base_amount = input.baseAmount

      // Solo agregar campos opcionales si no están vacíos
      if (input.concept?.trim()) txData.concept = input.concept
      if (input.categoryId) txData.category_id = input.categoryId
      if (input.accountId) txData.account_id = input.accountId
      if (input.toAccountId) txData.to_account_id = input.toAccountId
      if (input.cardId) txData.card_id = input.cardId
      if (input.notes?.trim()) txData.notes = input.notes
      if (input.source) txData.source = input.source
      if (input.externalId) txData.external_id = input.externalId
      if (input.familyId) txData.family_id = input.familyId

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
      if (input.familyId) {
        queryClient.invalidateQueries({
          queryKey: ['family_transactions', input.familyId],
        })
        queryClient.invalidateQueries({
          queryKey: ['family_card_usage', input.familyId],
        })
      }
    },
  })
}

// Elimina una transacción registrando el motivo en el historial de auditoría.
// El balance (vista account_balances) se revierte solo al borrar la fila.
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; userId: string; reason: string }) => {
      const { error } = await supabase.rpc('delete_transaction_with_reason', {
        p_tx_id: id,
        p_reason: reason,
      })
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transaction_deletions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_summary', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['monthly_totals', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['category_totals', input.userId] })
    },
  })
}

// Historial de transacciones eliminadas (con motivo).
export function useTransactionDeletions(userId?: string) {
  return useQuery({
    queryKey: ['transaction_deletions', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('transaction_deletions')
        .select('*')
        .eq('user_id', userId)
        .order('deleted_at', { ascending: false })
      if (error) throw error
      return (data || []) as TransactionDeletionRow[]
    },
    enabled: !!userId,
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
      /** Cuándo arrancó el plan; puede ser un mes anterior al registro. */
      startDate?: string
    }) => {
      const monthly = monthlyPayment(
        input.totalAmount,
        input.interestAmount,
        input.months,
      )
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
            monthly_payment: monthly,
            ...(input.startDate ? { start_date: input.startDate } : {}),
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
