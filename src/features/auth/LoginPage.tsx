import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { signInWithGoogle } from '@/lib/nativeAuth'

export function LoginPage() {
  // Login con Google. En web usa redirect normal; en app nativa (Capacitor)
  // usa navegador del sistema + deep link. Requiere el proveedor Google
  // habilitado en Supabase (Authentication -> Providers).

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">💰</div>
        <h1 className="text-xl font-semibold text-slate-800">FinZen</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organiza tus ingresos, gastos y cuentas en un solo lugar.
        </p>
        <Button className="mt-6 w-full" onClick={signInWithGoogle}>
          Continuar con Google
        </Button>
        <p className="mt-4 text-xs text-slate-400">
          Al continuar aceptas el manejo de tus datos según la política de
          privacidad.
        </p>
      </Card>
    </div>
  )
}
