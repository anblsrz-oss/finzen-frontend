// Utilidades de color compartidas (tema de la app y colores de tarjeta).

export type Rgb = [number, number, number]

export function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

// ¿Es un color hex válido? (#rgb o #rrggbb)
export function isHexColor(v: string | null | undefined): boolean {
  return !!v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())
}

export function parseHex(hex: string, fallback: Rgb = [13, 148, 136]): Rgb {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((v) => Number.isNaN(v))) return fallback
  return [r, g, b]
}

export function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')
}

// Mezcla el color base hacia otro (blanco o negro) según ratio (0..1).
export function mix(base: Rgb, toward: Rgb, ratio: number): Rgb {
  return [
    clamp255(base[0] + (toward[0] - base[0]) * ratio),
    clamp255(base[1] + (toward[1] - base[1]) * ratio),
    clamp255(base[2] + (toward[2] - base[2]) * ratio),
  ]
}

export const WHITE: Rgb = [255, 255, 255]
export const BLACK: Rgb = [0, 0, 0]

export function darken(hex: string, ratio: number): string {
  return toHex(mix(parseHex(hex), BLACK, ratio))
}

export function lighten(hex: string, ratio: number): string {
  return toHex(mix(parseHex(hex), WHITE, ratio))
}

// "r g b" para usar dentro de rgb(var(--x) / <alpha>).
export function triplet(rgb: Rgb): string {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`
}

// Luminancia relativa (WCAG). Sirve para decidir si el texto encima debe ser
// claro u oscuro: sobre un color claro, el texto blanco no se lee.
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// ¿El color es lo bastante claro como para necesitar texto oscuro encima?
export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.5
}
