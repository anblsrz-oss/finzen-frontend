// Preferencias locales del usuario (tema, idioma). Se guardan en localStorage
// (funciona igual dentro del WebView de Capacitor).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'light' | 'dark' | 'system'
export type LanguagePref = 'es' | 'en'

interface SettingsState {
  theme: ThemePref
  language: LanguagePref
  // Privacidad: oculta los montos (muestra asteriscos) en toda la app.
  hideAmounts: boolean
  setTheme: (theme: ThemePref) => void
  setLanguage: (language: LanguagePref) => void
  toggleHideAmounts: () => void
}

const systemDarkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveIsDark(theme: ThemePref): boolean {
  if (theme === 'system') return systemDarkQuery().matches
  return theme === 'dark'
}

function applyTheme(theme: ThemePref) {
  const dark = resolveIsDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  // Color de la barra del navegador / status bar coherente con el tema.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#0f766e')
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'es',
      hideAmounts: false,
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      setLanguage: (language) => set({ language }),
      toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
    }),
    { name: 'finzen-settings' },
  ),
)

// Llamar una vez al arrancar la app: aplica el tema guardado y sigue los
// cambios del sistema cuando la preferencia es 'system'.
export function initSettings() {
  applyTheme(useSettings.getState().theme)
  systemDarkQuery().addEventListener('change', () => {
    if (useSettings.getState().theme === 'system') applyTheme('system')
  })
}
