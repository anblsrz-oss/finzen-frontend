import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES_ARRAY, CURRENCIES } from '@/lib/format'
import { toMonthlyRate, toAnnualRate, daysInMonthOf } from '@/lib/yields'
import type { AccountRow } from '@/types/db'

// Tasa anual de retención sobre el capital para inversiones (Ley de Ingresos).
// Es solo la sugerencia inicial: cambia cada año y el usuario puede editarla.
const DEFAULT_ISR_RATE = 0.5

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  bank_name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'cash', 'voucher']),
  currency: z.enum(CURRENCIES_ARRAY),
  // En edición se permite negativo (p. ej. para corregir montos de prueba).
  initial_balance: z.coerce.number(),
  has_yield: z.boolean().default(false),
  yield_rate: z.coerce.number().optional(),
  // Los bancos y SOFIPOs publican la tasa anual; se guarda cómo se capturó.
  yield_rate_period: z.enum(['monthly', 'annual']).default('monthly'),
  yield_kind: z.enum(['demand', 'term']).default('demand'),
  yield_term_days: z.coerce.number().optional(),
  yield_term_end: z.string().optional(),
  withhold_isr: z.boolean().default(false),
  isr_rate: z.coerce.number().optional(),
  is_scholarship: z.boolean().default(false),
  scholarship_name: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  account?: AccountRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const isEdit = !!account

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: account?.name ?? '',
      bank_name: account?.bank_name ?? '',
      type: account?.type ?? 'checking',
      currency: (account?.currency as any) ?? 'MXN',
      initial_balance: account?.initial_balance ?? 0,
      has_yield: account?.has_yield ?? false,
      yield_rate: account?.yield_rate ?? undefined,
      yield_rate_period: account?.yield_rate_period ?? 'monthly',
      yield_kind: account?.yield_kind ?? 'demand',
      yield_term_days: account?.yield_term_days ?? undefined,
      yield_term_end: account?.yield_term_end ?? '',
      withhold_isr: account?.withhold_isr ?? false,
      isr_rate: account?.isr_rate ?? DEFAULT_ISR_RATE,
      is_scholarship: account?.is_scholarship ?? false,
      scholarship_name: account?.scholarship_name ?? '',
    },
  })

  const pending = createAccount.isPending || updateAccount.isPending
  const ratePeriod = form.watch('yield_rate_period')
  const rateValue = Number(form.watch('yield_rate')) || 0

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) {
      alert(t('No hay sesión activa'))
      return
    }
    const handlers = {
      onSuccess: () => {
        form.reset()
        onSuccess?.()
      },
      onError: (error: any) => {
        console.error('Error al guardar cuenta:', error)
        alert(`Error: ${error.message || 'Error desconocido'}`)
      },
    }
    // Los campos de plazo solo aplican a plazo fijo, y el ISR solo si se pidió
    // descontarlo: si no, se limpian para no dejar datos que no significan nada.
    const isTerm = data.has_yield && data.yield_kind === 'term'
    const payload = {
      ...data,
      yield_term_days: isTerm ? (data.yield_term_days ?? null) : null,
      yield_term_end: isTerm ? (data.yield_term_end || null) : null,
      isr_rate: data.has_yield && data.withhold_isr ? (data.isr_rate ?? null) : null,
      withhold_isr: data.has_yield && data.withhold_isr,
    }

    if (isEdit) {
      updateAccount.mutate(
        {
          id: account!.id,
          userId: session.user.id,
          ...payload,
          scholarship_name: data.is_scholarship ? data.scholarship_name || null : null,
        },
        handlers,
      )
    } else {
      createAccount.mutate({ userId: session.user.id, ...payload }, handlers)
    }
  }

  return (
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Nombre de la cuenta')}
            placeholder={t('Mi cuenta principal')}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Input
            label={t('Banco (opcional)')}
            placeholder={t('Banco X')}
            {...form.register('bank_name')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label={t('Tipo')}
            options={[
              { value: 'checking', label: t('Corriente') },
              { value: 'savings', label: t('Ahorro') },
              { value: 'investment', label: t('Inversión') },
              { value: 'cash', label: t('Efectivo') },
              { value: 'voucher', label: t('Vales de despensa') },
            ]}
            {...form.register('type')}
          />
          <Select
            label={t('Moneda')}
            options={Array.from(CURRENCIES).map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
          <Input
            label={t('Saldo inicial')}
            type="number"
            placeholder="0"
            step="0.01"
            {...form.register('initial_balance')}
            error={form.formState.errors.initial_balance?.message}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('has_yield')}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('Esta cuenta genera rendimientos')}
            </span>
          </label>
          {form.watch('has_yield') && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('Rendimiento (%)')}
                  type="number"
                  placeholder="15"
                  step="0.001"
                  {...form.register('yield_rate')}
                  error={form.formState.errors.yield_rate?.message}
                />
                <Select
                  label={t('La tasa es')}
                  options={[
                    { value: 'annual', label: t('Anual') },
                    { value: 'monthly', label: t('Mensual') },
                  ]}
                  {...form.register('yield_rate_period')}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ratePeriod === 'annual'
                  ? t('Los bancos y SOFIPOs publican la tasa anual. Equivale a {{rate}}% este mes ({{days}} días).', {
                      rate: toMonthlyRate(rateValue, 'annual').toFixed(3),
                      days: daysInMonthOf(),
                    })
                  : t('Equivale a {{rate}}% anual.', {
                      rate: toAnnualRate(rateValue, 'monthly').toFixed(2),
                    })}
              </p>

              <Select
                label={t('Tipo de rendimiento')}
                options={[
                  { value: 'demand', label: t('A la vista (se paga cada mes)') },
                  { value: 'term', label: t('Plazo fijo (se paga al vencer)') },
                ]}
                {...form.register('yield_kind')}
              />

              {form.watch('yield_kind') === 'term' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('Plazo (días)')}
                    type="number"
                    placeholder="90"
                    min="1"
                    {...form.register('yield_term_days')}
                  />
                  <Input
                    label={t('Vence el')}
                    type="date"
                    {...form.register('yield_term_end')}
                  />
                </div>
              )}

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  {...form.register('withhold_isr')}
                  className="mt-0.5 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {t('Descontar retención de ISR')}
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    {t('Se retiene sobre el capital, no sobre el interés. La tasa la fija cada año la Ley de Ingresos.')}
                  </span>
                </span>
              </label>
              {form.watch('withhold_isr') && (
                <Input
                  label={t('Tasa de ISR anual (%)')}
                  type="number"
                  step="0.001"
                  placeholder={String(DEFAULT_ISR_RATE)}
                  {...form.register('isr_rate')}
                />
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('is_scholarship')}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              🎓 {t('Es una cuenta de beca')}
            </span>
          </label>
          {form.watch('is_scholarship') && (
            <Input
              label={t('Nombre de la beca (opcional)')}
              placeholder={t('Ej: Beca Benito Juárez')}
              {...form.register('scholarship_name')}
            />
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? t('Guardando…')
              : isEdit
                ? t('Guardar cambios')
                : t('Crear cuenta')}
          </Button>
          {isEdit && onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('Cancelar')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
