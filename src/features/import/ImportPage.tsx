import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { useAuth } from '@/store/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import {
  useConfirmImport,
  useParsingRules,
  useSaveParsingRule,
  type ConfirmRow,
} from '@/hooks/useImports'
import { mapCsvRows } from '@/lib/importParser'
import type { ParsingRuleConfig } from '@/types/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatMoney, formatDate } from '@/lib/format'

const NONE = ''

export function ImportPage() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const accountsQuery = useAccounts(userId)
  const categoriesQuery = useCategories(userId)
  const rulesQuery = useParsingRules(userId, 'csv')
  const confirmImport = useConfirmImport()
  const saveRule = useSaveParsingRule()

  const accounts = accountsQuery.data || []
  const categories = categoriesQuery.data || []
  const rules = rulesQuery.data || []

  const [rawRows, setRawRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState<string>('')
  const [accountId, setAccountId] = useState('')
  const [bankName, setBankName] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [decimalSeparator, setDecimalSeparator] = useState<'.' | ','>('.')
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single')
  const [dateCol, setDateCol] = useState(NONE)
  const [amountCol, setAmountCol] = useState(NONE)
  const [debitCol, setDebitCol] = useState(NONE)
  const [creditCol, setCreditCol] = useState(NONE)
  const [conceptCol, setConceptCol] = useState(NONE)
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const account = accounts.find((a) => a.id === accountId)
  const currency = account?.currency ?? 'MXN'

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (res) => setRawRows(res.data as string[][]),
    })
  }

  const columnCount = rawRows[0]?.length ?? 0
  const headerRow = rawRows[0] ?? []
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows

  const columnOptions = useMemo(() => {
    const opts = [{ value: NONE, label: '— sin asignar —' }]
    for (let i = 0; i < columnCount; i++) {
      const label = hasHeader && headerRow[i] ? headerRow[i] : `Columna ${i + 1}`
      opts.push({ value: String(i), label: `${label}` })
    }
    return opts
  }, [columnCount, hasHeader, headerRow])

  const config: ParsingRuleConfig = useMemo(() => {
    const columns: ParsingRuleConfig['columns'] = {
      date: dateCol !== NONE ? Number(dateCol) : undefined,
      concept: conceptCol !== NONE ? Number(conceptCol) : undefined,
    }
    if (amountMode === 'single') {
      columns.amount = amountCol !== NONE ? Number(amountCol) : undefined
    } else {
      columns.debit = debitCol !== NONE ? Number(debitCol) : undefined
      columns.credit = creditCol !== NONE ? Number(creditCol) : undefined
    }
    return { columns, dateFormat, decimalSeparator, hasHeader }
  }, [
    dateCol,
    conceptCol,
    amountMode,
    amountCol,
    debitCol,
    creditCol,
    dateFormat,
    decimalSeparator,
    hasHeader,
  ])

  const mappingReady =
    dateCol !== NONE &&
    (amountMode === 'single'
      ? amountCol !== NONE
      : debitCol !== NONE || creditCol !== NONE)

  const parsed = useMemo(() => {
    if (!mappingReady || dataRows.length === 0) return null
    return mapCsvRows(dataRows, config, accountId)
  }, [mappingReady, dataRows, config, accountId])

  function applyRule(bank: string) {
    const rule = rules.find((r) => r.bank_name === bank)
    if (!rule) return
    const c = rule.config
    setBankName(bank)
    setHasHeader(c.hasHeader ?? true)
    setDateFormat(c.dateFormat ?? 'DD/MM/YYYY')
    setDecimalSeparator(c.decimalSeparator ?? '.')
    setDateCol(c.columns?.date != null ? String(c.columns.date) : NONE)
    setConceptCol(c.columns?.concept != null ? String(c.columns.concept) : NONE)
    if (c.columns?.amount != null) {
      setAmountMode('single')
      setAmountCol(String(c.columns.amount))
    } else {
      setAmountMode('split')
      setDebitCol(c.columns?.debit != null ? String(c.columns.debit) : NONE)
      setCreditCol(c.columns?.credit != null ? String(c.columns.credit) : NONE)
    }
  }

  async function handleConfirm() {
    if (!userId || !accountId || !parsed) return
    const rows: ConfirmRow[] = parsed.rows.map((r) => ({
      tx_date: r.tx_date,
      amount: r.amount,
      kind: r.kind,
      concept: r.concept,
      external_id: r.external_id,
      category_id: defaultCategoryId || null,
    }))
    const res = await confirmImport.mutateAsync({
      userId,
      accountId,
      currency,
      bankName: bankName || undefined,
      fileName: fileName || undefined,
      channel: 'csv',
      rows,
    })
    setResult(
      `Importadas ${res.inserted} de ${res.total} (${res.duplicates} duplicadas omitidas).`,
    )
    setRawRows([])
    setFileName('')
  }

  async function handleSaveRule() {
    if (!userId || !bankName.trim()) return
    await saveRule.mutateAsync({
      userId,
      bankName: bankName.trim(),
      channel: 'csv',
      config,
    })
  }

  return (
    <>
      <PageHeader
        title="Importar movimientos"
        subtitle="Sube el estado de cuenta (CSV) de tu banco y conviértelo en transacciones. Tus datos no salen a terceros."
      />

      {accounts.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-slate-500">
            Primero crea una cuenta para poder importar movimientos.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Paso 1: cuenta + archivo */}
          <Card className="grid gap-4">
            <h3 className="text-sm font-semibold text-slate-700">
              1. Cuenta destino y archivo
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Cuenta destino"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={[
                  { value: '', label: 'Selecciona una cuenta' },
                  ...accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency})`,
                  })),
                ]}
              />
              {rules.length > 0 && (
                <Select
                  label="Usar mapeo guardado"
                  value={bankName}
                  onChange={(e) => applyRule(e.target.value)}
                  options={[
                    { value: '', label: 'Nuevo mapeo…' },
                    ...rules.map((r) => ({
                      value: r.bank_name,
                      label: r.bank_name,
                    })),
                  ]}
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Archivo CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
              />
            </div>
          </Card>

          {/* Paso 2: mapeo de columnas */}
          {rawRows.length > 0 && (
            <Card className="grid gap-4">
              <h3 className="text-sm font-semibold text-slate-700">
                2. Mapea las columnas de {fileName}
              </h3>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                />
                La primera fila son encabezados
              </label>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="Columna de Fecha"
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  options={columnOptions}
                />
                <Select
                  label="Formato de fecha"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA' },
                    { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD' },
                    { value: 'YYYY/MM/DD', label: 'AAAA/MM/DD' },
                  ]}
                />
                <Select
                  label="Columna de Concepto"
                  value={conceptCol}
                  onChange={(e) => setConceptCol(e.target.value)}
                  options={columnOptions}
                />
                <Select
                  label="Formato de monto"
                  value={amountMode}
                  onChange={(e) =>
                    setAmountMode(e.target.value as 'single' | 'split')
                  }
                  options={[
                    { value: 'single', label: 'Una columna con signo (+/-)' },
                    { value: 'split', label: 'Columnas de cargo y abono' },
                  ]}
                />
                {amountMode === 'single' ? (
                  <Select
                    label="Columna de Monto"
                    value={amountCol}
                    onChange={(e) => setAmountCol(e.target.value)}
                    options={columnOptions}
                  />
                ) : (
                  <>
                    <Select
                      label="Columna de Cargo (egreso)"
                      value={debitCol}
                      onChange={(e) => setDebitCol(e.target.value)}
                      options={columnOptions}
                    />
                    <Select
                      label="Columna de Abono (ingreso)"
                      value={creditCol}
                      onChange={(e) => setCreditCol(e.target.value)}
                      options={columnOptions}
                    />
                  </>
                )}
                <Select
                  label="Separador decimal"
                  value={decimalSeparator}
                  onChange={(e) =>
                    setDecimalSeparator(e.target.value as '.' | ',')
                  }
                  options={[
                    { value: '.', label: 'Punto (1,234.56)' },
                    { value: ',', label: 'Coma (1.234,56)' },
                  ]}
                />
                <Select
                  label="Categoría por defecto (opcional)"
                  value={defaultCategoryId}
                  onChange={(e) => setDefaultCategoryId(e.target.value)}
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: `${c.icon ?? ''} ${c.name}`.trim(),
                    })),
                  ]}
                />
              </div>

              <div className="flex items-end gap-3">
                <Input
                  label="Nombre del banco (para guardar el mapeo)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej. BBVA, Nu, Klar…"
                  className="max-w-xs"
                />
                <Button
                  variant="secondary"
                  onClick={handleSaveRule}
                  disabled={!bankName.trim() || !mappingReady || saveRule.isPending}
                >
                  Guardar mapeo
                </Button>
              </div>
            </Card>
          )}

          {/* Paso 3: previsualización */}
          {parsed && (
            <Card className="grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  3. Previsualización ({parsed.rows.length} movimientos
                  {parsed.errors.length > 0 &&
                    `, ${parsed.errors.length} con error`}
                  )
                </h3>
                <Button
                  onClick={handleConfirm}
                  disabled={
                    !accountId || parsed.rows.length === 0 || confirmImport.isPending
                  }
                >
                  {confirmImport.isPending
                    ? 'Importando…'
                    : `Confirmar e importar (${parsed.rows.length})`}
                </Button>
              </div>

              {!accountId && (
                <p className="text-xs text-amber-600">
                  Selecciona la cuenta destino para poder importar.
                </p>
              )}

              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-600">
                          {formatDate(r.tx_date)}
                        </td>
                        <td className="px-3 py-1.5 text-slate-800">
                          {r.concept}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.kind === 'income' ? '📥 Ingreso' : '📤 Egreso'}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-medium ${
                            r.kind === 'income' ? 'text-green-600' : 'text-slate-800'
                          }`}
                        >
                          {r.kind === 'income' ? '+' : '-'}
                          {formatMoney(r.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 200 && (
                <p className="text-xs text-slate-400">
                  Mostrando 200 de {parsed.rows.length}. Se importarán todos.
                </p>
              )}
            </Card>
          )}

          {result && (
            <Card className="border-green-200 bg-green-50">
              <p className="text-sm font-medium text-green-700">{result}</p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
