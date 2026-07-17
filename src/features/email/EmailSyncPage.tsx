import { useEffect, useState } from 'react'
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
        `Correos encontrados: ${res.found}. Movimientos nuevos (pendientes): ${res.inserted}${
          res.duplicates ? `, ${res.duplicates} duplicados` : ''
        }.`,
      )
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`)
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
      },
    })
    setBankName('')
    setSenders('')
    setAmountRegex('')
  }

  return (
    <>
      <PageHeader
        title="Sincronizar correo"
        subtitle="Lee las alertas de tu banco desde tu Gmail y crea movimientos pendientes. Gratis y casi en tiempo real."
      />

      <div className="grid gap-4">
        {/* Reglas por banco */}
        <Card className="grid gap-3">
          <h3 className="text-sm font-semibold text-slate-700">
            1. Remitentes de tu banco
          </h3>
          <p className="text-xs text-slate-500">
            Indica de qué correos llegan las alertas (ej.{' '}
            <code>notificaciones@bbva.mx</code>). Solo se leen esos correos.
          </p>
          {rules.length > 0 && (
            <ul className="text-sm text-slate-600">
              {rules.map((r) => (
                <li key={r.id}>
                  <strong>{r.bank_name}:</strong>{' '}
                  {(r.config.senders ?? []).join(', ')}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Banco"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="BBVA"
            />
            <Input
              label="Remitentes (separados por coma)"
              value={senders}
              onChange={(e) => setSenders(e.target.value)}
              placeholder="notificaciones@bbva.mx"
            />
            <Input
              label="Regex de monto (opcional)"
              value={amountRegex}
              onChange={(e) => setAmountRegex(e.target.value)}
              placeholder="por \\$([\\d,]+\\.\\d{2})"
            />
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={handleSaveRule}
              disabled={!bankName.trim() || !senders.trim() || saveRule.isPending}
            >
              Guardar remitente
            </Button>
          </div>
        </Card>

        {/* Conectar + sincronizar */}
        <Card className="grid gap-3">
          <h3 className="text-sm font-semibold text-slate-700">
            2. Conecta Gmail y sincroniza
          </h3>
          {accounts.length > 0 && (
            <Select
              label="Asignar a la cuenta (opcional)"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'Sin cuenta' },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
            />
          )}
          <div className="flex flex-wrap gap-3">
            {!providerToken ? (
              <Button onClick={() => connectGmail()}>Conectar Gmail</Button>
            ) : (
              <span className="self-center text-sm text-green-600">
                ✓ Gmail conectado
              </span>
            )}
            <Button
              onClick={handleSync}
              disabled={!providerToken || rules.length === 0 || syncEmail.isPending}
            >
              {syncEmail.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Button>
          </div>
          {rules.length === 0 && (
            <p className="text-xs text-amber-600">
              Agrega al menos un remitente arriba antes de sincronizar.
            </p>
          )}
          <p className="text-xs text-slate-400">
            Los movimientos se crean como <strong>pendientes</strong>: revísalos y
            confírmalos en Transacciones para que cuenten en tus saldos.
          </p>
        </Card>

        {msg && (
          <Card className="border-brand-200 bg-brand-50">
            <p className="text-sm font-medium text-brand-700">{msg}</p>
          </Card>
        )}
      </div>
    </>
  )
}
