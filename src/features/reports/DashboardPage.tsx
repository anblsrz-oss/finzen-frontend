import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
} from '@/hooks/useReports'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { formatMoney } from '@/lib/format'

export function DashboardPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const mainCurrency = profile?.main_currency ?? 'MXN'

  // Solo mes actual para Gratis
  const startDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]

  const filters = { startDate, endDate }

  const summaryQuery = useTransactionsSummary(userId, filters)
  const monthlyQuery = useMonthlyTotals(userId, filters)
  const categoryQuery = useCategoryTotals(userId, filters)

  const summary = summaryQuery.data
  const monthly = monthlyQuery.data || []
  const categories = categoryQuery.data || []

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
              {formatMoney(summary.totalIncome, mainCurrency)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50">
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Total Egresos')}</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {formatMoney(summary.totalExpense, mainCurrency)}
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
              {formatMoney(summary.balance, mainCurrency)}
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
              {t('Sin transacciones este mes.')}
            </p>
          </Card>
        )}
      </div>
    </>
  )
}
