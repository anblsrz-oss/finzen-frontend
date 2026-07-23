import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  StatementImportRow,
  ParsingRuleRow,
  ParsingRuleConfig,
  IngestChannel,
  TxKind,
} from '@/types/db'

// Fila lista para confirmar (viene del parser + elecciones del usuario).
export interface ConfirmRow {
  tx_date: string
  amount: number
  kind: TxKind
  concept: string
  external_id: string
  category_id?: string | null
}

export function useStatementImports(userId?: string) {
  return useQuery({
    queryKey: ['statement_imports', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as StatementImportRow[]
    },
    enabled: !!userId,
  })
}

// Confirma un lote: crea el registro de import, filtra duplicados por
// external_id (contra transactions existentes) e inserta el resto.
export function useConfirmImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      accountId: string
      currency: string
      bankName?: string
      fileName?: string
      channel?: IngestChannel
      rows: ConfirmRow[]
    }) => {
      const { userId, accountId, currency, rows } = input
      if (rows.length === 0) {
        return { inserted: 0, duplicates: 0, total: 0 }
      }

      // 1) Detectar duplicados ya existentes en transactions.
      const ids = rows.map((r) => r.external_id)
      const { data: existing, error: exErr } = await supabase
        .from('transactions')
        .select('external_id')
        .eq('user_id', userId)
        .in('external_id', ids)
      if (exErr) throw exErr
      const seen = new Set((existing || []).map((r: any) => r.external_id))

      // Dedupe también dentro del propio archivo.
      const localSeen = new Set<string>()
      const fresh = rows.filter((r) => {
        if (seen.has(r.external_id) || localSeen.has(r.external_id)) return false
        localSeen.add(r.external_id)
        return true
      })
      const duplicates = rows.length - fresh.length

      // 2) Registro del lote.
      const { data: imp, error: impErr } = await supabase
        .from('statement_imports')
        .insert([
          {
            user_id: userId,
            account_id: accountId,
            bank_name: input.bankName ?? null,
            channel: input.channel ?? 'csv',
            file_name: input.fileName ?? null,
            status: 'confirmed',
            total_rows: rows.length,
            imported_rows: fresh.length,
          },
        ])
        .select()
        .single()
      if (impErr) throw impErr

      // 3) Insertar transacciones (confirmadas, no pendientes).
      if (fresh.length > 0) {
        const payload = fresh.map((r) => ({
          user_id: userId,
          kind: r.kind,
          amount: r.amount,
          currency,
          concept: r.concept,
          category_id: r.category_id ?? null,
          account_id: accountId,
          tx_date: r.tx_date,
          source: 'import',
          external_id: r.external_id,
          pending: false,
          raw_ref: imp.id,
        }))
        const { error: txErr } = await supabase
          .from('transactions')
          .insert(payload)
        if (txErr) throw txErr
      }

      return { inserted: fresh.length, duplicates, total: rows.length }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['statement_imports', input.userId] })
      queryClient.invalidateQueries({ queryKey: ['account_balances', input.userId] })
    },
  })
}

// --- Reglas de mapeo por banco/canal (se reutilizan entre imports) ---

export function useParsingRules(userId?: string, channel?: IngestChannel) {
  return useQuery({
    queryKey: ['parsing_rules', userId, channel],
    queryFn: async () => {
      if (!userId) return []
      let query = supabase
        .from('parsing_rules')
        .select('*')
        .eq('user_id', userId)
      if (channel) query = query.eq('channel', channel)
      const { data, error } = await query.order('bank_name')
      if (error) throw error
      return (data || []) as ParsingRuleRow[]
    },
    enabled: !!userId,
  })
}

export function useSaveParsingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      bankName: string
      channel: IngestChannel
      config: ParsingRuleConfig
    }) => {
      const { data, error } = await supabase
        .from('parsing_rules')
        .upsert(
          {
            user_id: input.userId,
            bank_name: input.bankName,
            channel: input.channel,
            config: input.config,
          },
          { onConflict: 'user_id,bank_name,channel' },
        )
        .select()
        .single()
      if (error) throw error
      return data as ParsingRuleRow
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['parsing_rules', input.userId] })
    },
  })
}

export function useDeleteParsingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; id: string }) => {
      const { error } = await supabase
        .from('parsing_rules')
        .delete()
        .eq('id', input.id)
        .eq('user_id', input.userId)
      if (error) throw error
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['parsing_rules', input.userId] })
    },
  })
}
