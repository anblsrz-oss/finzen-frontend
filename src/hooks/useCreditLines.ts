// Líneas de crédito: el límite y las fechas de corte/pago que varias
// tarjetas del mismo banco comparten. Ver 0018_credit_lines.sql.

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCards, useCardUsage } from '@/hooks/useCards'
import type { CreditLineRow, CreditLineUsageRow, CardUsageRow } from '@/types/db'

export function useCreditLines(userId?: string) {
  return useQuery({
    queryKey: ['credit_lines', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('credit_lines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as CreditLineRow[]
    },
    enabled: !!userId,
  })
}

export function useCreditLineUsage(userId?: string) {
  return useQuery({
    queryKey: ['credit_line_usage', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('credit_line_usage')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return (data || []) as CreditLineUsageRow[]
    },
    enabled: !!userId,
  })
}

// Uso de crédito listo para graficar.
//
// El límite vive en la línea, no en la tarjeta, y varias tarjetas comparten la
// misma línea. Por eso agrupamos por línea (una barra = un límite real) y
// colgamos los nombres de las tarjetas que la comparten. Las tarjetas de
// crédito sin línea asignada caen a su propia fila vía card_usage.
export interface CreditUsageItem {
  id: string
  name: string
  currency: string
  creditLimit: number
  used: number
  available: number
  /** Porcentaje de utilización 0-100. */
  percent: number
  /** Tarjetas que comparten esta línea. */
  cards: string[]
}

export function useCreditUsageBreakdown(userId?: string) {
  const linesQuery = useCreditLineUsage(userId)
  const cardsQuery = useCards(userId)
  const cardUsageQuery = useCardUsage(userId)

  const lines = linesQuery.data
  const cards = cardsQuery.data
  const cardUsage = cardUsageQuery.data

  const data = useMemo<CreditUsageItem[]>(() => {
    const build = (
      id: string,
      name: string,
      currency: string,
      creditLimit: number,
      used: number,
      available: number,
      cardNames: string[],
    ): CreditUsageItem => ({
      id,
      name,
      currency,
      creditLimit,
      used,
      available,
      percent: creditLimit > 0 ? (used / creditLimit) * 100 : 0,
      cards: cardNames,
    })

    const items = (lines || []).map((l) =>
      build(
        l.credit_line_id,
        l.name,
        l.currency,
        l.credit_limit,
        l.used,
        l.available,
        (cards || [])
          .filter((c) => c.credit_line_id === l.credit_line_id)
          .map((c) => c.name),
      ),
    )

    // Tarjetas de crédito huérfanas (sin línea): su límite legado sigue en
    // card_usage, así que se grafican por separado en vez de desaparecer.
    const orphanIds = new Set(
      (cards || [])
        .filter((c) => c.type === 'credit' && !c.credit_line_id)
        .map((c) => c.id),
    )
    ;(cardUsage as CardUsageRow[] | undefined)
      ?.filter((u) => orphanIds.has(u.card_id) && (u.credit_limit ?? 0) > 0)
      .forEach((u) => {
        items.push(
          build(u.card_id, u.name, u.currency, u.credit_limit ?? 0, u.used, u.available, []),
        )
      })

    // Lo más comprometido primero: es lo que el usuario necesita ver.
    return items.sort((a, b) => b.percent - a.percent)
  }, [lines, cards, cardUsage])

  return {
    data,
    isLoading:
      linesQuery.isLoading || cardsQuery.isLoading || cardUsageQuery.isLoading,
  }
}

export function useCreateCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      name: string
      bank_name?: string | null
      credit_limit: number
      currency: string
      cut_day?: number | null
      payment_day?: number | null
      dates_may_shift?: boolean
    }) => {
      const { userId, ...rest } = input
      const { data, error } = await supabase
        .from('credit_lines')
        .insert([{
          user_id: userId,
          name: rest.name,
          bank_name: rest.bank_name || null,
          credit_limit: rest.credit_limit,
          currency: rest.currency,
          cut_day: rest.cut_day ?? null,
          payment_day: rest.payment_day ?? null,
          dates_may_shift: rest.dates_may_shift ?? false,
        }])
        .select()
        .single()
      if (error) throw error
      return data as CreditLineRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
    },
  })
}

export function useUpdateCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      name?: string
      bank_name?: string | null
      credit_limit?: number
      currency?: string
      cut_day?: number | null
      payment_day?: number | null
      dates_may_shift?: boolean
    }) => {
      const { id, userId, ...rest } = input
      const updates: Record<string, any> = {}
      if (rest.name !== undefined) updates.name = rest.name
      if (rest.bank_name !== undefined) updates.bank_name = rest.bank_name || null
      if (rest.credit_limit !== undefined) updates.credit_limit = rest.credit_limit
      if (rest.currency !== undefined) updates.currency = rest.currency
      if (rest.cut_day !== undefined) updates.cut_day = rest.cut_day
      if (rest.payment_day !== undefined) updates.payment_day = rest.payment_day
      if (rest.dates_may_shift !== undefined) updates.dates_may_shift = rest.dates_may_shift

      const { data, error } = await supabase
        .from('credit_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CreditLineRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
    },
  })
}

export function useDeleteCreditLine() {
  const queryClient = useQueryClient()
  return useMutation({
    // Las tarjetas que la usaban quedan con credit_line_id null
    // (on delete set null), no se borran.
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase.from('credit_lines').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lines', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['cards', input.userId] })
    },
  })
}
