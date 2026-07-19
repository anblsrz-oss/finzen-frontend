import { useTranslation } from 'react-i18next'

// Galería curada de emojis para categorías (sin librería externa: solo un array
// estático para no inflar el bundle). Agrupada por tema relevante a finanzas.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Dinero',
    emojis: ['💰', '💵', '💳', '🏦', '📈', '📉', '🪙', '💱', '🧾', '💸', '🏧', '📊'],
  },
  {
    label: 'Comida',
    emojis: ['🍔', '🍕', '🍽️', '☕', '🍺', '🛒', '🥑', '🍎', '🍞', '🥩', '🍣', '🍦'],
  },
  {
    label: 'Transporte',
    emojis: ['🚗', '⛽', '🚕', '🚌', '🚇', '✈️', '🚲', '🛵', '🅿️', '🚙', '🛣️', '🚏'],
  },
  {
    label: 'Hogar',
    emojis: ['🏠', '🔌', '💡', '🚿', '🛋️', '🧹', '🪑', '🧺', '🔧', '📶', '🚰', '🗑️'],
  },
  {
    label: 'Salud',
    emojis: ['🏥', '💊', '🩺', '🦷', '🏋️', '🧘', '👓', '🧴', '🩹', '❤️', '🧠', '🩸'],
  },
  {
    label: 'Ocio',
    emojis: ['🎬', '🎮', '📺', '🎵', '🎧', '📚', '✈️', '🏖️', '🎟️', '🎨', '⚽', '🎁'],
  },
  {
    label: 'Compras',
    emojis: ['🛍️', '👕', '👟', '💄', '🧢', '⌚', '📱', '💻', '🎒', '🕶️', '💍', '🧸'],
  },
  {
    label: 'Trabajo/Estudio',
    emojis: ['💼', '🧑‍💻', '🎓', '✏️', '📎', '🖨️', '📅', '🗂️', '🔬', '🏢', '📖', '🎒'],
  },
  {
    label: 'Otros',
    emojis: ['🐶', '🎓', '🎉', '🌱', '🔒', '⭐', '❓', '➕', '➖', '🔁', '💝', '🧩'],
  },
]

interface EmojiPickerProps {
  value?: string
  onChange: (emoji: string) => void
  label?: string
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const { t } = useTranslation()
  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label} {value && <span className="text-lg">{value}</span>}
        </label>
      )}
      <div className="max-h-44 space-y-3 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">
              {t(group.label)}
            </p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onChange(emoji)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors ${
                    value === emoji
                      ? 'bg-brand-100 dark:bg-brand-800/60 ring-2 ring-brand-500'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
