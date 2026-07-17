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
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => `$${value.toLocaleString()}`}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar dataKey="income" fill="#16a34a" name="Ingresos" />
        <Bar dataKey="expense" fill="#ef4444" name="Egresos" />
      </BarChart>
    </ResponsiveContainer>
  )
}
