import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AccountRow } from '@/types/db'

export function useAccounts(userId?: string) {
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as AccountRow[]
    },
    enabled: !!userId,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      name: string
      bank_name?: string
      type: string
      currency: string
      initial_balance: number
      has_yield: boolean
      yield_rate?: number
      yield_rate_period?: 'monthly' | 'annual'
      yield_kind?: 'demand' | 'term'
      yield_term_days?: number | null
      yield_term_end?: string | null
      withhold_isr?: boolean
      isr_rate?: number | null
      is_scholarship?: boolean
      scholarship_name?: string
    }) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: input.userId,
            name: input.name,
            bank_name: input.bank_name,
            type: input.type,
            currency: input.currency,
            initial_balance: input.initial_balance,
            has_yield: input.has_yield,
            yield_rate: input.yield_rate,
            yield_rate_period: input.yield_rate_period ?? 'monthly',
            yield_kind: input.yield_kind ?? 'demand',
            yield_term_days: input.yield_term_days ?? null,
            yield_term_end: input.yield_term_end ?? null,
            withhold_isr: input.withhold_isr ?? false,
            isr_rate: input.isr_rate ?? null,
            is_scholarship: input.is_scholarship ?? false,
            scholarship_name: input.scholarship_name || null,
          },
        ])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', input.userId] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      name?: string
      bank_name?: string
      type?: string
      currency?: string
      initial_balance?: number
      has_yield?: boolean
      yield_rate?: number
      yield_rate_period?: 'monthly' | 'annual'
      yield_kind?: 'demand' | 'term'
      yield_term_days?: number | null
      yield_term_end?: string | null
      withhold_isr?: boolean
      isr_rate?: number | null
      is_scholarship?: boolean
      scholarship_name?: string | null
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.bank_name !== undefined) updates.bank_name = rest.bank_name
      if (rest.type !== undefined) updates.type = rest.type
      if (rest.currency !== undefined) updates.currency = rest.currency
      if (rest.initial_balance !== undefined) updates.initial_balance = rest.initial_balance
      if (rest.has_yield !== undefined) updates.has_yield = rest.has_yield
      if (rest.yield_rate !== undefined) updates.yield_rate = rest.yield_rate
      if (rest.yield_rate_period !== undefined) updates.yield_rate_period = rest.yield_rate_period
      if (rest.yield_kind !== undefined) updates.yield_kind = rest.yield_kind
      if (rest.yield_term_days !== undefined) updates.yield_term_days = rest.yield_term_days
      if (rest.yield_term_end !== undefined) updates.yield_term_end = rest.yield_term_end
      if (rest.withhold_isr !== undefined) updates.withhold_isr = rest.withhold_isr
      if (rest.isr_rate !== undefined) updates.isr_rate = rest.isr_rate
      if (rest.is_scholarship !== undefined) updates.is_scholarship = rest.is_scholarship
      if (rest.scholarship_name !== undefined) updates.scholarship_name = rest.scholarship_name

      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', input.userId] })
    },
  })
}

export function useAccountBalances(userId?: string) {
  return useQuery({
    queryKey: ['account_balances', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}
