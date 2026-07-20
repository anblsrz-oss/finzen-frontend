// Fechas reales de corte y pago confirmadas por el usuario.
// Ver 0020_credit_line_periods.sql y src/lib/creditDates.ts.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreditLinePeriodRow } from '@/types/db'

export function useCreditLinePeriods(userId?: string) {
  return useQuery({
    queryKey: ['credit_line_periods', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('credit_line_periods')
        .select('*')
        .eq('user_id', userId)
        .order('period_month', { ascending: false })
      if (error) throw error
      return (data || []) as CreditLinePeriodRow[]
    },
    enabled: !!userId,
  })
}

export function useConfirmCreditLinePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      credit_line_id: string
      period_month: string
      cut_date: string
      payment_date: string
    }) => {
      const { userId, ...rest } = input
      // upsert sobre (credit_line_id, period_month): confirmar de nuevo el
      // mismo periodo corrige la fecha en vez de duplicar la fila.
      const { data, error } = await supabase
        .from('credit_line_periods')
        .upsert(
          { user_id: userId, ...rest, confirmed: true },
          { onConflict: 'credit_line_id,period_month' },
        )
        .select()
        .single()
      if (error) throw error
      return data as CreditLinePeriodRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_line_periods', input.userId] })
    },
  })
}
