import { useEffect, useState } from 'react'

// Retrasa la propagación de un valor que cambia con cada tecla. Se usa para que
// el buscador no dispare una query por pulsación (y no invalide la caché de
// React Query en cada render, ya que el filtro forma parte del queryKey).
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
