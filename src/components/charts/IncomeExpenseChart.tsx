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
import { useSettings, resolveIsDark } from '@/store/useSettings'

interface DataPoint {
  month: string
  monthLabel: string
  income: number
  expense: number
}

interface IncomeExpenseChartProps {
  data: DataPoint[]
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const theme = useSettings((s) => s.theme)
  const dark = resolveIsDark(theme)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="monthLabel" tick={{ fill: axisColor }} stroke={gridColor} />
        <YAxis tick={{ fill: axisColor }} stroke={gridColor} />
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
        <Legend wrapperStyle={{ color: axisColor }} />
        <Bar dataKey="income" fill="#16a34a" name="Ingresos" />
        <Bar dataKey="expense" fill="#ef4444" name="Egresos" />
      </BarChart>
    </ResponsiveContainer>
  )
}
