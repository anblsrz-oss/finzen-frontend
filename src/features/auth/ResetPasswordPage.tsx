import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'

// Página a la que llega el enlace de "restablecer contraseña". Supabase deja
// una sesión de recuperación al abrir el enlace (evento PASSWORD_RECOVERY).
// Aquí se pide la nueva contraseña y se guarda con updateUser.
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Confirmar que llegamos con una sesión de recuperación válida.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit() {
    if (password.length < 6) {
      setError(t('La contraseña debe tener al menos 6 caracteres.'))
      return
    }
    if (password !== confirm) {
      setError(t('Las contraseñas no coinciden.'))
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <Card className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t('Nueva contraseña')}
        </h1>

        {done ? (
          <p className="mt-4 text-sm text-brand-700 dark:text-brand-500">
            {t('¡Listo! Tu contraseña se actualizó. Entrando…')}
          </p>
        ) : !ready ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t('Abre esta página desde el enlace que te enviamos por correo.')}
          </p>
        ) : (
          <div className="mt-5 space-y-3 text-left">
            <Input
              type="password"
              label={t('Nueva contraseña')}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              label={t('Confirmar contraseña')}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit()
              }}
            />
            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? t('Guardando…') : t('Guardar contraseña')}
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-4">
          <Link to="/login" className="text-xs text-slate-400 dark:text-slate-500 underline">
            {t('← Ir a iniciar sesión')}
          </Link>
        </div>
      </Card>
    </div>
  )
}
