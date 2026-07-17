import { useState } from 'react'
import { useAuth } from '@/store/useAuth'
import {
  useTransactionsSummary,
  useMonthlyTotals,
  useCategoryTotals,
} from '@/hooks/useReports'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { formatMoney } from '@/lib/format'

export function ReportsPage() {
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0],
  )

  // En Gratis, solo mes actual
  const filters =
    profile?.is_premium ? { startDate, endDate } : { startDate, endDate }

  const summaryQuery = useTransactionsSummary(userId, filters)
  const monthlyQuery = useMonthlyTotals(userId, filters)
  const categoryQuery = useCategoryTotals(userId, filters)

  const summary = summaryQuery.data
  const monthly = monthlyQuery.data || []
  const categories = categoryQuery.data || []

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Gráficas de ingresos y gastos por período, cuenta y tarjeta."
      />

      {/* Filtros (Premium) */}
      {profile?.is_premium && (
        <Card className="mb-6 bg-slate-50">
          <p className="mb-3 text-xs font-semibold text-slate-700">
            Rango de fechas
          </p>
          <div className="flex gap-3">
            <Input
              label="Desde"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Resumen de tarjetas */}
      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <p className="text-xs text-slate-600">Total Ingresos</p>
            <p className="text-2xl font-semibold text-green-600">
              {formatMoney(summary.totalIncome, 'MXN')}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50">
            <p className="text-xs text-slate-600">Total Egresos</p>
            <p className="text-2xl font-semibold text-red-600">
              {formatMoney(summary.totalExpense, 'MXN')}
            </p>
          </Card>
          <Card
            className={`bg-gradient-to-br ${
              summary.balance >= 0
                ? 'from-blue-50 to-cyan-50'
                : 'from-orange-50 to-yellow-50'
            }`}
          >
            <p className="text-xs text-slate-600">Balance</p>
            <p
              className={`text-2xl font-semibold ${
                summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}
            >
              {formatMoney(summary.balance, 'MXN')}
            </p>
          </Card>
        </div>
      )}

      {/* Gráficas */}
      <div className="space-y-6">
        {monthly.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800">
              Ingresos vs Egresos
            </h3>
            <IncomeExpenseChart data={monthly} />
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <h3 className="mb-4 font-semibold text-slate-800">
              Gastos por Categoría
            </h3>
            <CategoryPieChart data={categories} />
          </Card>
        )}

        {!monthly.length && !categories.length && (
          <Card className="border-dashed text-center">
            <p className="text-sm text-slate-500">
              Sin transacciones en este período.
            </p>
          </Card>
        )}
      </div>

      {!profile?.is_premium && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            📊 Premium: filtra por rango de fechas personalizado, cuenta o
            tarjeta. Actualiza tu plan para más análisis.
          </p>
        </Card>
      )}
    </>
  )
}
