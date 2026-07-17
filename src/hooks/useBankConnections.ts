import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BankConnectionRow } from '@/types/db'

export function useBankConnections(userId?: string) {
  return useQuery({
    queryKey: ['bank_connections', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as BankConnectionRow[]
    },
    enabled: !!userId,
  })
}
