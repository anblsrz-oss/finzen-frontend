import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useParsingRules,
  useSaveParsingRule,
  useDeleteParsingRule,
} from '@/hooks/useImports'
import type { ParsingRuleRow } from '@/types/db'
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
  const deleteRule = useDeleteParsingRule()
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
  const [editingId, setEditingId] = useState<string | null>(null)

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

  function resetForm() {
    setBankName('')
    setSenders('')
    setAmountRegex('')
    setConceptRegex('')
    setCurrency('')
    setKind('expense')
    setLast4Regex('')
    setShowAdvanced(false)
    setEditingId(null)
  }

  async function handleSaveRule() {
    if (!userId || !bankName.trim() || !senders.trim()) return
    // Si se renombró el banco durante la edición, el upsert (por bank_name)
    // crearía una regla nueva; borramos la vieja para no duplicar.
    if (editingId && rules.find((r) => r.id === editingId)?.bank_name !== bankName.trim()) {
      await deleteRule.mutateAsync({ userId, id: editingId })
    }
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
    resetForm()
  }

  function handleEditRule(r: ParsingRuleRow) {
    setEditingId(r.id)
    setBankName(r.bank_name)
    setSenders((r.config.senders ?? []).join(', '))
    setAmountRegex(r.config.amountRegex ?? '')
    setConceptRegex(r.config.conceptRegex ?? '')
    setCurrency(r.config.currency ?? '')
    setKind(r.config.kind === 'income' ? 'income' : 'expense')
    setLast4Regex(r.config.last4Regex ?? '')
    setShowAdvanced(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteRule(r: ParsingRuleRow) {
    if (!userId) return
    if (!window.confirm(t('¿Borrar el remitente "{{name}}"?', { name: r.bank_name }))) return
    if (editingId === r.id) resetForm()
    await deleteRule.mutateAsync({ userId, id: r.id })
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
            {editingId
              ? t('Editando: {{name}}', { name: bankName })
              : t('1. Remitentes (banco o proveedor)')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('Indica de qué correos llegan las alertas o tickets (ej.')}{' '}
            <code>notificaciones@bbva.mx</code>). {t('Solo se leen esos correos. Las facturas CFDI (XML) se leen automáticamente sin configurar regex.')}
          </p>
          {rules.length > 0 && (
            <ul className="grid gap-1 text-sm text-slate-600 dark:text-slate-300">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0 truncate">
                    <strong>{r.bank_name}:</strong>{' '}
                    {(r.config.senders ?? []).join(', ')}
                    {r.config.kind === 'income' && ` · ${t('ingreso')}`}
                    {r.config.currency && ` · ${r.config.currency}`}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditRule(r)}
                      className="text-xs font-medium text-brand-700 dark:text-brand-500 hover:underline"
                    >
                      {t('Editar')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r)}
                      disabled={deleteRule.isPending}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {t('Borrar')}
                    </button>
                  </span>
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

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleSaveRule}
              disabled={!bankName.trim() || !senders.trim() || saveRule.isPending}
            >
              {editingId ? t('Guardar cambios') : t('Guardar remitente')}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                {t('Cancelar')}
              </Button>
            )}
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
            {t('¿Error 403 / "Acceso bloqueado" al conectar? Tu correo debe estar añadido como usuario de prueba en la pantalla de consentimiento de OAuth en Google Cloud.')}
          </p>
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
