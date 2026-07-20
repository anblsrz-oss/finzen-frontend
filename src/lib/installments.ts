// Cálculos de meses sin intereses (MSI) y diferidos.

import { monthsElapsed, parseLocalDate, toISODate } from '@/lib/dates'

/** Mensualidad de un plan. El interés se reparte parejo entre los meses. */
export function monthlyPayment(
  totalAmount: number,
  interestAmount: number,
  months: number,
): number {
  if (!months) return 0
  return (totalAmount + interestAmount) / months
}

/**
 * Cuántas mensualidades ya deberían estar pagadas si el plan arrancó en el
 * pasado. Se acota al total de meses del plan.
 */
export function elapsedInstallments(startDate: string, months: number): number {
  return Math.min(monthsElapsed(startDate), months)
}

/** true si el plan arrancó en un mes anterior al actual. */
export function isRetroactive(startDate: string, today: Date = new Date()): boolean {
  const start = parseLocalDate(startDate)
  return (
    start.getFullYear() < today.getFullYear() ||
    (start.getFullYear() === today.getFullYear() && start.getMonth() < today.getMonth())
  )
}

/**
 * Fecha del ajuste por mensualidades ya pagadas: último día del mes anterior
 * al actual. Así el ingreso cae en el histórico, no en el mes en curso.
 */
export function adjustmentDate(today: Date = new Date()): string {
  // Día 0 del mes actual = último día del mes anterior.
  return toISODate(new Date(today.getFullYear(), today.getMonth(), 0))
}
