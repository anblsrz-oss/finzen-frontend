// Utilidades de formato. Multimoneda: se formatea segun la moneda de cada cuenta.

export function formatMoney(amount: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Si la moneda no es valida para Intl, caer a formato simple.
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export const CURRENCIES = ['MXN', 'USD', 'EUR', 'CAD', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCIES_ARRAY = Array.from(CURRENCIES) as [string, ...string[]]
