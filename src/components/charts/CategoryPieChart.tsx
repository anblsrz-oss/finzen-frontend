import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSettings, resolveIsDark } from '@/store/useSettings'

interface CategoryData {
  name: string
  icon: string
  total: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const theme = useSettings((s) => s.theme)
  const dark = resolveIsDark(theme)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
        Sin gastos en este período
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: `${d.icon} ${d.name}`,
    value: d.total,
    color: d.color,
  }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          labelLine={false}
          // Solo el porcentaje dentro del pastel: evita que nombres largos
          // se desborden del contenedor en móvil. Los nombres van en la leyenda.
          label={({ percent }) =>
            percent && percent > 0.05 ? `${Math.round(percent * 100)}%` : ''
          }
          outerRadius="70%"
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            `$${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`
          }
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
            borderRadius: 8,
          }}
          itemStyle={{ color: dark ? '#f1f5f9' : undefined }}
        />
        <Legend
          layout="horizontal"
          wrapperStyle={{
            fontSize: 12,
            paddingTop: 8,
            color: dark ? '#94a3b8' : undefined,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
