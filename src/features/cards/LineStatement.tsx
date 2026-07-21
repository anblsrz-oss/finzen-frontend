import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/format'
import { formatMonthLabel } from '@/lib/dates'
import { planProgress } from '@/lib/installments'
import { computeLineStatement } from '@/hooks/useCreditLines'
import type { CreditActivity } from '@/hooks/useCreditLines'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import type {
  CardRow,
  CreditLineRow,
  InstallmentPlanRow,
  InstallmentPlanPaymentRow,
} from '@/types/db'

interface LineStatementProps {
  line: CreditLineRow
  cards: CardRow[]
  activities: CreditActivity[]
  plans: InstallmentPlanRow[]
  payments: InstallmentPlanPaymentRow[]
  onPay: (amount: number) => void
}

/**
 * Estado de cuenta del periodo vigente de una línea: lo que se debe pagar según
 * los consumos de la ventana corte-a-corte, más el avance de sus planes MSI.
 */
export function LineStatement({
  line,
  cards,
  activities,
  plans,
  payments,
  onPay,
}: LineStatementProps) {
  const { t } = useTranslation()

  const statement = useMemo(
    () => computeLineStatement(line, cards, activities),
    [line, cards, activities],
  )

  // Avance de los planes MSI de esta línea (meses pagados / faltantes).
  const linePlans = useMemo(() => {
    const lineCardIds = new Set(
      cards.filter((c) => c.credit_line_id === line.id).map((c) => c.id),
    )
    const paidByPlan = new Map<string, Set<string>>()
    for (const p of payments) {
      if (!paidByPlan.has(p.plan_id)) paidByPlan.set(p.plan_id, new Set())
      paidByPlan.get(p.plan_id)!.add(p.period_month)
    }
    return plans
      .filter((p) => p.card_id && lineCardIds.has(p.card_id))
      .map((p) => ({
        plan: p,
        progress: planProgress(
          { start_date: p.start_date, months: p.months, monthly_payment: p.monthly_payment },
          paidByPlan.get(p.id) ?? new Set<string>(),
        ),
      }))
      .filter((x) => x.progress.remainingCount > 0)
  }, [line.id, cards, plans, payments])

  if (!statement.window) return null

  const pending = Math.max(0, statement.amount - statement.paid)

  return (
    <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('A pagar de este periodo')}
          </p>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            <Money amount={pending} currency={statement.currency} />
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('Consumos del {{start}} al {{end}}', {
              start: formatDate(statement.window.start),
              end: formatDate(statement.window.end),
            })}
            {statement.paid > 0 && (
              <>
                {' · '}
                {t('ya abonado')}{' '}
                <Money amount={statement.paid} currency={statement.currency} />
              </>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => onPay(pending)}>
          💳 {t('Pagar')}
        </Button>
      </div>

      {linePlans.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {t('Meses sin intereses activos')}
          </p>
          <ul className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {linePlans.map((x) => (
              <li key={x.plan.id}>
                {x.plan.description || t('Compra')}:{' '}
                {t('{{paid}}/{{total}} pagadas · faltan', {
                  paid: x.progress.paidCount,
                  total: x.progress.months,
                })}{' '}
                <Money amount={x.progress.remainingAmount} currency={x.plan.currency} />
                {x.progress.nextDuePeriod && (
                  <>
                    {' · '}
                    {t('sigue {{month}}', {
                      month: formatMonthLabel(x.progress.nextDuePeriod),
                    })}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
