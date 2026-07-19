// Utilidades de conversión de moneda. base_amount = monto convertido a la
// moneda principal del usuario. Cuando la moneda del movimiento coincide con la
// principal, la tasa es 1.

// Redondea a 2 decimales evitando errores de coma flotante.
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Convierte `amount` (en `fromCurrency`) a la moneda principal usando `rate`
// (unidades de moneda principal por 1 unidad de fromCurrency).
export function toBaseAmount(amount: number, rate: number): number {
  return round2(amount * rate)
}
