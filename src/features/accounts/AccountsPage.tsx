import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { useEntitlements } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { AccountForm } from './AccountForm'
import { formatMoney } from '@/lib/format'
import type { AccountRow } from '@/types/db'

export function AccountsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null)

  const accountsQuery = useAccounts(userId)
  const deleteAccount = useDeleteAccount()
  const { accountLimit } = useEntitlements()

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
    if (confirm(t('¿Eliminar esta cuenta?'))) {
      deleteAccount.mutate({ id, userId: userId! })
    }
  }

  return (
    <>
      <PageHeader
        title={t('Cuentas')}
        subtitle={t('Tus cuentas y bancos, con saldo y rendimientos.')}
        actions={
          <PremiumGate
            count={accounts.length}
            limit={accountLimit}
            lockedTooltip={t('Plan gratis: máximo {{n}} cuentas. Actualiza a Premium para agregar más.', { n: accountLimit })}
          >
            <Button
              onClick={() => {
                setEditingAccount(null)
                setShowForm(!showForm)
              }}
            >
              {showForm ? t('Cancelar') : t('+ Agregar cuenta')}
            </Button>
          </PremiumGate>
        }
      />

      {showForm && !editingAccount && (
        <AccountForm onSuccess={() => setShowForm(false)} />
      )}

      {editingAccount && (
        <AccountForm
          account={editingAccount}
          onSuccess={() => setEditingAccount(null)}
          onCancel={() => setEditingAccount(null)}
        />
      )}

      {accounts.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin cuentas. Crea una para empezar.')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acc) => {
            const balance = getBalance(acc.id)
            return (
              <Card key={acc.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    {acc.name}
                    {acc.is_scholarship && (
                      <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                        🎓 {acc.scholarship_name || t('Beca')}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {acc.bank_name || t('Sin banco')} • {acc.type} • {acc.currency}
                  </p>
                  {acc.has_yield && (
                    <p className="mt-1 text-xs text-green-600">
                      📈 {t('Rendimiento:')} {acc.yield_rate}% {t('mensual')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {formatMoney(balance, acc.currency)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowForm(false)
                        setEditingAccount(acc)
                      }}
                    >
                      {t('Editar')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleteAccount.isPending}
                    >
                      {t('Eliminar')}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!profile?.is_premium && accountLimit !== Infinity && accounts.length >= accountLimit && (
        <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('Plan gratis: máximo {{n}} cuentas. Actualiza a Premium para agregar más.', { n: accountLimit })}
          </p>
        </Card>
      )}
    </>
  )
}
