import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCards, useCardUsage, useDeleteCard } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useCreditLines,
  useCreditLineUsage,
  useCreditActivity,
} from '@/hooks/useCreditLines'
import { useCreditLinePeriods } from '@/hooks/useCreditLinePeriods'
import { useCategories } from '@/hooks/useCategories'
import { useInstallmentPlans, useInstallmentPayments } from '@/hooks/useTransactions'
import { PeriodConfirmBanner } from './PeriodConfirmBanner'
import { LinePeriodInfo } from './LinePeriodInfo'
import { LineStatement } from './LineStatement'
import { useEntitlements } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { CardForm } from './CardForm'
import { CardVisual } from './CardVisual'
import { TransactionForm } from '@/features/transactions/TransactionForm'
import { Money } from '@/components/ui/Money'
import type { CardRow, CreditLineRow } from '@/types/db'

export function CardsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CardRow | null>(null)
  const [payingLine, setPayingLine] = useState<{ line: CreditLineRow; amount: number } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // El formulario se renderiza arriba de la lista: en móvil hay que llevar al
  // usuario hasta él, si no parece que el botón "Editar" no hizo nada.
  useEffect(() => {
    if (editingCard) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editingCard])

  const cardsQuery = useCards(userId)
  const accountsQuery = useAccounts(userId)
  const cardUsageQuery = useCardUsage(userId)
  const creditLinesQuery = useCreditLines(userId)
  const lineUsageQuery = useCreditLineUsage(userId)
  const periodsQuery = useCreditLinePeriods(userId)
  const categoriesQuery = useCategories(userId)
  const activityQuery = useCreditActivity(userId)
  const plansQuery = useInstallmentPlans(userId)
  const paymentsQuery = useInstallmentPayments(userId)
  const deleteCard = useDeleteCard()
  const { cardLimit } = useEntitlements()

  const cards = cardsQuery.data || []
  const accounts = accountsQuery.data || []
  const cardUsages = cardUsageQuery.data || []
  const creditLines = creditLinesQuery.data || []
  const lineUsages = lineUsageQuery.data || []
  const periods = periodsQuery.data || []
  const categories = categoriesQuery.data || []
  const activities = activityQuery.data || []
  const plans = plansQuery.data || []
  const installmentPayments = paymentsQuery.data || []

  // Tarjetas que no cuelgan de ninguna línea: las de débito y las de crédito
  // cuya línea se borró (on delete set null).
  const looseCards = cards.filter(
    (c) => !c.credit_line_id || !creditLines.some((l) => l.id === c.credit_line_id),
  )

  const getCardUsage = (cardId: string) => {
    return cardUsages.find((cu) => cu.card_id === cardId)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('¿Eliminar esta tarjeta?'))) {
      deleteCard.mutate({ id, userId: userId! })
    }
  }

  function renderCard(card: CardRow) {
    const usage = getCardUsage(card.id)
    const account = accounts.find((a) => a.id === card.account_id)

    return (
      <div key={card.id} className="flex flex-col gap-3">
        <CardVisual card={card} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span>
            {card.card_format === 'virtual'
              ? t('Virtual')
              : card.brand || t('Sin marca')}
          </span>
          <span>· {card.currency}</span>
          {card.type === 'debit' && account && (
            <span>· {t('Ligada a:')} {account.name}</span>
          )}
        </div>

        {/* Gasto de esta tarjeta en particular; el límite y el disponible se
            muestran arriba, a nivel de la línea que comparte con las demás. */}
        {card.type === 'credit' && usage && (
          <div className="text-xs">
            <p className="text-slate-500 dark:text-slate-400">{t('Gasto de esta tarjeta')}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              <Money amount={usage.used} currency={card.currency} />
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowForm(false)
              setEditingCard(card)
            }}
          >
            {t('Editar')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(card.id)}
            disabled={deleteCard.isPending}
          >
            {t('Eliminar')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t('Tarjetas')}
        subtitle={t('Tarjetas de crédito y débito con límite, uso y fechas.')}
        actions={
          <PremiumGate
            count={cards.length}
            limit={cardLimit}
            lockedTooltip={t('Plan gratis: máximo {{n}} tarjetas. Actualiza a Premium para agregar más.', { n: cardLimit })}
          >
            <Button
              onClick={() => {
                setEditingCard(null)
                setShowForm(!showForm)
              }}
            >
              {showForm ? t('Cancelar') : t('+ Agregar tarjeta')}
            </Button>
          </PremiumGate>
        }
      />

      {showForm && !editingCard && (
        <CardForm
          accounts={accounts}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {editingCard && (
        <div ref={formRef} className="scroll-mt-4">
          {/* key = id: fuerza remontar al pasar de una tarjeta a otra. Sin
              esto useForm conserva los defaultValues de la tarjeta anterior
              y se editaba con datos que no eran los de esta. */}
          <CardForm
            key={editingCard.id}
            accounts={accounts}
            card={editingCard}
            onSuccess={() => setEditingCard(null)}
            onCancel={() => setEditingCard(null)}
          />
        </div>
      )}

      {cards.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin tarjetas. Crea una para empezar.')}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Un bloque por línea de crédito: el límite y el disponible son de
              la línea completa, las tarjetas solo aportan su gasto. */}
          {creditLines.map((line) => {
            const lineCards = cards.filter((c) => c.credit_line_id === line.id)
            if (lineCards.length === 0) return null
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
                        {t('{{n}} tarjetas · límite compartido', { n: lineCards.length })}
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
                </Card>

                <PeriodConfirmBanner line={line} periods={periods} />

                <div className="grid gap-6 sm:grid-cols-2">
                  {lineCards.map((card) => renderCard(card))}
                </div>
              </section>
            )
          })}

          {/* Débito y crédito sin línea asignada. */}
          {looseCards.length > 0 && (
            <section className="space-y-4">
              {creditLines.length > 0 && (
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t('Otras tarjetas')}
                </h3>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {looseCards.map((card) => renderCard(card))}
              </div>
            </section>
          )}
        </div>
      )}

      {!profile?.is_premium && cardLimit !== Infinity && cards.length >= cardLimit && (
        <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('Plan gratis: máximo {{n}} tarjetas. Actualiza a Premium para agregar más.', { n: cardLimit })}
          </p>
        </Card>
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
