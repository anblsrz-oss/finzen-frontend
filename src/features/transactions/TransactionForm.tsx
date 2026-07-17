import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/store/useAuth'
import { useCreateTransaction, useCreateInstallmentPlan } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type { AccountRow, CardRow, CategoryRow } from '@/types/db'

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
})

type FormData = z.infer<typeof schema>

interface TransactionFormProps {
  accounts: AccountRow[]
  cards: CardRow[]
  categories: CategoryRow[]
  onSuccess?: () => void
}

export function TransactionForm({
  accounts,
  cards,
  categories,
  onSuccess,
}: TransactionFormProps) {
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
  const selectedCard = cards.find((c) => c.id === cardId)
  const isCredit = selectedCard?.type === 'credit'

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) return

    // Validaciones según tipo
    if (data.kind === 'income' && !data.accountId) {
      alert('Selecciona la cuenta destino')
      return
    }
    if (data.kind === 'expense' && !data.accountId && !data.cardId) {
      alert('Selecciona una cuenta o tarjeta')
      return
    }
    if (data.kind === 'transfer' && (!data.accountId || !data.toAccountId)) {
      alert('Selecciona cuenta origen y destino')
      return
    }
    if (data.kind === 'transfer' && data.accountId === data.toAccountId) {
      alert('Las cuentas no pueden ser la misma')
      return
    }

    createTransaction.mutate(
      {
        userId: session.user.id,
        kind: data.kind,
        amount: data.amount,
        currency: data.currency,
        concept: data.concept,
        categoryId: data.categoryId,
        accountId: data.accountId,
        toAccountId: data.toAccountId,
        cardId: data.cardId,
        txDate: data.txDate,
        notes: data.notes,
      },
      {
        onSuccess: async (tx) => {
          // Si es MSI/diferido (premium), crear installment_plan
          if (
            profile?.is_premium &&
            msi &&
            isCredit &&
            data.msiMonths &&
            data.msiMonths > 0
          ) {
            await createInstallment.mutateAsync({
              userId: session.user.id,
              cardId: cardId!,
              transactionId: tx.id,
              description: data.concept || 'Compra',
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
    <Card className="mb-6 bg-slate-50">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo */}
        <Select
          label="Tipo"
          options={[
            { value: 'income', label: '📥 Ingreso' },
            { value: 'expense', label: '📤 Egreso' },
            { value: 'transfer', label: '🔄 Transferencia' },
          ]}
          {...form.register('kind')}
        />

        {/* Monto y moneda */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Monto"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register('amount')}
            error={form.formState.errors.amount?.message}
          />
          <Select
            label="Moneda"
            options={[
              { value: 'MXN', label: 'MXN' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            {...form.register('currency')}
          />
          <Input
            label="Fecha"
            type="date"
            {...form.register('txDate')}
            error={form.formState.errors.txDate?.message}
          />
        </div>

        {/* Concepto y categoría */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Concepto"
            placeholder="Ej: Almuerzo"
            {...form.register('concept')}
          />
          <Select
            label="Categoría"
            options={[
              { value: '', label: 'Sin categoría' },
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
            label="Cuenta destino"
            options={[
              { value: '', label: 'Selecciona una cuenta' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            {...form.register('accountId')}
            error={
              !form.watch('accountId') ? 'Requerida' : undefined
            }
          />
        )}

        {txKind === 'expense' && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Cuenta"
              options={[
                { value: '', label: 'Selecciona una cuenta' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              {...form.register('accountId')}
            />
            <Select
              label="O tarjeta"
              options={[
                { value: '', label: 'Selecciona una tarjeta' },
                ...cards.map((c) => ({ value: c.id, label: c.name })),
              ]}
              {...form.register('cardId')}
            />
          </div>
        )}

        {txKind === 'transfer' && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Cuenta origen"
              options={[
                { value: '', label: 'Selecciona origen' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              {...form.register('accountId')}
            />
            <Select
              label="Cuenta destino"
              options={[
                { value: '', label: 'Selecciona destino' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              {...form.register('toAccountId')}
            />
          </div>
        )}

        {/* MSI/Diferido (solo premium, crédito, egreso) */}
        {profile?.is_premium &&
          txKind === 'expense' &&
          isCredit && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register('msi')}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700">
                  💳 Meses sin intereses / Diferido
                </span>
              </label>
              {msi && (
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Meses"
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
                      <span className="text-sm font-medium text-slate-600">
                        MSI
                      </span>
                    </label>
                  </div>
                  {!form.watch('msiInterestFree') && (
                    <Input
                      label="Interés ($)"
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
          label="Notas (opcional)"
          placeholder="Detalles adicionales..."
          {...form.register('notes')}
        />

        {/* Botones */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createTransaction.isPending}
          >
            {createTransaction.isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
