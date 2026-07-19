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

// Asigna de forma determinista un color de la paleta según un índice
// (para categorías sin color propio, manteniendo estabilidad visual).
export function paletteColorAt(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}
