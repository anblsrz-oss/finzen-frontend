import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { AccountForm } from './AccountForm'
import { formatMoney } from '@/lib/format'

export function AccountsPage() {
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)

  const accountsQuery = useAccounts(userId)
  const deleteAccount = useDeleteAccount()

  // Consultar la vista account_balances para saldos actuales
  const balancesQuery = useQuery({
    queryKey: ['account_balances', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', userId)
      if (error) {
        console.error('Error cargando saldos:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
  })

  const accounts = accountsQuery.data || []
  const balances = balancesQuery.data || []

  const getBalance = (accountId: string) => {
    const balance = balances.find((b: any) => b.account_id === accountId)
    return balance?.current_balance ?? accounts.find(a => a.id === accountId)?.initial_balance ?? 0
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta cuenta?')) {
      deleteAccount.mutate({ id, userId: userId! })
    }
  }

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Tus cuentas y bancos, con saldo y rendimientos."
        actions={
          <PremiumGate count={accounts.length} limit={2}>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Agregar cuenta'}
            </Button>
          </PremiumGate>
        }
      />

      {showForm && <AccountForm onSuccess={() => setShowForm(false)} />}

      {accounts.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500">
            Sin cuentas. Crea una para empezar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acc) => {
            const balance = getBalance(acc.id)
            return (
              <Card key={acc.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{acc.name}</h3>
                  <p className="text-xs text-slate-500">
                    {acc.bank_name || 'Sin banco'} • {acc.type} • {acc.currency}
                  </p>
                  {acc.has_yield && (
                    <p className="mt-1 text-xs text-green-600">
                      📈 Rendimiento: {acc.yield_rate}% mensual
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-800">
                    {formatMoney(balance, acc.currency)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Se implementa en Fase 3"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleteAccount.isPending}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!profile?.is_premium && accounts.length >= 2 && (
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Plan gratis: máximo 2 cuentas. Actualiza a Premium para agregar más.
          </p>
        </Card>
      )}
    </>
  )
}
