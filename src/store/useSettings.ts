// Preferencias locales del usuario (tema, idioma). Se guardan en localStorage
// (funciona igual dentro del WebView de Capacitor).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'light' | 'dark' | 'system'
export type LanguagePref = 'es' | 'en'
export type IncomeExpenseChartType = 'bar' | 'line'
export type CategoryChartType = 'pie' | 'donut' | 'bar'

interface SettingsState {
  theme: ThemePref
  language: LanguagePref
  // Privacidad: oculta los montos (muestra asteriscos) en toda la app.
  hideAmounts: boolean
  // Preferencias de gráficas (Reportes y Resumen).
  incomeExpenseChartType: IncomeExpenseChartType
  categoryChartType: CategoryChartType
  chartPalette: string
  setTheme: (theme: ThemePref) => void
  setLanguage: (language: LanguagePref) => void
  toggleHideAmounts: () => void
  setIncomeExpenseChartType: (type: IncomeExpenseChartType) => void
  setCategoryChartType: (type: CategoryChartType) => void
  setChartPalette: (palette: string) => void
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
      incomeExpenseChartType: 'bar',
      categoryChartType: 'pie',
      chartPalette: 'vivo',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      setLanguage: (language) => set({ language }),
      toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
      setIncomeExpenseChartType: (incomeExpenseChartType) => set({ incomeExpenseChartType }),
      setCategoryChartType: (categoryChartType) => set({ categoryChartType }),
      setChartPalette: (chartPalette) => set({ chartPalette }),
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
