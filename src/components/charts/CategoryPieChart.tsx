import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

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
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
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
        />
        <Legend
          layout="horizontal"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
