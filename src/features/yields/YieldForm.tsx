import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateOrUpdateYield, useDeleteYield } from '@/hooks/useYields'
import { activeLocale } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatMoney } from '@/lib/format'
import type { AccountRow } from '@/types/db'

interface YieldFormProps {
  account: AccountRow
  expectedGrowth: number
  currentRecord?: {
    id: string
    period_month: string
    actual_growth: number | null
    verified: boolean
  }
  onDelete?: () => void
}

export function YieldForm({
  account,
  expectedGrowth,
  currentRecord,
  onDelete,
}: YieldFormProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const createOrUpdate = useCreateOrUpdateYield()
  const deleteYield = useDeleteYield()

  const [actualGrowth, setActualGrowth] = useState(
    currentRecord?.actual_growth?.toString() ?? '',
  )
  const [selectedMonth, setSelectedMonth] = useState(
    currentRecord?.period_month ?? new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
  )

  // Generar últimos 12 meses
  const months = []
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStr = d.toISOString().split('T')[0].slice(0, 7) + '-01'
    months.push({
      value: monthStr,
      label: new Date(monthStr).toLocaleDateString(activeLocale(), {
        year: 'numeric',
        month: 'long',
      }),
    })
  }

  const periodMonth = selectedMonth
  const difference = actualGrowth
    ? parseFloat(actualGrowth) - expectedGrowth
    : 0
  const percentDiff =
    expectedGrowth > 0 ? ((difference / expectedGrowth) * 100).toFixed(1) : '0'

  const handleSubmit = async () => {
    if (!session?.user?.id || !actualGrowth.trim()) return

    createOrUpdate.mutate({
      userId: session.user.id,
      accountId: account.id,
      periodMonth,
      expectedGrowth,
      actualGrowth: parseFloat(actualGrowth),
      verified: true,
    })
  }

  const handleDelete = () => {
    if (!session?.user?.id || !currentRecord) return
    if (confirm(t('¿Eliminar este registro?'))) {
      deleteYield.mutate(
        { id: currentRecord.id, userId: session.user.id },
        {
          onSuccess: () => {
            setActualGrowth('')
            onDelete?.()
          },
        },
      )
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <p className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
        {t('Registra el crecimiento real')}{' '}
        {currentRecord ? t('(Editar)') : t('de este mes')}
      </p>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('Mes')}
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={t('Crecimiento real ($)')}
            type="number"
            step="0.01"
            placeholder={formatMoney(expectedGrowth, account.currency)}
            value={actualGrowth}
            onChange={(e) => setActualGrowth(e.target.value)}
            className="flex-1"
          />
        </div>

        {actualGrowth && (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p
              className={`font-semibold ${difference >= 0 ? 'text-green-600' : 'text-red-600 dark:text-red-400'}`}
            >
              {difference >= 0 ? '+' : ''}{formatMoney(difference, account.currency)} ({percentDiff}% {t('vs esperado')})
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={createOrUpdate.isPending || !actualGrowth.trim()}
            className="flex-1"
          >
            {createOrUpdate.isPending ? t('Guardando…') : currentRecord ? t('Actualizar') : t('Verificar')}
          </Button>
          {currentRecord && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteYield.isPending}
            >
              {t('Eliminar')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
