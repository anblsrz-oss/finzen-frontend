// Catálogo de marcas de tarjeta. `cards.brand` sigue siendo texto libre en la
// base (hace falta para la opción "Otro" y para lo ya capturado antes de que
// esto existiera), pero la UI captura mediante lista desplegable y normaliza.

export const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover'] as const
export type CardBrand = (typeof CARD_BRANDS)[number]

/** Etiqueta que se guarda en `cards.brand` y se muestra al usuario. */
export const BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
}

/**
 * Reconoce una marca a partir de lo guardado. Tolera lo que ya existe en la
 * base: texto libre, OCR ("AMERICAN EXPRESS"), abreviaturas ("MC").
 * Devuelve null si no la reconoce — entonces es una marca "Otro".
 */
export function normalizeBrand(raw?: string | null): CardBrand | null {
  const b = (raw ?? '').trim().toLowerCase()
  if (!b) return null
  if (b.includes('visa')) return 'visa'
  if (b.includes('master') || b === 'mc') return 'mastercard'
  if (b.includes('amex') || b.includes('american')) return 'amex'
  if (b.includes('discover')) return 'discover'
  return null
}

/** Opciones para el <Select> de marca, con "Otro" al final. */
export function brandOptions(otherLabel: string) {
  return [
    ...CARD_BRANDS.map((b) => ({ value: b, label: BRAND_LABELS[b] })),
    { value: 'other', label: otherLabel },
  ]
}
