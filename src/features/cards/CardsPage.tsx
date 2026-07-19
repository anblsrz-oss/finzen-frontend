import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCards, useCardUsage, useDeleteCard } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import { useEntitlements } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { CardForm } from './CardForm'
import { CardVisual } from './CardVisual'
import { Money } from '@/components/ui/Money'
import type { CardRow } from '@/types/db'

export function CardsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CardRow | null>(null)

  const cardsQuery = useCards(userId)
  const accountsQuery = useAccounts(userId)
  const cardUsageQuery = useCardUsage(userId)
  const deleteCard = useDeleteCard()
  const { cardLimit } = useEntitlements()

  const cards = cardsQuery.data || []
  const accounts = accountsQuery.data || []
  const cardUsages = cardUsageQuery.data || []

  const getCardUsage = (cardId: string) => {
    return cardUsages.find((cu) => cu.card_id === cardId)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('¿Eliminar esta tarjeta?'))) {
      deleteCard.mutate({ id, userId: userId! })
    }
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
        <CardForm
          accounts={accounts}
          card={editingCard}
          onSuccess={() => setEditingCard(null)}
          onCancel={() => setEditingCard(null)}
        />
      )}

      {cards.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin tarjetas. Crea una para empezar.')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((card) => {
            const usage = getCardUsage(card.id)
            const account = accounts.find((a) => a.id === card.account_id)

            return (
              <div key={card.id} className="flex flex-col gap-3">
                <CardVisual card={card} />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>{card.brand || t('Sin marca')}</span>
                  <span>· {card.currency}</span>
                  {card.type === 'debit' && account && (
                    <span>· {t('Ligada a:')} {account.name}</span>
                  )}
                  {card.type === 'credit' && card.cut_day && card.payment_day && (
                    <span>· 📅 {t('Corte:')} {card.cut_day} | {t('Pago:')} {card.payment_day}</span>
                  )}
                </div>

                {card.type === 'credit' && usage && (
                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t('Usado')}</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        <Money amount={usage.used} currency={card.currency} />
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t('Límite')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        <Money amount={usage.credit_limit || 0} currency={card.currency} />
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t('Disponible')}</p>
                      <p className="font-medium text-green-600">
                        <Money amount={usage.available} currency={card.currency} />
                      </p>
                    </div>
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
          })}
        </div>
      )}

      {!profile?.is_premium && cardLimit !== Infinity && cards.length >= cardLimit && (
        <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('Plan gratis: máximo {{n}} tarjetas. Actualiza a Premium para agregar más.', { n: cardLimit })}
          </p>
        </Card>
      )}
    </>
  )
}
