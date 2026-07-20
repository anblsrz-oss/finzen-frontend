import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { ChartConfigPanel } from './ChartConfigPanel'
import { useSettings } from '@/store/useSettings'
import { reconcileOrder } from '@/lib/charts'
import type { ChartId, ChartPage } from '@/lib/charts'

interface ChartCardProps {
  chartId: ChartId
  page: ChartPage
  title: string
  // Gráficos disponibles (con datos) en esta página, en orden default. Sirve
  // para reconciliar el orden y deshabilitar las flechas en los extremos.
  available: ChartId[]
  // Muestra el check de exportación (solo Reportes exporta a Excel).
  exportable?: boolean
  // Nombres de puntos (categorías) para el panel de configuración.
  points?: string[]
  children: React.ReactNode
}

// Tarjeta contenedora de un gráfico con su barra de acciones: reordenar (↑/↓),
// configurar (⚙) e incluir en Excel (☑). El ref apunta al área capturable para
// la exportación PNG.
export const ChartCard = forwardRef<HTMLDivElement, ChartCardProps>(function ChartCard(
  { chartId, page, title, available, exportable, points, children },
  ref,
) {
  const { t } = useTranslation()
  const [configOpen, setConfigOpen] = useState(false)
  const chartOrder = useSettings((s) => s.chartOrder[page])
  const moveChart = useSettings((s) => s.moveChart)
  const includeExport = useSettings((s) => s.chartConfigs[chartId]?.export)
  const setChartExport = useSettings((s) => s.setChartExport)

  const order = reconcileOrder(chartOrder, available)
  const idx = order.indexOf(chartId)
  const isFirst = idx <= 0
  const isLast = idx === order.length - 1

  const arrowClass =
    'rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={arrowClass}
            disabled={isFirst}
            onClick={() => moveChart(page, chartId, 'up', available)}
            aria-label={t('Subir')}
            title={t('Subir')}
          >
            ↑
          </button>
          <button
            type="button"
            className={arrowClass}
            disabled={isLast}
            onClick={() => moveChart(page, chartId, 'down', available)}
            aria-label={t('Bajar')}
            title={t('Bajar')}
          >
            ↓
          </button>
          <button
            type="button"
            className={arrowClass}
            onClick={() => setConfigOpen(true)}
            aria-label={t('Configurar gráfico')}
            title={t('Configurar gráfico')}
          >
            ⚙
          </button>
          {exportable && (
            <label
              className="ml-1 flex cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
              title={t('Incluir en Excel')}
            >
              <input
                type="checkbox"
                className="accent-brand-500"
                checked={includeExport !== false}
                onChange={(e) => setChartExport(chartId, e.target.checked)}
              />
              Excel
            </label>
          )}
        </div>
      </div>

      {/* Área capturada por la exportación PNG. */}
      <div ref={ref} className="bg-white dark:bg-slate-800">
        {children}
      </div>

      <ChartConfigPanel
        chartId={chartId}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        points={points}
      />
    </Card>
  )
})
