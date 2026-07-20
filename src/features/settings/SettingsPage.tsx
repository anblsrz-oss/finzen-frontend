import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useSettings, type ThemePref, type LanguagePref } from '@/store/useSettings'
import { useMyFamilies, useMyInvitations } from '@/hooks/useFamily'
import { useStartCheckout, useOpenBillingPortal } from '@/hooks/useBilling'
import { useUpdateMainCurrency } from '@/hooks/useProfile'
import { useEntitlements } from '@/hooks/useAppConfig'
import { CURRENCIES } from '@/lib/format'
import { PhoneSection } from './PhoneSection'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Oscuro', icon: '🌙' },
  { value: 'system', label: 'Sistema', icon: '🖥️' },
]

const LANGUAGE_OPTIONS: { value: LanguagePref; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export function SettingsPage() {
  const { t } = useTranslation()
  const { session, profile, signOut } = useAuth()
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const showAccountsTotal = useSettings((s) => s.showAccountsTotal)
  const setShowAccountsTotal = useSettings((s) => s.setShowAccountsTotal)

  const userId = session?.user?.id
  const email = session?.user?.email ?? profile?.email
  const { data: families = [] } = useMyFamilies(userId)
  const { data: invitations = [] } = useMyInvitations(email)
  const family = families[0]

  const startCheckout = useStartCheckout()
  const openPortal = useOpenBillingPortal()
  const updateMainCurrency = useUpdateMainCurrency()
  const mainCurrency = profile?.main_currency ?? 'MXN'
  const { canUseFamily } = useEntitlements()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('Configuración')}
        subtitle={t('Tu cuenta y preferencias')}
      />

      <div className="grid gap-4">
        {/* Perfil */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            👤 {t('Perfil')}
          </p>
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xl">
                👤
              </span>
            )}
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {profile?.full_name ?? t('Usuario')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile?.email}
              </p>
            </div>
            {profile?.is_premium && (
              <Badge className="ml-auto bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                Premium
              </Badge>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {t('El nombre y la foto vienen de tu cuenta de Google.')}
          </p>
        </Card>

        {/* Apariencia */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            🎨 {t('Apariencia')}
          </p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  theme === opt.value
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                {t(opt.label)}
              </button>
            ))}
          </div>
        </Card>

        {/* Idioma */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            🌐 {t('Idioma')}
          </p>
          <div className="flex gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  language === opt.value
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Privacidad / visibilidad */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            👁️ {t('Visibilidad')}
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 cursor-pointer"
              checked={showAccountsTotal}
              onChange={(e) => setShowAccountsTotal(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {t('Mostrar total de cuentas')}
              <span className="block text-xs text-slate-400 dark:text-slate-500">
                {t('El apartado con la suma de todas tus cuentas, arriba del listado.')}
              </span>
            </span>
          </label>
        </Card>

        {/* Moneda principal */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            💱 {t('Moneda principal')}
          </p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {t('Tu balance y reportes se muestran en esta moneda. Los movimientos en otra moneda se convierten con el tipo de cambio.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((cur) => (
              <button
                key={cur}
                type="button"
                disabled={updateMainCurrency.isPending}
                onClick={() => {
                  if (userId && cur !== mainCurrency) {
                    updateMainCurrency.mutate(
                      { userId, mainCurrency: cur },
                      { onError: (e: any) => alert(`${t('Error:')} ${e.message}`) },
                    )
                  }
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  mainCurrency === cur
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </Card>

        {/* Teléfono */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            📱 {t('Teléfono')}
          </p>
          <PhoneSection />
        </Card>

        {/* Suscripción */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            ⭐ {t('Suscripción')}
          </p>
          {profile?.is_premium ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  Premium
                </Badge>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('Tienes acceso a todas las funciones.')}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={openPortal.isPending}
                onClick={() =>
                  openPortal.mutate(undefined, {
                    onError: (e: any) => alert(`${t('Error:')} ${e.message}`),
                  })
                }
              >
                {t('Gestionar suscripción')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('Plan gratuito. Premium desbloquea plan familiar, MSI/diferidos y rendimientos.')}
              </p>
              <Button
                className="self-start"
                disabled={startCheckout.isPending}
                onClick={() =>
                  startCheckout.mutate(undefined, {
                    onError: (e: any) => alert(`${t('Error:')} ${e.message}`),
                  })
                }
              >
                {startCheckout.isPending ? t('Abriendo…') : t('Hacerse Premium')}
              </Button>
            </div>
          )}
        </Card>

        {/* Familia */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            👨‍👩‍👧‍👦 {t('Plan familiar')}
          </p>
          {invitations.length > 0 && (
            <p className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-sm text-amber-700 dark:text-amber-300">
              {t('Tienes {{count}} invitación(es) pendiente(s).', {
                count: invitations.length,
              })}
            </p>
          )}
          {family ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {family.name}{' '}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {family.owner_id === userId
                    ? t('(eres el jefe de familia)')
                    : t('(miembro)')}
                </span>
              </p>
              <Link to="/familia">
                <Button size="sm" variant="secondary">
                  {t('Ver familia')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('No participas en ningún plan familiar.')}
                {!canUseFamily && ' ' + t('Crearlo requiere Premium.')}
              </p>
              <Link to="/familia">
                <Button size="sm" variant="secondary">
                  {canUseFamily
                    ? t('Crear plan familiar')
                    : t('Saber más')}
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Sesión */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              🚪 {t('Sesión')}
            </p>
            <Button variant="danger" size="sm" onClick={() => signOut()}>
              {t('Cerrar sesión')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
