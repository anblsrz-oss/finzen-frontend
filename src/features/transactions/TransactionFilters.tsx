import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import type { AccountRow, CardRow, CategoryRow } from '@/types/db'

// Estado crudo del formulario. Los montos viven como string porque un input
// vacío no es 0: "" significa "sin filtro" y 0 es un filtro legítimo.
export interface FilterState {
  startDate: string
  endDate: string
  cardIds: string[]
  accountIds: string[]
  categoryIds: string[]
  kind: '' | 'income' | 'expense' | 'transfer' | 'card_payment'
  status: '' | 'pending' | 'settled'
  minAmount: string
  maxAmount: string
  search: string
}

export const EMPTY_FILTERS: FilterState = {
  startDate: '',
  endDate: '',
  cardIds: [],
  accountIds: [],
  categoryIds: [],
  kind: '',
  status: '',
  minAmount: '',
  maxAmount: '',
  search: '',
}

export function countActiveFilters(f: FilterState): number {
  let n = 0
  if (f.startDate) n++
  if (f.endDate) n++
  if (f.cardIds.length) n++
  if (f.accountIds.length) n++
  if (f.categoryIds.length) n++
  if (f.kind) n++
  if (f.status) n++
  if (f.minAmount) n++
  if (f.maxAmount) n++
  if (f.search.trim()) n++
  return n
}

interface TransactionFiltersProps {
  value: FilterState
  onChange: (next: FilterState) => void
  accounts: AccountRow[]
  cards: CardRow[]
  categories: CategoryRow[]
  /** Cuántas transacciones está mostrando la lista con estos filtros. */
  resultCount: number
}

export function TransactionFilters({
  value,
  onChange,
  accounts,
  cards,
  categories,
  resultCount,
}: TransactionFiltersProps) {
  const { t } = useTranslation()
  const active = countActiveFilters(value)
  // Colapsado por defecto: en móvil el panel completo empujaría la lista
  // fuera de pantalla.
  const [open, setOpen] = useState(false)

  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          aria-expanded={open}
        >
          <span>🔍 {t('Filtros')}</span>
          {active > 0 && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
              {active}
            </span>
          )}
          <span className="text-slate-400">{open ? '▴' : '▾'}</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('{{count}} transacciones', { count: resultCount })}
          </span>
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('Limpiar filtros')}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t('Desde')}
            type="date"
            value={value.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
          <Input
            label={t('Hasta')}
            type="date"
            value={value.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
          <Input
            label={t('Buscar')}
            type="search"
            placeholder={t('Concepto o nota…')}
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
          />

          <MultiSelect
            label={t('Tarjeta')}
            options={cards.map((c) => ({ value: c.id, label: c.name }))}
            value={value.cardIds}
            onChange={(v) => set('cardIds', v)}
          />
          <MultiSelect
            label={t('Cuenta')}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={value.accountIds}
            onChange={(v) => set('accountIds', v)}
          />
          <MultiSelect
            label={t('Categoría')}
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.icon || ''} ${t(c.name)}`.trim(),
            }))}
            value={value.categoryIds}
            onChange={(v) => set('categoryIds', v)}
          />

          <Select
            label={t('Tipo')}
            value={value.kind}
            onChange={(e) => set('kind', e.target.value as FilterState['kind'])}
            options={[
              { value: '', label: t('Todos') },
              { value: 'income', label: t('Ingreso') },
              { value: 'expense', label: t('Egreso') },
              { value: 'transfer', label: t('Transferencia') },
              { value: 'card_payment', label: t('Pago de tarjeta') },
            ]}
          />
          <Select
            label={t('Estado')}
            value={value.status}
            onChange={(e) => set('status', e.target.value as FilterState['status'])}
            options={[
              { value: '', label: t('Todos') },
              { value: 'pending', label: t('Pendientes') },
              { value: 'settled', label: t('Conciliadas') },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t('Monto mín.')}
              type="number"
              inputMode="decimal"
              value={value.minAmount}
              onChange={(e) => set('minAmount', e.target.value)}
            />
            <Input
              label={t('Monto máx.')}
              type="number"
              inputMode="decimal"
              value={value.maxAmount}
              onChange={(e) => set('maxAmount', e.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
