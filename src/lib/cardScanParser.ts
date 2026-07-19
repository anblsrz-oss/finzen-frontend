// Extrae datos NO sensibles del texto OCR de una tarjeta física.
// SEGURIDAD: a propósito solo devuelve marca, últimos 4 dígitos y (si se puede)
// el nombre del titular. NUNCA el número completo, el CVC ni la fecha de
// vencimiento — no se retornan ni se guardan.

export interface CardScanResult {
  brand?: string
  last4?: string
  name?: string
}

// Marca a partir del IIN (primeros dígitos) del número.
function brandFromNumber(digits: string): string | undefined {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'American Express'
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover'
  if (/^3[0689]/.test(digits)) return 'Diners Club'
  if (/^35/.test(digits)) return 'JCB'
  return undefined
}

// Validación de Luhn para descartar secuencias que no son un PAN real.
function luhnValid(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

export function parseCardText(text: string): CardScanResult {
  const result: CardScanResult = {}

  // Buscar grupos de 13-19 dígitos (con espacios/guiones intercalados típicos).
  const candidates = text.match(/\b(?:\d[ -]?){13,19}\b/g) ?? []
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) continue
    // Preferir los que pasan Luhn; si ninguno pasa, usar el primero plausible.
    if (luhnValid(digits) || !result.last4) {
      result.last4 = digits.slice(-4)
      result.brand = brandFromNumber(digits)
      if (luhnValid(digits)) break
    }
  }

  // Nombre del titular: una línea con 2+ palabras en mayúsculas (heurística).
  // Se ignoran líneas con palabras típicas de la tarjeta.
  const IGNORE = /(VALID|THRU|GOOD|MONTH|EXP|CVV|CVC|BANK|CARD|CREDITO|DEBITO|MEMBER|SINCE|VISA|MASTERCARD|AMERICAN|EXPRESS)/i
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (IGNORE.test(trimmed)) continue
    const words = trimmed.split(/\s+/)
    const upperWords = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(w))
    if (upperWords.length >= 2 && upperWords.length <= 4) {
      result.name = upperWords.join(' ')
      break
    }
  }

  return result
}
