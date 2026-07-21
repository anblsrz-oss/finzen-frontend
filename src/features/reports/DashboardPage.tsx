import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
} from '@/hooks/useReports'
import { useCreditUsageBreakdown } from '@/hooks/useCreditLines'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { ChartCard } from '@/components/charts/ChartCard'
import { CreditUsageChart } from '@/components/charts/CreditUsageChart'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { ChartControls } from '@/components/charts/ChartControls'
import { Money } from '@/components/ui/Money'
import { monthStartISO, todayISO } from '@/lib/dates'
import { DEFAULT_ORDER, reconcileOrder } from '@/lib/charts'
import type { ChartId } from '@/lib/charts'
import { useSettings } from '@/store/useSettings'

export function DashboardPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const mainCurrency = profile?.main_currency ?? 'MXN'

  // Solo mes actual para Gratis
  const startDate = monthStartISO()
  const endDate = todayISO()

  const filters = { startDate, endDate }

  const summaryQuery = useTransactionsSummary(userId, filters)
  const monthlyQuery = useMonthlyTotals(userId, filters)
  const categoryQuery = useCategoryTotals(userId, filters)

  const summary = summaryQuery.data
  const monthly = monthlyQuery.data || []
  const categories = categoryQuery.data || []

  // Estado puntual, no histórico: no depende del rango de fechas de arriba.
  const { data: creditUsage } = useCreditUsageBreakdown(userId)

  const savedOrder = useSettings((s) => s.chartOrder.dashboard)

  // Gráficos con datos, en orden default; luego reconciliados con lo guardado.
  const available = DEFAULT_ORDER.dashboard.filter((id) => {
    if (id === 'creditUsage') return creditUsage.length > 0
    if (id === 'incomeExpense') return monthly.length > 0
    if (id === 'category') return categories.length > 0
    return false
  })
  const order = reconcileOrder(savedOrder, available)

  const renderChart = (id: ChartId) => {
    switch (id) {
      case 'creditUsage':
        return (
          <ChartCard key={id} chartId={id} page="dashboard" title={t('Uso de línea de crédito')} available={available}>
            <CreditUsageChart data={creditUsage} />
          </ChartCard>
        )
      case 'incomeExpense':
        return (
          <ChartCard key={id} chartId={id} page="dashboard" title={t('Ingresos vs Egresos')} available={available}>
            <IncomeExpenseChart data={monthly} currency={mainCurrency} />
          </ChartCard>
        )
      case 'category':
        return (
          <ChartCard
            key={id}
            chartId={id}
            page="dashboard"
            title={t('Gastos por Categoría')}
            available={available}
            points={categories.map((c) => c.name)}
          >
            <CategoryPieChart data={categories} currency={mainCurrency} />
          </ChartCard>
        )
      default:
        return null
    }
  }

  return (
    <>
      <PageHeader
        title={t('Resumen')}
        subtitle={t('Vista general de tus ingresos, egresos y balance.')}
      />

      {/* Tarjetas de resumen */}
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
              summary.balanceCash >= 0
                ? 'from-blue-50 to-cyan-50'
                : 'from-orange-50 to-yellow-50'
            }`}
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Balance efectivo')}</p>
            <p
              className={`text-2xl font-semibold ${
                summary.balanceCash >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              <Money amount={summary.balanceCash} currency={mainCurrency} />
            </p>
          </Card>
        </div>
      )}

      {/* Gráficas */}
      <div className="space-y-6">
        {(monthly.length > 0 || categories.length > 0) && (
          <Card>
            <ChartControls />
          </Card>
        )}

        {order.map((id) => renderChart(id))}

        {!monthly.length && !categories.length && !creditUsage.length && (
          <Card className="border-dashed text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Sin transacciones este mes.')}
            </p>
          </Card>
        )}
      </div>
    </>
  )
}
