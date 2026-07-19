// Configuración del aviso de actualización y descarga del APK.

// Versión actual de la app (inyectada por Vite desde package.json).
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

// URL del APK descargable (GitHub Releases; no usamos Supabase Storage).
// Configurable con VITE_APK_URL.
export const APK_URL: string =
  import.meta.env.VITE_APK_URL ||
  'https://github.com/anblsrz-oss/finzen-frontend/releases/latest/download/finzen.apk'

// version.json publicado junto a la web (public/version.json). La app nativa lo
// consulta para saber si hay una versión más nueva.
export const VERSION_JSON_URL = 'https://finze.xyz/version.json'

export interface RemoteVersion {
  version: string
  apkUrl?: string
  notes?: string
}

// Compara dos versiones semver simples (a>b => 1, a<b => -1, iguales => 0).
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}
