import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/format'
import { currentPeriod, cutDateForMonth, shiftDays } from '@/lib/creditDates'
import { daysUntil, parseLocalDate, formatMonthLabel } from '@/lib/dates'
import type { CreditLineRow, CreditLinePeriodRow } from '@/types/db'

interface LinePeriodInfoProps {
  line: CreditLineRow
  periods: CreditLinePeriodRow[]
}

/** "en 4 días" / "hoy" / "hace 2 días" */
function relativeLabel(t: (k: string, o?: any) => string, date: string): string {
  const d = daysUntil(date)
  if (d === 0) return t('hoy')
  if (d > 0) return t('en {{n}} días', { n: d })
  return t('hace {{n}} días', { n: -d })
}

/**
 * Fechas de corte y pago de la línea. Una fecha confirmada por el usuario
 * manda sobre la calculada; debajo, el historial con el corrimiento real.
 */
export function LinePeriodInfo({ line, periods }: LinePeriodInfoProps) {
  const { t } = useTranslation()
  const [showHistory, setShowHistory] = useState(false)

  const period = currentPeriod(line)
  if (!period) return null

  const linePeriods = periods.filter((p) => p.credit_line_id === line.id)
  const confirmed = linePeriods.find((p) => p.period_month === period.periodMonth)
  const cutDate = confirmed?.cut_date ?? period.cutDate
  const paymentDate = confirmed?.payment_date ?? period.paymentDate

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-600 dark:text-slate-300">
        📅 {t('Corte:')} {formatDate(cutDate)} · {relativeLabel(t, cutDate)}
        {' | '}
        {t('Pago:')} {formatDate(paymentDate)} · {relativeLabel(t, paymentDate)}
        {confirmed?.confirmed && (
          <span className="ml-1 text-green-600 dark:text-green-400">
            ✓ {t('confirmado')}
          </span>
        )}
      </p>

      {linePeriods.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-brand-700 hover:underline dark:text-brand-500"
          >
            {showHistory ? t('Ocultar historial') : t('Ver historial de periodos')}
          </button>
          {showHistory && (
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {linePeriods.map((p) => {
                // Corrimiento respecto a lo que se habría calculado sin confirmar.
                const calculated = line.cut_day
                  ? cutDateForMonth(line.cut_day, parseLocalDate(p.period_month))
                  : null
                const shift = calculated ? shiftDays(calculated, p.cut_date) : 0
                return (
                  <li key={p.id}>
                    {formatMonthLabel(p.period_month)}: {t('corte')} {formatDate(p.cut_date)}
                    {shift !== 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        ({shift > 0 ? '+' : ''}{shift} {t('días')})
                      </span>
                    )}
                    {' · '}
                    {t('pago')} {formatDate(p.payment_date)}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
