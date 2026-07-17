import { useState } from 'react'
import { useListUsers, useSetUserPremium } from '@/hooks/useAdmin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function AdminPage() {
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
        title="Panel Admin"
        subtitle="Gestiona usuarios y sus permisos de premium."
      />

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-800">
            Error: {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="py-8 text-center text-slate-500">Cargando usuarios...</p>
        ) : !users || users.length === 0 ? (
          <p className="py-8 text-center text-slate-500">Sin usuarios.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {user.is_premium && (
                          <Badge className="bg-green-100 text-green-800">Premium</Badge>
                        )}
                        {user.is_admin && (
                          <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
                        )}
                        {!user.is_premium && !user.is_admin && (
                          <Badge className="bg-slate-100 text-slate-800">Gratis</Badge>
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
                        {loadingId === user.id ? 'Actualizando...' : user.is_premium ? 'Quitar Premium' : 'Dar Premium'}
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
