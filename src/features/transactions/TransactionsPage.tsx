import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useTransactions,
  useDeleteTransaction,
  useTransactionDeletions,
} from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCategories } from '@/hooks/useCategories'
import { useMyFamilies, useFamilyCards } from '@/hooks/useFamily'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from './TransactionForm'
import { formatMoney, formatDate } from '@/lib/format'
import type { TransactionRow } from '@/types/db'

export function TransactionsPage() {
  const { t } = useTranslation()
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

  // Tarjetas compartidas de mi familia (para registrar gastos familiares).
  const familiesQuery = useMyFamilies(userId)
  const familyId = familiesQuery.data?.[0]?.id
  const familyCardsQuery = useFamilyCards(familyId)

  const transactions = transactionsQuery.data || []
  const accounts = accountsQuery.data || []
  const cards = cardsQuery.data || []
  const categories = categoriesQuery.data || []
  const deletions = deletionsQuery.data || []
  const familyCards = familyCardsQuery.data || []

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
      setError(t('Escribe el motivo de la eliminación.'))
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
      ? t('📥 Ingreso')
      : kind === 'expense'
        ? t('📤 Egreso')
        : t('🔄 Transferencia')

  return (
    <>
      <PageHeader
        title={t('Transacciones')}
        subtitle={t('Ingresos, egresos y transferencias entre tus cuentas.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory
                ? t('Ocultar historial')
                : t('Historial ({{count}})', { count: deletions.length })}
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? t('Cancelar') : t('+ Nueva transacción')}
            </Button>
          </div>
        }
      />

      {showForm && (
        <TransactionForm
          accounts={accounts}
          cards={cards}
          categories={categories}
          familyCards={familyCards}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Historial de eliminaciones */}
      {showHistory && (
        <Card className="mb-4 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('Historial de transacciones eliminadas')}
          </h3>
          {deletions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('Aún no has eliminado ninguna.')}</p>
          ) : (
            <div className="grid gap-2">
              {deletions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {d.concept || t('Sin concepto')}{' '}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {d.kind ? kindLabel(d.kind) : ''}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">
                      {d.amount != null
                        ? formatMoney(d.amount, d.currency || 'MXN')
                        : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {d.tx_date ? formatDate(d.tx_date) : ''} •{' '}
                    {t('eliminada')} {formatDate(d.deleted_at)}
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                    <span className="font-medium">{t('Motivo:')}</span> {d.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {transactions.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Sin transacciones. Registra una para empezar.')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {transactions.map((tx) => (
            <Card key={tx.id} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {tx.concept || t('Sin concepto')}
                  </span>
                  <span className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {kindLabel(tx.kind)}
                  </span>
                  {tx.pending && (
                    <span className="rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {t('Pendiente')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {getCategoryName(tx.category_id || undefined)} •{' '}
                  {tx.kind === 'transfer'
                    ? `${getAccountName(tx.account_id || undefined)} → ${getAccountName(tx.to_account_id || undefined)}`
                    : tx.card_id
                      ? `${getCardName(tx.card_id)}`
                      : getAccountName(tx.account_id || undefined)}{' '}
                  • {formatDate(tx.tx_date)}
                </p>
                {tx.notes && (
                  <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">{tx.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <p
                  className={`text-lg font-semibold ${
                    tx.kind === 'income' ? 'text-green-600' : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {tx.kind === 'income' ? '+' : '-'}
                  {formatMoney(tx.amount, tx.currency)}
                </p>
                <button
                  onClick={() => openDelete(tx)}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  🗑 {t('Eliminar')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de motivo de eliminación */}
      <Modal
        open={!!deleting}
        title={t('Eliminar transacción')}
        onClose={() => setDeleting(null)}
      >
        {deleting && (
          <div className="grid gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('Vas a eliminar')}{' '}
              <strong>{deleting.concept || t('Sin concepto')}</strong>{' '}
              {t('por')}{' '}
              <strong>{formatMoney(deleting.amount, deleting.currency)}</strong>.{' '}
              {t('El balance de tus cuentas se ajustará automáticamente.')}
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('Motivo de la eliminación')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t('Ej. Registrada por error, duplicada, monto incorrecto…')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                {t('Cancelar')}
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleteTx.isPending}
              >
                {deleteTx.isPending ? t('Eliminando…') : t('Eliminar')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
