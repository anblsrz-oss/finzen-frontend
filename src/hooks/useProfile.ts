import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'

// Actualiza la moneda principal del usuario. La política profiles_update_own
// permite editar el propio perfil; el trigger protect_profile_privileged_cols
// impide tocar is_premium/is_admin. Tras guardar, refresca el perfil en el store.
export function useUpdateMainCurrency() {
  const refreshProfile = useAuth((s) => s.refreshProfile)
  return useMutation({
    mutationFn: async (input: { userId: string; mainCurrency: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ main_currency: input.mainCurrency })
        .eq('id', input.userId)
      if (error) throw error
    },
    onSuccess: async () => {
      await refreshProfile()
    },
  })
}
