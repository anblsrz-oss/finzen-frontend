// Lectura de SMS de alerta bancaria — SOLO Android (Capacitor).
// iOS bloquea por completo la lectura de SMS por apps de terceros.
//
// Usa un plugin de comunidad para leer el inbox (requiere permiso READ_SMS).
// El import es dinámico y con @vite-ignore para que el build web no falle: el
// plugin nativo solo existe en el APK. Instálalo en el proyecto Android:
//   npm i capacitor-sms-inbox   (o el lector de SMS que prefieras)
//   npx cap sync android
// y declara el permiso READ_SMS en android/app/src/main/AndroidManifest.xml.

import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { toISODate } from '@/lib/dates'
import type { ParsingRuleConfig } from '@/types/db'

const SMS_PLUGIN = 'capacitor-sms-inbox'

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

interface RawSms {
  address: string // remitente
  body: string
  date: number // epoch ms
}

// Adaptador del plugin. Devuelve [] si el plugin no está disponible.
async function readInbox(sinceDays: number): Promise<RawSms[]> {
  if (!isAndroidNative()) return []
  try {
    const mod: any = await import(/* @vite-ignore */ SMS_PLUGIN)
    const SmsInbox = mod.SmsInbox ?? mod.default
    const perm = await SmsInbox.checkPermissions?.()
    if (perm && perm.sms !== 'granted') {
      await SmsInbox.requestPermissions?.()
    }
    const since = Date.now() - sinceDays * 86400_000
    const res = await SmsInbox.getSmsList({
      filter: { minDate: since, maxCount: 500 },
    })
    return (res?.smsList ?? []) as RawSms[]
  } catch (e) {
    console.warn('Plugin de SMS no disponible:', e)
    return []
  }
}

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return 'sms_' + (h >>> 0).toString(16)
}

export interface ParsedSms {
  amount: number
  concept: string
  tx_date: string
  external_id: string
}

// Aplica las reglas del usuario (channel='sms') a los SMS leídos.
function parseSms(
  messages: RawSms[],
  rules: { bank_name: string; config: ParsingRuleConfig }[],
): ParsedSms[] {
  const out: ParsedSms[] = []
  for (const m of messages) {
    const addr = m.address?.toLowerCase() ?? ''
    const rule = rules.find((r) =>
      (r.config.senders ?? []).some((s) => addr.includes(s.toLowerCase())),
    )
    if (rules.length > 0 && !rule) continue // solo remitentes configurados
    const cfg = rule?.config ?? {}
    const amountRe = cfg.amountRegex
      ? new RegExp(cfg.amountRegex, 'i')
      : /\$?\s?([\d,]+\.\d{2})/
    const match = m.body.match(amountRe)
    if (!match) continue
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) continue
    out.push({
      amount,
      concept: (rule?.bank_name ?? 'SMS') + ': ' + m.body.slice(0, 120),
      // Fecha local del SMS: con toISOString() un mensaje recibido de noche
      // (UTC-6) se guardaba con la fecha del dia siguiente.
      tx_date: toISODate(new Date(m.date)),
      external_id: djb2(`${addr}|${m.date}|${m.body}`),
    })
  }
  return out
}

// Lee, parsea e inserta como transacciones PENDIENTES (source='sms').
export async function syncSms(
  userId: string,
  rules: { bank_name: string; config: ParsingRuleConfig }[],
  accountId?: string,
  sinceDays = 30,
): Promise<{ found: number; inserted: number; duplicates: number }> {
  const inbox = await readInbox(sinceDays)
  const parsed = parseSms(inbox, rules)
  if (parsed.length === 0) return { found: inbox.length, inserted: 0, duplicates: 0 }

  const extIds = parsed.map((p) => p.external_id)
  const { data: existing } = await supabase
    .from('transactions')
    .select('external_id')
    .in('external_id', extIds)
  const seen = new Set((existing ?? []).map((r: any) => r.external_id))
  const fresh = parsed.filter((p) => !seen.has(p.external_id))

  if (fresh.length > 0) {
    const payload = fresh.map((p) => ({
      user_id: userId,
      kind: 'expense',
      amount: p.amount,
      currency: 'MXN',
      concept: p.concept,
      account_id: accountId ?? null,
      tx_date: p.tx_date,
      source: 'sms',
      external_id: p.external_id,
      pending: true,
    }))
    const { error } = await supabase.from('transactions').insert(payload)
    if (error) throw error
  }

  return {
    found: inbox.length,
    inserted: fresh.length,
    duplicates: parsed.length - fresh.length,
  }
}
