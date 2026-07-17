// Tipos de las tablas/vistas de Supabase (definidos a mano; en el futuro se pueden
// generar con `supabase gen types typescript`).

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash'
export type CardType = 'credit' | 'debit'
export type TxKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'

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
