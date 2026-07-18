import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/store/useAuth'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { to: '/', label: 'Resumen', icon: '📊' },
  { to: '/cuentas', label: 'Cuentas', icon: '🏦' },
  { to: '/tarjetas', label: 'Tarjetas', icon: '💳' },
  { to: '/transacciones', label: 'Transacciones', icon: '💸' },
  { to: '/importar', label: 'Importar', icon: '📥' },
  { to: '/recibos', label: 'Escanear recibo', icon: '🧾' },
  { to: '/familia', label: 'Familia', icon: '👨‍👩‍👧‍👦' },
  { to: '/correo', label: 'Sincronizar correo', icon: '📧' },
  { to: '/sms', label: 'Sincronizar SMS', icon: '📱' },
  { to: '/conectar', label: 'Conexión automática', icon: '🔗' },
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/rendimientos', label: 'Rendimientos', icon: '📈' },
  { to: '/reportes', label: 'Reportes', icon: '📑' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
]

// Accesos principales para la barra inferior en móvil.
const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Resumen', icon: '📊' },
  { to: '/cuentas', label: 'Cuentas', icon: '🏦' },
  { to: '/transacciones', label: 'Movs.', icon: '💸' },
  { to: '/reportes', label: 'Reportes', icon: '📑' },
]

// Resto de secciones, accesibles desde el menú "Más" en móvil.
const MORE_NAV: NavItem[] = [
  { to: '/tarjetas', label: 'Tarjetas', icon: '💳' },
  { to: '/recibos', label: 'Recibos', icon: '🧾' },
  { to: '/familia', label: 'Familia', icon: '👨‍👩‍👧‍👦' },
  { to: '/importar', label: 'Importar', icon: '📥' },
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/correo', label: 'Correo', icon: '📧' },
  { to: '/sms', label: 'SMS', icon: '📱' },
  { to: '/conectar', label: 'Conectar', icon: '🔗' },
  { to: '/rendimientos', label: 'Rendim.', icon: '📈' },
  { to: '/configuracion', label: 'Ajustes', icon: '⚙️' },
]

export function AppShell() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  // Cierra el menú "Más" al navegar a otra ruta.
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const moreNav: NavItem[] = profile?.is_admin
    ? [...MORE_NAV, { to: '/admin', label: 'Admin', icon: '🛠️' }]
    : MORE_NAV

  const moreActive = moreNav.some((item) =>
    location.pathname.startsWith(item.to),
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-5">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">FinZen</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <span>{item.icon}</span>
              {t(item.label)}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <span>🛠️</span>
              Admin
            </NavLink>
          )}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="safe-top flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xl">💰</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">FinZen</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {profile?.is_premium && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Premium
              </span>
            )}
            <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">
              {profile?.full_name ?? profile?.email ?? t('Usuario')}
            </span>
            <NavLink
              to="/configuracion"
              title={t('Configuración')}
              className="rounded-lg p-2 text-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              ⚙️
            </NavLink>
          </div>
        </header>

        {/* pb extra en móvil para no quedar debajo de la barra inferior */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Hoja "Más" (solo móvil) */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white dark:bg-slate-800 p-4 pb-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('Más opciones')}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {moreNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-800/40 text-brand-700 dark:text-brand-500'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`
                  }
                >
                  <span className="text-2xl">{item.icon}</span>
                  {t(item.label)}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior (solo móvil) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-700 dark:text-brand-500' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {t(item.label)}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            moreActive || moreOpen ? 'text-brand-700 dark:text-brand-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="text-lg">⋯</span>
          {t('Más')}
        </button>
      </nav>
    </div>
  )
}
