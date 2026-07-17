// Parseo de estados de cuenta CSV → filas de staging listas para confirmar.
// Pensado para hacerse 100% en el cliente (sin costo de terceros). El usuario
// mapea las columnas de su banco una vez; el mapeo se guarda como parsing_rule.

import type { TxKind, ParsingRuleConfig } from '@/types/db'

export interface ParsedRow {
  tx_date: string // ISO YYYY-MM-DD
  amount: number // siempre positivo; el signo se refleja en `kind`
  kind: TxKind
  concept: string
  external_id: string
  raw_text: string
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: { line: number; reason: string }[]
}

// Hash determinista (djb2) para dedupe. Mismo movimiento => mismo external_id.
export function hashRow(parts: (string | number)[]): string {
  const str = parts.join('|')
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  // a hex sin signo
  return 'imp_' + (h >>> 0).toString(16)
}

// Convierte "1,234.56" / "1.234,56" / "-45.00" a número.
export function parseAmount(
  raw: string,
  decimalSeparator: '.' | ',' = '.',
): number | null {
  if (raw == null) return null
  let s = String(raw).trim().replace(/\s/g, '')
  if (!s) return null
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-')
  s = s.replace(/[()]/g, '').replace(/[+-]/g, '')
  // quitar símbolo de moneda y letras
  s = s.replace(/[^0-9.,]/g, '')
  if (decimalSeparator === ',') {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  const n = parseFloat(s)
  if (Number.isNaN(n)) return null
  return negative ? -Math.abs(n) : n
}

// Parsea una fecha según un formato simple (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD…).
// Devuelve ISO YYYY-MM-DD o null.
export function parseDate(raw: string, format = 'DD/MM/YYYY'): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  // ISO ya válido
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const nums = s.match(/\d+/g)
  if (!nums || nums.length < 3) return null

  const fmt = format.toUpperCase()
  const order = ['YYYY', 'MM', 'DD'].sort(
    (a, b) => fmt.indexOf(a) - fmt.indexOf(b),
  )
  const map: Record<string, string> = {}
  order.forEach((token, i) => (map[token] = nums[i]))
  let year = map['YYYY'] ?? nums[2]
  if (year.length === 2) year = '20' + year
  const mm = (map['MM'] ?? nums[1]).padStart(2, '0')
  const dd = (map['DD'] ?? nums[0]).padStart(2, '0')
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null
  return `${year}-${mm}-${dd}`
}

function resolveCell(
  row: Record<string, string> | string[],
  key: string | number | undefined,
): string {
  if (key === undefined) return ''
  if (Array.isArray(row)) {
    return typeof key === 'number' ? (row[key] ?? '') : ''
  }
  return row[String(key)] ?? ''
}

// Aplica un mapeo de columnas a las filas ya parseadas por PapaParse.
// `rows` puede venir como objetos (con header) o arreglos (sin header).
export function mapCsvRows(
  rows: (Record<string, string> | string[])[],
  config: ParsingRuleConfig,
  accountId?: string,
): ParseResult {
  const out: ParsedRow[] = []
  const errors: { line: number; reason: string }[] = []
  const cols = config.columns ?? {}
  const dec = config.decimalSeparator ?? '.'

  rows.forEach((row, idx) => {
    const line = idx + 1
    const rawText = Array.isArray(row) ? row.join(',') : Object.values(row).join(',')

    const dateStr = resolveCell(row, cols.date)
    const tx_date = parseDate(dateStr, config.dateFormat)
    if (!tx_date) {
      errors.push({ line, reason: `Fecha inválida: "${dateStr}"` })
      return
    }

    // Monto: columna única con signo, o columnas separadas cargo/abono.
    let signed: number | null = null
    if (cols.amount !== undefined) {
      signed = parseAmount(resolveCell(row, cols.amount), dec)
    } else {
      const debit = parseAmount(resolveCell(row, cols.debit), dec) ?? 0
      const credit = parseAmount(resolveCell(row, cols.credit), dec) ?? 0
      if (credit) signed = Math.abs(credit)
      else if (debit) signed = -Math.abs(debit)
    }
    if (signed === null || signed === 0) {
      errors.push({ line, reason: 'Monto inválido o cero' })
      return
    }

    const kind: TxKind = signed >= 0 ? 'income' : 'expense'
    const amount = Math.abs(signed)
    const concept = resolveCell(row, cols.concept).trim() || 'Sin concepto'

    out.push({
      tx_date,
      amount,
      kind,
      concept,
      external_id: hashRow([accountId ?? '', tx_date, amount, concept]),
      raw_text: rawText,
    })
  })

  return { rows: out, errors }
}
