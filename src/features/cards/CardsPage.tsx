import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCards, useCardUsage, useDeleteCard } from '@/hooks/useCards'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditLines } from '@/hooks/useCreditLines'
import { useEntitlements } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { CardForm } from './CardForm'
import { CardVisual } from './CardVisual'
import { Money } from '@/components/ui/Money'
import type { CardRow } from '@/types/db'

type GroupBy = 'line' | 'bank' | 'type' | 'format'

export function CardsPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CardRow | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('line')
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
  const deleteCard = useDeleteCard()
  const { cardLimit } = useEntitlements()

  const cards = cardsQuery.data || []
  const accounts = accountsQuery.data || []
  const cardUsages = cardUsageQuery.data || []
  const creditLines = creditLinesQuery.data || []

  // Tarjetas que no cuelgan de ninguna línea: las de débito/vale y las de
  // crédito cuya línea se borró (on delete set null).
  const looseCards = cards.filter(
    (c) => !c.credit_line_id || !creditLines.some((l) => l.id === c.credit_line_id),
  )

  // Banco de una tarjeta: el propio; si no, se hereda de su línea (crédito) o
  // de su cuenta ligada (débito/vale). null => "Sin banco".
  const bankOf = (card: CardRow): string | null => {
    if (card.bank_name?.trim()) return card.bank_name.trim()
    if (card.credit_line_id) {
      const line = creditLines.find((l) => l.id === card.credit_line_id)
      if (line?.bank_name?.trim()) return line.bank_name.trim()
    }
    if (card.account_id) {
      const acc = accounts.find((a) => a.id === card.account_id)
      if (acc?.bank_name?.trim()) return acc.bank_name.trim()
    }
    return null
  }

  const typeLabelOf = (card: CardRow): string => {
    if (card.is_scholarship) return t('Beca')
    if (card.type === 'credit') return t('Crédito')
    if (card.type === 'voucher') return t('Vales')
    return t('Débito')
  }

  // Grupos genéricos (banco/tipo/formato). El agrupado por línea usa su propio
  // render más abajo para conservar el encabezado y el enlace "Ver línea".
  const genericGroups = useMemo(() => {
    if (groupBy === 'line') return []
    const SIN_BANCO = t('Sin banco')
    const map = new Map<string, { label: string; cards: CardRow[] }>()
    for (const card of cards) {
      const label =
        groupBy === 'bank'
          ? bankOf(card) ?? SIN_BANCO
          : groupBy === 'type'
            ? typeLabelOf(card)
            : card.card_format === 'virtual'
              ? t('Virtual')
              : t('Física')
      const g = map.get(label) ?? { label, cards: [] }
      g.cards.push(card)
      map.set(label, g)
    }
    // Más tarjetas primero; "Sin banco" siempre al final.
    return Array.from(map.values()).sort((a, b) => {
      if (a.label === SIN_BANCO) return 1
      if (b.label === SIN_BANCO) return -1
      return b.cards.length - a.cards.length
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, cards, creditLines, accounts, t])

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
          {card.bank_name && <span>· {card.bank_name}</span>}
          {(card.type === 'debit' || card.type === 'voucher') && account && (
            <span>· {t('Ligada a:')} {account.name}</span>
          )}
        </div>

        {/* Gasto de esta tarjeta en particular; el límite y el disponible se
            gestionan en la sección de Líneas de crédito. */}
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
        subtitle={t('Tus tarjetas de crédito, débito y vales. Los límites y pagos están en Líneas de crédito.')}
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
          {/* Control de agrupación */}
          <div className="max-w-xs">
            <Select
              label={t('Agrupar por')}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              options={[
                { value: 'line', label: t('Línea de crédito') },
                { value: 'bank', label: t('Banco') },
                { value: 'type', label: t('Tipo') },
                { value: 'format', label: t('Formato (física/virtual)') },
              ]}
            />
          </div>

          {groupBy === 'line' ? (
            <>
              {/* Un bloque por línea de crédito: las tarjetas que comparten
                  línea se muestran juntas. El límite y el pago viven en Líneas
                  de crédito. */}
              {creditLines.map((line) => {
                const lineCards = cards.filter((c) => c.credit_line_id === line.id)
                if (lineCards.length === 0) return null

                return (
                  <section key={line.id} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                          {line.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('{{n}} tarjetas · límite compartido', { n: lineCards.length })}
                        </p>
                      </div>
                      <Link
                        to="/lineas-credito"
                        className="text-xs font-medium text-brand-700 dark:text-brand-500 hover:underline"
                      >
                        {t('Ver línea')}
                      </Link>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {lineCards.map((card) => renderCard(card))}
                    </div>
                  </section>
                )
              })}

              {/* Débito, vales y crédito sin línea asignada. */}
              {looseCards.length > 0 && (
                <section className="space-y-4">
                  {creditLines.some((l) => cards.some((c) => c.credit_line_id === l.id)) && (
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t('Otras tarjetas')}
                    </h3>
                  )}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {looseCards.map((card) => renderCard(card))}
                  </div>
                </section>
              )}
            </>
          ) : (
            genericGroups.map((group) => (
              <section key={group.label} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {group.label}{' '}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    ({group.cards.length})
                  </span>
                </h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  {group.cards.map((card) => renderCard(card))}
                </div>
              </section>
            ))
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
    </>
  )
}
