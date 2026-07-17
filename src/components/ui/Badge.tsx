import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {}

export function Badge({ className = '', ...props }: BadgeProps) {
  return (
    <div
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      {...props}
    />
  )
}
