// Cálculos de meses sin intereses (MSI) y diferidos.

import { addMonths, monthsElapsed, monthStartISO, parseLocalDate, toISODate } from '@/lib/dates'

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

// ---------------------------------------------------------------------
// Seguimiento mes a mes (ledger installment_plan_payments).
// ---------------------------------------------------------------------

export interface PlanScheduleItem {
  /** 0-based. */
  index: number
  /** Mes de la mensualidad como "YYYY-MM-01". */
  periodMonth: string
  amount: number
}

/** Calendario de mensualidades de un plan, mes a mes desde su inicio. */
export function installmentSchedule(
  startDate: string,
  months: number,
  monthly: number,
): PlanScheduleItem[] {
  const items: PlanScheduleItem[] = []
  for (let i = 0; i < months; i++) {
    items.push({
      index: i,
      periodMonth: monthStartISO(addMonths(startDate, i)),
      amount: monthly,
    })
  }
  return items
}

export interface PlanProgress {
  months: number
  monthly: number
  paidCount: number
  remainingCount: number
  remainingAmount: number
  /** Primer mes no pagado, o null si el plan ya está saldado. */
  nextDuePeriod: string | null
  schedule: PlanScheduleItem[]
}

/** Avance de un plan cruzando su calendario con los meses ya pagados. */
export function planProgress(
  plan: { start_date: string; months: number; monthly_payment: number },
  paidPeriods: Set<string>,
): PlanProgress {
  const schedule = installmentSchedule(
    plan.start_date,
    plan.months,
    plan.monthly_payment,
  )
  const paidCount = schedule.filter((s) => paidPeriods.has(s.periodMonth)).length
  const remainingCount = Math.max(0, plan.months - paidCount)
  const nextDue = schedule.find((s) => !paidPeriods.has(s.periodMonth))
  return {
    months: plan.months,
    monthly: plan.monthly_payment,
    paidCount,
    remainingCount,
    remainingAmount: remainingCount * plan.monthly_payment,
    nextDuePeriod: nextDue?.periodMonth ?? null,
    schedule,
  }
}
