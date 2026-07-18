// Extracción heurística de datos (monto, fecha, comercio) del texto OCR de un
// ticket/factura. 100% en el cliente; el usuario siempre revisa el resultado
// antes de confirmar, así que las heurísticas priorizan no inventar datos.

import { parseAmount } from '@/lib/importParser'

export interface ReceiptExtraction {
  amount: number | null
  txDate: string | null // ISO YYYY-MM-DD
  merchant: string | null
  rawText: string
}

// Líneas que suelen contener el total a pagar…
const TOTAL_RE = /TOTAL|IMPORTE|A\s*PAGAR|PAGO\s*TOTAL/i
// …y las que lo parecen pero no lo son.
const NOT_TOTAL_RE = /SUB\s*-?\s*TOTAL|IVA|CAMBIO|EFECTIVO|PROPINA|AHORRO|PUNTOS|DESCUENTO/i

// Tokens con formato de dinero: 123.45, $1,234.56, 1.234,56…
const MONEY_RE = /\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)/g

const MONTHS_ES: Record<string, string> = {
  ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
  JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
}

function moneyTokens(line: string): number[] {
  const out: number[] = []
  for (const m of line.match(MONEY_RE) ?? []) {
    // Decide el separador decimal según el último símbolo (., o ,).
    const sep = m.lastIndexOf(',') > m.lastIndexOf('.') ? ',' : '.'
    const n = parseAmount(m, sep)
    if (n !== null && n > 0) out.push(n)
  }
  return out
}

function extractAmount(lines: string[]): number | null {
  const candidates: number[] = []
  for (const line of lines) {
    if (TOTAL_RE.test(line) && !NOT_TOTAL_RE.test(line)) {
      candidates.push(...moneyTokens(line))
    }
  }
  if (candidates.length > 0) return Math.max(...candidates)
  // Fallback: el mayor token monetario de todo el ticket suele ser el total.
  const all = lines.flatMap(moneyTokens)
  return all.length > 0 ? Math.max(...all) : null
}

function isPlausibleDate(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setFullYear(now.getFullYear() - 2)
  // Tolerancia de 1 día a futuro por zonas horarias.
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return d >= twoYearsAgo && d <= tomorrow
}

function extractDate(lines: string[]): string | null {
  for (const line of lines) {
    // ISO: 2026-07-18
    const iso = line.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
      const s = `${iso[1]}-${iso[2]}-${iso[3]}`
      if (isPlausibleDate(s)) return s
    }
    // DD/MM/YYYY o DD-MM-YY (convención mexicana: día primero)
    const dmy = line.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
    if (dmy) {
      let year = dmy[3]
      if (year.length === 2) year = '20' + year
      const mm = dmy[2].padStart(2, '0')
      const dd = dmy[1].padStart(2, '0')
      if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
        const s = `${year}-${mm}-${dd}`
        if (isPlausibleDate(s)) return s
      }
    }
    // 18 JUL 2026 / 18-ENE-26
    const named = line
      .toUpperCase()
      .match(/(\d{1,2})[\s\-./]*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*[\s\-./]*(\d{2,4})/)
    if (named) {
      let year = named[3]
      if (year.length === 2) year = '20' + year
      const s = `${year}-${MONTHS_ES[named[2]]}-${named[1].padStart(2, '0')}`
      if (isPlausibleDate(s)) return s
    }
  }
  return null
}

// RFC mexicano, teléfonos y líneas de dirección no son el nombre del comercio.
const NOT_MERCHANT_RE =
  /RFC|^[A-Z&Ñ]{3,4}\d{6}|TEL[:.\s]|^\+?\d[\d\s\-()]{6,}$|CALLE|AV\.|AVENIDA|C\.?P\.?\s*\d|COL\.|SUCURSAL|FOLIO|TICKET|FACTURA/i

function extractMerchant(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const clean = line.trim()
    const letters = clean.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
    if (letters.length >= 3 && !NOT_MERCHANT_RE.test(clean)) {
      return clean.slice(0, 40)
    }
  }
  return null
}

export function parseReceiptText(text: string): ReceiptExtraction {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  return {
    amount: extractAmount(lines),
    txDate: extractDate(lines),
    merchant: extractMerchant(lines),
    rawText: text,
  }
}
