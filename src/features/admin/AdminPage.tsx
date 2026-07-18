import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useListUsers, useSetUserPremium } from '@/hooks/useAdmin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function AdminPage() {
  const { t } = useTranslation()
  const { data: users, isLoading, error } = useListUsers()
  const { mutate: setPremium, isPending } = useSetUserPremium()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleTogglePremium = (userId: string, currentPremium: boolean) => {
    setLoadingId(userId)
    setPremium(
      { userId, isPremium: !currentPremium },
      {
        onSuccess: () => {
          setLoadingId(null)
        },
        onError: () => {
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
                      <Button
                        size="sm"
                        variant={user.is_premium ? 'danger' : 'primary'}
                        onClick={() => handleTogglePremium(user.id, user.is_premium)}
                        disabled={isPending || loadingId === user.id}
                      >
                        {loadingId === user.id ? t('Actualizando...') : user.is_premium ? t('Quitar Premium') : t('Dar Premium')}
                      </Button>
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
