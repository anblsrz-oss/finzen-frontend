import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CategoryRow, CategoryKind } from '@/types/db'

export function useCategories(userId?: string, kind?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', userId, kind],
    queryFn: async () => {
      if (!userId) return []
      let query = supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)

      if (kind) {
        query = query.eq('kind', kind)
      }

      const { data, error } = await query.order('is_system', {
        ascending: false,
      })
      if (error) throw error
      return (data || []) as CategoryRow[]
    },
    enabled: !!userId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      name: string
      kind: CategoryKind
      icon?: string
      color?: string
    }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            user_id: input.userId,
            name: input.name,
            kind: input.kind,
            icon: input.icon,
            color: input.color,
            is_system: false,
          },
        ])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['categories', input.userId] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      name?: string
      icon?: string | null
      color?: string | null
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.icon !== undefined) updates.icon = rest.icon || null
      if (rest.color !== undefined) updates.color = rest.color || null

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['categories', input.userId] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['categories', input.userId],
      })
    },
  })
}
