import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/store/useAuth'
import { useCreateAccount } from '@/hooks/useAccounts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES_ARRAY, CURRENCIES } from '@/lib/format'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  bank_name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'cash']),
  currency: z.enum(CURRENCIES_ARRAY),
  initial_balance: z.coerce.number().min(0, 'Saldo no puede ser negativo'),
  has_yield: z.boolean().default(false),
  yield_rate: z.coerce.number().optional(),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  onSuccess?: () => void
}

export function AccountForm({ onSuccess }: AccountFormProps) {
  const { session } = useAuth()
  const createAccount = useCreateAccount()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      bank_name: '',
      type: 'checking',
      currency: 'MXN',
      initial_balance: 0,
      has_yield: false,
    },
  })

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) {
      alert('No hay sesión activa')
      return
    }
    createAccount.mutate(
      {
        userId: session.user.id,
        ...data,
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess?.()
        },
        onError: (error: any) => {
          console.error('Error al crear cuenta:', error)
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
            label="Nombre de la cuenta"
            placeholder="Mi cuenta principal"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Banco (opcional)"
            placeholder="Banco X"
            {...form.register('bank_name')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Tipo"
            options={[
              { value: 'checking', label: 'Corriente' },
              { value: 'savings', label: 'Ahorro' },
              { value: 'investment', label: 'Inversión' },
              { value: 'cash', label: 'Efectivo' },
            ]}
            {...form.register('type')}
          />
          <Select
            label="Moneda"
            options={Array.from(CURRENCIES).map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
          <Input
            label="Saldo inicial"
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
            <span className="text-sm font-medium text-slate-700">
              Esta cuenta genera rendimientos
            </span>
          </label>
          {form.watch('has_yield') && (
            <Input
              label="Rendimiento mensual (%)"
              type="number"
              placeholder="0.833"
              step="0.001"
              {...form.register('yield_rate')}
              error={form.formState.errors.yield_rate?.message}
            />
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createAccount.isPending}
          >
            {createAccount.isPending ? 'Guardando…' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
