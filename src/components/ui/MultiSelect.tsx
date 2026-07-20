import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MultiSelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (values: string[]) => void
  /** Texto cuando no hay nada seleccionado (= sin filtro). */
  placeholder?: string
  className?: string
}

// Selección múltiple con chips. Mismo lenguaje visual que Select, pero no se
// puede construir sobre <select multiple>: en móvil es inusable.
export function MultiSelect({
  label,
  error,
  options,
  value,
  onChange,
  placeholder,
  className = '',
}: MultiSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  const selected = options.filter((o) => value.includes(o.value))

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
            error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          <span className="flex min-w-0 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-slate-400 dark:text-slate-500">
                {placeholder || t('Todas')}
              </span>
            ) : (
              selected.map((o) => (
                <span
                  key={o.value}
                  className="inline-flex max-w-full items-center gap-1 rounded bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 text-xs text-brand-700 dark:text-brand-200"
                >
                  <span className="truncate">{o.label}</span>
                  {/* Dentro de un <button> no puede ir otro <button>: span con rol. */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={t('Quitar')}
                    className="cursor-pointer opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(o.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        toggle(o.value)
                      }
                    }}
                  >
                    ×
                  </span>
                </span>
              ))
            )}
          </span>
          <span className="shrink-0 text-slate-400">▾</span>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                {t('Sin opciones')}
              </p>
            )}
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <input
                  type="checkbox"
                  className="accent-brand-500"
                  checked={value.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
