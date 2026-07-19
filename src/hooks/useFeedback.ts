import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface FeedbackInput {
  name?: string
  email?: string
  message: string
}

// Envía un comentario/sugerencia desde la landing. La edge function send-feedback
// (verify_jwt=false) lo reenvía al correo del admin vía Resend. Es "best effort":
// no requiere sesión y se puede llamar desde la página pública.
export function useSendFeedback() {
  return useMutation<{ sent: boolean }, Error, FeedbackInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('send-feedback', {
        body: input,
      })
      if (error) throw error
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error)
      }
      return data as { sent: boolean }
    },
  })
}
