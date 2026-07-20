// Preferencias locales del usuario (tema, idioma). Se guardan en localStorage
// (funciona igual dentro del WebView de Capacitor).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { reconcileOrder } from '@/lib/charts'
import type { ChartId, ChartPage } from '@/lib/charts'

const SETTINGS_KEY = 'ahorbit-settings'
const LEGACY_SETTINGS_KEY = 'finzen-settings'

// La app se llamaba FinZen. Al renombrar cambió la clave de localStorage, así
// que se arrastra lo guardado una sola vez: sin esto todos los usuarios
// perderían tema, idioma y demás preferencias sin explicación.
function migrateLegacySettings(): void {
  try {
    if (localStorage.getItem(SETTINGS_KEY) !== null) return
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY)
    if (legacy === null) return
    localStorage.setItem(SETTINGS_KEY, legacy)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  } catch {
    // localStorage bloqueado (modo privado): se arranca con los valores por defecto.
  }
}

migrateLegacySettings()

export type ThemePref = 'light' | 'dark' | 'system'
export type LanguagePref = 'es' | 'en'
export type IncomeExpenseChartType = 'bar' | 'line'
export type CategoryChartType = 'pie' | 'donut' | 'bar'

// Personalización por gráfico (colores, series ocultas, si entra al Excel).
export interface ChartConfig {
  // key de serie -> hex (p. ej. income -> #16a34a).
  seriesColors?: Record<string, string>
  // nombre de punto -> hex (solo gráficos por-entidad, p. ej. categorías).
  pointColors?: Record<string, string>
  // series o puntos ocultos (por key de serie o nombre de punto).
  hiddenSeries?: string[]
  // Incluir en la exportación a Excel. Ausente = true.
  export?: boolean
}

interface SettingsState {
  theme: ThemePref
  language: LanguagePref
  // Privacidad: oculta los montos (muestra asteriscos) en toda la app.
  hideAmounts: boolean
  // Muestra el apartado con la suma de todas las cuentas. Es distinto de
  // hideAmounts: aquel enmascara la cifra, este quita el bloque entero.
  showAccountsTotal: boolean
  // Preferencias de gráficas (Reportes y Resumen).
  incomeExpenseChartType: IncomeExpenseChartType
  categoryChartType: CategoryChartType
  chartPalette: string
  // Colores personalizados que el usuario ha creado para sus tarjetas.
  savedCardColors: string[]
  // Configuración por gráfico (colores, visibilidad, export), indexada por ChartId.
  chartConfigs: Record<string, ChartConfig>
  // Orden de los gráficos en cada página.
  chartOrder: Record<ChartPage, ChartId[]>
  setTheme: (theme: ThemePref) => void
  setLanguage: (language: LanguagePref) => void
  toggleHideAmounts: () => void
  setShowAccountsTotal: (show: boolean) => void
  setIncomeExpenseChartType: (type: IncomeExpenseChartType) => void
  setCategoryChartType: (type: CategoryChartType) => void
  setChartPalette: (palette: string) => void
  addSavedCardColor: (hex: string) => void
  removeSavedCardColor: (hex: string) => void
  setChartSeriesColor: (chartId: ChartId, key: string, color: string) => void
  setChartPointColor: (chartId: ChartId, name: string, color: string) => void
  toggleChartSeries: (chartId: ChartId, key: string) => void
  resetChartConfig: (chartId: ChartId) => void
  setChartExport: (chartId: ChartId, include: boolean) => void
  moveChart: (page: ChartPage, chartId: ChartId, dir: 'up' | 'down', available: ChartId[]) => void
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
      showAccountsTotal: true,
      incomeExpenseChartType: 'bar',
      categoryChartType: 'pie',
      // 'categoria' = usar el color propio de cada categoría.
      chartPalette: 'categoria',
      savedCardColors: [],
      chartConfigs: {},
      chartOrder: { dashboard: [], reports: [] },
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      setLanguage: (language) => set({ language }),
      toggleHideAmounts: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
      setShowAccountsTotal: (showAccountsTotal) => set({ showAccountsTotal }),
      setIncomeExpenseChartType: (incomeExpenseChartType) => set({ incomeExpenseChartType }),
      setCategoryChartType: (categoryChartType) => set({ categoryChartType }),
      setChartPalette: (chartPalette) => set({ chartPalette }),
      addSavedCardColor: (hex) =>
        set((s) => {
          const v = hex.toLowerCase()
          if (s.savedCardColors.includes(v)) return s
          // Se guardan los más recientes primero, con un tope razonable.
          return { savedCardColors: [v, ...s.savedCardColors].slice(0, 24) }
        }),
      removeSavedCardColor: (hex) =>
        set((s) => ({
          savedCardColors: s.savedCardColors.filter((c) => c !== hex.toLowerCase()),
        })),
      setChartSeriesColor: (chartId, key, color) =>
        set((s) => {
          const cfg = s.chartConfigs[chartId] ?? {}
          return {
            chartConfigs: {
              ...s.chartConfigs,
              [chartId]: {
                ...cfg,
                seriesColors: { ...cfg.seriesColors, [key]: color },
              },
            },
          }
        }),
      setChartPointColor: (chartId, name, color) =>
        set((s) => {
          const cfg = s.chartConfigs[chartId] ?? {}
          return {
            chartConfigs: {
              ...s.chartConfigs,
              [chartId]: {
                ...cfg,
                pointColors: { ...cfg.pointColors, [name]: color },
              },
            },
          }
        }),
      toggleChartSeries: (chartId, key) =>
        set((s) => {
          const cfg = s.chartConfigs[chartId] ?? {}
          const hidden = cfg.hiddenSeries ?? []
          const next = hidden.includes(key)
            ? hidden.filter((k) => k !== key)
            : [...hidden, key]
          return {
            chartConfigs: {
              ...s.chartConfigs,
              [chartId]: { ...cfg, hiddenSeries: next },
            },
          }
        }),
      // Borra colores y visibilidad, pero conserva la preferencia de export.
      resetChartConfig: (chartId) =>
        set((s) => {
          const cfg = s.chartConfigs[chartId] ?? {}
          return {
            chartConfigs: {
              ...s.chartConfigs,
              [chartId]: { export: cfg.export },
            },
          }
        }),
      setChartExport: (chartId, include) =>
        set((s) => {
          const cfg = s.chartConfigs[chartId] ?? {}
          return {
            chartConfigs: {
              ...s.chartConfigs,
              [chartId]: { ...cfg, export: include },
            },
          }
        }),
      moveChart: (page, chartId, dir, available) =>
        set((s) => {
          // Se opera sobre el orden reconciliado para que mover funcione aunque
          // lo guardado esté incompleto o traiga IDs que ya no existen.
          const order = reconcileOrder(s.chartOrder[page], available)
          const i = order.indexOf(chartId)
          const j = dir === 'up' ? i - 1 : i + 1
          if (i === -1 || j < 0 || j >= order.length) return s
          ;[order[i], order[j]] = [order[j], order[i]]
          return { chartOrder: { ...s.chartOrder, [page]: order } }
        }),
    }),
    { name: SETTINGS_KEY },
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
