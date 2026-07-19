import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/store/useAuth'
import { useSettings } from '@/store/useSettings'
import { useSendFeedback } from '@/hooks/useFeedback'
import { APK_URL } from '@/lib/appUpdate'

// Página pública de bienvenida (pre-login). Presenta la app, permite iniciar
// sesión / crear cuenta, cambiar de idioma, descargar la app y enviar
// comentarios. Sin sección de precios/premium por ahora.

function LanguageToggle() {
  const { language, setLanguage } = useSettings()
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 text-xs">
      {(['es', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setLanguage(lng)}
          className={`px-3 py-1.5 font-medium transition-colors ${
            language === lng
              ? 'bg-brand-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function FeedbackForm() {
  const { t } = useTranslation()
  const sendFeedback = useSendFeedback()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  if (sendFeedback.isSuccess) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 text-sm text-green-800 dark:text-green-300">
          {t('¡Gracias! Recibimos tu comentario.')}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!message.trim()) return
        sendFeedback.mutate({ name, email, message })
      }}
      className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder={t('Tu nombre (opcional)')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder={t('Tu correo (opcional)')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <textarea
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        rows={4}
        placeholder={t('¿Qué te gustaría mejorar o agregar?')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {sendFeedback.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {t('No se pudo enviar. Intenta más tarde.')}
        </p>
      )}
      <Button type="submit" disabled={sendFeedback.isPending || !message.trim()}>
        {sendFeedback.isPending ? t('Enviando…') : t('Enviar comentario')}
      </Button>
    </form>
  )
}

export function LandingPage() {
  const { t } = useTranslation()
  const { session } = useAuth()

  // Si ya hay sesión, la landing no aplica: al panel.
  if (session) return <Navigate to="/" replace />

  const steps = [
    { icon: '🔗', title: t('Conecta tus cuentas'), text: t('Registra cuentas y tarjetas, o sincroniza tus movimientos desde el correo.') },
    { icon: '🧾', title: t('Captura sin esfuerzo'), text: t('Escanea tickets y facturas con la cámara o sube un PDF; FinZen extrae los datos.') },
    { icon: '📊', title: t('Entiende tu dinero'), text: t('Mira tu balance, gastos por categoría y reportes claros en un solo lugar.') },
  ]

  const features = [
    { icon: '🏦', title: t('Cuentas y tarjetas'), text: t('Controla saldos, límites y fechas de corte.') },
    { icon: '📷', title: t('Recibos con OCR'), text: t('Foto o PDF del ticket y listo.') },
    { icon: '📧', title: t('Sincronización por correo'), text: t('Importa cargos desde tus notificaciones.') },
    { icon: '👨‍👩‍👧', title: t('Plan familiar'), text: t('Comparte tarjetas y gastos con tu familia.') },
    { icon: '🌎', title: t('Multi-moneda'), text: t('Registra en varias monedas.') },
    { icon: '🌙', title: t('Modo oscuro e idiomas'), text: t('Español e inglés, claro y oscuro.') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Barra superior */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span>💰</span> FinZen
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link to="/login">
            <Button variant="secondary" size="sm">
              {t('Iniciar sesión')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-10 pb-16 text-center">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          {t('Tus finanzas personales, claras y en un solo lugar.')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
          {t('Organiza ingresos, gastos, cuentas y tarjetas. Escanea recibos y entiende a dónde va tu dinero.')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg">{t('Crear cuenta gratis')}</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              {t('Ya tengo cuenta')}
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {t('Todas las funciones gratuitas por el momento.')}
        </p>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold">{t('Cómo funciona')}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center shadow-sm"
            >
              <div className="text-4xl">{s.icon}</div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Características */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold">{t('Todo lo que necesitas')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm"
            >
              <span className="text-2xl">{f.icon}</span>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Descargar app */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl bg-brand-600 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold">{t('Llévala en tu celular')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            {t('Instálala como app desde tu navegador, o descarga el APK para Android.')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary">
                ⬇️ {t('Descargar app (Android)')}
              </Button>
            </a>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                {t('Empezar ahora')}
              </Button>
            </Link>
          </div>
          <p className="mx-auto mt-3 max-w-md text-xs text-white/70">
            {t('En Android, permite instalar apps de orígenes desconocidos al abrir el archivo.')}
          </p>
        </div>
      </section>

      {/* Comentarios */}
      <section className="mx-auto max-w-2xl px-6 py-12">
        <h2 className="mb-2 text-center text-2xl font-bold">{t('¿Ideas para mejorar?')}</h2>
        <p className="mb-6 text-center text-sm text-slate-600 dark:text-slate-300">
          {t('Cuéntanos qué te gustaría ver en FinZen. Leemos todos los comentarios.')}
        </p>
        <FeedbackForm />
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>© {t('FinZen — Finanzas personales.')}</p>
      </footer>
    </div>
  )
}
