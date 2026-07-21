import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardRow } from '@/types/db'
import { CardNetworkLogo } from './CardNetworkLogo'
import { isHexColor, isLightColor, darken } from '@/lib/colorUtils'
import { normalizeBrand } from '@/lib/cardBrands'

// Gradientes disponibles para las tarjetas (clave guardada en cards.color).
// Paleta amplia tipo Word: se recorren los tonos para poder elegir con detalle.
// Las claves originales (blue/purple/emerald/slate/rose/amber) se conservan
// para no romper las tarjetas ya guardadas.
export const CARD_GRADIENTS: Record<string, string> = {
  // Fríos
  sky: 'from-sky-500 to-blue-700',
  blue: 'from-blue-600 to-indigo-800',
  indigo: 'from-indigo-600 to-blue-900',
  navy: 'from-blue-900 to-slate-900',
  violet: 'from-violet-600 to-purple-900',
  purple: 'from-purple-600 to-fuchsia-800',
  fuchsia: 'from-fuchsia-500 to-purple-800',
  pink: 'from-pink-500 to-fuchsia-700',
  // Cálidos
  rose: 'from-rose-600 to-pink-800',
  red: 'from-red-500 to-rose-800',
  orange: 'from-orange-500 to-red-700',
  amber: 'from-amber-500 to-orange-700',
  yellow: 'from-yellow-400 to-amber-600',
  gold: 'from-yellow-600 to-amber-800',
  lime: 'from-lime-500 to-green-700',
  green: 'from-green-500 to-emerald-800',
  // Verdes/neutros
  emerald: 'from-emerald-600 to-teal-800',
  teal: 'from-teal-500 to-emerald-800',
  cyan: 'from-cyan-500 to-teal-700',
  slate: 'from-slate-700 to-slate-900',
  gray: 'from-gray-600 to-gray-900',
  zinc: 'from-zinc-600 to-zinc-900',
  stone: 'from-stone-600 to-stone-900',
  black: 'from-neutral-800 to-black',
  // Claros (llevan texto oscuro, ver LIGHT_GRADIENT_KEYS)
  white: 'from-white to-slate-200',
  silver: 'from-slate-200 to-slate-400',
}

// Gradientes claros: encima de ellos el texto blanco no se leería.
const LIGHT_GRADIENT_KEYS = new Set(['white', 'silver'])

export const CARD_GRADIENT_KEYS = Object.keys(CARD_GRADIENTS)

// Gradiente por defecto cuando no se eligió color. Las virtuales no tienen
// marca de la que derivarlo, así que estrenan uno propio.
function defaultGradientKey(card: Pick<CardRow, 'brand' | 'card_format'>): string {
  if (card.card_format === 'virtual') return 'violet'
  switch (normalizeBrand(card.brand)) {
    case 'visa':
      return 'blue'
    case 'mastercard':
      return 'amber'
    case 'amex':
      return 'emerald'
    case 'discover':
      return 'rose'
    default:
      return 'slate'
  }
}

type CardSurfaceInput = Pick<CardRow, 'color' | 'brand'> &
  Partial<Pick<CardRow, 'card_format'>>

export function gradientClass(card: CardSurfaceInput): string {
  const key =
    card.color && CARD_GRADIENTS[card.color]
      ? card.color
      : defaultGradientKey({ brand: card.brand, card_format: card.card_format ?? 'physical' })
  return CARD_GRADIENTS[key]
}

// Fondo de la tarjeta. `cards.color` guarda o bien una clave de gradiente
// ('blue', 'white'…) o bien un color personalizado en hex ('#ff8800'), del que
// se deriva un degradado. El texto se aclara u oscurece según el fondo para
// que siempre se lea.
export function cardSurface(card: CardSurfaceInput): {
  className: string
  style?: CSSProperties
  light: boolean
} {
  if (isHexColor(card.color ?? '')) {
    const hex = card.color!.trim()
    return {
      className: '',
      style: {
        backgroundImage: `linear-gradient(to bottom right, ${hex}, ${darken(hex, 0.35)})`,
      },
      light: isLightColor(hex),
    }
  }
  const key =
    card.color && CARD_GRADIENTS[card.color]
      ? card.color
      : defaultGradientKey({ brand: card.brand, card_format: card.card_format ?? 'physical' })
  return {
    className: `bg-gradient-to-br ${CARD_GRADIENTS[key]}`,
    light: LIGHT_GRADIENT_KEYS.has(key),
  }
}

interface CardVisualProps {
  card: CardRow
}

// Representación tipo tarjeta física: fondo degradado, chip, últimos 4 dígitos,
// nombre, marca y tipo.
export function CardVisual({ card }: CardVisualProps) {
  const { t } = useTranslation()
  const surface = cardSurface(card)
  // Sobre fondos claros el texto blanco no se lee: se usa oscuro.
  const textClass = surface.light ? 'text-slate-900' : 'text-white'
  const overlay = surface.light ? 'bg-black/5' : 'bg-white/10'
  const badgeBg = surface.light ? 'bg-black/10' : 'bg-white/20'

  return (
    <div
      className={`relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-2xl ${surface.className} p-5 ${textClass} shadow-xl`}
      style={surface.style}
    >
      {/* Brillo/arte decorativo: reflejos diagonales y círculos suaves */}
      <div
        className={`pointer-events-none absolute inset-0 ${
          surface.light
            ? 'bg-gradient-to-tr from-black/0 via-black/[0.03] to-black/10'
            : 'bg-gradient-to-tr from-white/0 via-white/5 to-white/15'
        }`}
      />
      <div className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full ${overlay}`} />
      <div className={`pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full ${overlay}`} />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide">{card.name}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {card.is_scholarship && (
              <span className={`inline-flex w-fit items-center rounded-full ${badgeBg} px-2 py-0.5 text-[10px] font-medium`}>
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
          {card.type === 'credit'
            ? t('Crédito')
            : card.type === 'voucher'
              ? t('Vales')
              : t('Débito')}
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
            stroke="currentColor"
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
        <CardNetworkLogo brand={card.brand} cardFormat={card.card_format} />
      </div>
    </div>
  )
}
