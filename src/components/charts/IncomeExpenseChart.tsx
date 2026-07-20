import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useSettings, resolveIsDark } from '@/store/useSettings'
import type { IncomeExpenseChartType } from '@/store/useSettings'
import { useMoneyFormat } from '@/components/ui/Money'
import { CHART_META, seriesColor } from '@/lib/charts'
import type { ChartId } from '@/lib/charts'

interface DataPoint {
  month: string
  monthLabel: string
  income: number
  expense: number
}

interface IncomeExpenseChartProps {
  data: DataPoint[]
  // Si no se pasa, se usa la preferencia guardada en settings.
  type?: IncomeExpenseChartType
  currency?: string
  // ID para leer color/visibilidad de settings. Por defecto 'incomeExpense'.
  chartId?: ChartId
}

export function IncomeExpenseChart({
  data,
  type,
  currency = 'MXN',
  chartId = 'incomeExpense',
}: IncomeExpenseChartProps) {
  const { t } = useTranslation()
  const theme = useSettings((s) => s.theme)
  const prefType = useSettings((s) => s.incomeExpenseChartType)
  const config = useSettings((s) => s.chartConfigs[chartId])
  const money = useMoneyFormat()
  const chartType = type ?? prefType
  const dark = resolveIsDark(theme)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  const meta = CHART_META.incomeExpense
  const incomeColor = seriesColor(config, meta, 'income')
  const expenseColor = seriesColor(config, meta, 'expense')
  const hidden = config?.hiddenSeries ?? []
  const showIncome = !hidden.includes('income')
  const showExpense = !hidden.includes('expense')

  const tooltip = (
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
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === 'line' ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="monthLabel" tick={{ fill: axisColor }} stroke={gridColor} />
          <YAxis tick={{ fill: axisColor }} stroke={gridColor} />
          {tooltip}
          <Legend wrapperStyle={{ color: axisColor }} />
          {showIncome && (
            <Line type="monotone" dataKey="income" stroke={incomeColor} name={t('Ingresos')} strokeWidth={2} />
          )}
          {showExpense && (
            <Line type="monotone" dataKey="expense" stroke={expenseColor} name={t('Egresos')} strokeWidth={2} />
          )}
        </LineChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="monthLabel" tick={{ fill: axisColor }} stroke={gridColor} />
          <YAxis tick={{ fill: axisColor }} stroke={gridColor} />
          {tooltip}
          <Legend wrapperStyle={{ color: axisColor }} />
          {showIncome && <Bar dataKey="income" fill={incomeColor} name={t('Ingresos')} />}
          {showExpense && <Bar dataKey="expense" fill={expenseColor} name={t('Egresos')} />}
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
