// Parser de facturas CFDI (SAT México, versiones 3.3 y 4.0). El XML es
// estructurado, así que la extracción es exacta (a diferencia del OCR).
// Se lee en el cliente con DOMParser; el usuario revisa antes de confirmar.

export interface CfdiExtraction {
  amount: number | null
  txDate: string | null // YYYY-MM-DD
  merchant: string | null // Nombre del emisor
  rfc: string | null // RFC del emisor
  concept: string | null // primera descripción de concepto o el emisor
  currency: string | null // Moneda (MXN, USD…)
  // TipoDeComprobante del SAT: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago.
  tipo: string | null
}

const EMPTY: CfdiExtraction = {
  amount: null,
  txDate: null,
  merchant: null,
  rfc: null,
  concept: null,
  currency: null,
  tipo: null,
}

// Un CFDI de nómina (tipo "N") lo emite el patrón al trabajador: para quien
// recibe la factura es un INGRESO. El resto (una compra, un servicio) es un
// gasto. Sirve para preseleccionar el tipo de movimiento.
export function cfdiIsIncome(tipo: string | null): boolean {
  return (tipo ?? '').toUpperCase() === 'N'
}

// Busca el primer elemento por nombre local, ignorando el prefijo de namespace
// (cfdi:Comprobante, Comprobante, etc.).
function firstByLocalName(doc: Document, local: string): Element | null {
  const all = doc.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === local) return all[i]
  }
  return null
}

// Lee un atributo probando distintas capitalizaciones.
function attr(el: Element | null, ...names: string[]): string | null {
  if (!el) return null
  for (const n of names) {
    const v = el.getAttribute(n)
    if (v != null && v !== '') return v
  }
  return null
}

export function isCfdiXml(text: string): boolean {
  return /<(\w+:)?Comprobante[\s>]/i.test(text)
}

export function parseCfdiXml(xml: string): CfdiExtraction {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch {
    return { ...EMPTY }
  }
  // parsererror => XML inválido
  if (doc.getElementsByTagName('parsererror').length > 0) return { ...EMPTY }

  const comp = firstByLocalName(doc, 'Comprobante')
  if (!comp) return { ...EMPTY }

  const total = attr(comp, 'Total', 'total')
  const fecha = attr(comp, 'Fecha', 'fecha')
  const moneda = attr(comp, 'Moneda', 'moneda')
  const tipo = attr(comp, 'TipoDeComprobante', 'tipoDeComprobante')

  const emisor = firstByLocalName(doc, 'Emisor')
  const nombre = attr(emisor, 'Nombre', 'nombre')
  const rfc = attr(emisor, 'Rfc', 'rfc', 'RFC')

  const concepto = firstByLocalName(doc, 'Concepto')
  const desc = attr(concepto, 'Descripcion', 'descripcion')

  const amount = total ? parseFloat(total) : null

  return {
    amount: amount != null && Number.isFinite(amount) ? amount : null,
    // Fecha viene como 2024-01-15T10:30:00; tomamos la parte de fecha.
    txDate: fecha ? fecha.slice(0, 10) : null,
    merchant: nombre,
    rfc,
    concept: desc || nombre,
    // Moneda del CFDI; si no es un ISO de 3 letras, se ignora.
    currency: moneda && /^[A-Z]{3}$/.test(moneda) ? moneda : null,
    tipo,
  }
}
