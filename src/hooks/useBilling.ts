import { useMutation } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/lib/supabase'

// Llama a una edge function de Stripe con el JWT del usuario y devuelve la URL
// de checkout/portal. Abre esa URL: en web con redirect, en app nativa con el
// navegador del sistema (@capacitor/browser).
async function invokeBilling(
  fn: 'create-checkout-session' | 'create-portal-session',
): Promise<void> {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess.session) throw new Error('No session')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sess.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ returnUrl: window.location.origin }),
    },
  )
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || 'No se pudo iniciar el pago')
  }
  if (!data.url) throw new Error('Respuesta sin URL')

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: data.url })
  } else {
    window.location.href = data.url
  }
}

export function useStartCheckout() {
  return useMutation({ mutationFn: () => invokeBilling('create-checkout-session') })
}

export function useOpenBillingPortal() {
  return useMutation({ mutationFn: () => invokeBilling('create-portal-session') })
}
