import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TransactionForm } from './TransactionForm'
import { formatMoney, formatDate } from '@/lib/format'

export function TransactionsPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)

  const transactionsQuery = useTransactions(userId)
  const accountsQuery = useAccounts(userId)
  const cardsQuery = useCards(userId)
  const categoriesQuery = useCategories(userId)

  const transactions = transactionsQuery.data || []
  const accounts = accountsQuery.data || []
  const cards = cardsQuery.data || []
  const categories = categoriesQuery.data || []

  const getAccountName = (id?: string) => {
    return accounts.find((a) => a.id === id)?.name || '—'
  }

  const getCardName = (id?: string) => {
    return cards.find((c) => c.id === id)?.name || '—'
  }

  const getCategoryName = (id?: string) => {
    return categories.find((c) => c.id === id)?.name || '—'
  }

  return (
    <>
      <PageHeader
        title="Transacciones"
        subtitle="Ingresos, egresos y transferencias entre tus cuentas."
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nueva transacción'}
          </Button>
        }
      />

      {showForm && (
        <TransactionForm
          accounts={accounts}
          cards={cards}
          categories={categories}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {transactions.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500">
            Sin transacciones. Registra una para empezar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {transactions.map((tx) => (
            <Card key={tx.id} className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-800">
                    {tx.concept || 'Sin concepto'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {tx.kind === 'income'
                      ? '📥 Ingreso'
                      : tx.kind === 'expense'
                        ? '📤 Egreso'
                        : '🔄 Transferencia'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {getCategoryName(tx.category_id || undefined)} •{' '}
                  {tx.kind === 'transfer'
                    ? `${getAccountName(tx.account_id || undefined)} → ${getAccountName(tx.to_account_id || undefined)}`
                    : tx.card_id
                      ? `${getCardName(tx.card_id)}`
                      : getAccountName(tx.account_id || undefined)}{' '}
                  • {formatDate(tx.tx_date)}
                </p>
                {tx.notes && (
                  <p className="mt-1 text-xs italic text-slate-400">
                    {tx.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-semibold ${
                    tx.kind === 'income'
                      ? 'text-green-600'
                      : 'text-slate-800'
                  }`}
                >
                  {tx.kind === 'income' ? '+' : '-'}
                  {formatMoney(tx.amount, tx.currency)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
