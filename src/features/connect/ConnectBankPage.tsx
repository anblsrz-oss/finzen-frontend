import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

// Conexión automática con banco vía agregador (Belvo/Finerio) — función Premium.
// Andamiaje: la BD ya tiene `bank_connections` y hay una Edge Function stub
// (supabase/functions/sync-aggregator). No se contrata el agregador todavía;
// se activa cuando el negocio justifique el costo (~$1,000 USD/mes).
export function ConnectBankPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const isPremium = !!profile?.is_premium

  return (
    <>
      <PageHeader
        title={t('Conexión automática')}
        subtitle={t('Sincroniza tus movimientos directo del banco, sin subir archivos.')}
      />

      <Card className="grid gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔗</span>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {t('Premium · Próximamente')}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('Estamos preparando la conexión directa con bancos y SOFIPOs mediante un agregador de Open Finance. Mientras tanto, puedes traer tus movimientos gratis por dos vías:')}
        </p>
        <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong>{t('Importar')}</strong>{' '}
            {t('tu estado de cuenta (CSV) — todas las plataformas.')}
          </li>
          <li>
            <strong>{t('Sincronizar correo')}</strong>{' '}
            {t('de alertas del banco — casi en tiempo real.')}
          </li>
          <li>
            <strong>{t('Leer SMS')}</strong>{' '}
            {t('de alerta — solo en la app de Android.')}
          </li>
        </ul>
        {!isPremium && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('La conexión automática estará disponible en el plan Premium.')}
          </p>
        )}
      </Card>
    </>
  )
}
