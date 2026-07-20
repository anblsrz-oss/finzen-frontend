import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { ColorPickerFull } from '@/components/ui/ColorPickerFull'
import { useSettings } from '@/store/useSettings'
import { CHART_META, seriesColor } from '@/lib/charts'
import type { ChartId } from '@/lib/charts'

interface ChartConfigPanelProps {
  chartId: ChartId
  open: boolean
  onClose: () => void
  // Nombres de los puntos presentes (categorías) para los gráficos por-entidad.
  points?: string[]
}

// Fila con muestra de color, etiqueta, toggle de visibilidad y edición de color
// desplegable. Se comparte entre series y puntos.
function ConfigRow({
  label,
  color,
  hidden,
  togglable,
  editing,
  onToggleEdit,
  onToggleVisible,
  onColor,
}: {
  label: string
  color: string
  hidden: boolean
  togglable: boolean
  editing: boolean
  onToggleEdit: () => void
  onToggleVisible?: () => void
  onColor: (c: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleEdit}
          className="h-6 w-6 shrink-0 rounded border border-black/10"
          style={{ backgroundColor: color }}
          aria-label={t('Cambiar color')}
          title={t('Cambiar color')}
        />
        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
          {label}
        </span>
        {togglable && (
          <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <input type="checkbox" className="accent-brand-500" checked={!hidden} onChange={onToggleVisible} />
            {t('Mostrar')}
          </label>
        )}
      </div>
      {editing && (
        <div className="mt-2">
          <ColorPickerFull value={color} onChange={onColor} />
        </div>
      )}
    </div>
  )
}

export function ChartConfigPanel({ chartId, open, onClose, points }: ChartConfigPanelProps) {
  const { t } = useTranslation()
  const meta = CHART_META[chartId]
  const config = useSettings((s) => s.chartConfigs[chartId])
  const setChartSeriesColor = useSettings((s) => s.setChartSeriesColor)
  const setChartPointColor = useSettings((s) => s.setChartPointColor)
  const toggleChartSeries = useSettings((s) => s.toggleChartSeries)
  const resetChartConfig = useSettings((s) => s.resetChartConfig)

  const [editing, setEditing] = useState<string | null>(null)
  const hidden = config?.hiddenSeries ?? []
  const toggleEdit = (key: string) => setEditing((cur) => (cur === key ? null : key))

  return (
    <Modal open={open} title={t('Configurar gráfico')} onClose={onClose}>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{t('Series')}</p>
          <div className="space-y-2">
            {meta.series.map((s) => (
              <ConfigRow
                key={s.key}
                label={t(s.labelKey)}
                color={seriesColor(config, meta, s.key)}
                hidden={hidden.includes(s.key)}
                togglable={s.togglable}
                editing={editing === `s:${s.key}`}
                onToggleEdit={() => toggleEdit(`s:${s.key}`)}
                onToggleVisible={() => toggleChartSeries(chartId, s.key)}
                onColor={(c) => setChartSeriesColor(chartId, s.key, c)}
              />
            ))}
          </div>
        </div>

        {meta.perPointColors && points && points.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{t('Elementos')}</p>
            <div className="space-y-2">
              {points.map((name) => (
                <ConfigRow
                  key={name}
                  label={t(name)}
                  color={config?.pointColors?.[name] ?? '#94a3b8'}
                  hidden={hidden.includes(name)}
                  togglable
                  editing={editing === `p:${name}`}
                  onToggleEdit={() => toggleEdit(`p:${name}`)}
                  onToggleVisible={() => toggleChartSeries(chartId, name)}
                  onColor={(c) => setChartPointColor(chartId, name, c)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
          <button
            type="button"
            onClick={() => {
              resetChartConfig(chartId)
              setEditing(null)
            }}
            className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            {t('Restablecer colores')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t('Listo')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
