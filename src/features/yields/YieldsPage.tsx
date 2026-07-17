import { useAuth } from '@/store/useAuth'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { useYieldRecords } from '@/hooks/useYields'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { YieldForm } from './YieldForm'
import { formatMoney } from '@/lib/format'

import { useState } from 'react'

export function YieldsPage() {
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  const accountsQuery = useAccounts(userId)
  const balancesQuery = useAccountBalances(userId)
  const yieldsQuery = useYieldRecords(userId)

  const accounts = accountsQuery.data || []
  const balances = balancesQuery.data || []
  const yields = yieldsQuery.data || []

  // Filtrar solo cuentas con rendimiento
  const accountsWithYield = accounts.filter((a) => a.has_yield)

  if (!profile?.is_premium) {
    return (
      <>
        <PageHeader
          title="Rendimientos"
          subtitle="Compara el crecimiento calculado contra el real."
        />
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Esta función es solo para Premium. Actualiza tu plan para usarla.
          </p>
        </Card>
      </>
    )
  }

  if (accountsWithYield.length === 0) {
    return (
      <>
        <PageHeader
          title="Rendimientos"
          subtitle="Compara el crecimiento calculado contra el real."
        />
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500">
            Sin cuentas con rendimiento. Crea una cuenta con opción de
            rendimiento en Cuentas.
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Rendimientos"
        subtitle="Compara el crecimiento calculado contra el real."
      />

      <div className="space-y-6">
        {accountsWithYield.map((account) => {
          const balance = balances.find((b) => b.account_id === account.id)
          const currentBalance = balance?.current_balance ?? account.initial_balance
          const accountYields = yields.filter(
            (y) => y.account_id === account.id,
          )

          // Rendimiento esperado este mes
          const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
          const thisMonthYield = accountYields.find(
            (y) => y.period_month === currentMonth,
          )
          const expectedGrowth =
            thisMonthYield?.expected_growth ??
            (currentBalance * (account.yield_rate || 0)) / 100

          return (
            <div key={account.id} className="space-y-3">
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="font-semibold text-slate-800">{account.name}</h3>
                <p className="mt-1 text-xs text-slate-600">
                  📈 Rendimiento: {account.yield_rate}% mensual
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Saldo actual</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatMoney(currentBalance, account.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Crecimiento esperado</p>
                    <p className="text-lg font-semibold text-green-600">
                      +{formatMoney(expectedGrowth, account.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Crecimiento real</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {thisMonthYield && thisMonthYield.actual_growth !== null
                        ? `+${formatMoney(thisMonthYield.actual_growth, account.currency)}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Mostrar últimos registros */}
              {accountYields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Histórico
                  </p>
                  {accountYields.map((y) => (
                    <div
                      key={y.id}
                      onClick={() => setEditingAccountId(y.id)}
                      className="cursor-pointer transition-colors"
                    >
                      <Card
                        className={`flex items-center justify-between ${
                          y.verified ? 'border-green-200 bg-green-50' : ''
                        } ${
                          editingAccountId === y.id ? 'border-blue-300 bg-blue-50' : ''
                        } hover:border-slate-300`}
                      >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {new Date(y.period_month).toLocaleDateString(
                            'es-MX',
                            {
                              year: 'numeric',
                              month: 'long',
                            },
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          Esperado:{' '}
                          {formatMoney(y.expected_growth || 0, account.currency)} |
                          Real:{' '}
                          {y.actual_growth !== null
                            ? formatMoney(y.actual_growth, account.currency)
                            : '—'}
                        </p>
                      </div>
                      {y.verified && (
                        <span className="text-xs font-semibold text-green-600">
                          ✓ Verificado
                        </span>
                      )}
                      </Card>
                    </div>
                  ))}
                </div>
              )}

              {/* Form para registrar crecimiento actual o editar */}
              {editingAccountId && editingAccountId !== account.id ? null : (
                <YieldForm
                  account={account}
                  expectedGrowth={expectedGrowth}
                  currentRecord={
                    editingAccountId === account.id
                      ? accountYields.find((y) => y.id === editingAccountId)
                      : thisMonthYield || undefined
                  }
                  onDelete={() => setEditingAccountId(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
