import {
  BarChart,
  Bar,
  Cell,
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
import type { CreditUsageItem } from '@/hooks/useCreditLines'

interface CreditUsageChartProps {
  data: CreditUsageItem[]
}

export function CreditUsageChart({ data }: CreditUsageChartProps) {
  const { t } = useTranslation()
  const theme = useSettings((s) => s.theme)
  const config = useSettings((s) => s.chartConfigs['creditUsage'])
  const money = useMoneyFormat()
  const dark = resolveIsDark(theme)
  const axisColor = dark ? '#94a3b8' : '#475569'
  const gridColor = dark ? '#334155' : '#e2e8f0'

  // Colores del semáforo y del disponible, configurables. El default del
  // "disponible" sigue al tema salvo que el usuario lo cambie.
  const meta = CHART_META.creditUsage
  const lowColor = seriesColor(config, meta, 'low')
  const mediumColor = seriesColor(config, meta, 'medium')
  const highColor = seriesColor(config, meta, 'high')
  const availableColor = config?.seriesColors?.['available'] ?? (dark ? '#334155' : '#e2e8f0')

  // Por debajo de 30% es sano, arriba de 70% pesa en el buró y el pago mínimo.
  const usageColor = (percent: number): string => {
    if (percent >= 70) return highColor
    if (percent >= 30) return mediumColor
    return lowColor
  }

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('Sin líneas de crédito registradas.')}
      </p>
    )
  }

  // Barras apiladas usado + disponible: juntas suman el límite, así que el
  // largo total de cada barra es comparable entre líneas.
  const chartData = data.map((d) => ({
    name: d.name,
    used: d.used,
    available: Math.max(0, d.available),
    percent: d.percent,
    currency: d.currency,
    creditLimit: d.creditLimit,
    cards: d.cards,
  }))

  const height = Math.max(200, chartData.length * 56 + 60)

  return (
    <div className="space-y-3">
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
            formatter={(value: number, name: string) => [
              money(value, chartData[0]?.currency),
              name,
            ]}
            contentStyle={{
              backgroundColor: dark ? '#1e293b' : '#ffffff',
              border: `1px solid ${gridColor}`,
              borderRadius: 8,
            }}
            labelStyle={{ color: dark ? '#f1f5f9' : '#000' }}
            itemStyle={{ color: axisColor }}
          />
          <Legend wrapperStyle={{ color: axisColor }} />
          <Bar dataKey="used" stackId="credit" name={t('Usado')}>
            {chartData.map((d) => (
              <Cell key={d.name} fill={usageColor(d.percent)} />
            ))}
          </Bar>
          <Bar
            dataKey="available"
            stackId="credit"
            name={t('Disponible')}
            fill={availableColor}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Detalle: el % exacto y qué tarjetas comparten cada línea, que la
          gráfica sola no alcanza a comunicar. */}
      <ul className="space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: usageColor(d.percent) }}
            />
            <span className="font-medium text-slate-700 dark:text-slate-200">{d.name}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {money(d.used, d.currency)} / {money(d.creditLimit, d.currency)} (
              {d.percent.toFixed(0)}%)
            </span>
            {d.cards.length > 0 && (
              <span className="text-slate-400 dark:text-slate-500">· {d.cards.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
