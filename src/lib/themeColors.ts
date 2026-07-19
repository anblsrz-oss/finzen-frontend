// Personalización de colores de la app, configurable por admin (app_config.theme_colors).
// Se aplican como variables CSS mediante una hoja de estilo inyectada, con reglas
// separadas para :root (claro) y :root.dark (oscuro), de modo que el cambio de
// tema (incluido 'system') funciona sin tener que reaplicar desde JS.

export interface ThemeColors {
  // Color de acento (marca). De aquí se deriva toda la rampa brand-*.
  brand: string
  light: { bg: string; surface: string }
  dark: { bg: string; surface: string }
}

// Valores por defecto: equivalen al tema teal original y a los fondos slate.
export const DEFAULT_THEME_COLORS: ThemeColors = {
  brand: '#0d9488',
  light: { bg: '#f8fafc', surface: '#ffffff' },
  dark: { bg: '#0f172a', surface: '#1e293b' },
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((v) => Number.isNaN(v))) return [13, 148, 136] // teal fallback
  return [r, g, b]
}

// Mezcla el color base hacia otro (blanco o negro) según ratio (0..1).
function mix(base: [number, number, number], toward: [number, number, number], ratio: number): [number, number, number] {
  return [
    clamp(base[0] + (toward[0] - base[0]) * ratio),
    clamp(base[1] + (toward[1] - base[1]) * ratio),
    clamp(base[2] + (toward[2] - base[2]) * ratio),
  ]
}

const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

// "r g b" para usar dentro de rgb(var(--x) / <alpha>).
function triplet(rgb: [number, number, number]): string {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`
}

// Deriva la rampa brand (50,100,500,600,700,800) desde un color de acento.
function brandRamp(accent: string): Record<string, string> {
  const base = parseHex(accent)
  return {
    '--brand-50': triplet(mix(base, WHITE, 0.92)),
    '--brand-100': triplet(mix(base, WHITE, 0.8)),
    '--brand-500': triplet(mix(base, WHITE, 0.18)),
    '--brand-600': triplet(base),
    '--brand-700': triplet(mix(base, BLACK, 0.15)),
    '--brand-800': triplet(mix(base, BLACK, 0.3)),
  }
}

const STYLE_ID = 'finzen-theme-colors'

// Aplica los colores como una hoja de estilo (idempotente). Pasar null limpia.
export function applyThemeColors(colors: ThemeColors | null): void {
  const existing = document.getElementById(STYLE_ID)
  if (!colors) {
    existing?.remove()
    return
  }

  const ramp = brandRamp(colors.brand)
  const rampCss = Object.entries(ramp)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')

  const css = `
:root {
  ${rampCss}
  --bg: ${triplet(parseHex(colors.light.bg))};
  --surface: ${triplet(parseHex(colors.light.surface))};
}
:root.dark {
  --bg: ${triplet(parseHex(colors.dark.bg))};
  --surface: ${triplet(parseHex(colors.dark.surface))};
}`

  const style = (existing as HTMLStyleElement) ?? document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  if (!existing) document.head.appendChild(style)
}
