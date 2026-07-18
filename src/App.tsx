import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/reports/DashboardPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { CardsPage } from '@/features/cards/CardsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { ImportPage } from '@/features/import/ImportPage'
import { ReceiptPage } from '@/features/receipts/ReceiptPage'
import { FamilyPage } from '@/features/family/FamilyPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EmailSyncPage } from '@/features/email/EmailSyncPage'
import { SmsSyncPage } from '@/features/sms/SmsSyncPage'
import { ConnectBankPage } from '@/features/connect/ConnectBankPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { YieldsPage } from '@/features/yields/YieldsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AdminPage } from '@/features/admin/AdminPage'

export default function App() {
  const init = useAuth((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cuentas" element={<AccountsPage />} />
        <Route path="/tarjetas" element={<CardsPage />} />
        <Route path="/transacciones" element={<TransactionsPage />} />
        <Route path="/importar" element={<ImportPage />} />
        <Route path="/recibos" element={<ReceiptPage />} />
        <Route path="/familia" element={<FamilyPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
        <Route path="/correo" element={<EmailSyncPage />} />
        <Route path="/sms" element={<SmsSyncPage />} />
        <Route path="/conectar" element={<ConnectBankPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/rendimientos" element={<YieldsPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
