import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Browser } from '@capacitor/browser'
import {
  APP_VERSION,
  APK_URL,
  VERSION_JSON_URL,
  compareVersions,
  type RemoteVersion,
} from '@/lib/appUpdate'

// Aviso de actualización para la app nativa (APK). Consulta version.json en el
// servidor; si hay una versión más nueva que la instalada, ofrece descargar el
// APK actualizado (el service worker no aplica igual dentro del WebView nativo).
export function NativeUpdatePrompt() {
  const { t } = useTranslation()
  const [remote, setRemote] = useState<RemoteVersion | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as RemoteVersion
        if (!cancelled && data?.version) setRemote(data)
      } catch {
        // sin conexión / no disponible: no molestar
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const hasUpdate =
    !!remote && compareVersions(remote.version, APP_VERSION) > 0

  if (!hasUpdate || dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-slate-800 p-3 shadow-lg">
        <span className="text-xl">⬇️</span>
        <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
          {t('Hay una nueva versión ({{v}}). Descarga la actualización.', {
            v: remote!.version,
          })}
        </p>
        <button
          onClick={() => Browser.open({ url: remote!.apkUrl || APK_URL })}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('Descargar')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={t('Cerrar')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
