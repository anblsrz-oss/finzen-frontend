// Fechas de corte y pago de una línea de crédito.
// La línea guarda días nominales (corte el 15, pago el 5); aquí se convierten
// en fechas reales del calendario. Dos reglas que importan:
//   - Un día que no existe en el mes se recorta (corte el 31 → 28 en febrero).
//   - El pago siempre cae DESPUÉS del corte: si payment_day <= cut_day, es del
//     mes siguiente.

import { clampDayToMonth, toISODate, parseLocalDate, monthStartISO } from '@/lib/dates'

export interface CreditPeriod {
  /** Primer día del mes del corte, "YYYY-MM-01". Clave del periodo. */
  periodMonth: string
  cutDate: string
  paymentDate: string
  /** true si el usuario ya confirmó estas fechas contra su estado de cuenta. */
  confirmed: boolean
}

/** Fecha de corte del mes de `ref`, con el día recortado al mes. */
export function cutDateForMonth(cutDay: number, ref: Date): string {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return toISODate(new Date(y, m, clampDayToMonth(y, m, cutDay)))
}

/**
 * Fecha de pago que corresponde a un corte dado.
 * Si el día de pago es menor o igual al de corte, el pago es del mes siguiente.
 */
export function paymentDateForCut(
  cutDay: number,
  paymentDay: number,
  cutDate: string,
): string {
  const cut = parseLocalDate(cutDate)
  const monthOffset = paymentDay <= cutDay ? 1 : 0
  const y = cut.getFullYear()
  const m = cut.getMonth() + monthOffset
  // new Date normaliza el desbordamiento de diciembre a enero.
  const target = new Date(y, m, 1)
  return toISODate(
    new Date(
      target.getFullYear(),
      target.getMonth(),
      clampDayToMonth(target.getFullYear(), target.getMonth(), paymentDay),
    ),
  )
}

/**
 * Periodo vigente de una línea: el corte más reciente que ya ocurrió o el de
 * este mes si aún no llega. Devuelve null si la línea no tiene días definidos.
 */
export function currentPeriod(
  line: { cut_day: number | null; payment_day: number | null },
  today: Date = new Date(),
): Omit<CreditPeriod, 'confirmed'> | null {
  if (!line.cut_day || !line.payment_day) return null

  const thisMonthCut = cutDateForMonth(line.cut_day, today)
  // Si el corte de este mes aún no llega, el periodo vigente es el del mes
  // pasado: es el que el usuario todavía tiene que pagar.
  const ref =
    parseLocalDate(thisMonthCut) > today
      ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
      : today

  const cutDate = cutDateForMonth(line.cut_day, ref)
  return {
    periodMonth: monthStartISO(cutDate),
    cutDate,
    paymentDate: paymentDateForCut(line.cut_day, line.payment_day, cutDate),
  }
}

/** Diferencia en días entre la fecha confirmada y la calculada (+ = se recorrió después). */
export function shiftDays(calculated: string, actual: string): number {
  return Math.round(
    (parseLocalDate(actual).getTime() - parseLocalDate(calculated).getTime()) / 86_400_000,
  )
}
