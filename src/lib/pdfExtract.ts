// Extracción de texto desde un PDF de un solo recibo/factura. Se carga
// perezosamente (import dinámico) para no inflar el bundle inicial.
//
// Estrategia: si el PDF tiene capa de texto real (la mayoría de facturas/
// recibos digitales), se usa directo — es instantáneo y mucho más preciso
// que el OCR. Si no (un PDF que es solo una foto escaneada), se renderiza la
// primera página a un canvas y se corre el mismo OCR que usamos para fotos.

export interface PdfExtraction {
  text: string
  // Data URL de la primera página renderizada, para mostrarla como preview.
  previewDataUrl: string
}

// Por debajo de esto, asumimos que el PDF no tiene texto embebido real.
const TEXT_THRESHOLD = 25

export async function extractFromPdf(
  file: File,
  onOcrProgress?: (p: number) => void,
): Promise<PdfExtraction> {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url'))
    .default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)

  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  const previewDataUrl = canvas.toDataURL('image/jpeg', 0.92)

  const textContent = await page.getTextContent()
  const embeddedText = textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .trim()

  if (embeddedText.length >= TEXT_THRESHOLD) {
    return { text: embeddedText, previewDataUrl }
  }

  // Sin capa de texto (PDF escaneado): OCR sobre la página ya renderizada.
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? new Blob()), 'image/jpeg', 0.92),
  )
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onOcrProgress?.(m.progress)
    },
  })
  const {
    data: { text },
  } = await worker.recognize(blob)
  await worker.terminate()

  return { text, previewDataUrl }
}
