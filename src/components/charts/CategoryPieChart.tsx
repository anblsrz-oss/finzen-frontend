import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSettings, resolveIsDark } from '@/store/useSettings'
import type { CategoryChartType } from '@/store/useSettings'
import { paletteColorAt } from '@/lib/categoryColors'
import type { ChartPaletteKey } from '@/lib/categoryColors'

interface CategoryData {
  name: string
  icon: string
  total: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
  // Si no se pasan, se usan las preferencias guardadas en settings.
  type?: CategoryChartType
  palette?: ChartPaletteKey
}

export function CategoryPieChart({ data, type, palette }: CategoryPieChartProps) {
  const theme = useSettings((s) => s.theme)
  const prefType = useSettings((s) => s.categoryChartType)
  const prefPalette = useSettings((s) => s.chartPalette)
  const chartType = type ?? prefType
  const paletteKey = (palette ?? prefPalette) as ChartPaletteKey
  const dark = resolveIsDark(theme)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
        Sin gastos en este período
      </div>
    )
  }

  // Color propio de la categoría o, si no tiene, uno de la paleta por índice.
  const chartData = data.map((d, i) => ({
    name: `${d.icon} ${d.name}`,
    value: d.total,
    color: d.color || paletteColorAt(i, paletteKey),
  }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  const tooltip = (
    <Tooltip
      formatter={(value: number) =>
        `$${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`
      }
      contentStyle={{
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        border: `1px solid ${gridColor}`,
        borderRadius: 8,
      }}
      itemStyle={{ color: dark ? '#f1f5f9' : undefined }}
    />
  )

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} stroke={gridColor} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: axisColor, fontSize: 12 }}
            stroke={gridColor}
          />
          {tooltip}
          <Bar dataKey="value" name="Gasto">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

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
          innerRadius={chartType === 'donut' ? '45%' : 0}
          outerRadius="70%"
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        {tooltip}
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
