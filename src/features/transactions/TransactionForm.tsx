import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateTransaction, useCreateInstallmentPlan } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type { AccountRow, CardRow, CategoryRow, FamilyCardRow } from '@/types/db'

const schema = z.object({
  kind: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Monto debe ser mayor a 0'),
  currency: z.string(),
  concept: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
  cardId: z.string().optional(),
  txDate: z.string(),
  notes: z.string().optional(),
  msi: z.boolean().default(false),
  msiMonths: z.coerce.number().optional(),
  msiInterestFree: z.boolean().default(true),
  msiInterest: z.coerce.number().default(0),
  familyExpense: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface TransactionFormProps {
  accounts: AccountRow[]
  cards: CardRow[]
  categories: CategoryRow[]
  // Tarjetas compartidas de mi familia (vista family_cards, sin límite).
  familyCards?: FamilyCardRow[]
  onSuccess?: () => void
}

export function TransactionForm({
  accounts,
  cards,
  categories,
  familyCards = [],
  onSuccess,
}: TransactionFormProps) {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const createTransaction = useCreateTransaction()
  const createInstallment = useCreateInstallmentPlan()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      kind: 'expense',
      currency: 'MXN',
      txDate: new Date().toISOString().split('T')[0],
      msi: false,
      msiInterestFree: true,
    },
  })

  const txKind = form.watch('kind')
  const cardId = form.watch('cardId')
  const msi = form.watch('msi')
  const familyExpense = form.watch('familyExpense')
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

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) return

    // Validaciones según tipo
    if (data.kind === 'income' && !data.accountId) {
      alert(t('Selecciona la cuenta destino'))
      return
    }
    if (data.kind === 'expense' && !data.accountId && !data.cardId) {
      alert(t('Selecciona una cuenta o tarjeta'))
      return
    }
    if (data.kind === 'transfer' && (!data.accountId || !data.toAccountId)) {
      alert(t('Selecciona cuenta origen y destino'))
      return
    }
    if (data.kind === 'transfer' && data.accountId === data.toAccountId) {
      alert(t('Las cuentas no pueden ser la misma'))
      return
    }

    const familyId = selectedForeignCard
      ? selectedForeignCard.family_id
      : ownSharedCard && data.familyExpense
        ? ownSharedCard.family_id
        : undefined

    createTransaction.mutate(
      {
        userId: session.user.id,
        kind: data.kind,
        amount: data.amount,
        currency: data.currency,
        concept: data.concept,
        categoryId: data.categoryId,
        // Un gasto familiar va solo contra la tarjeta, nunca contra una cuenta.
        accountId: familyId ? undefined : data.accountId,
        toAccountId: data.toAccountId,
        cardId: data.cardId,
        txDate: data.txDate,
        notes: data.notes,
        familyId,
      },
      {
        onSuccess: async (tx) => {
          // Si es MSI/diferido (premium), crear installment_plan
          if (
            profile?.is_premium &&
            msi &&
            isCredit &&
            !familyId &&
            data.msiMonths &&
            data.msiMonths > 0
          ) {
            await createInstallment.mutateAsync({
              userId: session.user.id,
              cardId: cardId!,
              transactionId: tx.id,
              description: data.concept || t('Compra'),
              totalAmount: data.amount,
              currency: data.currency,
              months: data.msiMonths,
              isInterestFree: data.msiInterestFree,
              interestAmount: data.msiInterest || 0,
            })
          }
          form.reset()
          onSuccess?.()
        },
        onError: (error: any) => {
          alert(`Error: ${error.message}`)
        },
      },
    )
  }

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
            options={[
              { value: 'MXN', label: 'MXN' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            {...form.register('currency')}
          />
          <Input
            label={t('Fecha')}
            type="date"
            {...form.register('txDate')}
            error={form.formState.errors.txDate?.message}
          />
        </div>

        {/* Concepto y categoría */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Concepto')}
            placeholder={t('Ej: Almuerzo')}
            {...form.register('concept')}
          />
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('Cuenta origen')}
              options={[
                { value: '', label: t('Selecciona origen') },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              {...form.register('accountId')}
            />
            <Select
              label={t('Cuenta destino')}
              options={[
                { value: '', label: t('Selecciona destino') },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              {...form.register('toAccountId')}
            />
          </div>
        )}

        {/* MSI/Diferido (solo premium, crédito, egreso; no aplica a gastos familiares) */}
        {profile?.is_premium &&
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
          <Button
            type="submit"
            disabled={createTransaction.isPending}
          >
            {createTransaction.isPending ? t('Guardando…') : t('Registrar')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
