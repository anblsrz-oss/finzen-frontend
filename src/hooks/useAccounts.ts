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
