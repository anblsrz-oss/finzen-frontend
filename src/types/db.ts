// Tipos de las tablas/vistas de Supabase (definidos a mano; en el futuro se pueden
// generar con `supabase gen types typescript`).

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash'
export type CardType = 'credit' | 'debit'
export type TxKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type TxSource = 'manual' | 'import' | 'email' | 'sms' | 'aggregator' | 'receipt'
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
  main_currency: string
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
  /** Si yield_rate se capturó como tasa mensual o anual (como la publica el banco). */
  yield_rate_period: 'monthly' | 'annual'
  /** A la vista (paga cada mes) o a plazo fijo (paga al vencimiento). */
  yield_kind: 'demand' | 'term'
  yield_term_days: number | null
  yield_term_end: string | null
  withhold_isr: boolean
  /** Tasa anual de retención sobre el capital (la fija la Ley de Ingresos). */
  isr_rate: number | null
  is_scholarship: boolean
  scholarship_name: string | null
  created_at: string
}

export interface CreditLineRow {
  id: string
  user_id: string
  name: string
  bank_name: string | null
  credit_limit: number
  currency: string
  cut_day: number | null
  payment_day: number | null
  dates_may_shift: boolean
  created_at: string
}

export interface CreditLinePeriodRow {
  id: string
  user_id: string
  credit_line_id: string
  /** Primer día del mes del corte. */
  period_month: string
  cut_date: string
  payment_date: string
  confirmed: boolean
  created_at: string
}

export interface CreditLineUsageRow {
  credit_line_id: string
  user_id: string
  name: string
  currency: string
  credit_limit: number
  used: number
  available: number
}

export interface CardRow {
  id: string
  user_id: string
  name: string
  brand: string | null
  type: CardType
  /** Físico o virtual; independiente de crédito/débito. */
  card_format: 'physical' | 'virtual'
  currency: string
  account_id: string | null
  credit_line_id: string | null
  // Legado: el límite y las fechas viven ahora en credit_lines. Se conservan
  // por si hay que revertir, pero el frontend ya no los lee.
  credit_limit: number | null
  cut_day: number | null
  payment_day: number | null
  last4: string | null
  color: string | null
  has_cashback: boolean
  is_scholarship: boolean
  scholarship_name: string | null
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
  fx_rate: number | null
  base_amount: number | null
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
  family_id: string | null
  created_at: string
}

// Plan familiar
export type FamilyMemberStatus = 'pending' | 'accepted' | 'rejected'

export interface FamilyRow {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export interface FamilyMemberRow {
  id: string
  family_id: string
  user_id: string | null
  invited_email: string
  status: FamilyMemberStatus
  invited_at: string
  responded_at: string | null
}

export interface FamilySharedCardRow {
  id: string
  family_id: string
  card_id: string
  created_at: string
}

// Vista family_cards: lo que un miembro puede ver de una tarjeta compartida.
// A propósito NO tiene credit_limit/cut_day/payment_day.
export interface FamilyCardRow {
  family_id: string
  card_id: string
  name: string
  brand: string | null
  type: CardType
  currency: string
  owner_id: string
}

export interface FamilyCardUsageRow {
  family_id: string
  card_id: string
  name: string
  currency: string
  family_spent: number
}

export interface FamilyMemberProfileRow {
  family_id: string
  member_id: string
  user_id: string | null
  invited_email: string
  status: FamilyMemberStatus
  full_name: string | null
  avatar_url: string | null
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

// Configuración global (una sola fila). Editable por admin.
export interface AppConfigRow {
  id: boolean
  free_max_accounts: number
  free_max_cards: number
  free_max_transactions: number
  family_is_premium: boolean
  yields_is_premium: boolean
  installments_is_premium: boolean
  reports_filters_is_premium: boolean
  // Colores de tema personalizados (null = tema por defecto). Ver ThemeColors.
  theme_colors: import('@/lib/themeColors').ThemeColors | null
  updated_at: string
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
