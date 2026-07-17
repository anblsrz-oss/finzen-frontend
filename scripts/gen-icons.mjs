// Genera los iconos PNG de la app (PWA + base para iconos nativos) a partir de
// un SVG vectorial (sin depender de fuentes de emoji).
// Uso: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

const svg = (bg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${bg === 'maskable' ? 0 : 112}" fill="#0f766e"/>
  <circle cx="256" cy="256" r="${bg === 'maskable' ? 130 : 150}" fill="#ffffff"/>
  <text x="256" y="262" font-family="Arial, Helvetica, sans-serif" font-size="${
    bg === 'maskable' ? 180 : 210
  }" font-weight="700" fill="#0f766e" text-anchor="middle" dominant-baseline="central">$</text>
</svg>`

const targets = [
  { file: 'pwa-192x192.png', size: 192, variant: 'normal' },
  { file: 'pwa-512x512.png', size: 512, variant: 'normal' },
  { file: 'pwa-maskable-512x512.png', size: 512, variant: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, variant: 'normal' },
  { file: 'icon-source-1024.png', size: 1024, variant: 'normal' }, // fuente para @capacitor/assets
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t.variant)))
    .resize(t.size, t.size)
    .png()
    .toFile(join(pub, t.file))
  console.log('✓', t.file, `${t.size}x${t.size}`)
}
