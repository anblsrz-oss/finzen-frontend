import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface FxRateResult {
  rate: number
  date: string
  base: string
  quote: string
  cached: boolean
}

// Obtiene el tipo de cambio base->quote vía la edge function fx-rate (cacheada
// en la tabla fx_rates). Solo corre cuando base y quote difieren y `enabled`.
export function useFxRate(base?: string, quote?: string, enabled = true) {
  const shouldRun = enabled && !!base && !!quote && base !== quote
  return useQuery<FxRateResult>({
    queryKey: ['fx_rate', base, quote],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fx-rate', {
        body: { base, quote },
      })
      if (error) throw error
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error)
      }
      return data as FxRateResult
    },
    enabled: shouldRun,
    staleTime: 1000 * 60 * 60, // 1h: el tipo de cambio no cambia tan seguido
    retry: 1,
  })
}
