// Autenticación adaptada a plataforma.
// - Web (PWA / Vercel): flujo OAuth normal con redirect al origin.
// - Nativo (Capacitor iOS/Android): abre el navegador del sistema y regresa a
//   la app vía deep link (custom URL scheme), luego canjea el código por sesión.
//
// Requiere registrar el scheme en AndroidManifest.xml e Info.plist, y añadir la
// redirect URL nativa en Supabase Auth y en Google Cloud OAuth. Ver README nativo.

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/lib/supabase'

export const NATIVE_REDIRECT = 'com.finzen.app://auth-callback'

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web'
}

// Inicia sesión con Google en el flujo adecuado según plataforma.
export async function signInWithGoogle(): Promise<void> {
  if (!isNative()) {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_REDIRECT,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (data?.url) {
    await Browser.open({ url: data.url })
  }
}

// Escucha el retorno del deep link tras el login. Llamar una sola vez al arrancar.
export function initNativeAuthListener(): void {
  if (!isNative()) return

  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT)) return
    try {
      const code = extractParam(url, 'code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      } else {
        // Fallback flujo implícito: tokens en el fragmento (#access_token=...)
        const accessToken = extractParam(url, 'access_token')
        const refreshToken = extractParam(url, 'refresh_token')
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        }
      }
    } finally {
      await Browser.close().catch(() => {})
    }
  })
}

// Extrae un parámetro tanto de la query (?a=b) como del fragmento (#a=b).
function extractParam(url: string, key: string): string | null {
  const m = url.match(new RegExp('[?&#]' + key + '=([^&]+)'))
  return m ? decodeURIComponent(m[1]) : null
}
