import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/db'

export type Profile = ProfileRow

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('No se pudo cargar el perfil:', error.message)
    return null
  }
  return data as Profile | null
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const profile = session?.user
      ? await fetchProfile(session.user.id)
      : null
    set({ session, profile, loading: false })

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newProfile = newSession?.user
        ? await fetchProfile(newSession.user.id)
        : null
      set({ session: newSession, profile: newProfile })
    })
  },

  refreshProfile: async () => {
    const userId = get().session?.user?.id
    if (!userId) return
    set({ profile: await fetchProfile(userId) })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
