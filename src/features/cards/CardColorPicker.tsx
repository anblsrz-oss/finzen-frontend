import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/store/useSettings'
import { isHexColor, parseHex, toHex, darken } from '@/lib/colorUtils'
import { CARD_GRADIENTS, CARD_GRADIENT_KEYS } from './CardVisual'

interface CardColorPickerProps {
  value?: string | null
  onChange: (color: string) => void
}

// Muestra de color: para una clave usa el gradiente de Tailwind; para un hex
// personalizado, un degradado equivalente en línea.
function swatchProps(color: string) {
  if (isHexColor(color)) {
    return {
      className: '',
      style: {
        backgroundImage: `linear-gradient(to bottom right, ${color}, ${darken(color, 0.35)})`,
      },
    }
  }
  return { className: `bg-gradient-to-br ${CARD_GRADIENTS[color] ?? ''}`, style: undefined }
}

// Selector de color de tarjeta: presets + colores guardados por el usuario +
// un panel "Más colores" para elegir por rueda/RGB/hex (estilo Office).
export function CardColorPicker({ value, onChange }: CardColorPickerProps) {
  const { t } = useTranslation()
  const savedCardColors = useSettings((s) => s.savedCardColors)
  const addSavedCardColor = useSettings((s) => s.addSavedCardColor)
  const removeSavedCardColor = useSettings((s) => s.removeSavedCardColor)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('#3b82f6')

  const [r, g, b] = parseHex(isHexColor(draft) ? draft : '#3b82f6')

  const setChannel = (i: 0 | 1 | 2, raw: string) => {
    const n = Math.max(0, Math.min(255, parseInt(raw, 10) || 0))
    const rgb: [number, number, number] = [r, g, b]
    rgb[i] = n
    setDraft(toHex(rgb))
  }

  const Swatch = ({ color, onRemove }: { color: string; onRemove?: () => void }) => {
    const p = swatchProps(color)
    const selected = value === color
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => onChange(color)}
          title={color}
          aria-label={color}
          className={`h-8 w-8 rounded-md border border-black/10 transition-transform ${p.className} ${
            selected
              ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900'
              : 'hover:scale-110'
          }`}
          style={p.style}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title={t('Quitar')}
            className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] leading-none text-white group-hover:flex"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('Color de la tarjeta')}
      </label>

      <div className="space-y-3 rounded-lg border border-slate-300 dark:border-slate-600 p-3">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {CARD_GRADIENT_KEYS.map((key) => (
            <Swatch key={key} color={key} />
          ))}
        </div>

        {/* Guardados por el usuario */}
        {savedCardColors.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('Guardados')}
            </p>
            <div className="flex flex-wrap gap-2">
              {savedCardColors.map((c) => (
                <Swatch key={c} color={c} onRemove={() => removeSavedCardColor(c)} />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-brand-700 dark:text-brand-500 underline"
        >
          {open ? t('Cerrar') : t('Más colores…')}
        </button>

        {/* Panel personalizado: rueda del sistema + RGB + hex */}
        {open && (
          <div className="space-y-3 rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-300">
                  {t('Elegir')}
                </label>
                <input
                  type="color"
                  value={isHexColor(draft) ? draft : '#3b82f6'}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
              {(['R', 'G', 'B'] as const).map((label, i) => (
                <div key={label}>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-300">
                    {label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={[r, g, b][i]}
                    onChange={(e) => setChannel(i as 0 | 1 | 2, e.target.value)}
                    className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-300">
                  {t('Hex')}
                </label>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="#3b82f6"
                  className={`w-24 rounded-lg border bg-white dark:bg-slate-800 px-2 py-1.5 font-mono text-sm ${
                    isHexColor(draft)
                      ? 'border-slate-300 dark:border-slate-600'
                      : 'border-red-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('Vista previa')}
              </span>
              <div
                className="h-8 w-16 rounded-md border border-black/10"
                style={
                  isHexColor(draft)
                    ? {
                        backgroundImage: `linear-gradient(to bottom right, ${draft}, ${darken(draft, 0.35)})`,
                      }
                    : undefined
                }
              />
              <button
                type="button"
                disabled={!isHexColor(draft)}
                onClick={() => {
                  const v = draft.toLowerCase()
                  addSavedCardColor(v)
                  onChange(v)
                  setOpen(false)
                }}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {t('Usar y guardar')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
