import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCards } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useCreditLines,
  useCreditLineUsage,
  useCreditActivity,
  useDeleteCreditLine,
} from '@/hooks/useCreditLines'
import { useCreditLinePeriods } from '@/hooks/useCreditLinePeriods'
import { useCategories } from '@/hooks/useCategories'
import { useInstallmentPlans, useInstallmentPayments } from '@/hooks/useTransactions'
import { PeriodConfirmBanner } from '@/features/cards/PeriodConfirmBanner'
import { LinePeriodInfo } from '@/features/cards/LinePeriodInfo'
import { LineStatement } from '@/features/cards/LineStatement'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/features/transactions/TransactionForm'
import { Money } from '@/components/ui/Money'
import { CreditLineForm } from './CreditLineForm'
import type { CreditLineRow } from '@/types/db'

export function CreditLinesPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingLine, setEditingLine] = useState<CreditLineRow | null>(null)
  const [payingLine, setPayingLine] = useState<{ line: CreditLineRow; amount: number } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // El formulario de edición aparece arriba: en móvil hay que llevar al usuario
  // hasta él, si no parece que "Editar" no hizo nada.
  useEffect(() => {
    if (editingLine) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editingLine])

  const cardsQuery = useCards(userId)
  const accountsQuery = useAccounts(userId)
  const creditLinesQuery = useCreditLines(userId)
  const lineUsageQuery = useCreditLineUsage(userId)
  const periodsQuery = useCreditLinePeriods(userId)
  const categoriesQuery = useCategories(userId)
  const activityQuery = useCreditActivity(userId)
  const plansQuery = useInstallmentPlans(userId)
  const paymentsQuery = useInstallmentPayments(userId)
  const deleteLine = useDeleteCreditLine()

  const cards = cardsQuery.data || []
  const accounts = accountsQuery.data || []
  const creditLines = creditLinesQuery.data || []
  const lineUsages = lineUsageQuery.data || []
  const periods = periodsQuery.data || []
  const categories = categoriesQuery.data || []
  const activities = activityQuery.data || []
  const plans = plansQuery.data || []
  const installmentPayments = paymentsQuery.data || []

  const handleDelete = (line: CreditLineRow) => {
    const lineCards = cards.filter((c) => c.credit_line_id === line.id)
    const msg = lineCards.length
      ? t('¿Eliminar la línea "{{name}}"? Sus {{n}} tarjetas quedarán sin línea asignada.', {
          name: line.name,
          n: lineCards.length,
        })
      : t('¿Eliminar la línea "{{name}}"?', { name: line.name })
    if (confirm(msg)) {
      deleteLine.mutate({ id: line.id, userId: userId! })
    }
  }

  return (
    <>
      <PageHeader
        title={t('Líneas de crédito')}
        subtitle={t('Límites, fechas de corte y pago que comparten tus tarjetas de crédito.')}
        actions={
          <Button
            onClick={() => {
              setEditingLine(null)
              setShowForm(!showForm)
            }}
          >
            {showForm ? t('Cancelar') : t('+ Agregar línea')}
          </Button>
        }
      />

      {showForm && !editingLine && (
        <CreditLineForm onSuccess={() => setShowForm(false)} />
      )}

      {editingLine && (
        <div ref={formRef} className="scroll-mt-4">
          <CreditLineForm
            key={editingLine.id}
            line={editingLine}
            onSuccess={() => setEditingLine(null)}
            onCancel={() => setEditingLine(null)}
          />
        </div>
      )}

      {creditLines.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin líneas de crédito. Crea una para asignarle tus tarjetas.')}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {creditLines.map((line) => {
            const lineCards = cards.filter((c) => c.credit_line_id === line.id)
            const usage = lineUsages.find((u) => u.credit_line_id === line.id)

            return (
              <section key={line.id} className="space-y-4">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {line.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {lineCards.length > 0
                          ? t('{{n}} tarjetas · límite compartido', { n: lineCards.length })
                          : t('Sin tarjetas asignadas')}
                      </p>
                    </div>
                    {usage && (
                      <div className="flex gap-4 text-xs">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">{t('Usado')}</p>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            <Money amount={usage.used} currency={line.currency} />
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">{t('Límite')}</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            <Money amount={usage.credit_limit} currency={line.currency} />
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">{t('Disponible')}</p>
                          <p className="font-medium text-green-600">
                            <Money amount={usage.available} currency={line.currency} />
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <LinePeriodInfo line={line} periods={periods} />
                  <LineStatement
                    line={line}
                    cards={cards}
                    activities={activities}
                    plans={plans}
                    payments={installmentPayments}
                    onPay={(amount) => setPayingLine({ line, amount })}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowForm(false)
                      setEditingLine(line)
                    }}>
                      {t('Editar')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(line)}
                      disabled={deleteLine.isPending}
                    >
                      {t('Eliminar')}
                    </Button>
                  </div>
                </Card>

                <PeriodConfirmBanner line={line} periods={periods} />

                {lineCards.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Tarjetas:')} {lineCards.map((c) => c.name).join(', ')}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Pago de la línea de crédito: reutiliza el formulario de transacciones
          prellenado como "Pago de tarjeta". */}
      <Modal
        open={!!payingLine}
        title={t('Pagar {{name}}', { name: payingLine?.line.name ?? '' })}
        onClose={() => setPayingLine(null)}
      >
        {payingLine && (
          <TransactionForm
            accounts={accounts}
            cards={cards}
            categories={categories}
            initial={{
              kind: 'card_payment',
              toCreditLineId: payingLine.line.id,
              amount: payingLine.amount > 0 ? payingLine.amount : undefined,
            }}
            onSuccess={() => setPayingLine(null)}
            onCancel={() => setPayingLine(null)}
          />
        )}
      </Modal>
    </>
  )
}
