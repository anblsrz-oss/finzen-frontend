import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useCreateCard, useUpdateCard } from '@/hooks/useCards'
import {
  useCreditLines,
  useCreateCreditLine,
  useUpdateCreditLine,
} from '@/hooks/useCreditLines'
import { normalizeBrand, brandOptions, BRAND_LABELS } from '@/lib/cardBrands'
import { formatMoney } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { CURRENCIES_ARRAY, CURRENCIES } from '@/lib/format'
import { recognizeImage } from '@/lib/ocr'
import { parseCardText } from '@/lib/cardScanParser'
import { CardColorPicker } from './CardColorPicker'
import type { AccountRow, CardRow } from '@/types/db'

// Valor del <Select> de línea de crédito cuando se quiere dar de alta una nueva.
const NEW_LINE = '__new__'

const schema = z
  .object({
    name: z.string().min(1, 'Nombre requerido'),
    // 'other' abre el campo de texto libre; las virtuales no llevan marca.
    brand_option: z.string().optional(),
    brand_other: z.string().optional(),
    type: z.enum(['credit', 'debit']),
    card_format: z.enum(['physical', 'virtual']),
    currency: z.enum(CURRENCIES_ARRAY),
    account_id: z.string().optional(),
    credit_line_id: z.string().optional(),
    // Solo se usan al crear una línea nueva desde aquí.
    line_name: z.string().optional(),
    credit_limit: z.coerce.number().optional(),
    cut_day: z.coerce.number().optional(),
    payment_day: z.coerce.number().optional(),
    dates_may_shift: z.boolean().default(false),
    last4: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}$/.test(v), 'Deben ser 4 dígitos'),
    color: z.string().optional(),
    has_cashback: z.boolean().default(false),
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
    if (data.card_format === 'physical' && !data.brand_option) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_option'],
        message: 'Selecciona la marca',
      })
    }
    if (data.brand_option === 'other' && !data.brand_other?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_other'],
        message: 'Escribe la marca',
      })
    }
    if (data.type === 'credit') {
      if (!data.credit_line_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['credit_line_id'],
          message: 'Selecciona o crea una línea de crédito',
        })
      }
      // Al crear una línea nueva, su límite es obligatorio.
      if (data.credit_line_id === NEW_LINE) {
        if (!data.line_name?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['line_name'],
            message: 'Nombre de la línea requerido',
          })
        }
        if (!data.credit_limit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['credit_limit'],
            message: 'Límite requerido para crédito',
          })
        }
      }
    }
  })

type FormData = z.infer<typeof schema>

interface CardFormProps {
  accounts: AccountRow[]
  card?: CardRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function CardForm({ accounts, card, onSuccess, onCancel }: CardFormProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const createCard = useCreateCard()
  const updateCard = useUpdateCard()
  const createCreditLine = useCreateCreditLine()
  const updateCreditLine = useUpdateCreditLine()
  const { data: creditLines = [] } = useCreditLines(session?.user?.id)
  const isEdit = !!card

  // La marca guardada puede venir de OCR o de captura libre anterior: se
  // reconoce si es una de las conocidas, si no cae en "Otro".
  const knownBrand = normalizeBrand(card?.brand)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: card?.name ?? '',
      brand_option: card ? (knownBrand ?? (card.brand ? 'other' : '')) : '',
      brand_other: card && !knownBrand ? (card.brand ?? '') : '',
      type: card?.type ?? 'credit',
      card_format: card?.card_format ?? 'physical',
      currency: (card?.currency as any) ?? 'MXN',
      account_id: card?.account_id ?? undefined,
      credit_line_id: card?.credit_line_id ?? undefined,
      line_name: '',
      credit_limit: undefined,
      cut_day: undefined,
      payment_day: undefined,
      dates_may_shift: false,
      last4: card?.last4 ?? '',
      color: card?.color ?? undefined,
      has_cashback: card?.has_cashback ?? false,
      is_scholarship: card?.is_scholarship ?? false,
      scholarship_name: card?.scholarship_name ?? '',
    },
  })

  const pending =
    createCard.isPending || updateCard.isPending || createCreditLine.isPending

  const cardType = form.watch('type')
  const cardFormat = form.watch('card_format')
  const brandOption = form.watch('brand_option')
  const selectedLineId = form.watch('credit_line_id')
  const selectedColor = form.watch('color')
  const isNewLine = selectedLineId === NEW_LINE
  const inheritedLine = creditLines.find((l) => l.id === selectedLineId)

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
      if (parsed.brand) {
        // Si se escaneó, es una tarjeta física con marca impresa.
        form.setValue('card_format', 'physical')
        const known = normalizeBrand(parsed.brand)
        form.setValue('brand_option', known ?? 'other')
        if (!known) form.setValue('brand_other', parsed.brand)
      }
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
    const userId = session.user.id
    const isCredit = data.type === 'credit'

    // Las virtuales no traen marca impresa; "Otro" toma el texto libre.
    const brand =
      data.card_format === 'virtual'
        ? null
        : data.brand_option === 'other'
          ? (data.brand_other?.trim() || null)
          : data.brand_option
            ? BRAND_LABELS[data.brand_option as keyof typeof BRAND_LABELS]
            : null

    // Si se pidió una línea nueva hay que crearla antes de la tarjeta, para
    // tener su id. Si falla, no se crea la tarjeta huérfana.
    let creditLineId: string | null = null
    if (isCredit) {
      if (data.credit_line_id === NEW_LINE) {
        try {
          const line = await createCreditLine.mutateAsync({
            userId,
            name: data.line_name!.trim(),
            credit_limit: data.credit_limit!,
            currency: data.currency,
            cut_day: data.cut_day ?? null,
            payment_day: data.payment_day ?? null,
            dates_may_shift: data.dates_may_shift,
          })
          creditLineId = line.id
        } catch (error: any) {
          console.error('Error al crear la línea de crédito:', error)
          alert(`Error: ${error.message || 'Error desconocido'}`)
          return
        }
      } else {
        creditLineId = data.credit_line_id || null
      }
    }

    const payload = {
      userId,
      name: data.name,
      brand,
      type: data.type,
      card_format: data.card_format,
      currency: data.currency,
      account_id: data.account_id || null,
      // El límite y las fechas viven en la línea de crédito.
      credit_line_id: isCredit ? creditLineId : null,
      last4: data.last4 || null,
      color: data.color || null,
      // El cashback solo aplica a tarjetas de crédito.
      has_cashback: isCredit ? data.has_cashback : false,
      is_scholarship: data.is_scholarship,
      scholarship_name: data.is_scholarship ? data.scholarship_name || null : null,
    }
    const handlers = {
      onSuccess: () => {
        form.reset()
        onSuccess?.()
      },
      onError: (error: any) => {
        console.error('Error al guardar tarjeta:', error)
        alert(`Error: ${error.message || 'Error desconocido'}`)
      },
    }
    if (isEdit) {
      updateCard.mutate({ id: card!.id, ...payload }, handlers)
    } else {
      createCard.mutate(payload, handlers)
    }
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
          <Select
            label={t('Formato')}
            options={[
              { value: 'physical', label: t('💳 Física') },
              { value: 'virtual', label: t('☁️ Virtual') },
            ]}
            {...form.register('card_format')}
          />
        </div>

        {/* Las tarjetas virtuales no tienen marca impresa. */}
        {cardFormat === 'physical' && (
          <div className="space-y-2">
            <Select
              label={t('Marca')}
              options={[
                { value: '', label: t('Selecciona una marca') },
                ...brandOptions(t('Otra…')),
              ]}
              {...form.register('brand_option')}
              error={form.formState.errors.brand_option?.message}
            />
            {brandOption === 'other' && (
              <Input
                label={t('¿Cuál marca?')}
                placeholder={t('Ej: Carnet, UnionPay')}
                {...form.register('brand_other')}
                error={form.formState.errors.brand_other?.message}
              />
            )}
          </div>
        )}

        <Input
          label={t('Últimos 4 dígitos (opcional)')}
          placeholder="1234"
          inputMode="numeric"
          maxLength={4}
          {...form.register('last4')}
          error={form.formState.errors.last4?.message}
        />

        <CardColorPicker
          value={selectedColor}
          onChange={(color) => form.setValue('color', color)}
        />

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
          <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Select
              label={t('Línea de crédito')}
              options={[
                { value: '', label: t('Selecciona una línea') },
                ...creditLines.map((l) => ({
                  value: l.id,
                  label: `${l.name} · ${formatMoney(l.credit_limit, l.currency)}`,
                })),
                { value: NEW_LINE, label: t('➕ Nueva línea de crédito') },
              ]}
              {...form.register('credit_line_id')}
              error={form.formState.errors.credit_line_id?.message}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('Varias tarjetas del mismo banco comparten un solo límite y las mismas fechas de corte y pago. Selecciona la línea que ya usas o crea una nueva.')}
            </p>

            {isNewLine && (
              <>
                <Input
                  label={t('Nombre de la línea')}
                  placeholder={t('Ej: Nu')}
                  {...form.register('line_name')}
                  error={form.formState.errors.line_name?.message}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label={t('Límite de crédito')}
                    type="number"
                    placeholder="20000"
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
              </>
            )}

            {/* Al reusar una línea existente, se muestra lo que hereda. El
                corrimiento por días inhábiles se puede activar aquí, porque
                es propiedad de la línea y afecta a todas sus tarjetas. */}
            {inheritedLine && (
              <div className="space-y-2 rounded-md bg-slate-100 p-3 dark:bg-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t('Hereda de {{name}}: límite {{limit}}{{dates}}', {
                    name: inheritedLine.name,
                    limit: formatMoney(inheritedLine.credit_limit, inheritedLine.currency),
                    dates:
                      inheritedLine.cut_day && inheritedLine.payment_day
                        ? t(', corte el día {{cut}} y pago el día {{pay}}', {
                            cut: inheritedLine.cut_day,
                            pay: inheritedLine.payment_day,
                          })
                        : '',
                  })}
                </p>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 cursor-pointer"
                    checked={inheritedLine.dates_may_shift}
                    disabled={updateCreditLine.isPending}
                    onChange={(e) =>
                      updateCreditLine.mutate({
                        id: inheritedLine.id,
                        userId: session!.user.id,
                        dates_may_shift: e.target.checked,
                      })
                    }
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200">
                    📅 {t('Las fechas se recorren en días inhábiles')}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {cardType === 'credit' && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('has_cashback')}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              💸 {t('Ofrece cashback')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t('(regístralo como ingreso con la categoría Cashback)')}
            </span>
          </label>
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
          <Button type="submit" disabled={pending}>
            {pending
              ? t('Guardando…')
              : isEdit
                ? t('Guardar cambios')
                : t('Crear tarjeta')}
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
