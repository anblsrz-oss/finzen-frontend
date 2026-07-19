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
import { useSettings, resolveIsDark } from '@/store/useSettings'
import type { IncomeExpenseChartType } from '@/store/useSettings'

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
  incomeColor?: string
  expenseColor?: string
}

export function IncomeExpenseChart({
  data,
  type,
  incomeColor = '#16a34a',
  expenseColor = '#ef4444',
}: IncomeExpenseChartProps) {
  const theme = useSettings((s) => s.theme)
  const prefType = useSettings((s) => s.incomeExpenseChartType)
  const chartType = type ?? prefType
  const dark = resolveIsDark(theme)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  const tooltip = (
    <Tooltip
      formatter={(value: number) => `$${value.toLocaleString()}`}
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
          <Line type="monotone" dataKey="income" stroke={incomeColor} name="Ingresos" strokeWidth={2} />
          <Line type="monotone" dataKey="expense" stroke={expenseColor} name="Egresos" strokeWidth={2} />
        </LineChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="monthLabel" tick={{ fill: axisColor }} stroke={gridColor} />
          <YAxis tick={{ fill: axisColor }} stroke={gridColor} />
          {tooltip}
          <Legend wrapperStyle={{ color: axisColor }} />
          <Bar dataKey="income" fill={incomeColor} name="Ingresos" />
          <Bar dataKey="expense" fill={expenseColor} name="Egresos" />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
