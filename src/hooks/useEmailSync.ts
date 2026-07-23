import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

// Pide consentimiento del scope de solo-lectura de Gmail. Provoca un nuevo flujo
// OAuth; al volver, la sesión trae `provider_token` para llamar a Gmail API.
export async function connectGmail(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GMAIL_SCOPE,
      redirectTo: window.location.href,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

// Token de Google presente en la sesión tras el consentimiento (transitorio).
export async function getProviderToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.provider_token ?? null
}

interface SyncResult {
  inserted: number
  found: number
  duplicates?: number
  error?: string
}

// Llama a la Edge Function sync-email con el token de Google del usuario.
export function useSyncEmail() {
  const queryClient = useQueryClient()
  return useMutation<
    SyncResult,
    Error,
    { userId: string; providerToken: string; accountId?: string; sinceDays?: number }
  >({
    mutationFn: async ({ providerToken, accountId, sinceDays }) => {
      const { data, error } = await supabase.functions.invoke('sync-email', {
        body: { providerToken, accountId, sinceDays },
      })
      if (error) {
        // En un fallo non-2xx, supabase-js pone la respuesta real en `context`;
        // extraemos el `error` del cuerpo para mostrar la causa, no el genérico.
        let detail = error.message
        try {
          const ctx = (error as { context?: Response }).context
          const body = ctx && typeof ctx.json === 'function' ? await ctx.json() : null
          if (body?.error) detail = body.error
        } catch {
          /* si no se puede leer el cuerpo, queda el mensaje genérico */
        }
        throw new Error(detail)
      }
      if ((data as SyncResult)?.error) throw new Error((data as SyncResult).error)
      return data as SyncResult
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', vars.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_pending_count', vars.userId] })
    },
  })
}
