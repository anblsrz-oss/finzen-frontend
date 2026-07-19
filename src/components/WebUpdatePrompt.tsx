import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'

// Aviso de actualización para web/PWA. Cuando hay un nuevo service worker
// (build desplegado), muestra un banner para recargar con la versión nueva.
export function WebUpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-slate-800 p-3 shadow-lg">
        <span className="text-xl">🔄</span>
        <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
          {t('Hay una nueva versión disponible.')}
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('Actualizar')}
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={t('Cerrar')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
