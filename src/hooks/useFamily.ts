import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  FamilyRow,
  FamilyMemberRow,
  FamilyCardRow,
  FamilyCardUsageRow,
  FamilyMemberProfileRow,
  TransactionRow,
} from '@/types/db'

// Familias donde participo (dueño o miembro aceptado; RLS filtra).
export function useMyFamilies(userId?: string) {
  return useQuery({
    queryKey: ['families', userId],
    queryFn: async () => {
      if (!userId) return []
      // RLS también devuelve familias donde solo tengo invitación pendiente;
      // aquí interesan las activas: las mías + donde soy miembro aceptado.
      const [owned, memberships] = await Promise.all([
        supabase.from('families').select('*').eq('owner_id', userId),
        supabase
          .from('family_members')
          .select('families(*)')
          .eq('user_id', userId)
          .eq('status', 'accepted'),
      ])
      if (owned.error) throw owned.error
      if (memberships.error) throw memberships.error
      const viaMembership = (memberships.data || [])
        .map((m: any) => m.families as FamilyRow | null)
        .filter((f: FamilyRow | null): f is FamilyRow => !!f)
      return [...((owned.data || []) as FamilyRow[]), ...viaMembership]
    },
    enabled: !!userId,
  })
}

// Invitaciones pendientes dirigidas a mi correo.
export function useMyInvitations(email?: string | null) {
  const normalized = email?.trim().toLowerCase()
  return useQuery({
    queryKey: ['family_invitations', normalized],
    queryFn: async () => {
      if (!normalized) return []
      const { data, error } = await supabase
        .from('family_members')
        .select('*, families(name)')
        .eq('status', 'pending')
        .is('user_id', null)
        .eq('invited_email', normalized)
      if (error) throw error
      return (data || []) as (FamilyMemberRow & {
        families: { name: string } | null
      })[]
    },
    enabled: !!normalized,
  })
}

export function useCreateFamily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; name: string }) => {
      const { data, error } = await supabase
        .from('families')
        .insert([{ owner_id: input.userId, name: input.name }])
        .select()
        .single()
      if (error) throw error
      return data as FamilyRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['families', input.userId] })
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { familyId: string; email: string }) => {
      const email = input.email.trim().toLowerCase()
      const { data, error } = await supabase
        .from('family_members')
        .insert([{ family_id: input.familyId, invited_email: email }])
        .select()
        .single()
      if (error) throw error

      // El correo es "best effort": si falla, la invitación ya quedó creada
      // y el invitado la ve igual al entrar a la app con esa cuenta.
      let emailSent = false
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'invite-family-email',
          { body: { familyId: input.familyId, email } },
        )
        emailSent = !fnError && !!fnData?.sent
      } catch {
        emailSent = false
      }

      return { member: data as FamilyMemberRow, emailSent }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['family_members', input.familyId],
      })
    },
  })
}

export function useRespondInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      memberId: string
      userId: string
      accept: boolean
    }) => {
      const patch = input.accept
        ? {
            status: 'accepted',
            user_id: input.userId,
            responded_at: new Date().toISOString(),
          }
        : { status: 'rejected', responded_at: new Date().toISOString() }
      const { error } = await supabase
        .from('family_members')
        .update(patch)
        .eq('id', input.memberId)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['families', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['family_invitations'] })
    },
  })
}

// Elimina la familia completa (solo el dueño). Vía RPC security definer que
// borra los gastos familiares, los miembros y las tarjetas compartidas.
export function useDeleteFamily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { familyId: string; userId: string }) => {
      const { error } = await supabase.rpc('delete_family', {
        p_family_id: input.familyId,
      })
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['families', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['families'] })
      queryClient.invalidateQueries({ queryKey: ['family_invitations'] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { memberId: string; familyId: string }) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', input.memberId)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['family_members', input.familyId],
      })
      queryClient.invalidateQueries({ queryKey: ['families'] })
    },
  })
}

// Miembros con nombre/avatar (vista family_member_profiles).
export function useFamilyMembers(familyId?: string) {
  return useQuery({
    queryKey: ['family_members', familyId],
    queryFn: async () => {
      if (!familyId) return []
      const { data, error } = await supabase
        .from('family_member_profiles')
        .select('*')
        .eq('family_id', familyId)
      if (error) throw error
      return (data || []) as FamilyMemberProfileRow[]
    },
    enabled: !!familyId,
  })
}

// Tarjetas compartidas visibles para mí (vista family_cards, SIN límite).
export function useFamilyCards(familyId?: string) {
  return useQuery({
    queryKey: ['family_cards', familyId],
    queryFn: async () => {
      if (!familyId) return []
      const { data, error } = await supabase
        .from('family_cards')
        .select('*')
        .eq('family_id', familyId)
      if (error) throw error
      return (data || []) as FamilyCardRow[]
    },
    enabled: !!familyId,
  })
}

export function useFamilyCardUsage(familyId?: string) {
  return useQuery({
    queryKey: ['family_card_usage', familyId],
    queryFn: async () => {
      if (!familyId) return []
      const { data, error } = await supabase
        .from('family_card_usage')
        .select('*')
        .eq('family_id', familyId)
      if (error) throw error
      return (data || []) as FamilyCardUsageRow[]
    },
    enabled: !!familyId,
  })
}

export function useShareCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { familyId: string; cardId: string }) => {
      const { error } = await supabase
        .from('family_shared_cards')
        .insert([{ family_id: input.familyId, card_id: input.cardId }])
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['family_cards', input.familyId],
      })
      queryClient.invalidateQueries({
        queryKey: ['family_card_usage', input.familyId],
      })
    },
  })
}

export function useUnshareCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { familyId: string; cardId: string }) => {
      const { error } = await supabase
        .from('family_shared_cards')
        .delete()
        .eq('family_id', input.familyId)
        .eq('card_id', input.cardId)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['family_cards', input.familyId],
      })
      queryClient.invalidateQueries({
        queryKey: ['family_card_usage', input.familyId],
      })
    },
  })
}

// Movimientos familiares (RLS permite verlos a dueño y miembros).
export function useFamilyTransactions(familyId?: string, limit = 100) {
  return useQuery({
    queryKey: ['family_transactions', familyId, limit],
    queryFn: async () => {
      if (!familyId) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .order('tx_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []) as TransactionRow[]
    },
    enabled: !!familyId,
  })
}
