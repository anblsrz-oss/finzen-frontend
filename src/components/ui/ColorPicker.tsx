import { CATEGORY_COLORS } from '@/lib/categoryColors'

interface ColorPickerProps {
  value?: string | null
  onChange: (color: string) => void
  label?: string
  // Colores a mostrar (por defecto la paleta de categorías).
  colors?: readonly string[]
}

// Selector de color por muestras (swatches). Reutilizable para categorías y
// para la personalización de colores en gráficas.
export function ColorPicker({ value, onChange, label, colors = CATEGORY_COLORS }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={color}
            className={`h-8 w-8 rounded-full transition-transform ${
              value === color
                ? 'ring-2 ring-offset-2 ring-slate-500 dark:ring-offset-slate-900'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  )
}
