import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useEntitlements } from '@/hooks/useAppConfig'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
} from '@/hooks/useReports'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { Money } from '@/components/ui/Money'

export function ReportsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  )

  // En Gratis, solo mes actual
  const filters =
    profile?.is_premium ? { startDate, endDate } : { startDate, endDate }

  const summaryQuery = useTransactionsSummary(userId, filters)
  const monthlyQuery = useMonthlyTotals(userId, filters)
  const categoryQuery = useCategoryTotals(userId, filters)

  const summary = summaryQuery.data
  const monthly = monthlyQuery.data || []
  const categories = categoryQuery.data || []
  const mainCurrency = profile?.main_currency ?? 'MXN'
  const { canUseReportsFilters } = useEntitlements()

  return (
    <>
      <PageHeader
        title={t('Reportes')}
        subtitle={t('Gráficas de ingresos y gastos por período, cuenta y tarjeta.')}
      />

      {/* Filtros (configurable como Premium) */}
      {canUseReportsFilters && (
        <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {t('Rango de fechas')}
          </p>
          <div className="flex gap-3">
            <Input
              label={t('Desde')}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label={t('Hasta')}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Resumen de tarjetas */}
      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Total Ingresos')}</p>
            <p className="text-2xl font-semibold text-green-600">
              <Money amount={summary.totalIncome} currency={mainCurrency} />
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50">
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Total Egresos')}</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              <Money amount={summary.totalExpense} currency={mainCurrency} />
            </p>
          </Card>
          <Card
            className={`bg-gradient-to-br ${
              summary.balance >= 0
                ? 'from-blue-50 to-cyan-50'
                : 'from-orange-50 to-yellow-50'
            }`}
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Balance')}</p>
            <p
              className={`text-2xl font-semibold ${
                summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              <Money amount={summary.balance} currency={mainCurrency} />
            </p>
          </Card>
        </div>
      )}

      {/* Gráficas */}
      <div className="space-y-6">
        {monthly.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
              {t('Ingresos vs Egresos')}
            </h3>
            <IncomeExpenseChart data={monthly} />
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
              {t('Gastos por Categoría')}
            </h3>
            <CategoryPieChart data={categories} />
          </Card>
        )}

        {!monthly.length && !categories.length && (
          <Card className="border-dashed text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Sin transacciones en este período.')}
            </p>
          </Card>
        )}
      </div>

      {!canUseReportsFilters && (
        <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            📊 {t('Premium: filtra por rango de fechas personalizado, cuenta o tarjeta. Actualiza tu plan para más análisis.')}
          </p>
        </Card>
      )}
    </>
  )
}
