import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
