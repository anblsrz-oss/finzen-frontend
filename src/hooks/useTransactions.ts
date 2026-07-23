import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthlyPayment } from '@/lib/installments'
import type {
  TransactionRow,
  TxKind,
  TxSource,
  TransactionDeletionRow,
  InstallmentPlanPaymentRow,
} from '@/types/db'

export interface TransactionFilter {
  kind?: TxKind
  accountIds?: string[]
  cardIds?: string[]
  categoryIds?: string[]
  startDate?: string
  endDate?: string
  /** Búsqueda libre sobre concepto y notas. */
  search?: string
  pending?: boolean
  minAmount?: number
  maxAmount?: number
}

// PostgREST parsea la cadena de .or() con comas y paréntesis como separadores,
// así que un término de búsqueda que los contenga rompe la query. Los quitamos
// en vez de escaparlos: en un buscador no aportan y no vale romper la sintaxis.
function sanitizeSearch(term: string): string {
  return term.replace(/[,()\\]/g, ' ').trim()
}

export function useTransactions(
  userId?: string,
  filter?: TransactionFilter,
  limit?: number,
) {
  return useQuery({
    queryKey: ['transactions', userId, filter, limit],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        // Los gastos familiares viven en la sección Familia, no aquí.
        .is('family_id', null)

      if (filter?.kind) {
        query = query.eq('kind', filter.kind)
      }
      if (filter?.accountIds?.length) {
        const list = filter.accountIds.join(',')
        // Una transferencia toca dos cuentas: filtrar solo por account_id
        // escondería las que llegan a la cuenta seleccionada.
        query = query.or(`account_id.in.(${list}),to_account_id.in.(${list})`)
      }
      if (filter?.cardIds?.length) {
        query = query.in('card_id', filter.cardIds)
      }
      if (filter?.categoryIds?.length) {
        query = query.in('category_id', filter.categoryIds)
      }
      if (filter?.startDate) {
        query = query.gte('tx_date', filter.startDate)
      }
      if (filter?.endDate) {
        query = query.lte('tx_date', filter.endDate)
      }
      if (filter?.pending !== undefined) {
        query = query.eq('pending', filter.pending)
      }
      if (filter?.minAmount !== undefined) {
        query = query.gte('amount', filter.minAmount)
      }
      if (filter?.maxAmount !== undefined) {
        query = query.lte('amount', filter.maxAmount)
      }
      if (filter?.search) {
        const term = sanitizeSearch(filter.search)
        if (term) {
          query = query.or(`concept.ilike.%${term}%,notes.ilike.%${term}%`)
        }
      }

      query = query.order('tx_date', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as TransactionRow[]
    },
    enabled: !!userId,
  })
}

// Total sin filtrar. El límite del plan Gratis se mide contra todo el
// histórico: si se contaran solo las filas visibles, aplicar un filtro
// desbloquearía el botón de "Nueva transacción".
export function useTransactionsCount(userId?: string) {
  return useQuery({
    queryKey: ['transactions_count', userId],
    queryFn: async () => {
      if (!userId) return 0
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('family_id', null)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!userId,
  })
}

// Cuenta de movimientos pendientes por revisar (los que crean las
// sincronizaciones de correo/SMS entran así). Alimenta el badge de la
// navegación. `head: true` no trae filas, solo el conteo.
export function usePendingCount(userId?: string) {
  return useQuery({
    queryKey: ['transactions_pending_count', userId],
    queryFn: async () => {
      if (!userId) return 0
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('family_id', null)
        .eq('pending', true)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      kind: TxKind
      amount: number
      currency: string
      fxRate?: number
      baseAmount?: number
      concept?: string
      categoryId?: string
      accountId?: string
      toAccountId?: string
      cardId?: string
      /** Pago de tarjeta: línea de crédito a la que se abona. */
      toCreditLineId?: string
      /** Transferencia a una cuenta que no es del usuario (cuenta como egreso). */
      isExternal?: boolean
      txDate: string
      notes?: string
      source?: TxSource
      externalId?: string
      familyId?: string
    }) => {
      const txData: Record<string, any> = {
        user_id: input.userId,
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        tx_date: input.txDate,
      }

      // Multimoneda: monto convertido a la moneda principal. Si no viene, el
      // trigger fill_tx_base_amount cae a fx=1 / base=amount.
      if (input.fxRate !== undefined) txData.fx_rate = input.fxRate
      if (input.baseAmount !== undefined) txData.base_amount = input.baseAmount

      // Solo agregar campos opcionales si no están vacíos
      if (input.concept?.trim()) txData.concept = input.concept
      if (input.categoryId) txData.category_id = input.categoryId
      if (input.accountId) txData.account_id = input.accountId
      if (input.toAccountId) txData.to_account_id = input.toAccountId
      if (input.cardId) txData.card_id = input.cardId
      if (input.toCreditLineId) txData.to_credit_line_id = input.toCreditLineId
      if (input.isExternal) txData.is_external = true
      if (input.notes?.trim()) txData.notes = input.notes
      if (input.source) txData.source = input.source
      if (input.externalId) txData.external_id = input.externalId
      if (input.familyId) txData.family_id = input.familyId

      const { data, error } = await supabase
        .from('transactions')
        .insert([txData])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_pending_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_activity', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_summary', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['monthly_totals', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['category_totals', input.userId] })
      if (input.familyId) {
        queryClient.invalidateQueries({
          queryKey: ['family_transactions', input.familyId],
        })
        queryClient.invalidateQueries({
          queryKey: ['family_card_usage', input.familyId],
        })
      }
    },
  })
}

// Edita una transacción ya registrada (corregir monto, fecha, categoría, etc.).
// A diferencia del alta, aquí los campos de relación se escriben SIEMPRE (incluido
// null) para poder limpiarlos al cambiar de tipo; los balances y el uso de crédito
// se recalculan solos porque son vistas.
export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      userId: string
      kind: TxKind
      amount: number
      currency: string
      fxRate?: number
      baseAmount?: number
      concept?: string
      categoryId?: string | null
      accountId?: string | null
      toAccountId?: string | null
      cardId?: string | null
      toCreditLineId?: string | null
      isExternal?: boolean
      txDate: string
      notes?: string
    }) => {
      const updates: Record<string, any> = {
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        tx_date: input.txDate,
        concept: input.concept?.trim() || null,
        category_id: input.categoryId || null,
        account_id: input.accountId || null,
        to_account_id: input.toAccountId || null,
        card_id: input.cardId || null,
        to_credit_line_id: input.toCreditLineId || null,
        is_external: input.isExternal ?? false,
        notes: input.notes?.trim() || null,
      }
      if (input.fxRate !== undefined) updates.fx_rate = input.fxRate
      if (input.baseAmount !== undefined) updates.base_amount = input.baseAmount

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_pending_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_activity', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_summary', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['monthly_totals', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['category_totals', input.userId] })
    },
  })
}

// Elimina una transacción registrando el motivo en el historial de auditoría.
// El balance (vista account_balances) se revierte solo al borrar la fila.
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; userId: string; reason: string }) => {
      const { error } = await supabase.rpc('delete_transaction_with_reason', {
        p_tx_id: id,
        p_reason: reason,
      })
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_pending_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_activity', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transaction_deletions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_summary', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['monthly_totals', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['category_totals', input.userId] })
    },
  })
}

// Confirma un movimiento pendiente (pending -> false). Los movimientos de las
// sincronizaciones entran como pendientes y las vistas de saldo los excluyen;
// al confirmarlos empiezan a contar en los saldos.
export function useConfirmTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ pending: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_pending_count', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['card_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_line_usage', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['credit_activity', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions_summary', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['monthly_totals', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['category_totals', input.userId] })
    },
  })
}

// Historial de transacciones eliminadas (con motivo).
export function useTransactionDeletions(userId?: string) {
  return useQuery({
    queryKey: ['transaction_deletions', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('transaction_deletions')
        .select('*')
        .eq('user_id', userId)
        .order('deleted_at', { ascending: false })
      if (error) throw error
      return (data || []) as TransactionDeletionRow[]
    },
    enabled: !!userId,
  })
}

export function useInstallmentPlans(userId?: string) {
  return useQuery({
    queryKey: ['installment_plans', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

export function useCreateInstallmentPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      cardId: string
      transactionId: string
      description: string
      totalAmount: number
      currency: string
      months: number
      isInterestFree: boolean
      interestAmount: number
      /** Cuándo arrancó el plan; puede ser un mes anterior al registro. */
      startDate?: string
    }) => {
      const monthly = monthlyPayment(
        input.totalAmount,
        input.interestAmount,
        input.months,
      )
      const { data, error } = await supabase
        .from('installment_plans')
        .insert([
          {
            user_id: input.userId,
            card_id: input.cardId,
            transaction_id: input.transactionId,
            description: input.description,
            total_amount: input.totalAmount,
            currency: input.currency,
            months: input.months,
            is_interest_free: input.isInterestFree,
            interest_amount: input.interestAmount,
            monthly_payment: monthly,
            ...(input.startDate ? { start_date: input.startDate } : {}),
          },
        ])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['installment_plans', input.userId],
      })
    },
  })
}

// Mensualidades MSI ya conciliadas (ledger installment_plan_payments).
export function useInstallmentPayments(userId?: string) {
  return useQuery({
    queryKey: ['installment_plan_payments', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('installment_plan_payments')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return (data || []) as InstallmentPlanPaymentRow[]
    },
    enabled: !!userId,
  })
}

// Marca una o varias mensualidades como pagadas. upsert sobre (plan_id,
// period_month): volver a marcar el mismo mes no duplica la fila.
export function useConfirmInstallmentPayments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      rows: { planId: string; periodMonth: string; amount: number }[]
    }) => {
      if (input.rows.length === 0) return
      const { error } = await supabase.from('installment_plan_payments').upsert(
        input.rows.map((r) => ({
          user_id: input.userId,
          plan_id: r.planId,
          period_month: r.periodMonth,
          amount: r.amount,
          paid: true,
        })),
        { onConflict: 'plan_id,period_month' },
      )
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['installment_plan_payments', input.userId],
      })
    },
  })
}
