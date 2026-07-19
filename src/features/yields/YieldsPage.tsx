import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts'
import { useEntitlements } from '@/hooks/useAppConfig'
import { activeLocale } from '@/i18n'
import { useYieldRecords } from '@/hooks/useYields'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { YieldForm } from './YieldForm'
import { formatMoney } from '@/lib/format'

import { useState } from 'react'

export function YieldsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id
  const { canUseYields } = useEntitlements()
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  const accountsQuery = useAccounts(userId)
  const balancesQuery = useAccountBalances(userId)
  const yieldsQuery = useYieldRecords(userId)

  const accounts = accountsQuery.data || []
  const balances = balancesQuery.data || []
  const yields = yieldsQuery.data || []

  // Filtrar solo cuentas con rendimiento
  const accountsWithYield = accounts.filter((a) => a.has_yield)

  if (!canUseYields) {
    return (
      <>
        <PageHeader
          title={t('Rendimientos')}
          subtitle={t('Compara el crecimiento calculado contra el real.')}
        />
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('Esta función es solo para Premium. Actualiza tu plan para usarla.')}
          </p>
        </Card>
      </>
    )
  }

  if (accountsWithYield.length === 0) {
    return (
      <>
        <PageHeader
          title={t('Rendimientos')}
          subtitle={t('Compara el crecimiento calculado contra el real.')}
        />
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin cuentas con rendimiento. Crea una cuenta con opción de rendimiento en Cuentas.')}
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('Rendimientos')}
        subtitle={t('Compara el crecimiento calculado contra el real.')}
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
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{account.name}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  📈 {t('Rendimiento:')} {account.yield_rate}% {t('mensual')}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Saldo actual')}</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {formatMoney(currentBalance, account.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Crecimiento esperado')}</p>
                    <p className="text-lg font-semibold text-green-600">
                      +{formatMoney(expectedGrowth, account.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Crecimiento real')}</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
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
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('Histórico')}
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
                          editingAccountId === y.id ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''
                        } hover:border-slate-300`}
                      >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {new Date(y.period_month).toLocaleDateString(
                            activeLocale(),
                            {
                              year: 'numeric',
                              month: 'long',
                            },
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('Esperado:')}{' '}
                          {formatMoney(y.expected_growth || 0, account.currency)} |
                          {' '}{t('Real:')}{' '}
                          {y.actual_growth !== null
                            ? formatMoney(y.actual_growth, account.currency)
                            : '—'}
                        </p>
                      </div>
                      {y.verified && (
                        <span className="text-xs font-semibold text-green-600">
                          ✓ {t('Verificado')}
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
