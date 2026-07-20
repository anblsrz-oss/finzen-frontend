import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useSettings, resolveIsDark } from '@/store/useSettings'
import { useMoneyFormat } from '@/components/ui/Money'
import { CHART_META, seriesColor } from '@/lib/charts'
import type { ChartId } from '@/lib/charts'
import type { Breakdown } from '@/hooks/useReports'

interface BreakdownBarChartProps {
  data: Breakdown[]
  currency?: string
  // ID para leer color/visibilidad de settings ('byCard' o 'byAccount').
  chartId: ChartId
}

// Barras agrupadas ingreso/egreso por entidad. Genérico a propósito: lo usan
// tanto el desglose por tarjeta como el de por cuenta.
export function BreakdownBarChart({ data, currency = 'MXN', chartId }: BreakdownBarChartProps) {
  const { t } = useTranslation()
  const theme = useSettings((s) => s.theme)
  const config = useSettings((s) => s.chartConfigs[chartId])
  const money = useMoneyFormat()
  const dark = resolveIsDark(theme)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  const meta = CHART_META[chartId]
  const incomeColor = seriesColor(config, meta, 'income')
  const expenseColor = seriesColor(config, meta, 'expense')
  const hidden = config?.hiddenSeries ?? []
  const showIncome = !hidden.includes('income')
  const showExpense = !hidden.includes('expense')

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('Sin movimientos en este período.')}
      </p>
    )
  }

  const chartData = data.map((d) => ({ ...d, name: t(d.name) }))

  // Horizontal: los nombres de tarjetas/cuentas no caben en un eje X vertical.
  // La altura crece con el número de filas para que las barras no se aplasten.
  const height = Math.max(220, chartData.length * 48 + 60)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} stroke={gridColor} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: axisColor, fontSize: 12 }}
          stroke={gridColor}
        />
        <Tooltip
          formatter={(value: number) => money(value, currency)}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${gridColor}`,
            borderRadius: 8,
          }}
          labelStyle={{ color: dark ? '#f1f5f9' : '#000' }}
          itemStyle={{ color: axisColor }}
        />
        <Legend wrapperStyle={{ color: axisColor }} />
        {showIncome && <Bar dataKey="income" fill={incomeColor} name={t('Ingresos')} />}
        {showExpense && <Bar dataKey="expense" fill={expenseColor} name={t('Egresos')} />}
      </BarChart>
    </ResponsiveContainer>
  )
}
