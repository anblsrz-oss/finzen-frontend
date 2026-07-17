import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useParsingRules, useSaveParsingRule } from '@/hooks/useImports'
import { useQueryClient } from '@tanstack/react-query'
import { isAndroidNative, syncSms } from '@/lib/smsSync'
import { getPlatform } from '@/lib/nativeAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function SmsSyncPage() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const queryClient = useQueryClient()

  const accountsQuery = useAccounts(userId)
  const rulesQuery = useParsingRules(userId, 'sms')
  const saveRule = useSaveParsingRule()

  const accounts = accountsQuery.data || []
  const rules = rulesQuery.data || []

  const [accountId, setAccountId] = useState('')
  const [bankName, setBankName] = useState('')
  const [senders, setSenders] = useState('')
  const [amountRegex, setAmountRegex] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const platform = getPlatform()
  const available = isAndroidNative()

  async function handleSaveRule() {
    if (!userId || !bankName.trim() || !senders.trim()) return
    await saveRule.mutateAsync({
      userId,
      bankName: bankName.trim(),
      channel: 'sms',
      config: {
        senders: senders.split(',').map((s) => s.trim()).filter(Boolean),
        amountRegex: amountRegex.trim() || undefined,
      },
    })
    setBankName('')
    setSenders('')
    setAmountRegex('')
  }

  async function handleSync() {
    if (!userId) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await syncSms(
        userId,
        rules.map((r) => ({ bank_name: r.bank_name, config: r.config })),
        accountId || undefined,
      )
      setMsg(
        `SMS leídos: ${res.found}. Movimientos nuevos (pendientes): ${res.inserted}${
          res.duplicates ? `, ${res.duplicates} duplicados` : ''
        }.`,
      )
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Sincronizar SMS"
        subtitle="Lee las alertas de compra por SMS de tu banco. Disponible solo en la app de Android."
      />

      {!available ? (
        <Card className="border-dashed">
          <p className="text-sm text-slate-600">
            {platform === 'ios'
              ? '📵 Apple no permite que las apps lean SMS. En iPhone usa "Sincronizar correo" o "Importar" tu estado de cuenta.'
              : 'Esta función solo está disponible en la app instalada de Android. En el navegador no se pueden leer SMS.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="grid gap-3">
            <h3 className="text-sm font-semibold text-slate-700">
              1. Remitentes de SMS de tu banco
            </h3>
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
                label="Remitentes (coma)"
                value={senders}
                onChange={(e) => setSenders(e.target.value)}
                placeholder="BBVA, 33000"
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

          <Card className="grid gap-3">
            <h3 className="text-sm font-semibold text-slate-700">
              2. Leer SMS
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
            <div>
              <Button onClick={handleSync} disabled={busy}>
                {busy ? 'Leyendo…' : 'Leer SMS y crear pendientes'}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Se pedirá permiso para leer SMS. Los movimientos se crean como
              pendientes; confírmalos en Transacciones.
            </p>
          </Card>

          {msg && (
            <Card className="border-brand-200 bg-brand-50">
              <p className="text-sm font-medium text-brand-700">{msg}</p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
