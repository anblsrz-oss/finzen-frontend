import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import {
  useTransactions,
  useDeleteTransaction,
  useTransactionDeletions,
} from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from './TransactionForm'
import { formatMoney, formatDate } from '@/lib/format'
import type { TransactionRow } from '@/types/db'

export function TransactionsPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [deleting, setDeleting] = useState<TransactionRow | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const transactionsQuery = useTransactions(userId)
  const accountsQuery = useAccounts(userId)
  const cardsQuery = useCards(userId)
  const categoriesQuery = useCategories(userId)
  const deletionsQuery = useTransactionDeletions(userId)
  const deleteTx = useDeleteTransaction()

  const transactions = transactionsQuery.data || []
  const accounts = accountsQuery.data || []
  const cards = cardsQuery.data || []
  const categories = categoriesQuery.data || []
  const deletions = deletionsQuery.data || []

  const getAccountName = (id?: string) =>
    accounts.find((a) => a.id === id)?.name || '—'
  const getCardName = (id?: string) => cards.find((c) => c.id === id)?.name || '—'
  const getCategoryName = (id?: string) =>
    categories.find((c) => c.id === id)?.name || '—'

  function openDelete(tx: TransactionRow) {
    setDeleting(tx)
    setReason('')
    setError(null)
  }

  async function confirmDelete() {
    if (!userId || !deleting) return
    if (!reason.trim()) {
      setError('Escribe el motivo de la eliminación.')
      return
    }
    try {
      await deleteTx.mutateAsync({ id: deleting.id, userId, reason: reason.trim() })
      setDeleting(null)
      setReason('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const kindLabel = (kind: string) =>
    kind === 'income'
      ? '📥 Ingreso'
      : kind === 'expense'
        ? '📤 Egreso'
        : '🔄 Transferencia'

  return (
    <>
      <PageHeader
        title="Transacciones"
        subtitle="Ingresos, egresos y transferencias entre tus cuentas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Ocultar historial' : `Historial (${deletions.length})`}
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Nueva transacción'}
            </Button>
          </div>
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

      {/* Historial de eliminaciones */}
      {showHistory && (
        <Card className="mb-4 border-slate-300 bg-slate-50">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Historial de transacciones eliminadas
          </h3>
          {deletions.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no has eliminado ninguna.</p>
          ) : (
            <div className="grid gap-2">
              {deletions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {d.concept || 'Sin concepto'}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        {d.kind ? kindLabel(d.kind) : ''}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-semibold text-slate-700">
                      {d.amount != null
                        ? formatMoney(d.amount, d.currency || 'MXN')
                        : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {d.tx_date ? formatDate(d.tx_date) : ''} • eliminada{' '}
                    {formatDate(d.deleted_at)}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    <span className="font-medium">Motivo:</span> {d.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
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
            <Card key={tx.id} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-slate-800">
                    {tx.concept || 'Sin concepto'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {kindLabel(tx.kind)}
                  </span>
                  {tx.pending && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pendiente
                    </span>
                  )}
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
                  <p className="mt-1 text-xs italic text-slate-400">{tx.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <p
                  className={`text-lg font-semibold ${
                    tx.kind === 'income' ? 'text-green-600' : 'text-slate-800'
                  }`}
                >
                  {tx.kind === 'income' ? '+' : '-'}
                  {formatMoney(tx.amount, tx.currency)}
                </p>
                <button
                  onClick={() => openDelete(tx)}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  🗑 Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de motivo de eliminación */}
      <Modal
        open={!!deleting}
        title="Eliminar transacción"
        onClose={() => setDeleting(null)}
      >
        {deleting && (
          <div className="grid gap-3">
            <p className="text-sm text-slate-600">
              Vas a eliminar{' '}
              <strong>{deleting.concept || 'Sin concepto'}</strong> por{' '}
              <strong>{formatMoney(deleting.amount, deleting.currency)}</strong>. El
              balance de tus cuentas se ajustará automáticamente.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Motivo de la eliminación <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Ej. Registrada por error, duplicada, monto incorrecto…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleteTx.isPending}
              >
                {deleteTx.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
