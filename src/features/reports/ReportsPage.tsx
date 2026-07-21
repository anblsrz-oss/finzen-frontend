import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useEntitlements } from '@/hooks/useAppConfig'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
  useCardAccountTotals,
} from '@/hooks/useReports'
import { useCategories } from '@/hooks/useCategories'
import { useCreditUsageBreakdown } from '@/hooks/useCreditLines'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ChartCard } from '@/components/charts/ChartCard'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { BreakdownBarChart } from '@/components/charts/BreakdownBarChart'
import { CreditUsageChart } from '@/components/charts/CreditUsageChart'
import { ChartControls } from '@/components/charts/ChartControls'
import { Money } from '@/components/ui/Money'
import { formatDate } from '@/lib/format'
import { monthStartISO, todayISO } from '@/lib/dates'
import { CHART_META, DEFAULT_ORDER, reconcileOrder } from '@/lib/charts'
import type { ChartId } from '@/lib/charts'
import { useSettings } from '@/store/useSettings'
import { exportReportToExcel } from '@/lib/exportExcel'
import type { ExportMode } from '@/lib/exportExcel'

export function ReportsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  // Un ref por gráfico, indexado por su ChartId, para capturar el PNG al exportar.
  const chartRefs = useRef<Partial<Record<ChartId, HTMLDivElement | null>>>({})
  const [exportMode, setExportMode] = useState<ExportMode>('both')
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState(monthStartISO())
  const [endDate, setEndDate] = useState(todayISO())

  // El rango se aplica siempre; lo que está gateado por Premium es la UI del
  // filtro (canUseReportsFilters), no el cálculo. Sin filtro visible, startDate
  // y endDate se quedan en el mes actual, que es el comportamiento del plan Gratis.
  //
  // Memoizado: forma parte del queryKey de las tres queries, y un objeto nuevo
  // en cada render las invalidaría en cascada.
  const filters = useMemo(() => ({ startDate, endDate }), [startDate, endDate])

  const summaryQuery = useTransactionsSummary(userId, filters)
  const monthlyQuery = useMonthlyTotals(userId, filters)
  const categoryQuery = useCategoryTotals(userId, filters)
  const { data: breakdown } = useCardAccountTotals(userId, filters)
  const { data: creditUsage } = useCreditUsageBreakdown(userId)

  const summary = summaryQuery.data
  const monthly = monthlyQuery.data || []
  const categories = categoryQuery.data || []
  const mainCurrency = profile?.main_currency ?? 'MXN'
  const { canUseReportsFilters } = useEntitlements()

  const savedOrder = useSettings((s) => s.chartOrder.reports)
  const chartConfigs = useSettings((s) => s.chartConfigs)

  // Mapa id→categoría para nombrar los movimientos exportados.
  const categoriesQuery = useCategories(userId)
  const categoryById = new Map(
    (categoriesQuery.data || []).map((c) => [c.id, c]),
  )

  // Gráficos con datos, en orden default; luego reconciliados con lo guardado.
  const available = DEFAULT_ORDER.reports.filter((id) => {
    if (id === 'incomeExpense') return monthly.length > 0
    if (id === 'category') return categories.length > 0
    if (id === 'byCard') return breakdown.byCard.length > 0
    if (id === 'byAccount') return breakdown.byAccount.length > 0
    if (id === 'creditUsage') return creditUsage.length > 0
    return false
  })
  const order = reconcileOrder(savedOrder, available)
  const hasData = available.length > 0

  const setRef = (id: ChartId) => (el: HTMLDivElement | null) => {
    chartRefs.current[id] = el
  }

  const renderChart = (id: ChartId) => {
    const common = { chartId: id, page: 'reports' as const, available, exportable: true }
    switch (id) {
      case 'incomeExpense':
        return (
          <ChartCard key={id} {...common} title={t('Ingresos vs Egresos')} ref={setRef(id)}>
            <IncomeExpenseChart data={monthly} currency={mainCurrency} />
          </ChartCard>
        )
      case 'category':
        return (
          <ChartCard
            key={id}
            {...common}
            title={t('Gastos por Categoría')}
            points={categories.map((c) => c.name)}
            ref={setRef(id)}
          >
            <CategoryPieChart data={categories} currency={mainCurrency} />
          </ChartCard>
        )
      case 'byCard':
        return (
          <ChartCard key={id} {...common} title={t('Ingresos y Egresos por Tarjeta')} ref={setRef(id)}>
            <BreakdownBarChart data={breakdown.byCard} currency={mainCurrency} chartId={id} />
          </ChartCard>
        )
      case 'byAccount':
        return (
          <ChartCard key={id} {...common} title={t('Ingresos y Egresos por Cuenta')} ref={setRef(id)}>
            <BreakdownBarChart data={breakdown.byAccount} currency={mainCurrency} chartId={id} />
          </ChartCard>
        )
      case 'creditUsage':
        return (
          <ChartCard key={id} {...common} title={t('Uso de línea de crédito')} ref={setRef(id)}>
            <CreditUsageChart data={creditUsage} />
          </ChartCard>
        )
      default:
        return null
    }
  }

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
            category: cat ? `${cat.icon || ''} ${t(cat.name)}`.trim() : '',
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

      // Solo los gráficos marcados para exportar (check en la esquina), en el
      // orden en que se muestran.
      const charts = order
        .filter((id) => chartConfigs[id]?.export !== false)
        .map((id) => ({ title: t(CHART_META[id].titleKey), el: chartRefs.current[id] ?? null }))

      await exportReportToExcel({
        mode: exportMode,
        fileName: `ahorbit-reporte-${startDate}_a_${endDate}.xlsx`,
        monthly: monthly.map((m) => ({
          monthLabel: m.monthLabel,
          income: m.income,
          expense: m.expense,
        })),
        categories: categories.map((c) => ({
          icon: c.icon,
          name: t(c.name),
          total: c.total,
        })),
        transactions,
        charts,
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

      {/* Resumen: ingresos, egresos y crédito usado. */}
      {summary && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
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
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('Efectivo que salió (incluye pagos de tarjeta)')}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-violet-50">
            <p className="text-xs text-slate-600 dark:text-slate-300">{t('Crédito usado')}</p>
            <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
              <Money amount={summary.creditUsed} currency={mainCurrency} />
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('Deuda generada con tarjeta en el periodo')}
            </p>
          </Card>
        </div>
      )}

      {/* Dos balances: efectivo (caja) y económico (reconoce el crédito). */}
      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Card
            className={`bg-gradient-to-br ${
              summary.balanceCash >= 0 ? 'from-blue-50 to-cyan-50' : 'from-orange-50 to-yellow-50'
            }`}
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('Balance efectivo')}
            </p>
            <p
              className={`text-2xl font-semibold ${
                summary.balanceCash >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              <Money amount={summary.balanceCash} currency={mainCurrency} />
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('Ingresos − egresos de efectivo. El consumo a crédito no cuenta hasta que lo pagas.')}
            </p>
          </Card>
          <Card
            className={`bg-gradient-to-br ${
              summary.balanceEconomic >= 0 ? 'from-blue-50 to-cyan-50' : 'from-orange-50 to-yellow-50'
            }`}
          >
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('Balance económico')}
            </p>
            <p
              className={`text-2xl font-semibold ${
                summary.balanceEconomic >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              <Money amount={summary.balanceEconomic} currency={mainCurrency} />
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('Reconoce el gasto al consumir con tarjeta (resta el crédito usado).')}
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

        {order.map((id) => renderChart(id))}

        {!hasData && (
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
