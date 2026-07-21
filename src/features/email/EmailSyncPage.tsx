import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useParsingRules, useSaveParsingRule } from '@/hooks/useImports'
import {
  connectGmail,
  getProviderToken,
  useSyncEmail,
} from '@/hooks/useEmailSync'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function EmailSyncPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id

  const accountsQuery = useAccounts(userId)
  const rulesQuery = useParsingRules(userId, 'email')
  const saveRule = useSaveParsingRule()
  const syncEmail = useSyncEmail()

  const accounts = accountsQuery.data || []
  const rules = rulesQuery.data || []

  const [providerToken, setProviderToken] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  // Regla nueva
  const [bankName, setBankName] = useState('')
  const [senders, setSenders] = useState('')
  const [amountRegex, setAmountRegex] = useState('')
  const [conceptRegex, setConceptRegex] = useState('')
  const [currency, setCurrency] = useState('')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [last4Regex, setLast4Regex] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    // Al volver del consentimiento de Gmail, la sesión trae el provider_token.
    void getProviderToken().then(setProviderToken)
  }, [session])

  async function handleSync() {
    if (!userId || !providerToken) return
    setMsg(null)
    try {
      const res = await syncEmail.mutateAsync({
        userId,
        providerToken,
        accountId: accountId || undefined,
        sinceDays: 30,
      })
      setMsg(
        t('Correos encontrados: {{found}}. Movimientos nuevos (pendientes): {{inserted}}{{dups}}.', {
          found: res.found,
          inserted: res.inserted,
          dups: res.duplicates ? t(', {{n}} duplicados', { n: res.duplicates }) : '',
        }),
      )
    } catch (e) {
      setMsg(`${t('Error:')} ${(e as Error).message}`)
    }
  }

  async function handleSaveRule() {
    if (!userId || !bankName.trim() || !senders.trim()) return
    await saveRule.mutateAsync({
      userId,
      bankName: bankName.trim(),
      channel: 'email',
      config: {
        senders: senders
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        amountRegex: amountRegex.trim() || undefined,
        conceptRegex: conceptRegex.trim() || undefined,
        currency: currency.trim() || undefined,
        kind,
        last4Regex: last4Regex.trim() || undefined,
      },
    })
    setBankName('')
    setSenders('')
    setAmountRegex('')
    setConceptRegex('')
    setCurrency('')
    setKind('expense')
    setLast4Regex('')
    setShowAdvanced(false)
  }

  return (
    <>
      <PageHeader
        title={t('Sincronizar correo')}
        subtitle={t('Lee alertas de tu banco y correos de proveedores (facturas, tickets, domiciliados) desde tu Gmail y crea movimientos pendientes. Gratis y casi en tiempo real.')}
      />

      <div className="grid gap-4">
        {/* Reglas por banco */}
        <Card className="grid gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('1. Remitentes (banco o proveedor)')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Indica de qué correos llegan las alertas o tickets (ej.')}{' '}
            <code>notificaciones@bbva.mx</code>). {t('Solo se leen esos correos. Las facturas CFDI (XML) se leen automáticamente sin configurar regex.')}
          </p>
          {rules.length > 0 && (
            <ul className="text-sm text-slate-600 dark:text-slate-300">
              {rules.map((r) => (
                <li key={r.id}>
                  <strong>{r.bank_name}:</strong>{' '}
                  {(r.config.senders ?? []).join(', ')}
                  {r.config.kind === 'income' && ` · ${t('ingreso')}`}
                  {r.config.currency && ` · ${r.config.currency}`}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label={t('Banco o proveedor')}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="BBVA / CFE / Netflix"
            />
            <Input
              label={t('Remitentes (separados por coma)')}
              value={senders}
              onChange={(e) => setSenders(e.target.value)}
              placeholder="notificaciones@bbva.mx"
            />
            <Input
              label={t('Regex de monto (opcional)')}
              value={amountRegex}
              onChange={(e) => setAmountRegex(e.target.value)}
              placeholder="por \\$([\\d,]+\\.\\d{2})"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-fit text-xs font-medium text-brand-700 dark:text-brand-500 hover:underline"
          >
            {showAdvanced ? t('▲ Ocultar opciones avanzadas') : t('▼ Opciones avanzadas (moneda, tipo, concepto, tarjeta)')}
          </button>

          {showAdvanced && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t('Tipo de movimiento')}
                value={kind}
                onChange={(e) => setKind(e.target.value as 'expense' | 'income')}
                options={[
                  { value: 'expense', label: t('📤 Egreso') },
                  { value: 'income', label: t('📥 Ingreso') },
                ]}
              />
              <Input
                label={t('Moneda (opcional, ej. MXN, USD)')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="MXN"
                maxLength={3}
              />
              <Input
                label={t('Regex de concepto (opcional)')}
                value={conceptRegex}
                onChange={(e) => setConceptRegex(e.target.value)}
                placeholder="en (.+?) por"
              />
              <Input
                label={t('Regex de terminación de tarjeta (opcional)')}
                value={last4Regex}
                onChange={(e) => setLast4Regex(e.target.value)}
                placeholder="terminada en (\\d{4})"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 sm:col-span-2">
                {t('Si el correo trae la terminación de la tarjeta, se asignará automáticamente la tarjeta que coincida (y su cuenta ligada).')}
              </p>
            </div>
          )}

          <div>
            <Button
              variant="secondary"
              onClick={handleSaveRule}
              disabled={!bankName.trim() || !senders.trim() || saveRule.isPending}
            >
              {t('Guardar remitente')}
            </Button>
          </div>
        </Card>

        {/* Conectar + sincronizar */}
        <Card className="grid gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('2. Conecta Gmail y sincroniza')}
          </h3>
          {accounts.length > 0 && (
            <Select
              label={t('Asignar a la cuenta (opcional)')}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: t('Sin cuenta') },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
            />
          )}
          <div className="flex flex-wrap gap-3">
            {!providerToken ? (
              <Button onClick={() => connectGmail()}>{t('Conectar Gmail')}</Button>
            ) : (
              <span className="self-center text-sm text-green-600">
                ✓ {t('Gmail conectado')}
              </span>
            )}
            <Button
              onClick={handleSync}
              disabled={!providerToken || rules.length === 0 || syncEmail.isPending}
            >
              {syncEmail.isPending ? t('Sincronizando…') : t('Sincronizar ahora')}
            </Button>
          </div>
          {rules.length === 0 && (
            <p className="text-xs text-amber-600">
              {t('Agrega al menos un remitente arriba antes de sincronizar.')}
            </p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('Los movimientos se crean como pendientes: revísalos y confírmalos en Transacciones para que cuenten en tus saldos.')}
          </p>
        </Card>

        {msg && (
          <Card className="border-brand-200 bg-brand-50 dark:bg-brand-800/40">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-500">{msg}</p>
          </Card>
        )}
      </div>
    </>
  )
}
