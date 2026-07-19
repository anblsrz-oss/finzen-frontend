import { useTranslation } from 'react-i18next'
import { useSettings } from '@/store/useSettings'
import { Select } from '@/components/ui/Select'
import { CHART_PALETTE_KEYS, CHART_PALETTE_LABELS } from '@/lib/categoryColors'

// Controles para personalizar el tipo de gráfico y la paleta de colores.
// La preferencia se guarda en settings (localStorage) y aplica en Reportes y Resumen.
export function ChartControls() {
  const { t } = useTranslation()
  const incomeExpenseChartType = useSettings((s) => s.incomeExpenseChartType)
  const setIncomeExpenseChartType = useSettings((s) => s.setIncomeExpenseChartType)
  const categoryChartType = useSettings((s) => s.categoryChartType)
  const setCategoryChartType = useSettings((s) => s.setCategoryChartType)
  const chartPalette = useSettings((s) => s.chartPalette)
  const setChartPalette = useSettings((s) => s.setChartPalette)

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select
        label={t('Ingresos vs Egresos')}
        options={[
          { value: 'bar', label: t('Barras') },
          { value: 'line', label: t('Líneas') },
        ]}
        value={incomeExpenseChartType}
        onChange={(e) => setIncomeExpenseChartType(e.target.value as any)}
      />
      <Select
        label={t('Gastos por categoría')}
        options={[
          { value: 'pie', label: t('Pastel') },
          { value: 'donut', label: t('Dona') },
          { value: 'bar', label: t('Barras') },
        ]}
        value={categoryChartType}
        onChange={(e) => setCategoryChartType(e.target.value as any)}
      />
      <Select
        label={t('Paleta de colores')}
        options={CHART_PALETTE_KEYS.map((k) => ({ value: k, label: t(CHART_PALETTE_LABELS[k]) }))}
        value={chartPalette}
        onChange={(e) => setChartPalette(e.target.value)}
      />
    </div>
  )
}
