// Utilidades de fecha. Todo lo que sale de Postgres como columna `date` llega
// como "YYYY-MM-DD" sin zona; si eso se pasa a `new Date()` ECMAScript lo
// interpreta como medianoche UTC y al formatearlo en local se ve el dia
// anterior (en Mexico, UTC-6). Aqui vive el parseo correcto y la generacion de
// fechas "de hoy" en hora local, para no volver a usar toISOString().

import { activeLocale } from '@/i18n'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parsea una fecha respetando la zona horaria local.
 * - "2026-07-19" (columna `date`) -> medianoche LOCAL, no UTC.
 * - "2026-07-19T12:00:00Z" (columna `timestamptz`) -> tal cual, ya trae zona.
 */
export function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  if (DATE_ONLY.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(date)
}

/** Fecha de hoy como "YYYY-MM-DD" en hora local. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Convierte un Date a "YYYY-MM-DD" usando sus componentes locales. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Mes de una fecha como "YYYY-MM" (por defecto, el mes actual). */
export function monthISO(date?: string | Date): string {
  const d = date ? parseLocalDate(date) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Primer dia del mes como "YYYY-MM-01" (formato de period_month). */
export function monthStartISO(date?: string | Date): string {
  return `${monthISO(date)}-01`
}

/** Suma meses conservando el dia; si el dia no existe en el mes destino, lo recorta. */
export function addMonths(date: string | Date, months: number): Date {
  const d = parseLocalDate(date)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  target.setDate(clampDayToMonth(target.getFullYear(), target.getMonth(), day))
  return target
}

/** Ultimo dia del mes (1-31) para un anio/mes dados. `month` es 0-indexado. */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Recorta un dia del mes al ultimo dia valido.
 * Un corte fijado el 31 cae el 28 (o 29) en febrero.
 * `month` es 0-indexado.
 */
export function clampDayToMonth(year: number, month: number, day: number): number {
  return Math.min(day, lastDayOfMonth(year, month))
}

/** Diferencia en dias completos entre hoy y una fecha (negativo = ya paso). */
export function daysUntil(date: string | Date, from: Date = new Date()): number {
  const target = parseLocalDate(date)
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const b = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/** Meses completos transcurridos entre dos fechas (nunca negativo). */
export function monthsElapsed(from: string | Date, to: string | Date = new Date()): number {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  return Math.max(0, months - (b.getDate() < a.getDate() ? 1 : 0))
}

/** Etiqueta de mes a partir de "YYYY-MM" o "YYYY-MM-DD". Ej: "jul 2026". */
export function formatMonthLabel(
  ym: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' },
): string {
  const iso = DATE_ONLY.test(ym) ? ym : `${ym}-01`
  return parseLocalDate(iso).toLocaleDateString(activeLocale(), opts)
}
