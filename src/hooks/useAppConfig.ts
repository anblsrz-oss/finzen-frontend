import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'
import type { AppConfigRow } from '@/types/db'

// Valores por defecto (todo gratis) mientras carga o si no hay fila.
const DEFAULT_CONFIG: AppConfigRow = {
  id: true,
  free_max_accounts: 0,
  free_max_cards: 0,
  free_max_transactions: 0,
  family_is_premium: false,
  yields_is_premium: false,
  installments_is_premium: false,
  reports_filters_is_premium: false,
  updated_at: '',
}

export function useAppConfig() {
  return useQuery({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return (data as AppConfigRow | null) ?? DEFAULT_CONFIG
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<AppConfigRow, 'id' | 'updated_at'>>) => {
      const { error } = await supabase
        .from('app_config')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', true)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_config'] })
    },
  })
}

// 0 = ilimitado -> Infinity para comparar límites cómodamente.
function asLimit(n: number): number {
  return n && n > 0 ? n : Infinity
}

// Derechos del usuario: combina la config con su estado premium. Una feature
// está bloqueada solo si está marcada como premium Y el usuario no es premium.
export function useEntitlements() {
  const { profile } = useAuth()
  const { data: config = DEFAULT_CONFIG } = useAppConfig()
  const isPremium = !!profile?.is_premium
  const allow = (isPremiumFeature: boolean) => isPremium || !isPremiumFeature
  return {
    config,
    isPremium,
    accountLimit: isPremium ? Infinity : asLimit(config.free_max_accounts),
    cardLimit: isPremium ? Infinity : asLimit(config.free_max_cards),
    transactionLimit: isPremium ? Infinity : asLimit(config.free_max_transactions),
    canUseFamily: allow(config.family_is_premium),
    canUseYields: allow(config.yields_is_premium),
    canUseInstallments: allow(config.installments_is_premium),
    canUseReportsFilters: allow(config.reports_filters_is_premium),
  }
}
