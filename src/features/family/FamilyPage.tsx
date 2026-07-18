import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'
import {
  useMyFamilies,
  useMyInvitations,
  useCreateFamily,
  useInviteMember,
  useRespondInvitation,
  useRemoveMember,
  useFamilyMembers,
  useFamilyCards,
  useFamilyCardUsage,
  useShareCard,
  useUnshareCard,
  useFamilyTransactions,
} from '@/hooks/useFamily'
import { useCards, useCardUsage } from '@/hooks/useCards'
import { formatMoney, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { FamilyMemberProfileRow } from '@/types/db'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  accepted: { label: 'Activo', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  rejected: { label: 'Rechazó', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
}

function memberLabel(m: FamilyMemberProfileRow): string {
  return m.full_name || m.invited_email
}

export function FamilyPage() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const email = session?.user?.email ?? profile?.email

  const { data: invitations = [] } = useMyInvitations(email)
  const { data: families = [], isLoading } = useMyFamilies(userId)
  const family = families[0]
  const isOwner = !!family && family.owner_id === userId

  const respondInvitation = useRespondInvitation()
  const createFamily = useCreateFamily()
  const [familyName, setFamilyName] = useState('Mi familia')

  return (
    <div>
      <PageHeader
        title={t('Familia')}
        subtitle={t('Comparte tarjetas con tu familia y lleven los gastos juntos')}
      />

      {/* Invitaciones pendientes (cualquier usuario) */}
      {invitations.map((inv) => (
        <Card key={inv.id} className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              👨‍👩‍👧‍👦 {t('Te invitaron a la familia')}{' '}
              <span className="font-semibold">
                {inv.families?.name ?? t('Sin nombre')}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={respondInvitation.isPending}
                onClick={() =>
                  userId &&
                  respondInvitation.mutate({
                    memberId: inv.id,
                    userId,
                    accept: true,
                  })
                }
              >
                {t('Aceptar')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={respondInvitation.isPending}
                onClick={() =>
                  userId &&
                  respondInvitation.mutate({
                    memberId: inv.id,
                    userId,
                    accept: false,
                  })
                }
              >
                {t('Rechazar')}
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('Cargando…')}</p>
      ) : !family ? (
        profile?.is_premium ? (
          <Card>
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('Crear plan familiar')}
            </p>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              {t('Como jefe de familia podrás invitar a tus familiares por correo y compartirles tus tarjetas de crédito. Ellos registran sus gastos y tú mantienes el control: solo tú ves el límite de tus tarjetas.')}
            </p>
            <div className="flex max-w-md gap-2">
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder={t('Nombre de la familia')}
              />
              <Button
                disabled={createFamily.isPending || !familyName.trim()}
                onClick={() =>
                  userId &&
                  createFamily.mutate(
                    { userId, name: familyName.trim() },
                    { onError: (e: any) => alert(`Error: ${e.message}`) },
                  )
                }
              >
                {t('Crear')}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-amber-200 dark:border-amber-800">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                {t('Función Premium')}
              </Badge>
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
                {t('El plan familiar permite al jefe de familia compartir tarjetas con sus familiares y llevar los gastos del hogar por separado. Hazte Premium para crear tu familia. (Ser miembro invitado no requiere Premium.)')}
              </p>
            </div>
          </Card>
        )
      ) : (
        <FamilyDetail familyId={family.id} familyName={family.name} isOwner={isOwner} />
      )}
    </div>
  )
}

function FamilyDetail({
  familyId,
  familyName,
  isOwner,
}: {
  familyId: string
  familyName: string
  isOwner: boolean
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const userId = session?.user?.id

  const { data: members = [] } = useFamilyMembers(familyId)
  const { data: familyCards = [] } = useFamilyCards(familyId)
  const { data: familyUsage = [] } = useFamilyCardUsage(familyId)
  const { data: familyTxs = [] } = useFamilyTransactions(familyId)
  const { data: myCards = [] } = useCards(isOwner ? userId : undefined)
  const { data: myUsage = [] } = useCardUsage(isOwner ? userId : undefined)

  const inviteMember = useInviteMember()
  const removeMember = useRemoveMember()
  const shareCard = useShareCard()
  const unshareCard = useUnshareCard()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNotice, setInviteNotice] = useState<string | null>(null)

  const sharedIds = new Set(familyCards.map((c) => c.card_id))
  const myCreditCards = myCards.filter((c) => c.type === 'credit')

  // Nombre de quien hizo cada gasto y totales por miembro.
  const nameByUser = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach((m) => {
      if (m.user_id) map[m.user_id] = memberLabel(m)
    })
    return map
  }, [members])

  const totalsByUser = useMemo(() => {
    const totals: Record<string, number> = {}
    familyTxs.forEach((tx) => {
      totals[tx.user_id] = (totals[tx.user_id] ?? 0) + tx.amount
    })
    return totals
  }, [familyTxs])

  const cardNameById = useMemo(() => {
    const map: Record<string, string> = {}
    familyCards.forEach((c) => (map[c.card_id] = c.name))
    return map
  }, [familyCards])

  function handleLeave() {
    const mine = members.find((m) => m.user_id === userId)
    if (!mine) return
    if (!confirm(t('¿Salir de la familia? Tus gastos familiares pasados seguirán en el historial de la familia.'))) return
    removeMember.mutate({ memberId: mine.member_id, familyId })
  }

  return (
    <div className="grid gap-4">
      {/* Miembros */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            👨‍👩‍👧‍👦 {familyName} — {t('miembros')}
          </p>
          {!isOwner && (
            <Button size="sm" variant="ghost" onClick={handleLeave}>
              {t('Salir de la familia')}
            </Button>
          )}
        </div>

        {isOwner && (
          <div className="mb-4">
            <div className="flex max-w-md gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@familiar.com"
              />
              <Button
                size="sm"
                disabled={inviteMember.isPending || !inviteEmail.includes('@')}
                onClick={() =>
                  inviteMember.mutate(
                    { familyId, email: inviteEmail },
                    {
                      onSuccess: (result) => {
                        setInviteEmail('')
                        setInviteNotice(
                          result.emailSent
                            ? t('Invitación enviada por correo.')
                            : t('Invitación creada, pero no se pudo enviar el correo. La persona la verá igual al entrar a FinZen.'),
                        )
                      },
                      onError: (e: any) =>
                        alert(
                          e?.code === '23505'
                            ? t('Ese correo ya fue invitado.')
                            : `Error: ${e.message}`,
                        ),
                    },
                  )
                }
              >
                {t('Invitar')}
              </Button>
            </div>
            {inviteNotice && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {inviteNotice}
              </p>
            )}
          </div>
        )}

        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {members.map((m) => {
            const badge = STATUS_BADGE[m.status]
            return (
              <li
                key={m.member_id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-2">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm">
                      👤
                    </span>
                  )}
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{memberLabel(m)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{m.invited_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.user_id && totalsByUser[m.user_id] != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatMoney(totalsByUser[m.user_id])}
                    </span>
                  )}
                  <Badge className={badge.cls}>{t(badge.label)}</Badge>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            t('¿Quitar a {{name}}? Sus gastos familiares pasados se conservan en el historial.', { name: memberLabel(m) }),
                          )
                        ) {
                          removeMember.mutate({ memberId: m.member_id, familyId })
                        }
                      }}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
          {members.length === 0 && (
            <li className="py-2 text-sm text-slate-500 dark:text-slate-400">
              {t('Aún no hay miembros.')}{' '}
              {isOwner ? t('Invita a alguien con su correo.') : ''}
            </li>
          )}
        </ul>
      </Card>

      {/* Tarjetas compartidas */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          💳 {t('Tarjetas compartidas')}
        </p>

        {isOwner ? (
          myCreditCards.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('No tienes tarjetas de crédito registradas. Crea una en Tarjetas para poder compartirla.')}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {myCreditCards.map((c) => {
                const shared = sharedIds.has(c.id)
                const usage = familyUsage.find((u) => u.card_id === c.id)
                const own = myUsage.find((u) => u.card_id === c.id)
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {c.name}
                        {c.brand ? ` · ${c.brand}` : ''}
                      </p>
                      {shared && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('Gasto familiar:')}{' '}
                          {formatMoney(usage?.family_spent ?? 0, c.currency)}
                          {own && own.credit_limit != null && (
                            <>
                              {' '}
                              · {t('Disponible total:')}{' '}
                              {formatMoney(own.available, c.currency)}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={shared ? 'secondary' : 'primary'}
                      disabled={shareCard.isPending || unshareCard.isPending}
                      onClick={() =>
                        shared
                          ? unshareCard.mutate({ familyId, cardId: c.id })
                          : shareCard.mutate(
                              { familyId, cardId: c.id },
                              {
                                onError: (e: any) =>
                                  alert(`Error: ${e.message}`),
                              },
                            )
                      }
                    >
                      {shared ? t('Dejar de compartir') : t('Compartir')}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )
        ) : familyCards.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('El jefe de familia aún no comparte tarjetas.')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {familyCards.map((c) => {
              const usage = familyUsage.find((u) => u.card_id === c.card_id)
              return (
                <li key={c.card_id} className="py-2">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {c.name}
                    {c.brand ? ` · ${c.brand}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Gasto familiar acumulado:')}{' '}
                    {formatMoney(usage?.family_spent ?? 0, c.currency)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {!isOwner && familyCards.length > 0 && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {t('Registra gastos con estas tarjetas desde Transacciones eligiendo la tarjeta marcada como familiar.')}
          </p>
        )}
      </Card>

      {/* Movimientos familiares */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          💸 {t('Movimientos familiares')}
        </p>
        {familyTxs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Todavía no hay gastos familiares registrados.')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {familyTxs.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {tx.concept ?? t('Sin concepto')}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDate(tx.tx_date)} ·{' '}
                    {nameByUser[tx.user_id] ?? t('Miembro')} ·{' '}
                    {cardNameById[tx.card_id ?? ''] ?? t('Tarjeta')}
                  </p>
                </div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  -{formatMoney(tx.amount, tx.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
