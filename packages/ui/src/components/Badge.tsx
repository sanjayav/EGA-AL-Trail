import type { ReactNode } from 'react'
import { cn } from '../cn'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'accent'

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-hover)] text-[var(--fg-default)]',
  info: 'bg-[var(--color-accent-soft,#E6EEF7)] text-[var(--color-accent,#0F4C81)]',
  success: 'bg-[#DCFCE7] text-[#166534]',
  warning: 'bg-[#FEF3C7] text-[#92400E]',
  critical: 'bg-[#FEE2E2] text-[#991B1B]',
  accent: 'bg-[var(--color-gold-soft,var(--color-accent-soft))] text-[var(--color-gold-deep,var(--color-accent))]',
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 h-5 text-[11px] font-medium rounded-[var(--radius-sm)]',
        'tabular',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
