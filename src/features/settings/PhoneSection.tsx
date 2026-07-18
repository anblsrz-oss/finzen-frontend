import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

// Vinculación de teléfono con verificación por SMS (Supabase Auth + proveedor
// Phone, p. ej. Twilio). Si el proveedor no está configurado en Supabase, el
// envío falla con un mensaje claro; el resto de la app no se ve afectada.
export function PhoneSection() {
  const { t } = useTranslation()
  const { session, refreshProfile } = useAuth()
  const currentPhone = session?.user?.phone

  const [editing, setEditing] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  function resetFlow() {
    setEditing(false)
    setCodeSent(false)
    setPhone('')
    setCode('')
    setError(null)
  }

  async function sendCode() {
    setError(null)
    const e164 = phone.trim()
    if (!/^\+\d{8,15}$/.test(e164)) {
      setError(t('Escribe tu número en formato internacional, ej. +5215512345678'))
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ phone: e164 })
      if (error) throw error
      setCodeSent(true)
      setCooldown(60)
    } catch (e: any) {
      setError(
        e?.message?.toLowerCase().includes('provider') ||
          e?.message?.toLowerCase().includes('sms')
          ? t('El envío de SMS no está configurado. Contacta al administrador.')
          : e?.message ?? t('No se pudo enviar el código.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode() {
    setError(null)
    setBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: code.trim(),
        type: 'phone_change',
      })
      if (error) throw error
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ phone: phone.trim() })
          .eq('id', session.user.id)
      }
      await refreshProfile()
      resetFlow()
    } catch (e: any) {
      setError(e?.message ?? t('Código incorrecto.'))
    } finally {
      setBusy(false)
    }
  }

  // Vista compacta: teléfono verificado y no estamos editando.
  if (currentPhone && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-700 dark:text-slate-200">{currentPhone}</p>
          <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            {t('Verificado')}
          </Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          {t('Cambiar')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!codeSent ? (
        <>
          <Input
            label={t('Número de teléfono')}
            placeholder="+5215512345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={sendCode}>
              {busy ? t('Enviando…') : t('Enviar código')}
            </Button>
            {currentPhone && (
              <Button variant="ghost" onClick={resetFlow}>
                {t('Cancelar')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <Input
            label={t('Código de verificación')}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={busy || !code.trim()} onClick={verifyCode}>
              {busy ? t('Verificando…') : t('Verificar')}
            </Button>
            <Button
              variant="ghost"
              disabled={cooldown > 0 || busy}
              onClick={sendCode}
            >
              {cooldown > 0
                ? t('Reenviar en {{s}}s', { s: cooldown })
                : t('Reenviar código')}
            </Button>
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
