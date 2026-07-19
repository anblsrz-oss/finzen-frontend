import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'

interface PremiumGateProps {
  count: number
  limit: number
  children: ReactNode
  lockedTooltip?: string
}

/**
 * Bloquea elementos si el usuario no es premium y alcanzó el límite.
 * Usado para botones "Agregar" en gratis (límite = 2).
 */
export function PremiumGate({
  count,
  limit,
  children,
  lockedTooltip,
}: PremiumGateProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const tooltip =
    lockedTooltip ?? t('Plan gratis: máximo 2. Actualiza a Premium para más.')

  const isLocked = !profile?.is_premium && count >= limit

  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div
      title={tooltip}
      className="inline-block cursor-not-allowed opacity-50 [&>*]:pointer-events-none"
    >
      {children}
    </div>
  )
}
