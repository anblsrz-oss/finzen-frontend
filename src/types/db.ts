// Tipos de las tablas/vistas de Supabase (definidos a mano; en el futuro se pueden
// generar con `supabase gen types typescript`).

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash'
export type CardType = 'credit' | 'debit'
export type TxKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type TxSource = 'manual' | 'import' | 'email' | 'sms' | 'aggregator'
export type IngestChannel = 'csv' | 'pdf' | 'email' | 'sms'
export type ImportStatus = 'parsing' | 'staged' | 'confirmed' | 'failed'
export type StagingStatus = 'pending' | 'confirmed' | 'discarded' | 'duplicate'

export interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_premium: boolean
  is_admin: boolean
  created_at: string
}

export interface AccountRow {
  id: string
  user_id: string
  name: string
  bank_name: string | null
  type: AccountType
  currency: string
  initial_balance: number
  has_yield: boolean
  yield_rate: number | null
  created_at: string
}

export interface CardRow {
  id: string
  user_id: string
  name: string
  brand: string | null
  type: CardType
  currency: string
  account_id: string | null
  credit_limit: number | null
  cut_day: number | null
  payment_day: number | null
  created_at: string
}

export interface CategoryRow {
  id: string
  user_id: string | null
  name: string
  kind: CategoryKind
  icon: string | null
  color: string | null
  is_system: boolean
  created_at: string
}

export interface TransactionRow {
  id: string
  user_id: string
  kind: TxKind
  amount: number
  currency: string
  concept: string | null
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  card_id: string | null
  tx_date: string
  notes: string | null
  source: TxSource
  external_id: string | null
  pending: boolean
  raw_ref: string | null
  created_at: string
}

export interface InstallmentPlanRow {
  id: string
  user_id: string
  card_id: string | null
  transaction_id: string | null
  description: string | null
  total_amount: number
  currency: string
  months: number
  is_interest_free: boolean
  interest_amount: number
  monthly_payment: number
  start_date: string
  created_at: string
}

export interface YieldRecordRow {
  id: string
  user_id: string
  account_id: string
  period_month: string
  expected_growth: number | null
  actual_growth: number | null
  verified: boolean
  created_at: string
}

// Ingesta de movimientos (Fase 8)
export interface StatementImportRow {
  id: string
  user_id: string
  account_id: string | null
  bank_name: string | null
  channel: IngestChannel
  file_name: string | null
  status: ImportStatus
  total_rows: number
  imported_rows: number
  created_at: string
}

export interface ImportStagingRow {
  id: string
  user_id: string
  import_id: string | null
  tx_date: string | null
  amount: number | null
  kind: TxKind | null
  concept: string | null
  category_id: string | null
  account_id: string | null
  card_id: string | null
  external_id: string | null
  raw_text: string | null
  status: StagingStatus
  created_at: string
}

export interface ParsingRuleRow {
  id: string
  user_id: string
  bank_name: string
  channel: IngestChannel
  config: ParsingRuleConfig
  created_at: string
}

// Config de una regla de parseo. Para CSV: mapeo de columnas (por índice o
// nombre de encabezado). Para email/sms: remitentes y regex de extracción.
export interface ParsingRuleConfig {
  // CSV
  columns?: {
    date?: string | number
    amount?: string | number
    concept?: string | number
    // columnas separadas de cargo/abono (algunos bancos las separan)
    debit?: string | number
    credit?: string | number
  }
  dateFormat?: string // ej. 'DD/MM/YYYY'
  hasHeader?: boolean
  decimalSeparator?: '.' | ','
  // email / sms
  senders?: string[]
  amountRegex?: string
  conceptRegex?: string
  dateRegex?: string
}

export interface TransactionDeletionRow {
  id: string
  user_id: string
  transaction_id: string
  kind: TxKind | null
  amount: number | null
  currency: string | null
  concept: string | null
  account_id: string | null
  to_account_id: string | null
  card_id: string | null
  tx_date: string | null
  source: TxSource | null
  reason: string
  snapshot: Record<string, unknown> | null
  deleted_at: string
}

export interface BankConnectionRow {
  id: string
  user_id: string
  provider: string
  external_id: string | null
  institution: string | null
  status: 'pending' | 'active' | 'error' | 'revoked'
  last_sync_at: string | null
  created_at: string
}

// Vistas calculadas
export interface AccountBalanceRow {
  account_id: string
  user_id: string
  name: string
  currency: string
  current_balance: number
}

export interface CardUsageRow {
  card_id: string
  user_id: string
  name: string
  currency: string
  credit_limit: number | null
  used: number
  available: number
}
