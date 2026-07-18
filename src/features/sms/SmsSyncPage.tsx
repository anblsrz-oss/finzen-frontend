import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        t('SMS leídos: {{found}}. Movimientos nuevos (pendientes): {{inserted}}{{dups}}.', {
          found: res.found,
          inserted: res.inserted,
          dups: res.duplicates ? t(', {{n}} duplicados', { n: res.duplicates }) : '',
        }),
      )
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    } catch (e) {
      setMsg(`${t('Error:')} ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('Sincronizar SMS')}
        subtitle={t('Lee las alertas de compra por SMS de tu banco. Disponible solo en la app de Android.')}
      />

      {!available ? (
        <Card className="border-dashed">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {platform === 'ios'
              ? t('📵 Apple no permite que las apps lean SMS. En iPhone usa "Sincronizar correo" o "Importar" tu estado de cuenta.')
              : t('Esta función solo está disponible en la app instalada de Android. En el navegador no se pueden leer SMS.')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="grid gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('1. Remitentes de SMS de tu banco')}
            </h3>
            {rules.length > 0 && (
              <ul className="text-sm text-slate-600 dark:text-slate-300">
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
                label={t('Banco')}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BBVA"
              />
              <Input
                label={t('Remitentes (coma)')}
                value={senders}
                onChange={(e) => setSenders(e.target.value)}
                placeholder="BBVA, 33000"
              />
              <Input
                label={t('Regex de monto (opcional)')}
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
                {t('Guardar remitente')}
              </Button>
            </div>
          </Card>

          <Card className="grid gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('2. Leer SMS')}
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
            <div>
              <Button onClick={handleSync} disabled={busy}>
                {busy ? t('Leyendo…') : t('Leer SMS y crear pendientes')}
              </Button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t('Se pedirá permiso para leer SMS. Los movimientos se crean como pendientes; confírmalos en Transacciones.')}
            </p>
          </Card>

          {msg && (
            <Card className="border-brand-200 bg-brand-50 dark:bg-brand-800/40">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-500">{msg}</p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
