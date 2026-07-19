import { useTranslation } from 'react-i18next'
import type { CardRow } from '@/types/db'

// Gradientes disponibles para las tarjetas (clave guardada en cards.color).
export const CARD_GRADIENTS: Record<string, string> = {
  blue: 'from-blue-600 to-indigo-800',
  purple: 'from-purple-600 to-fuchsia-800',
  emerald: 'from-emerald-600 to-teal-800',
  slate: 'from-slate-700 to-slate-900',
  rose: 'from-rose-600 to-pink-800',
  amber: 'from-amber-500 to-orange-700',
}

export const CARD_GRADIENT_KEYS = Object.keys(CARD_GRADIENTS)

// Gradiente por defecto según la marca cuando no se eligió color.
function defaultGradientKey(brand?: string | null): string {
  const b = (brand ?? '').toLowerCase()
  if (b.includes('visa')) return 'blue'
  if (b.includes('master')) return 'amber'
  if (b.includes('amex') || b.includes('american')) return 'emerald'
  if (b.includes('discover')) return 'rose'
  return 'slate'
}

export function gradientClass(card: Pick<CardRow, 'color' | 'brand'>): string {
  const key =
    card.color && CARD_GRADIENTS[card.color]
      ? card.color
      : defaultGradientKey(card.brand)
  return CARD_GRADIENTS[key]
}

interface CardVisualProps {
  card: CardRow
}

// Representación tipo tarjeta física: fondo degradado, chip, últimos 4 dígitos,
// nombre, marca y tipo.
export function CardVisual({ card }: CardVisualProps) {
  const { t } = useTranslation()
  return (
    <div
      className={`relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass(
        card,
      )} p-5 text-white shadow-lg`}
    >
      {/* Brillo decorativo */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />

      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide">{card.name}</span>
          {card.is_scholarship && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
              🎓 {card.scholarship_name || t('Beca')}
            </span>
          )}
        </div>
        <span className="text-xs font-medium uppercase opacity-90">
          {card.type === 'credit' ? t('Crédito') : t('Débito')}
        </span>
      </div>

      {/* Chip */}
      <div className="mt-5 h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-90" />

      {/* Número (solo últimos 4) */}
      <div className="mt-4 font-mono text-lg tracking-widest">
        •••• •••• •••• {card.last4 || '••••'}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="max-w-[60%] truncate text-xs uppercase tracking-wide opacity-90">
          {card.name}
        </span>
        <span className="text-lg font-bold italic">
          {card.brand || ''}
        </span>
      </div>
    </div>
  )
}
