import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/store/useAuth'
import { useCreateCard } from '@/hooks/useCards'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES_ARRAY, CURRENCIES } from '@/lib/format'
import type { AccountRow } from '@/types/db'

const schema = z
  .object({
    name: z.string().min(1, 'Nombre requerido'),
    brand: z.string().optional(),
    type: z.enum(['credit', 'debit']),
    currency: z.enum(CURRENCIES_ARRAY),
    account_id: z.string().optional(),
    credit_limit: z.coerce.number().optional(),
    cut_day: z.coerce.number().optional(),
    payment_day: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'debit' && !data.account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['account_id'],
        message: 'Selecciona una cuenta para débito',
      })
    }
    if (data.type === 'credit' && !data.credit_limit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['credit_limit'],
        message: 'Límite requerido para crédito',
      })
    }
  })

type FormData = z.infer<typeof schema>

interface CardFormProps {
  accounts: AccountRow[]
  onSuccess?: () => void
}

export function CardForm({ accounts, onSuccess }: CardFormProps) {
  const { session } = useAuth()
  const createCard = useCreateCard()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'credit',
      currency: 'MXN',
    },
  })

  const cardType = form.watch('type')

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) {
      alert('No hay sesión activa')
      return
    }
    createCard.mutate(
      {
        userId: session.user.id,
        ...data,
        account_id: data.account_id || null,
        credit_limit: data.credit_limit ?? undefined,
        cut_day: data.cut_day ?? undefined,
        payment_day: data.payment_day ?? undefined,
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess?.()
        },
        onError: (error: any) => {
          console.error('Error al crear tarjeta:', error)
          alert(`Error: ${error.message || 'Error desconocido'}`)
        },
      },
    )
  }

  return (
    <Card className="mb-6 bg-slate-50">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre de la tarjeta"
            placeholder="Mi Visa"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Marca (opcional)"
            placeholder="Visa, Mastercard..."
            {...form.register('brand')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Tipo"
            options={[
              { value: 'credit', label: '💳 Crédito' },
              { value: 'debit', label: '💰 Débito' },
            ]}
            {...form.register('type')}
          />
          <Select
            label="Moneda"
            options={Array.from(CURRENCIES).map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
        </div>

        {cardType === 'debit' && (
          <Select
            label="Cuenta ligada"
            options={[
              { value: '', label: 'Selecciona una cuenta' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            {...form.register('account_id')}
            error={form.formState.errors.account_id?.message}
          />
        )}

        {cardType === 'credit' && (
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Límite de crédito"
              type="number"
              placeholder="10000"
              step="0.01"
              {...form.register('credit_limit')}
              error={form.formState.errors.credit_limit?.message}
            />
            <Input
              label="Día de corte"
              type="number"
              placeholder="15"
              min="1"
              max="31"
              {...form.register('cut_day')}
            />
            <Input
              label="Día de pago"
              type="number"
              placeholder="5"
              min="1"
              max="31"
              {...form.register('payment_day')}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createCard.isPending}
          >
            {createCard.isPending ? 'Guardando…' : 'Crear tarjeta'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
