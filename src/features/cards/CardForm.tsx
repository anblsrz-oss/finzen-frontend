import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateCard } from '@/hooks/useCards'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES_ARRAY, CURRENCIES } from '@/lib/format'
import { recognizeImage } from '@/lib/ocr'
import { parseCardText } from '@/lib/cardScanParser'
import { CARD_GRADIENTS, CARD_GRADIENT_KEYS } from './CardVisual'
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
    last4: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}$/.test(v), 'Deben ser 4 dígitos'),
    color: z.string().optional(),
    is_scholarship: z.boolean().default(false),
    scholarship_name: z.string().optional(),
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
  const { t } = useTranslation()
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
  const selectedColor = form.watch('color')

  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanMsg, setScanMsg] = useState<string | null>(null)

  // Escanea la tarjeta con la cámara y rellena nombre/marca/últimos 4. Por
  // seguridad NO se lee ni guarda el número completo, el CVC ni la fecha.
  async function handleScan(file: File) {
    setScanning(true)
    setScanProgress(0)
    setScanMsg(null)
    try {
      const text = await recognizeImage(file, setScanProgress, 'eng')
      const parsed = parseCardText(text)
      if (parsed.last4) form.setValue('last4', parsed.last4)
      if (parsed.brand) form.setValue('brand', parsed.brand)
      if (parsed.name && !form.getValues('name')) {
        form.setValue('name', parsed.name)
      }
      setScanMsg(
        parsed.last4
          ? t('Detectado: {{brand}} ····{{last4}}. Revisa y completa los datos.', {
              brand: parsed.brand ?? t('tarjeta'),
              last4: parsed.last4,
            })
          : t('No se detectaron los datos. Captúralos manualmente.'),
      )
    } catch (err: any) {
      setScanMsg(
        t('No se pudo leer la tarjeta: {{error}}. Captúrala manualmente.', {
          error: err?.message ?? t('error desconocido'),
        }),
      )
    } finally {
      setScanning(false)
    }
  }

  async function onSubmit(data: FormData) {
    if (!session?.user?.id) {
      alert(t('No hay sesión activa'))
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
        last4: data.last4,
        color: data.color,
        is_scholarship: data.is_scholarship,
        scholarship_name: data.scholarship_name,
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
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Escanear tarjeta con la cámara */}
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-500">
            📷 {scanning ? t('Leyendo tarjeta…') : t('Escanear tarjeta con la cámara')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={scanning}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleScan(f)
                e.target.value = ''
              }}
            />
          </label>
          {scanning && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${Math.round(scanProgress * 100)}%` }}
              />
            </div>
          )}
          {scanMsg && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{scanMsg}</p>
          )}
          <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {t('Por tu seguridad solo se leen la marca y los últimos 4 dígitos. No se guarda el número completo, CVC ni la fecha.')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Nombre de la tarjeta')}
            placeholder={t('Mi Visa')}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Input
            label={t('Marca (opcional)')}
            placeholder={t('Visa, Mastercard...')}
            {...form.register('brand')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('Últimos 4 dígitos (opcional)')}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            {...form.register('last4')}
            error={form.formState.errors.last4?.message}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('Color de la tarjeta')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CARD_GRADIENT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => form.setValue('color', key)}
                  className={`h-8 w-8 rounded-lg bg-gradient-to-br ${CARD_GRADIENTS[key]} transition-transform ${
                    selectedColor === key
                      ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900'
                      : 'hover:scale-105'
                  }`}
                  aria-label={key}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label={t('Tipo')}
            options={[
              { value: 'credit', label: t('💳 Crédito') },
              { value: 'debit', label: t('💰 Débito') },
            ]}
            {...form.register('type')}
          />
          <Select
            label={t('Moneda')}
            options={Array.from(CURRENCIES).map((c) => ({ value: c, label: c }))}
            {...form.register('currency')}
          />
        </div>

        {cardType === 'debit' && (
          <Select
            label={t('Cuenta ligada')}
            options={[
              { value: '', label: t('Selecciona una cuenta') },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            {...form.register('account_id')}
            error={form.formState.errors.account_id?.message}
          />
        )}

        {cardType === 'credit' && (
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('Límite de crédito')}
              type="number"
              placeholder="10000"
              step="0.01"
              {...form.register('credit_limit')}
              error={form.formState.errors.credit_limit?.message}
            />
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
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('is_scholarship')}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              🎓 {t('Es una tarjeta de beca')}
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
          <Button
            type="submit"
            disabled={createCard.isPending}
          >
            {createCard.isPending ? t('Guardando…') : t('Crear tarjeta')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
