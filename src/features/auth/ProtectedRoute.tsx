import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'

/**
 * Protege las rutas privadas. En la Fase 1 se conecta con el login real de Google.
 * Mientras no haya sesión, redirige a /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        {t('Cargando…')}
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
