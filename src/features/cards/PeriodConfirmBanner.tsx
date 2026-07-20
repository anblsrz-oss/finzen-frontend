import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useConfirmCreditLinePeriod } from '@/hooks/useCreditLinePeriods'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'
import { currentPeriod } from '@/lib/creditDates'
import { daysUntil, toISODate, parseLocalDate } from '@/lib/dates'
import type { CreditLineRow, CreditLinePeriodRow } from '@/types/db'

interface PeriodConfirmBannerProps {
  line: CreditLineRow
  periods: CreditLinePeriodRow[]
}

// Margen razonable de corrimiento por días inhábiles: un fin de semana largo.
const MAX_SHIFT_DAYS = 5

/**
 * Cuando una línea marca que sus fechas se recorren, al llegar el corte
 * calculado se le pregunta al usuario si esa fue la fecha real. Lo que
 * responda queda en credit_line_periods y manda sobre el cálculo.
 */
export function PeriodConfirmBanner({ line, periods }: PeriodConfirmBannerProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const confirmPeriod = useConfirmCreditLinePeriod()
  const [customDate, setCustomDate] = useState<string | null>(null)

  const period = currentPeriod(line)
  if (!line.dates_may_shift || !period) return null

  // Ya confirmado: no hay nada que preguntar.
  const existing = periods.find(
    (p) => p.credit_line_id === line.id && p.period_month === period.periodMonth,
  )
  if (existing?.confirmed) return null

  // Solo se pregunta una vez que la fecha calculada llegó.
  if (daysUntil(period.cutDate) > 0) return null

  function save(cutDate: string) {
    if (!session?.user?.id || !period) return
    confirmPeriod.mutate({
      userId: session.user.id,
      credit_line_id: line.id,
      period_month: period.periodMonth,
      cut_date: cutDate,
      payment_date: period.paymentDate,
    })
  }

  const cut = parseLocalDate(period.cutDate)
  const min = toISODate(new Date(cut.getFullYear(), cut.getMonth(), cut.getDate() - MAX_SHIFT_DAYS))
  const max = toISODate(new Date(cut.getFullYear(), cut.getMonth(), cut.getDate() + MAX_SHIFT_DAYS))

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        ⚠️ {t('¿Tu corte de {{name}} fue el {{date}}?', {
          name: line.name,
          date: formatDate(period.cutDate),
        })}
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
        {t('Marcaste que esta línea recorre sus fechas en días inhábiles. Confírmala para que los periodos cuadren.')}
      </p>

      {customDate === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => save(period.cutDate)}
            disabled={confirmPeriod.isPending}
          >
            {t('Sí, fue esa fecha')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomDate(period.cutDate)}
          >
            {t('Fue otro día')}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customDate}
            min={min}
            max={max}
            onChange={(e) => setCustomDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
          <Button
            size="sm"
            onClick={() => save(customDate)}
            disabled={confirmPeriod.isPending || !customDate}
          >
            {t('Guardar')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCustomDate(null)}>
            {t('Cancelar')}
          </Button>
        </div>
      )}
    </div>
  )
}
