import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CardRow } from '@/types/db'

export function useCards(userId?: string) {
  return useQuery({
    queryKey: ['cards', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as CardRow[]
    },
    enabled: !!userId,
  })
}

export function useCreateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      name: string
      brand?: string
      type: 'credit' | 'debit'
      currency: string
      account_id?: string | null
      credit_limit?: number
      cut_day?: number
      payment_day?: number
      last4?: string
      color?: string
      is_scholarship?: boolean
      scholarship_name?: string
    }) => {
      const cardData: Record<string, any> = {
        user_id: input.userId,
        name: input.name,
        brand: input.brand,
        type: input.type,
        currency: input.currency,
        account_id: input.account_id,
        last4: input.last4 || null,
        color: input.color || null,
        is_scholarship: input.is_scholarship ?? false,
        scholarship_name: input.scholarship_name || null,
      }

      // Solo agregar campos de crédito si es tarjeta de crédito
      if (input.type === 'credit') {
        cardData.credit_limit = input.credit_limit
        cardData.cut_day = input.cut_day
        cardData.payment_day = input.payment_day
      }

      const { data, error } = await supabase
        .from('cards')
        .insert([cardData])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['cards', input.userId] })
    },
  })
}

export function useUpdateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      name?: string
      brand?: string
      type?: string
      currency?: string
      account_id?: string | null
      credit_limit?: number
      cut_day?: number
      payment_day?: number
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.brand !== undefined) updates.brand = rest.brand
      if (rest.type !== undefined) updates.type = rest.type
      if (rest.currency !== undefined) updates.currency = rest.currency
      if (rest.account_id !== undefined) updates.account_id = rest.account_id
      if (rest.credit_limit !== undefined) updates.credit_limit = rest.credit_limit
      if (rest.cut_day !== undefined) updates.cut_day = rest.cut_day
      if (rest.payment_day !== undefined) updates.payment_day = rest.payment_day

      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['cards', input.userId] })
    },
  })
}

export function useDeleteCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['cards', input.userId] })
    },
  })
}

export function useCardUsage(userId?: string) {
  return useQuery({
    queryKey: ['card_usage', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('card_usage')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}
