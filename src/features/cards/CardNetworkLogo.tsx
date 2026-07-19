// Logos de red de pago dibujados como SVG propios (sin librerías ni imágenes
// externas). Se eligen según la marca detectada de la tarjeta. Son
// representaciones estilizadas para dar aspecto realista, no logotipos oficiales.

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic'

export function networkFromBrand(brand?: string | null): CardNetwork {
  const b = (brand ?? '').toLowerCase()
  if (b.includes('visa')) return 'visa'
  if (b.includes('master')) return 'mastercard'
  if (b.includes('amex') || b.includes('american')) return 'amex'
  if (b.includes('discover')) return 'discover'
  return 'generic'
}

interface CardNetworkLogoProps {
  brand?: string | null
  className?: string
}

// Marca de red en la esquina de la tarjeta.
export function CardNetworkLogo({ brand, className = 'h-8' }: CardNetworkLogoProps) {
  const network = networkFromBrand(brand)

  if (network === 'mastercard') {
    return (
      <svg viewBox="0 0 48 30" className={className} role="img" aria-label="Mastercard">
        <circle cx="18" cy="15" r="12" fill="#EB001B" />
        <circle cx="30" cy="15" r="12" fill="#F79E1B" />
        <path
          d="M24 6a12 12 0 0 1 0 18 12 12 0 0 1 0-18z"
          fill="#FF5F00"
        />
      </svg>
    )
  }

  if (network === 'visa') {
    return (
      <span
        className={`${className} inline-flex items-center font-serif text-2xl font-black italic tracking-tight text-white drop-shadow`}
        aria-label="Visa"
      >
        VISA
      </span>
    )
  }

  if (network === 'amex') {
    return (
      <span
        className={`${className} inline-flex items-center rounded bg-white/95 px-1.5 text-xs font-black tracking-tight text-[#2E77BC]`}
        aria-label="American Express"
      >
        AMEX
      </span>
    )
  }

  if (network === 'discover') {
    return (
      <span
        className={`${className} inline-flex items-center gap-1 text-sm font-bold italic text-white`}
        aria-label="Discover"
      >
        DISC<span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F76B1C]" />VER
      </span>
    )
  }

  // Marca desconocida: si el usuario escribió algo, mostrarlo como texto;
  // si no, no mostrar nada (el icono contactless ya aparece junto al chip).
  if (brand) {
    return (
      <span className={`${className} inline-flex items-center text-base font-bold italic text-white`}>
        {brand}
      </span>
    )
  }
  return null
}
