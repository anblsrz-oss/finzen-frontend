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
// `date` (YYYY-MM-DD) permite pedir el tipo de cambio de una fecha específica
// (la fecha de la transacción); si se omite, el backend usa el día de hoy.
export function useFxRate(base?: string, quote?: string, enabled = true, date?: string) {
  const shouldRun = enabled && !!base && !!quote && base !== quote
  return useQuery<FxRateResult>({
    queryKey: ['fx_rate', base, quote, date],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fx-rate', {
        body: { base, quote, date },
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
