import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useCards, useCardUsage, useDeleteCard } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { CardForm } from './CardForm'
import { formatMoney } from '@/lib/format'

export function CardsPage() {
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)

  const cardsQuery = useCards(userId)
  const accountsQuery = useAccounts(userId)
  const cardUsageQuery = useCardUsage(userId)
  const deleteCard = useDeleteCard()

  const cards = cardsQuery.data || []
  const accounts = accountsQuery.data || []
  const cardUsages = cardUsageQuery.data || []

  const getCardUsage = (cardId: string) => {
    return cardUsages.find((cu) => cu.card_id === cardId)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta tarjeta?')) {
      deleteCard.mutate({ id, userId: userId! })
    }
  }

  return (
    <>
      <PageHeader
        title="Tarjetas"
        subtitle="Tarjetas de crédito y débito con límite, uso y fechas."
        actions={
          <PremiumGate count={cards.length} limit={2}>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Agregar tarjeta'}
            </Button>
          </PremiumGate>
        }
      />

      {showForm && (
        <CardForm
          accounts={accounts}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {cards.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500">
            Sin tarjetas. Crea una para empezar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => {
            const usage = getCardUsage(card.id)
            const account = accounts.find((a) => a.id === card.account_id)

            return (
              <Card
                key={card.id}
                className={`${
                  card.type === 'credit'
                    ? 'border-l-4 border-l-blue-500'
                    : 'border-l-4 border-l-green-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{card.name}</h3>
                    <p className="text-xs text-slate-500">
                      {card.brand || 'Sin marca'} • {card.type === 'credit' ? '💳 Crédito' : '💰 Débito'} • {card.currency}
                    </p>
                    {card.type === 'debit' && account && (
                      <p className="mt-1 text-xs text-slate-600">
                        Ligada a: {account.name}
                      </p>
                    )}
                    {card.type === 'credit' && card.cut_day && card.payment_day && (
                      <p className="mt-1 text-xs text-slate-600">
                        📅 Corte: {card.cut_day} | Pago: {card.payment_day}
                      </p>
                    )}
                  </div>

                  {card.type === 'credit' && usage && (
                    <div className="text-right">
                      <div className="mb-2">
                        <p className="text-xs text-slate-500">Usado</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {formatMoney(usage.used, card.currency)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div>
                          <p className="text-xs text-slate-500">Límite</p>
                          <p className="text-sm font-medium text-slate-700">
                            {formatMoney(usage.credit_limit || 0, card.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Disponible</p>
                          <p className="text-sm font-medium text-green-600">
                            {formatMoney(usage.available, card.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {card.type === 'debit' && account && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Saldo</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {formatMoney(account.initial_balance, card.currency)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                    disabled={deleteCard.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!profile?.is_premium && cards.length >= 2 && (
        <Card className="mt-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Plan gratis: máximo 2 tarjetas. Actualiza a Premium para agregar más.
          </p>
        </Card>
      )}
    </>
  )
}
