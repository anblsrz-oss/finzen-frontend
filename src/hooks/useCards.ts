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
      brand?: string | null
      bank_name?: string | null
      type: 'credit' | 'debit' | 'voucher'
      card_format?: 'physical' | 'virtual'
      currency: string
      account_id?: string | null
      credit_line_id?: string | null
      last4?: string | null
      color?: string | null
      has_cashback?: boolean
      is_scholarship?: boolean
      scholarship_name?: string | null
    }) => {
      const cardData: Record<string, any> = {
        user_id: input.userId,
        name: input.name,
        brand: input.brand ?? null,
        bank_name: input.bank_name || null,
        type: input.type,
        card_format: input.card_format ?? 'physical',
        currency: input.currency,
        account_id: input.account_id,
        last4: input.last4 || null,
        color: input.color || null,
        has_cashback: input.has_cashback ?? false,
        is_scholarship: input.is_scholarship ?? false,
        scholarship_name: input.scholarship_name || null,
      }

      // El límite y las fechas viven en la línea de crédito, no en la tarjeta.
      if (input.type === 'credit') {
        cardData.credit_line_id = input.credit_line_id ?? null
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
      brand?: string | null
      bank_name?: string | null
      type?: string
      card_format?: 'physical' | 'virtual'
      currency?: string
      account_id?: string | null
      credit_line_id?: string | null
      last4?: string | null
      color?: string | null
      has_cashback?: boolean
      is_scholarship?: boolean
      scholarship_name?: string | null
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.brand !== undefined) updates.brand = rest.brand || null
      if (rest.bank_name !== undefined) updates.bank_name = rest.bank_name || null
      if (rest.type !== undefined) updates.type = rest.type
      if (rest.card_format !== undefined) updates.card_format = rest.card_format
      if (rest.currency !== undefined) updates.currency = rest.currency
      if (rest.account_id !== undefined) updates.account_id = rest.account_id
      if (rest.credit_line_id !== undefined) updates.credit_line_id = rest.credit_line_id
      if (rest.last4 !== undefined) updates.last4 = rest.last4 || null
      if (rest.color !== undefined) updates.color = rest.color || null
      if (rest.has_cashback !== undefined) updates.has_cashback = rest.has_cashback
      if (rest.is_scholarship !== undefined) updates.is_scholarship = rest.is_scholarship
      if (rest.scholarship_name !== undefined) updates.scholarship_name = rest.scholarship_name

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
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
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
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
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
