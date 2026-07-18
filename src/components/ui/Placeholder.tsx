import { Card } from '@/components/ui/Card'

interface PlaceholderProps {
  phase: string
  description: string
}

/**
 * Marcador temporal para pantallas que se implementan en fases posteriores.
 * Reemplazar por la funcionalidad real en su fase correspondiente.
 */
export function Placeholder({ phase, description }: PlaceholderProps) {
  return (
    <Card className="border-dashed">
      <p className="text-sm font-medium text-brand-700 dark:text-brand-500">{phase}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </Card>
  )
}
