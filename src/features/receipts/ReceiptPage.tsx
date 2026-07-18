import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCategories } from '@/hooks/useCategories'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { parseReceiptText } from '@/lib/receiptParser'
import { hashRow } from '@/lib/importParser'
import { extractFromPdf } from '@/lib/pdfExtract'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const schema = z.object({
  amount: z.coerce.number().positive('Monto debe ser mayor a 0'),
  currency: z.string(),
  txDate: z.string().min(1, 'Fecha requerida'),
  concept: z.string().min(1, 'Concepto requerido'),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Step = 'capture' | 'ocr' | 'review' | 'done'

// Reduce la foto a máx. 1600px por lado: acelera el OCR y baja el consumo de
// memoria en celulares sin perder legibilidad del ticket.
async function downscaleImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.92),
  )
}

export function ReceiptPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id
  const { data: accounts = [] } = useAccounts(userId)
  const { data: cards = [] } = useCards(userId)
  const { data: categories = [] } = useCategories(userId)
  const createTransaction = useCreateTransaction()

  const [step, setStep] = useState<Step>('capture')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'MXN',
      txDate: new Date().toISOString().split('T')[0],
    },
  })

  async function handleFile(file: File) {
    fileRef.current = file
    setErrorMsg(null)
    if (file.type === 'application/pdf') {
      await runPdfExtraction(file)
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
      await runOcr(file)
    }
  }

  // Aplica el texto detectado (por OCR o extraído del PDF) al formulario de
  // revisión y avanza al paso siguiente.
  function applyExtractedText(text: string) {
    setRawText(text)
    const extracted = parseReceiptText(text)
    form.reset({
      amount: (extracted.amount ?? undefined) as number | undefined,
      currency: 'MXN',
      txDate: extracted.txDate ?? new Date().toISOString().split('T')[0],
      concept: extracted.merchant ?? '',
      categoryId: '',
      accountId: '',
      cardId: '',
    })
    setStep('review')
  }

  async function runOcr(file: File) {
    setStep('ocr')
    setProgress(0)
    try {
      const blob = await downscaleImage(file)
      // Lazy-load: tesseract.js (~3-4 MB con worker+idioma, cacheado) queda
      // fuera del bundle inicial.
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(m.progress)
        },
      })
      const {
        data: { text },
      } = await worker.recognize(blob)
      await worker.terminate()

      applyExtractedText(text)
    } catch (err: any) {
      setErrorMsg(
        t('No se pudo leer el ticket: {{error}}. Revisa tu conexión (la primera vez se descarga el motor OCR) e intenta de nuevo.', {
          error: err?.message ?? t('error desconocido'),
        }),
      )
      setStep('capture')
    }
  }

  async function runPdfExtraction(file: File) {
    setStep('ocr')
    setProgress(0)
    try {
      // Lazy-load: pdfjs-dist (~1-2 MB, cacheado) queda fuera del bundle inicial.
      const { text, previewDataUrl } = await extractFromPdf(file, setProgress)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(previewDataUrl)
      applyExtractedText(text)
    } catch (err: any) {
      setErrorMsg(
        t('No se pudo leer el PDF: {{error}}. Intenta con otro archivo o con una foto del recibo.', {
          error: err?.message ?? t('error desconocido'),
        }),
      )
      setStep('capture')
    }
  }

  function onSubmit(data: FormData) {
    if (!userId) return
    if (!data.accountId && !data.cardId) {
      alert(t('Selecciona una cuenta o tarjeta'))
      return
    }
    createTransaction.mutate(
      {
        userId,
        kind: 'expense',
        amount: data.amount,
        currency: data.currency,
        concept: data.concept,
        categoryId: data.categoryId,
        accountId: data.accountId,
        cardId: data.cardId,
        txDate: data.txDate,
        source: 'receipt',
        externalId: hashRow(['receipt', data.txDate, data.amount, data.concept]),
      },
      {
        onSuccess: () => setStep('done'),
        onError: (error: any) => {
          if (error?.code === '23505') {
            alert(t('Este recibo ya fue registrado (movimiento duplicado).'))
          } else {
            alert(`Error: ${error.message}`)
          }
        },
      },
    )
  }

  function resetAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setRawText('')
    setShowRaw(false)
    setErrorMsg(null)
    fileRef.current = null
    form.reset({
      currency: 'MXN',
      txDate: new Date().toISOString().split('T')[0],
    })
    setStep('capture')
  }

  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  return (
    <div>
      <PageHeader
        title={t('Escanear recibo')}
        subtitle={t('Toma una foto del ticket y registra el gasto automáticamente')}
      />

      {step === 'capture' && (
        <Card>
          {errorMsg && (
            <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMsg}
            </p>
          )}
          <div className="flex flex-col items-center gap-4 py-6">
            <span className="text-5xl">🧾</span>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {t('Fotografía el ticket con buena luz y lo más plano posible, o sube un PDF de tu factura/recibo. Después podrás revisar y corregir los datos detectados.')}
            </p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-700">
                📷 {t('Tomar foto')}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="cursor-pointer text-sm text-brand-700 dark:text-brand-500 underline">
              {t('o subir una imagen o PDF existente')}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </Card>
      )}

      {step === 'ocr' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-6">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Ticket"
                className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
              />
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('Leyendo el ticket…')}</p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('Revisa y corrige los datos')}
            </p>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('Fecha')}
                  type="date"
                  {...form.register('txDate')}
                  error={form.formState.errors.txDate?.message}
                />
                <Select
                  label={t('Categoría')}
                  options={[
                    { value: '', label: t('Sin categoría') },
                    ...expenseCategories.map((c) => ({
                      value: c.id,
                      label: `${c.icon} ${c.name}`,
                    })),
                  ]}
                  {...form.register('categoryId')}
                />
              </div>
              <Input
                label={t('Concepto / comercio')}
                placeholder={t('Ej: Supermercado')}
                {...form.register('concept')}
                error={form.formState.errors.concept?.message}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label={t('Cuenta')}
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
                  ]}
                  {...form.register('cardId')}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? t('Guardando…') : t('Registrar gasto')}
                </Button>
                <Button type="button" variant="ghost" onClick={resetAll}>
                  {t('Cancelar')}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Ticket"
                className="mx-auto max-h-72 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
              />
            )}
            <button
              type="button"
              className="mt-3 text-sm text-brand-700 dark:text-brand-500 underline"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? t('Ocultar texto detectado') : t('Ver texto detectado')}
            </button>
            {showRaw && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-300">
                {rawText || t('(sin texto)')}
              </pre>
            )}
          </Card>
        </div>
      )}

      {step === 'done' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-6">
            <span className="text-5xl">✅</span>
            <p className="text-sm text-slate-700 dark:text-slate-200">{t('Gasto registrado correctamente.')}</p>
            <div className="flex gap-2">
              <Button onClick={resetAll}>{t('Escanear otro')}</Button>
              <Link to="/transacciones">
                <Button variant="secondary">{t('Ver movimientos')}</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
