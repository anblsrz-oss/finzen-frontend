// Personalización de colores de la app, configurable por admin (app_config.theme_colors).
// Se aplican como variables CSS mediante una hoja de estilo inyectada, con reglas
// separadas para :root (claro) y :root.dark (oscuro), de modo que el cambio de
// tema (incluido 'system') funciona sin tener que reaplicar desde JS.

import { parseHex, mix, triplet, WHITE, BLACK } from './colorUtils'

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
