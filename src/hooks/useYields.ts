import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface YieldRecord {
  id: string
  user_id: string
  account_id: string
  period_month: string
  expected_growth: number | null
  actual_growth: number | null
  verified: boolean
  created_at: string
}

export function useYieldRecords(userId?: string, accountId?: string) {
  return useQuery({
    queryKey: ['yield_records', userId, accountId],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('yield_records')
        .select('*')
        .eq('user_id', userId)

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data, error } = await query.order('period_month', {
        ascending: false,
      })
      if (error) throw error
      return (data || []) as YieldRecord[]
    },
    enabled: !!userId,
  })
}

export function useDeleteYield() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('yield_records')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['yield_records', userId],
      })
    },
  })
}

export function useCreateOrUpdateYield() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      accountId: string
      periodMonth: string
      expectedGrowth?: number
      actualGrowth?: number
      verified?: boolean
    }) => {
      // Verificar si ya existe el registro para este mes
      const { data: existing } = await supabase
        .from('yield_records')
        .select('id')
        .eq('account_id', input.accountId)
        .eq('period_month', input.periodMonth)
        .maybeSingle()

      if (existing) {
        // Actualizar
        const { data, error } = await supabase
          .from('yield_records')
          .update({
            expected_growth: input.expectedGrowth,
            actual_growth: input.actualGrowth,
            verified: input.verified,
          })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        // Crear nuevo
        const { data, error } = await supabase
          .from('yield_records')
          .insert([
            {
              user_id: input.userId,
              account_id: input.accountId,
              period_month: input.periodMonth,
              expected_growth: input.expectedGrowth,
              actual_growth: input.actualGrowth,
              verified: input.verified,
            },
          ])
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['yield_records', userId],
      })
    },
  })
}
