import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useEntitlements } from '@/hooks/useAppConfig'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
} from '@/hooks/useReports'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { ChartControls } from '@/components/charts/ChartControls'
import { Money } from '@/components/ui/Money'
import { formatDate } from '@/lib/format'
import { exportReportToExcel } from '@/lib/exportExcel'
import type { ExportMode } from '@/lib/exportExcel'

export function ReportsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const incomeExpenseRef = useRef<HTMLDivElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const [exportMode, setExportMode] = useState<ExportMode>('both')
  const [exporting, setExporting] = useState(false)
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

  // Mapa id→categoría para nombrar los movimientos exportados.
  const categoriesQuery = useCategories(userId)
  const categoryById = new Map(
    (categoriesQuery.data || []).map((c) => [c.id, c]),
  )

  const hasData = monthly.length > 0 || categories.length > 0

  const handleExport = async () => {
    setExporting(true)
    try {
      const transactions = (summary?.transactions || [])
        .slice()
        .sort((a, b) => (a.tx_date < b.tx_date ? 1 : -1))
        .map((tx) => {
          const cat = tx.category_id ? categoryById.get(tx.category_id) : undefined
          return {
            date: formatDate(tx.tx_date),
            concept: tx.concept || '',
            category: cat ? `${cat.icon || ''} ${cat.name}`.trim() : '',
            kind:
              tx.kind === 'income'
                ? t('Ingreso')
                : tx.kind === 'expense'
                  ? t('Egreso')
                  : t('Transferencia'),
            amount: tx.amount,
            currency: tx.currency,
          }
        })

      await exportReportToExcel({
        mode: exportMode,
        fileName: `finzen-reporte-${startDate}_a_${endDate}.xlsx`,
        monthly: monthly.map((m) => ({
          monthLabel: m.monthLabel,
          income: m.income,
          expense: m.expense,
        })),
        categories: categories.map((c) => ({
          icon: c.icon,
          name: c.name,
          total: c.total,
        })),
        transactions,
        charts: [
          { title: t('Ingresos vs Egresos'), el: incomeExpenseRef.current },
          { title: t('Gastos por Categoría'), el: categoryRef.current },
        ],
      })
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err)
      alert(t('No se pudo exportar: {{error}}', { error: err?.message || 'error' }))
    } finally {
      setExporting(false)
    }
  }

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
        {hasData && (
          <Card className="space-y-4">
            <ChartControls />
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <Select
                label={t('Exportar a Excel')}
                options={[
                  { value: 'both', label: t('Tablas y gráficos') },
                  { value: 'tables', label: t('Solo tablas') },
                  { value: 'charts', label: t('Solo gráficos') },
                ]}
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as ExportMode)}
              />
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? t('Exportando…') : `📊 ${t('Descargar Excel')}`}
              </Button>
            </div>
          </Card>
        )}
        {monthly.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
              {t('Ingresos vs Egresos')}
            </h3>
            <div ref={incomeExpenseRef} className="bg-white dark:bg-slate-800">
              <IncomeExpenseChart data={monthly} />
            </div>
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">
              {t('Gastos por Categoría')}
            </h3>
            <div ref={categoryRef} className="bg-white dark:bg-slate-800">
              <CategoryPieChart data={categories} />
            </div>
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
