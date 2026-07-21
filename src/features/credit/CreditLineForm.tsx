import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateCreditLine, useUpdateCreditLine } from '@/hooks/useCreditLines'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES, CURRENCIES_ARRAY } from '@/lib/format'
import type { CreditLineRow } from '@/types/db'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  bank_name: z.string().optional(),
  credit_limit: z.coerce.number().positive('El límite debe ser mayor a 0'),
  currency: z.enum(CURRENCIES_ARRAY),
  cut_day: z.coerce.number().optional(),
  payment_day: z.coerce.number().optional(),
  dates_may_shift: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface CreditLineFormProps {
  line?: CreditLineRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreditLineForm({ line, onSuccess, onCancel }: CreditLineFormProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const createLine = useCreateCreditLine()
  const updateLine = useUpdateCreditLine()
  const isEdit = !!line

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: line?.name ?? '',
      bank_name: line?.bank_name ?? '',
      credit_limit: line?.credit_limit ?? undefined,
      currency: (line?.currency as any) ?? 'MXN',
      cut_day: line?.cut_day ?? undefined,
      payment_day: line?.payment_day ?? undefined,
      dates_may_shift: line?.dates_may_shift ?? false,
    },
  })

  const pending = createLine.isPending || updateLine.isPending
  const [error, setError] = useState<string | null>(null)

  function onSubmit(data: FormData) {
    if (!session?.user?.id) {
      alert(t('No hay sesión activa'))
      return
    }
    setError(null)
    const userId = session.user.id
    const payload = {
      name: data.name.trim(),
      bank_name: data.bank_name?.trim() || null,
      credit_limit: data.credit_limit,
      currency: data.currency,
      cut_day: data.cut_day ?? null,
      payment_day: data.payment_day ?? null,
      dates_may_shift: data.dates_may_shift,
    }
    const handlers = {
      onSuccess: () => {
        form.reset()
        onSuccess?.()
      },
      onError: (err: any) => {
        console.error('Error al guardar la línea de crédito:', err)
        setError(err?.message || t('Error desconocido'))
      },
    }
    if (isEdit) {
      updateLine.mutate({ id: line!.id, userId, ...payload }, handlers)
    } else {
      createLine.mutate({ userId, ...payload }, handlers)
    }
  }

  return (
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Nombre de la línea')}
            placeholder={t('Ej: Nu')}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Input
            label={t('Banco (opcional)')}
            placeholder={t('Ej: Nu México')}
            {...form.register('bank_name')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Límite de crédito')}
            type="number"
            placeholder="20000"
            step="0.01"
            {...form.register('credit_limit')}
            error={form.formState.errors.credit_limit?.message}
          />
          <Select
            label={t('Moneda')}
            options={Array.from(CURRENCIES).map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Día de corte')}
            type="number"
            placeholder="15"
            min="1"
            max="31"
            {...form.register('cut_day')}
          />
          <Input
            label={t('Día de pago')}
            type="number"
            placeholder="5"
            min="1"
            max="31"
            {...form.register('payment_day')}
          />
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            {...form.register('dates_may_shift')}
            className="mt-0.5 cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            📅 {t('Las fechas se recorren en días inhábiles')}
            <span className="block text-xs text-slate-400 dark:text-slate-500">
              {t('Te preguntaremos la fecha real cuando llegue el corte.')}
            </span>
          </span>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? t('Guardando…')
              : isEdit
                ? t('Guardar cambios')
                : t('Crear línea')}
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
