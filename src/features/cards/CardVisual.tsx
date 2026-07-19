import { useTranslation } from 'react-i18next'
import type { CardRow } from '@/types/db'
import { CardNetworkLogo } from './CardNetworkLogo'

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
      )} p-5 text-white shadow-xl`}
    >
      {/* Brillo/arte decorativo: reflejos diagonales y círculos suaves */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/15" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide">{card.name}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {card.is_scholarship && (
              <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                🎓 {card.scholarship_name || t('Beca')}
              </span>
            )}
            {card.has_cashback && (
              <span className="inline-flex w-fit items-center rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-medium">
                💸 {t('Cashback')}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs font-medium uppercase opacity-90">
          {card.type === 'credit' ? t('Crédito') : t('Débito')}
        </span>
      </div>

      {/* Chip metálico + icono contactless */}
      <div className="relative mt-5 flex items-center gap-3">
        <div className="relative h-8 w-11 overflow-hidden rounded-md bg-gradient-to-br from-yellow-100 via-yellow-300 to-amber-500 shadow-inner">
          <div className="absolute inset-0 grid grid-cols-3 gap-px opacity-40">
            <div className="border-r border-amber-700/40" />
            <div className="border-x border-amber-700/40" />
            <div className="border-l border-amber-700/40" />
          </div>
          <div className="absolute inset-y-1/3 left-0 right-0 border-y border-amber-700/40" />
        </div>
        <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-80" fill="none" aria-hidden>
          <path
            d="M8 6c2.5 2 2.5 10 0 12M12 4c3.5 3 3.5 13 0 16M16 2c4.5 4 4.5 16 0 20"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Número (solo últimos 4) */}
      <div className="relative mt-4 font-mono text-lg tracking-widest [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
        •••• •••• •••• {card.last4 || '••••'}
      </div>

      <div className="relative mt-3 flex items-end justify-between">
        <span className="max-w-[55%] truncate text-xs uppercase tracking-wide opacity-90">
          {card.name}
        </span>
        <CardNetworkLogo brand={card.brand} />
      </div>
    </div>
  )
}
