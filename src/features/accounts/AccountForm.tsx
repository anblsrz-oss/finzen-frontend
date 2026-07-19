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
import type { AccountRow } from '@/types/db'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  bank_name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'cash']),
  currency: z.enum(CURRENCIES_ARRAY),
  // En edición se permite negativo (p. ej. para corregir montos de prueba).
  initial_balance: z.coerce.number(),
  has_yield: z.boolean().default(false),
  yield_rate: z.coerce.number().optional(),
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
      is_scholarship: account?.is_scholarship ?? false,
      scholarship_name: account?.scholarship_name ?? '',
    },
  })

  const pending = createAccount.isPending || updateAccount.isPending

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
    if (isEdit) {
      updateAccount.mutate(
        {
          id: account!.id,
          userId: session.user.id,
          ...data,
          scholarship_name: data.is_scholarship ? data.scholarship_name || null : null,
        },
        handlers,
      )
    } else {
      createAccount.mutate({ userId: session.user.id, ...data }, handlers)
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
            <Input
              label={t('Rendimiento mensual (%)')}
              type="number"
              placeholder="0.833"
              step="0.001"
              {...form.register('yield_rate')}
              error={form.formState.errors.yield_rate?.message}
            />
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
