import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  is_premium: boolean
  is_admin: boolean
  created_at: string
}

export function useListUsers() {
  return useQuery({
    queryKey: ['list_users'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw new Error('No session')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to list users')
      }

      return response.json() as Promise<UserProfile[]>
    },
  })
}

export function useSetUserPremium() {
  return useMutation({
    mutationFn: async ({ userId, isPremium }: { userId: string; isPremium: boolean }) => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw new Error('No session')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-premium`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, isPremium }),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set premium')
      }

      return response.json()
    },
  })
}
