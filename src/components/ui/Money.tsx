import { formatMoney } from '@/lib/format'
import { useSettings } from '@/store/useSettings'

interface MoneyProps {
  amount: number
  currency?: string
  // Cuántos asteriscos mostrar cuando los montos están ocultos.
  maskLength?: number
  className?: string
}

// Muestra un monto formateado, o asteriscos si el usuario activó "ocultar montos"
// (👁 en la barra superior). Centraliza el enmascarado para todas las superficies.
export function Money({ amount, currency = 'MXN', maskLength = 6, className }: MoneyProps) {
  const hideAmounts = useSettings((s) => s.hideAmounts)
  if (hideAmounts) {
    return <span className={className}>{'•'.repeat(maskLength)}</span>
  }
  return <span className={className}>{formatMoney(amount, currency)}</span>
}

// Versión función para contextos de texto mixto (donde el monto va dentro de una
// frase). Respeta el mismo flag "ocultar montos".
export function useMoneyFormat() {
  const hideAmounts = useSettings((s) => s.hideAmounts)
  return (amount: number, currency = 'MXN', maskLength = 6) =>
    hideAmounts ? '•'.repeat(maskLength) : formatMoney(amount, currency)
}
