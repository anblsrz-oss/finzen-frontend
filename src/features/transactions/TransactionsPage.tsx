import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useTransactions,
  useTransactionsCount,
  useDeleteTransaction,
  useTransactionDeletions,
} from '@/hooks/useTransactions'
import type { TransactionFilter } from '@/hooks/useTransactions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCreditLines } from '@/hooks/useCreditLines'
import { useCategories } from '@/hooks/useCategories'
import { useMyFamilies, useFamilyCards } from '@/hooks/useFamily'
import { useEntitlements } from '@/hooks/useAppConfig'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from './TransactionForm'
import {
  TransactionFilters,
  EMPTY_FILTERS,
  countActiveFilters,
} from './TransactionFilters'
import type { FilterState } from './TransactionFilters'
import { formatMoney, formatDate } from '@/lib/format'
import { Money } from '@/components/ui/Money'
import type { TransactionRow } from '@/types/db'

export function TransactionsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRow | null>(null)
  const [deleting, setDeleting] = useState<TransactionRow | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // En móvil, al editar hay que llevar al usuario hasta el formulario de arriba.
  useEffect(() => {
    if (editingTx) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editingTx])

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  // El texto se debounce; el resto de los filtros se aplican de inmediato.
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  // Memoizado: el objeto va dentro del queryKey de useTransactions, y una
  // identidad nueva en cada render refetchearía la lista sin motivo.
  const txFilter = useMemo<TransactionFilter>(() => {
    const parseAmount = (v: string) => {
      const n = Number(v)
      return v.trim() !== '' && Number.isFinite(n) ? n : undefined
    }
    return {
      kind: filters.kind || undefined,
      accountIds: filters.accountIds,
      cardIds: filters.cardIds,
      categoryIds: filters.categoryIds,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      search: debouncedSearch.trim() || undefined,
      pending:
        filters.status === '' ? undefined : filters.status === 'pending',
      minAmount: parseAmount(filters.minAmount),
      maxAmount: parseAmount(filters.maxAmount),
    }
  }, [
    filters.kind,
    filters.accountIds,
    filters.cardIds,
    filters.categoryIds,
    filters.startDate,
    filters.endDate,
    filters.status,
    filters.minAmount,
    filters.maxAmount,
    debouncedSearch,
  ])

  const transactionsQuery = useTransactions(userId, txFilter)
  const totalCountQuery = useTransactionsCount(userId)
  const accountsQuery = useAccounts(userId)
  const cardsQuery = useCards(userId)
  const creditLinesQuery = useCreditLines(userId)
  const categoriesQuery = useCategories(userId)
  const deletionsQuery = useTransactionDeletions(userId)
  const deleteTx = useDeleteTransaction()
  const { transactionLimit } = useEntitlements()

  // Tarjetas compartidas de mi familia (para registrar gastos familiares).
  const familiesQuery = useMyFamilies(userId)
  const familyId = familiesQuery.data?.[0]?.id
  const familyCardsQuery = useFamilyCards(familyId)

  const transactions = transactionsQuery.data || []
  // Contra el límite del plan se mide el histórico completo, no lo filtrado.
  const totalCount = totalCountQuery.data ?? 0
  const accounts = accountsQuery.data || []
  const cards = cardsQuery.data || []
  const creditLines = creditLinesQuery.data || []
  const categories = categoriesQuery.data || []
  const deletions = deletionsQuery.data || []
  const familyCards = familyCardsQuery.data || []

  const getAccountName = (id?: string) =>
    accounts.find((a) => a.id === id)?.name || '—'
  const getCardName = (id?: string) => cards.find((c) => c.id === id)?.name || '—'
  const getLineName = (id?: string) =>
    creditLines.find((l) => l.id === id)?.name || '—'
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
        : kind === 'card_payment'
          ? t('💳 Pago de tarjeta')
          : t('🔄 Transferencia')

  // Origen/destino que se muestra bajo el concepto, según el tipo.
  const flowLabel = (tx: TransactionRow) => {
    if (tx.kind === 'transfer') {
      return tx.is_external
        ? `${getAccountName(tx.account_id || undefined)} → ${t('cuenta externa')}`
        : `${getAccountName(tx.account_id || undefined)} → ${getAccountName(tx.to_account_id || undefined)}`
    }
    if (tx.kind === 'card_payment') {
      return `${getAccountName(tx.account_id || undefined)} → ${getLineName(tx.to_credit_line_id || undefined)}`
    }
    return tx.card_id
      ? getCardName(tx.card_id)
      : getAccountName(tx.account_id || undefined)
  }

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
            {showForm ? (
              <Button onClick={() => setShowForm(false)}>{t('Cancelar')}</Button>
            ) : (
              <PremiumGate
                count={totalCount}
                limit={transactionLimit}
                lockedTooltip={t('Plan gratis: máximo {{n}} transacciones. Actualiza a Premium para registrar más.', { n: transactionLimit })}
              >
                <Button
                  onClick={() => {
                    setEditingTx(null)
                    setShowForm(true)
                  }}
                >
                  {t('+ Nueva transacción')}
                </Button>
              </PremiumGate>
            )}
          </div>
        }
      />

      {!showForm && transactionLimit !== Infinity && totalCount >= transactionLimit && (
        <Card className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('Plan gratis: máximo {{n}} transacciones. Actualiza a Premium para registrar más.', { n: transactionLimit })}
          </p>
        </Card>
      )}

      {showForm && !editingTx && (
        <TransactionForm
          accounts={accounts}
          cards={cards}
          categories={categories}
          familyCards={familyCards}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {editingTx && (
        <div ref={formRef} className="scroll-mt-4">
          {/* key = id: fuerza remontar al pasar de una transacción a otra, para
              no arrastrar los defaultValues de la anterior. */}
          <TransactionForm
            key={editingTx.id}
            accounts={accounts}
            cards={cards}
            categories={categories}
            familyCards={familyCards}
            transaction={editingTx}
            onSuccess={() => setEditingTx(null)}
            onCancel={() => setEditingTx(null)}
          />
        </div>
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

      <TransactionFilters
        value={filters}
        onChange={setFilters}
        accounts={accounts}
        cards={cards}
        categories={categories}
        resultCount={transactions.length}
      />

      {transactions.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {/* "No hay nada" y "no hay nada que cumpla el filtro" son
                situaciones distintas: la segunda tiene salida. */}
            {countActiveFilters(filters) > 0
              ? t('Ninguna transacción coincide con los filtros.')
              : t('Sin transacciones. Registra una para empezar.')}
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
                  {(tx.kind === 'income' || tx.kind === 'expense') &&
                    `${getCategoryName(tx.category_id || undefined)} • `}
                  {flowLabel(tx)} • {formatDate(tx.tx_date)}
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
                  {tx.kind === 'income' ? '+' : tx.kind === 'transfer' && !tx.is_external ? '' : '-'}
                  <Money amount={tx.amount} currency={tx.currency} />
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingTx(tx)
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400"
                  >
                    ✏️ {t('Editar')}
                  </button>
                  <button
                    onClick={() => openDelete(tx)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    🗑 {t('Eliminar')}
                  </button>
                </div>
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
