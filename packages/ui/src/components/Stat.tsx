import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  context?: string
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  className?: string
}

const TREND_GLYPH = { up: '↑', down: '↓', flat: '→' } as const

export function Stat({ label, value, unit, context, trend, className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="tabular text-[28px] font-semibold leading-none text-[var(--fg-default)]">
          {value}
        </span>
        {unit && <span className="font-mono text-[13px] text-[var(--fg-muted)]">{unit}</span>}
      </div>
      {(context || trend) && (
        <div className="flex items-center gap-2 text-[13px] text-[var(--fg-muted)]">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.direction === 'up' && 'text-[var(--color-green,#10B981)]',
                trend.direction === 'down' && 'text-[var(--color-red,#EF4444)]',
              )}
            >
              {TREND_GLYPH[trend.direction]} {trend.label}
            </span>
          )}
          {context && <span>{context}</span>}
        </div>
      )}
    </div>
  )
}
