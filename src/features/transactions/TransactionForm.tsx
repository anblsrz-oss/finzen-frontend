import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useCreateTransaction,
  useUpdateTransaction,
  useCreateInstallmentPlan,
  useInstallmentPlans,
  useInstallmentPayments,
  useConfirmInstallmentPayments,
} from '@/hooks/useTransactions'
import { useCreditLines } from '@/hooks/useCreditLines'
import { useFxRate } from '@/hooks/useFxRate'
import { useEntitlements } from '@/hooks/useAppConfig'
import { toBaseAmount } from '@/lib/fx'
import { CURRENCIES, formatMoney } from '@/lib/format'
import { todayISO, formatMonthLabel } from '@/lib/dates'
import {
  monthlyPayment,
  elapsedInstallments,
  isRetroactive,
  installmentSchedule,
  planProgress,
} from '@/lib/installments'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type {
  AccountRow,
  CardRow,
  CategoryRow,
  FamilyCardRow,
  TransactionRow,
} from '@/types/db'

const schema = z.object({
  kind: z.enum(['income', 'expense', 'transfer', 'card_payment']),
  amount: z.coerce.number().positive('Monto debe ser mayor a 0'),
  currency: z.string(),
  concept: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
  cardId: z.string().optional(),
  // Pago de tarjeta: línea de crédito a la que se abona.
  toCreditLineId: z.string().optional(),
  // Transferencia a una cuenta que no es mía (cuenta como egreso).
  isExternal: z.boolean().default(false),
  txDate: z.string(),
  notes: z.string().optional(),
  msi: z.boolean().default(false),
  msiMonths: z.coerce.number().optional(),
  msiInterestFree: z.boolean().default(true),
  msiInterest: z.coerce.number().default(0),
  // Un MSI puede registrarse tarde, con mensualidades ya pagadas.
  msiStartDate: z.string().optional(),
  msiPaidPrevious: z.boolean().default(false),
  msiPaidCount: z.coerce.number().optional(),
  familyExpense: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface TransactionFormProps {
  accounts: AccountRow[]
  cards: CardRow[]
  categories: CategoryRow[]
  // Tarjetas compartidas de mi familia (vista family_cards, sin límite).
  familyCards?: FamilyCardRow[]
  // Si viene, el formulario edita esa transacción en lugar de crear una nueva.
  transaction?: TransactionRow
  // Prefill (p. ej. botón "Pagar" de una línea de crédito).
  initial?: { kind?: FormData['kind']; toCreditLineId?: string; amount?: number }
  onSuccess?: () => void
  onCancel?: () => void
}

export function TransactionForm({
  accounts,
  cards,
  categories,
  familyCards = [],
  transaction,
  initial,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const isEdit = !!transaction
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const createInstallment = useCreateInstallmentPlan()
  const confirmInstallments = useConfirmInstallmentPayments()
  const { canUseInstallments } = useEntitlements()
  const mainCurrency = profile?.main_currency ?? 'MXN'

  const creditLinesQuery = useCreditLines(userId)
  const plansQuery = useInstallmentPlans(userId)
  const paymentsQuery = useInstallmentPayments(userId)
  const creditLines = creditLinesQuery.data || []
  const plans = plansQuery.data || []
  const payments = paymentsQuery.data || []

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: transaction
      ? {
          kind: transaction.kind,
          amount: transaction.amount,
          currency: transaction.currency,
          concept: transaction.concept ?? '',
          categoryId: transaction.category_id ?? '',
          accountId: transaction.account_id ?? '',
          toAccountId: transaction.to_account_id ?? '',
          cardId: transaction.card_id ?? '',
          toCreditLineId: transaction.to_credit_line_id ?? '',
          isExternal: transaction.is_external,
          txDate: transaction.tx_date,
          notes: transaction.notes ?? '',
          msi: false,
          msiInterestFree: true,
          msiStartDate: todayISO(),
          msiPaidPrevious: false,
        }
      : {
          kind: initial?.kind ?? 'expense',
          currency: mainCurrency,
          amount: initial?.amount as any,
          toCreditLineId: initial?.toCreditLineId ?? '',
          txDate: todayISO(),
          isExternal: false,
          msi: false,
          msiInterestFree: true,
          msiStartDate: todayISO(),
          msiPaidPrevious: false,
        },
  })

  const txKind = form.watch('kind')
  const cardId = form.watch('cardId')
  const currency = form.watch('currency')
  const amountRaw = form.watch('amount')
  const isExternal = form.watch('isExternal')
  const toCreditLineId = form.watch('toCreditLineId')

  // Multimoneda: cuando la moneda del movimiento difiere de la principal, se
  // obtiene el tipo de cambio (editable) para convertir a la moneda principal.
  const txDate = form.watch('txDate')
  const needsFx = !!currency && currency !== mainCurrency
  const fxQuery = useFxRate(currency, mainCurrency, needsFx, txDate)
  const [rateInput, setRateInput] = useState('')

  useEffect(() => {
    if (!needsFx) {
      setRateInput('')
    } else if (fxQuery.data?.rate) {
      setRateInput(String(fxQuery.data.rate))
    }
  }, [needsFx, fxQuery.data?.rate])

  const effectiveRate = needsFx ? Number(rateInput) || 0 : 1
  const amountNum = Number(amountRaw) || 0
  const basePreview = needsFx ? toBaseAmount(amountNum, effectiveRate) : amountNum
  const msi = form.watch('msi')
  const msiMonths = Number(form.watch('msiMonths')) || 0
  const msiStartDate = form.watch('msiStartDate') || todayISO()
  const msiPaidPrevious = form.watch('msiPaidPrevious')
  const familyExpense = form.watch('familyExpense')

  // Un MSI que arrancó meses atrás: hay que preguntar si esas mensualidades
  // ya se pagaron, si no el histórico queda negativo por un gasto que en
  // realidad se venía cubriendo.
  const msiIsRetroactive = msi && msiMonths > 0 && isRetroactive(msiStartDate)
  const msiElapsed = msiIsRetroactive ? elapsedInstallments(msiStartDate, msiMonths) : 0
  const msiPaidCount = Math.min(
    Number(form.watch('msiPaidCount')) || 0,
    msiMonths || 0,
  )
  const msiMonthly = monthlyPayment(amountNum, Number(form.watch('msiInterest')) || 0, msiMonths)

  // Al marcar "ya pagué", se propone por defecto lo transcurrido.
  useEffect(() => {
    if (msiPaidPrevious && !form.getValues('msiPaidCount')) {
      form.setValue('msiPaidCount', msiElapsed)
    }
  }, [msiPaidPrevious, msiElapsed, form])
  const selectedCard = cards.find((c) => c.id === cardId)
  const isCredit = selectedCard?.type === 'credit'

  const myUserId = session?.user?.id
  // Tarjetas familiares ajenas (del jefe de familia): entran al selector.
  const foreignFamilyCards = familyCards.filter((c) => c.owner_id !== myUserId)
  const selectedForeignCard = foreignFamilyCards.find(
    (c) => c.card_id === cardId,
  )
  // Mi tarjeta propia que además está compartida: permite marcar el gasto
  // como familiar con el checkbox.
  const ownSharedCard = familyCards.find(
    (c) => c.owner_id === myUserId && c.card_id === cardId,
  )
  const isFamilyTx = !!selectedForeignCard || (!!ownSharedCard && familyExpense)

  // --- Conciliación MSI al pagar la tarjeta -------------------------------
  // Meses ya pagados por plan, para calcular el avance.
  const paidByPlan = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const p of payments) {
      if (!m.has(p.plan_id)) m.set(p.plan_id, new Set())
      m.get(p.plan_id)!.add(p.period_month)
    }
    return m
  }, [payments])

  const cardLineOf = (id: string | null) =>
    id ? cards.find((c) => c.id === id)?.credit_line_id ?? null : null

  // Planes activos de la línea que se está pagando, con su mensualidad pendiente.
  const linePlans = useMemo(() => {
    if (txKind !== 'card_payment' || !toCreditLineId) return []
    return plans
      .filter((p) => cardLineOf(p.card_id) === toCreditLineId)
      .map((p) => ({
        plan: p,
        progress: planProgress(
          { start_date: p.start_date, months: p.months, monthly_payment: p.monthly_payment },
          paidByPlan.get(p.id) ?? new Set<string>(),
        ),
      }))
      .filter((x) => x.progress.remainingCount > 0 && x.progress.nextDuePeriod)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txKind, toCreditLineId, plans, paidByPlan, cards])

  const [msiToPay, setMsiToPay] = useState<Record<string, boolean>>({})

  async function onSubmit(data: FormData) {
    if (!userId) return

    // Validaciones según tipo
    if (data.kind === 'income' && !data.accountId) {
      alert(t('Selecciona la cuenta destino'))
      return
    }
    if (data.kind === 'expense' && !data.accountId && !data.cardId) {
      alert(t('Selecciona una cuenta o tarjeta'))
      return
    }
    if (data.kind === 'transfer' && !data.accountId) {
      alert(t('Selecciona la cuenta origen'))
      return
    }
    if (data.kind === 'transfer' && !data.isExternal && !data.toAccountId) {
      alert(t('Selecciona la cuenta destino'))
      return
    }
    if (
      data.kind === 'transfer' &&
      !data.isExternal &&
      data.accountId === data.toAccountId
    ) {
      alert(t('Las cuentas no pueden ser la misma'))
      return
    }
    if (data.kind === 'card_payment' && (!data.accountId || !data.toCreditLineId)) {
      alert(t('Selecciona la cuenta origen y la línea de crédito a pagar'))
      return
    }

    const familyId = selectedForeignCard
      ? selectedForeignCard.family_id
      : ownSharedCard && data.familyExpense
        ? ownSharedCard.family_id
        : undefined

    // Conversión a la moneda principal.
    const fxRate = data.currency !== mainCurrency ? effectiveRate : 1
    const baseAmount = toBaseAmount(data.amount, fxRate)
    if (data.currency !== mainCurrency && (!fxRate || fxRate <= 0)) {
      alert(t('Escribe un tipo de cambio válido.'))
      return
    }

    // Resolver cuenta/tarjeta según el tipo.
    let resolvedAccountId: string | undefined
    let resolvedToAccountId: string | undefined
    let resolvedCardId: string | undefined
    let resolvedToCreditLineId: string | undefined
    let resolvedCategoryId: string | undefined = data.categoryId || undefined
    let external = false

    if (data.kind === 'income') {
      resolvedAccountId = data.accountId || undefined
    } else if (data.kind === 'expense') {
      resolvedCardId = data.cardId || undefined
      if (resolvedCardId) {
        // Débito descuenta de su cuenta ligada; crédito no toca ninguna cuenta.
        const card = cards.find((c) => c.id === resolvedCardId)
        if (card?.type === 'debit') {
          resolvedAccountId = card.account_id || undefined
        } else if (!card) {
          // Tarjeta familiar ajena: gasto sin cuenta propia.
          resolvedAccountId = undefined
        }
      } else {
        resolvedAccountId = data.accountId || undefined
      }
    } else if (data.kind === 'transfer') {
      resolvedAccountId = data.accountId || undefined
      external = data.isExternal
      resolvedToAccountId = external ? undefined : data.toAccountId || undefined
      resolvedCategoryId = undefined
    } else if (data.kind === 'card_payment') {
      resolvedAccountId = data.accountId || undefined
      resolvedToCreditLineId = data.toCreditLineId || undefined
      resolvedCategoryId = undefined
    }

    try {
      if (isEdit && transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.id,
          userId,
          kind: data.kind,
          amount: data.amount,
          currency: data.currency,
          fxRate,
          baseAmount,
          concept: data.concept,
          categoryId: resolvedCategoryId ?? null,
          accountId: resolvedAccountId ?? null,
          toAccountId: resolvedToAccountId ?? null,
          cardId: resolvedCardId ?? null,
          toCreditLineId: resolvedToCreditLineId ?? null,
          isExternal: external,
          txDate: data.txDate,
          notes: data.notes,
        })
        onSuccess?.()
        return
      }

      const tx = await createTransaction.mutateAsync({
        userId,
        kind: data.kind,
        amount: data.amount,
        currency: data.currency,
        fxRate,
        baseAmount,
        concept: data.concept,
        categoryId: resolvedCategoryId,
        // Un gasto familiar va solo contra la tarjeta, nunca contra una cuenta.
        accountId: familyId ? undefined : resolvedAccountId,
        toAccountId: resolvedToAccountId,
        cardId: resolvedCardId,
        toCreditLineId: resolvedToCreditLineId,
        isExternal: external,
        txDate: data.txDate,
        notes: data.notes,
        familyId,
      })

      // MSI/diferido (premium): crear el plan y sembrar el ledger de meses ya
      // pagados (en lugar del viejo ingreso de "Ajuste de saldo").
      if (
        canUseInstallments &&
        msi &&
        isCredit &&
        !familyId &&
        data.msiMonths &&
        data.msiMonths > 0
      ) {
        const plan = await createInstallment.mutateAsync({
          userId,
          cardId: cardId!,
          transactionId: tx.id,
          description: data.concept || t('Compra'),
          totalAmount: data.amount,
          currency: data.currency,
          months: data.msiMonths,
          isInterestFree: data.msiInterestFree,
          interestAmount: data.msiInterest || 0,
          startDate: data.msiStartDate,
        })

        const paid = Math.min(data.msiPaidCount || 0, data.msiMonths)
        if (data.msiPaidPrevious && paid > 0) {
          const monthly = monthlyPayment(
            data.amount,
            data.msiInterest || 0,
            data.msiMonths,
          )
          const schedule = installmentSchedule(
            data.msiStartDate || todayISO(),
            data.msiMonths,
            monthly,
          )
          await confirmInstallments.mutateAsync({
            userId,
            rows: schedule.slice(0, paid).map((s) => ({
              planId: plan.id,
              periodMonth: s.periodMonth,
              amount: s.amount,
            })),
          })
        }
      }

      // Pago de tarjeta: conciliar las mensualidades MSI marcadas del periodo.
      if (data.kind === 'card_payment') {
        const rows = linePlans
          .filter((x) => msiToPay[x.plan.id] && x.progress.nextDuePeriod)
          .map((x) => ({
            planId: x.plan.id,
            periodMonth: x.progress.nextDuePeriod!,
            amount: x.progress.monthly,
          }))
        if (rows.length > 0) {
          await confirmInstallments.mutateAsync({ userId, rows })
        }
      }

      form.reset()
      setMsiToPay({})
      onSuccess?.()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const submitting =
    createTransaction.isPending || updateTransaction.isPending

  return (
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo */}
        <Select
          label={t('Tipo')}
          options={[
            { value: 'income', label: t('📥 Ingreso') },
            { value: 'expense', label: t('📤 Egreso') },
            { value: 'transfer', label: t('🔄 Transferencia') },
            { value: 'card_payment', label: t('💳 Pago de tarjeta') },
          ]}
          {...form.register('kind')}
        />

        {/* Monto y moneda */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label={t('Monto')}
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register('amount')}
            error={form.formState.errors.amount?.message}
          />
          <Select
            label={t('Moneda')}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
          <Input
            label={t('Fecha')}
            type="date"
            {...form.register('txDate')}
            error={form.formState.errors.txDate?.message}
          />
        </div>

        {/* Conversión a la moneda principal (solo si difiere) */}
        {needsFx && (
          <div className="space-y-2 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-3">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('Tipo de cambio ({{from}}→{{to}})', {
                  from: currency,
                  to: mainCurrency,
                })}
                type="number"
                step="0.0001"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={fxQuery.isLoading ? t('Obteniendo…') : '0.00'}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('Equivale a')}
                </label>
                <p className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  ≈ {formatMoney(basePreview, mainCurrency)}
                </p>
              </div>
            </div>
            <p className="text-xs text-sky-700 dark:text-sky-300">
              {fxQuery.isError
                ? t('No se obtuvo el tipo de cambio automático. Escríbelo manualmente.')
                : t('Puedes ajustar el tipo de cambio si lo necesitas.')}
            </p>
          </div>
        )}

        {/* Concepto y categoría (la categoría no aplica a transferencias ni pagos) */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Concepto')}
            placeholder={t('Ej: Almuerzo')}
            {...form.register('concept')}
          />
          {(txKind === 'income' || txKind === 'expense') && (
            <Select
              label={t('Categoría')}
              options={[
                { value: '', label: t('Sin categoría') },
                ...categories
                  .filter((c) => c.kind === (txKind === 'income' ? 'income' : 'expense'))
                  .map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
              ]}
              {...form.register('categoryId')}
            />
          )}
        </div>

        {/* Cuentas/Tarjetas según tipo */}
        {txKind === 'income' && (
          <Select
            label={t('Cuenta destino')}
            options={[
              { value: '', label: t('Selecciona una cuenta') },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            {...form.register('accountId')}
            error={
              !form.watch('accountId') ? t('Requerida') : undefined
            }
          />
        )}

        {txKind === 'expense' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t('Cuenta')}
                disabled={!!selectedForeignCard}
                options={[
                  { value: '', label: t('Selecciona una cuenta') },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                {...form.register('accountId')}
              />
              <Select
                label={t('O tarjeta')}
                options={[
                  { value: '', label: t('Selecciona una tarjeta') },
                  ...cards.map((c) => ({ value: c.id, label: c.name })),
                  ...foreignFamilyCards.map((c) => ({
                    value: c.card_id,
                    label: `${c.name} · 👨‍👩‍👧 ${t('Familiar')}`,
                  })),
                ]}
                {...form.register('cardId')}
              />
            </div>
            {selectedForeignCard && (
              <p className="rounded-lg bg-brand-50 dark:bg-brand-800/40 p-2 text-xs text-brand-700 dark:text-brand-500">
                👨‍👩‍👧 {t('Este gasto se registrará en el plan familiar, no en tus finanzas personales.')}
              </p>
            )}
            {ownSharedCard && !selectedForeignCard && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register('familyExpense')}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  👨‍👩‍👧 {t('Gasto familiar (se registra en el plan familiar)')}
                </span>
              </label>
            )}
          </>
        )}

        {txKind === 'transfer' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t('Cuenta origen')}
                options={[
                  { value: '', label: t('Selecciona origen') },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                {...form.register('accountId')}
              />
              {!isExternal && (
                <Select
                  label={t('Cuenta destino')}
                  options={[
                    { value: '', label: t('Selecciona destino') },
                    ...accounts.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                  {...form.register('toAccountId')}
                />
              )}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register('isExternal')}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('La cuenta destino no es mía (cuenta externa)')}
              </span>
            </label>
            {isExternal && (
              <p className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-xs text-amber-700 dark:text-amber-300">
                {t('Sale dinero de verdad: se contará como egreso en tus reportes.')}
              </p>
            )}
          </div>
        )}

        {txKind === 'card_payment' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t('Cuenta origen')}
                options={[
                  { value: '', label: t('Selecciona la cuenta') },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                {...form.register('accountId')}
              />
              <Select
                label={t('Línea de crédito a pagar')}
                options={[
                  { value: '', label: t('Selecciona la línea') },
                  ...creditLines.map((l) => ({ value: l.id, label: l.name })),
                ]}
                {...form.register('toCreditLineId')}
              />
            </div>

            {/* Conciliación MSI: marcar la mensualidad del periodo por plan. */}
            {linePlans.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  💳 {t('Meses sin intereses de esta línea')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t('Marca las mensualidades que cubre este pago.')}
                </p>
                {linePlans.map((x) => (
                  <label key={x.plan.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 cursor-pointer"
                      checked={!!msiToPay[x.plan.id]}
                      onChange={(e) =>
                        setMsiToPay((prev) => ({
                          ...prev,
                          [x.plan.id]: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {x.plan.description || t('Compra')} ·{' '}
                      {formatMoney(x.progress.monthly, x.plan.currency)}{' '}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({t('mensualidad de {{month}}; van {{paid}}/{{total}})', {
                          month: x.progress.nextDuePeriod
                            ? formatMonthLabel(x.progress.nextDuePeriod)
                            : '',
                          paid: x.progress.paidCount,
                          total: x.progress.months,
                        })}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MSI/Diferido (solo al crear; crédito, egreso; no aplica a gastos familiares) */}
        {!isEdit &&
          canUseInstallments &&
          txKind === 'expense' &&
          !isFamilyTx &&
          isCredit && (
            <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register('msi')}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  💳 {t('Meses sin intereses / Diferido')}
                </span>
              </label>
              {msi && (
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label={t('Meses')}
                    type="number"
                    min="1"
                    max="24"
                    {...form.register('msiMonths')}
                    error={form.formState.errors.msiMonths?.message}
                  />
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...form.register('msiInterestFree')}
                        className="cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        MSI
                      </span>
                    </label>
                  </div>
                  {!form.watch('msiInterestFree') && (
                    <Input
                      label={t('Interés ($)')}
                      type="number"
                      step="0.01"
                      {...form.register('msiInterest')}
                    />
                  )}
                </div>
              )}

              {msi && (
                <Input
                  label={t('Mes en que empezó el plan')}
                  type="date"
                  {...form.register('msiStartDate')}
                />
              )}

              {/* Plan que arrancó en un periodo anterior: hay que saber si
                  esas mensualidades ya se pagaron. */}
              {msiIsRetroactive && (
                <div className="space-y-2 rounded-md border border-amber-300 bg-white p-3 dark:border-amber-700 dark:bg-slate-800">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    ⚠️ {t('Este plan empezó en {{month}} (hace {{n}} meses).', {
                      month: formatMonthLabel(msiStartDate),
                      n: msiElapsed,
                    })}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {t('¿Ya pagaste mensualidades anteriores?')}
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('msiPaidPrevious')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {t('Sí, ya pagué algunas')}
                    </span>
                  </label>
                  {msiPaidPrevious && (
                    <>
                      <Input
                        label={t('¿Cuántas de {{total}}?', { total: msiMonths })}
                        type="number"
                        min="1"
                        max={msiMonths || undefined}
                        {...form.register('msiPaidCount')}
                      />
                      {msiPaidCount > 0 && (
                        <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                          {t('Se marcarán {{n}} mensualidades ({{amount}}) como ya pagadas.', {
                            n: msiPaidCount,
                            amount: formatMoney(msiMonthly * msiPaidCount, currency),
                          })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Notas */}
        <Input
          label={t('Notas (opcional)')}
          placeholder={t('Detalles adicionales...')}
          {...form.register('notes')}
        />

        {/* Botones */}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t('Guardando…')
              : isEdit
                ? t('Guardar cambios')
                : t('Registrar')}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('Cancelar')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
