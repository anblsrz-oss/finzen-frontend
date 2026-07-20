// Líneas de crédito: el límite y las fechas de corte/pago que varias
// tarjetas del mismo banco comparten. Ver 0018_credit_lines.sql.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreditLineRow, CreditLineUsageRow } from '@/types/db'

export function useCreditLines(userId?: string) {
  return useQuery({
    queryKey: ['credit_lines', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('credit_lines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as CreditLineRow[]
    },
    enabled: !!userId,
  })
}

export function useCreditLineUsage(userId?: string) {
  return useQuery({
    queryKey: ['credit_line_usage', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('credit_line_usage')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return (data || []) as CreditLineUsageRow[]
    },
    enabled: !!userId,
  })
}

export function useCreateCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      name: string
      bank_name?: string | null
      credit_limit: number
      currency: string
      cut_day?: number | null
      payment_day?: number | null
      dates_may_shift?: boolean
    }) => {
      const { userId, ...rest } = input
      const { data, error } = await supabase
        .from('credit_lines')
        .insert([{
          user_id: userId,
          name: rest.name,
          bank_name: rest.bank_name || null,
          credit_limit: rest.credit_limit,
          currency: rest.currency,
          cut_day: rest.cut_day ?? null,
          payment_day: rest.payment_day ?? null,
          dates_may_shift: rest.dates_may_shift ?? false,
        }])
        .select()
        .single()
      if (error) throw error
      return data as CreditLineRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
    },
  })
}

export function useUpdateCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      name?: string
      bank_name?: string | null
      credit_limit?: number
      currency?: string
      cut_day?: number | null
      payment_day?: number | null
      dates_may_shift?: boolean
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.bank_name !== undefined) updates.bank_name = rest.bank_name || null
      if (rest.credit_limit !== undefined) updates.credit_limit = rest.credit_limit
      if (rest.currency !== undefined) updates.currency = rest.currency
      if (rest.cut_day !== undefined) updates.cut_day = rest.cut_day
      if (rest.payment_day !== undefined) updates.payment_day = rest.payment_day
      if (rest.dates_may_shift !== undefined) updates.dates_may_shift = rest.dates_may_shift

      const { data, error } = await supabase
        .from('credit_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CreditLineRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
    },
  })
}

export function useDeleteCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    // Las tarjetas que la usaban quedan con credit_line_id null
    // (on delete set null), no se borran.
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase.from('credit_lines').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['cards', input.userId] })
    },
  })
}
