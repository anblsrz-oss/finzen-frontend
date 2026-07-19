import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/store/useAuth'
import { useListUsers, useSetUserPremium, useSetUserAdmin } from '@/hooks/useAdmin'
import { useAppConfig, useUpdateAppConfig } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { AppConfigRow } from '@/types/db'

// Editor de límites del plan gratis y de qué funciones son premium.
function ConfigEditor() {
  const { t } = useTranslation()
  const { data: config } = useAppConfig()
  const updateConfig = useUpdateAppConfig()
  const [form, setForm] = useState<AppConfigRow | null>(null)

  useEffect(() => {
    if (config) setForm(config)
  }, [config])

  if (!form) return null

  const setNum = (key: keyof AppConfigRow) => (v: string) =>
    setForm({ ...form, [key]: Math.max(0, parseInt(v, 10) || 0) })
  const setBool = (key: keyof AppConfigRow) => (v: boolean) =>
    setForm({ ...form, [key]: v })

  const FEATURES: { key: keyof AppConfigRow; label: string }[] = [
    { key: 'family_is_premium', label: t('Plan familiar') },
    { key: 'yields_is_premium', label: t('Rendimientos') },
    { key: 'installments_is_premium', label: t('Meses sin intereses / diferido') },
    { key: 'reports_filters_is_premium', label: t('Filtros de reportes') },
  ]

  return (
    <Card className="mb-6">
      <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
        ⚙️ {t('Planes y límites')}
      </p>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {t('Define los límites del plan gratis (0 = ilimitado) y qué funciones requieren Premium.')}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t('Máx. cuentas (gratis)')}
          type="number"
          min="0"
          value={form.free_max_accounts}
          onChange={(e) => setNum('free_max_accounts')(e.target.value)}
        />
        <Input
          label={t('Máx. tarjetas (gratis)')}
          type="number"
          min="0"
          value={form.free_max_cards}
          onChange={(e) => setNum('free_max_cards')(e.target.value)}
        />
        <Input
          label={t('Máx. transacciones (gratis)')}
          type="number"
          min="0"
          value={form.free_max_transactions}
          onChange={(e) => setNum('free_max_transactions')(e.target.value)}
        />
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {t('Funciones que requieren Premium')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={!!form[f.key]}
              onChange={(e) => setBool(f.key)(e.target.checked)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          disabled={updateConfig.isPending}
          onClick={() =>
            updateConfig.mutate(
              {
                free_max_accounts: form.free_max_accounts,
                free_max_cards: form.free_max_cards,
                free_max_transactions: form.free_max_transactions,
                family_is_premium: form.family_is_premium,
                yields_is_premium: form.yields_is_premium,
                installments_is_premium: form.installments_is_premium,
                reports_filters_is_premium: form.reports_filters_is_premium,
              },
              { onError: (e: any) => alert(`${t('Error:')} ${e.message}`) },
            )
          }
        >
          {updateConfig.isPending ? t('Guardando…') : t('Guardar configuración')}
        </Button>
        {updateConfig.isSuccess && (
          <span className="text-xs text-green-600 dark:text-green-400">{t('Guardado ✓')}</span>
        )}
      </div>
    </Card>
  )
}

export function AdminPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const currentUserId = session?.user?.id
  const queryClient = useQueryClient()
  const { data: users, isLoading, error } = useListUsers()
  const { mutate: setPremium, isPending } = useSetUserPremium()
  const { mutate: setAdmin, isPending: isAdminPending } = useSetUserAdmin()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const refreshUsers = () =>
    queryClient.invalidateQueries({ queryKey: ['list_users'] })

  const handleTogglePremium = (userId: string, currentPremium: boolean) => {
    setLoadingId(userId)
    setPremium(
      { userId, isPremium: !currentPremium },
      {
        onSuccess: () => {
          refreshUsers()
          setLoadingId(null)
        },
        onError: (e: any) => {
          alert(`${t('Error:')} ${e.message}`)
          setLoadingId(null)
        },
      },
    )
  }

  const handleToggleAdmin = (userId: string, currentAdmin: boolean) => {
    setLoadingId(userId)
    setAdmin(
      { userId, isAdmin: !currentAdmin },
      {
        onSuccess: () => {
          refreshUsers()
          setLoadingId(null)
        },
        onError: (e: any) => {
          alert(`${t('Error:')} ${e.message}`)
          setLoadingId(null)
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title={t('Panel Admin')}
        subtitle={t('Gestiona usuarios y sus permisos de premium.')}
      />

      <ConfigEditor />

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-800">
            {t('Error:')} {error instanceof Error ? error.message : t('Error desconocido')}
          </p>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="py-8 text-center text-slate-500 dark:text-slate-400">{t('Cargando usuarios...')}</p>
        ) : !users || users.length === 0 ? (
          <p className="py-8 text-center text-slate-500 dark:text-slate-400">{t('Sin usuarios.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                    {t('Email')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                    {t('Nombre')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                    {t('Estado')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">
                    {t('Acciones')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {user.is_premium && (
                          <Badge className="bg-green-100 text-green-800">Premium</Badge>
                        )}
                        {user.is_admin && (
                          <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800">Admin</Badge>
                        )}
                        {!user.is_premium && !user.is_admin && (
                          <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100">{t('Gratis')}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={user.is_premium ? 'danger' : 'primary'}
                          onClick={() => handleTogglePremium(user.id, user.is_premium)}
                          disabled={isPending || isAdminPending || loadingId === user.id}
                        >
                          {loadingId === user.id ? t('Actualizando...') : user.is_premium ? t('Quitar Premium') : t('Dar Premium')}
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_admin ? 'danger' : 'secondary'}
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          disabled={
                            isPending ||
                            isAdminPending ||
                            loadingId === user.id ||
                            (user.id === currentUserId && user.is_admin)
                          }
                          title={
                            user.id === currentUserId && user.is_admin
                              ? t('No puedes quitarte admin a ti mismo')
                              : undefined
                          }
                        >
                          {user.is_admin ? t('Quitar Admin') : t('Hacer Admin')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
