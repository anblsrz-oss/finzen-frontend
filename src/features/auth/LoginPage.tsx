import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { signInWithGoogle } from '@/lib/nativeAuth'
import { useAuth } from '@/store/useAuth'

// Login con dos opciones:
// - Google (OAuth, adaptado a web/nativo en nativeAuth).
// - Código de 6 dígitos a cualquier correo (Outlook, etc.) vía Supabase Auth
//   OTP: signInWithOtp -> verifyOtp. shouldCreateUser=true, así el mismo flujo
//   sirve para "iniciar sesión" y "crear cuenta".

type Step = 'email' | 'code'

export function LoginPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Si ya hay sesión (p. ej. tras verificar el código), salir del login.
  if (session) return <Navigate to="/" replace />

  async function sendCode() {
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setError(t('Escribe tu correo.'))
      return
    }
    setLoading(true)
    setError(null)
    setInfo(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setEmail(normalized)
    setStep('code')
    setInfo(t('Te enviamos un código de 6 dígitos a {{email}}.', { email: normalized }))
  }

  async function verifyCode() {
    const token = code.trim()
    if (token.length < 6) {
      setError(t('El código tiene 6 dígitos.'))
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError(t('Código incorrecto o expirado. Intenta de nuevo.'))
      return
    }
    // onAuthStateChange (useAuth) cargará la sesión y el <Navigate> de arriba
    // redirige al panel.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <Card className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">💰</div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">FinZen</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('Organiza tus ingresos, gastos y cuentas en un solo lugar.')}
        </p>

        <Button className="mt-6 w-full" onClick={signInWithGoogle}>
          {t('Continuar con Google')}
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 dark:text-slate-500">{t('o con tu correo')}</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {step === 'email' ? (
          <div className="space-y-3 text-left">
            <Input
              type="email"
              autoComplete="email"
              placeholder={t('tucorreo@ejemplo.com')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendCode()
              }}
            />
            <Button className="w-full" onClick={sendCode} disabled={loading}>
              {loading ? t('Enviando…') : t('Enviar código')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void verifyCode()
              }}
            />
            <Button className="w-full" onClick={verifyCode} disabled={loading}>
              {loading ? t('Verificando…') : t('Verificar y entrar')}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-slate-400 dark:text-slate-500 underline"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
                setInfo(null)
              }}
            >
              {t('Usar otro correo')}
            </button>
          </div>
        )}

        {info && <p className="mt-3 text-xs text-brand-700 dark:text-brand-500">{info}</p>}
        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-4">
          <Link
            to="/bienvenida"
            className="text-xs text-slate-400 dark:text-slate-500 underline"
          >
            {t('← Volver al inicio')}
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {t('Al continuar aceptas el manejo de tus datos según la política de privacidad.')}
        </p>
      </Card>
    </div>
  )
}
