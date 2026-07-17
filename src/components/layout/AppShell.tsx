import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { Button } from '@/components/ui/Button'

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
  { to: '/correo', label: 'Sincronizar correo', icon: '📧' },
  { to: '/sms', label: 'Sincronizar SMS', icon: '📱' },
  { to: '/conectar', label: 'Conexión automática', icon: '🔗' },
  { to: '/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/rendimientos', label: 'Rendimientos', icon: '📈' },
  { to: '/reportes', label: 'Reportes', icon: '📑' },
]

// Accesos principales para la barra inferior en móvil.
const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Resumen', icon: '📊' },
  { to: '/cuentas', label: 'Cuentas', icon: '🏦' },
  { to: '/transacciones', label: 'Movs.', icon: '💸' },
  { to: '/importar', label: 'Importar', icon: '📥' },
  { to: '/reportes', label: 'Reportes', icon: '📑' },
]

export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-slate-800">FinZen</span>
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
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
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
        <header className="safe-top flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xl">💰</span>
            <span className="font-semibold text-slate-800">FinZen</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {profile?.is_premium && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Premium
              </span>
            )}
            <span className="hidden text-sm text-slate-600 sm:inline">
              {profile?.full_name ?? profile?.email ?? 'Usuario'}
            </span>
            <Button variant="ghost" onClick={() => signOut()}>
              Salir
            </Button>
          </div>
        </header>

        {/* pb extra en móvil para no quedar debajo de la barra inferior */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Barra de navegación inferior (solo móvil) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-slate-200 bg-white md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
