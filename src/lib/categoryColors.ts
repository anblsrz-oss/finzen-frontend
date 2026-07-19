// Paleta de colores para categorías. El color elegido se guarda en categories.color
// (hex) y alimenta las gráficas de reportes (pastel/barras por categoría).
export const CATEGORY_COLORS = [
  '#ef4444', // rojo
  '#f97316', // naranja
  '#f59e0b', // ámbar
  '#84cc16', // lima
  '#22c55e', // verde
  '#14b8a6', // teal
  '#0ea5e9', // celeste
  '#6366f1', // índigo
  '#8b5cf6', // violeta
  '#ec4899', // rosa
  '#78716c', // piedra
  '#64748b', // gris azulado
] as const

// Color de respaldo cuando una categoría no tiene color asignado.
export const FALLBACK_CATEGORY_COLOR = '#94a3b8'

// Paletas disponibles para las gráficas (elegibles desde Reportes). Se usan para
// colorear automáticamente las categorías que no tienen un color propio.
export const CHART_PALETTES: Record<string, readonly string[]> = {
  vivo: CATEGORY_COLORS,
  pastel: ['#fca5a5', '#fdba74', '#fcd34d', '#bef264', '#86efac', '#5eead4', '#7dd3fc', '#a5b4fc', '#c4b5fd', '#f9a8d4', '#d6d3d1', '#cbd5e1'],
  oceano: ['#0ea5e9', '#0891b2', '#0d9488', '#059669', '#2563eb', '#4f46e5', '#0284c7', '#14b8a6', '#22d3ee', '#3b82f6', '#6366f1', '#38bdf8'],
  calido: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#ea580c', '#f43f5e', '#fb923c', '#facc15', '#e11d48', '#c2410c', '#fbbf24'],
}

export type ChartPaletteKey = keyof typeof CHART_PALETTES

export const CHART_PALETTE_KEYS = Object.keys(CHART_PALETTES) as ChartPaletteKey[]

// Etiquetas legibles para el selector de paleta.
export const CHART_PALETTE_LABELS: Record<ChartPaletteKey, string> = {
  vivo: 'Vivo',
  pastel: 'Pastel',
  oceano: 'Océano',
  calido: 'Cálido',
}

// Asigna de forma determinista un color de una paleta según un índice
// (para categorías sin color propio, manteniendo estabilidad visual).
export function paletteColorAt(index: number, palette: ChartPaletteKey = 'vivo'): string {
  const colors = CHART_PALETTES[palette] ?? CATEGORY_COLORS
  return colors[index % colors.length]
}
