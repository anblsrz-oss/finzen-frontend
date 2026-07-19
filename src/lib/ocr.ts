// OCR reutilizable con tesseract.js (lazy-loaded para no inflar el bundle).
// Usado para escanear recibos y tarjetas.

// Reduce la imagen a máx. `maxSide` px por lado: acelera el OCR y baja el uso
// de memoria en celulares sin perder legibilidad.
export async function downscaleImage(file: File, maxSide = 1600): Promise<Blob> {
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

// Corre OCR sobre una imagen y devuelve el texto detectado. `onProgress` recibe
// un valor 0..1. `lang` por defecto español.
export async function recognizeImage(
  file: File,
  onProgress?: (p: number) => void,
  lang = 'spa',
): Promise<string> {
  const blob = await downscaleImage(file)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  const {
    data: { text },
  } = await worker.recognize(blob)
  await worker.terminate()
  return text
}
