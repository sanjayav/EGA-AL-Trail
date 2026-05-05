'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  loading?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--fg-on-accent)] hover:opacity-90 ' +
    'focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]',
  secondary:
    'bg-[var(--surface-page)] text-[var(--fg-default)] border border-[var(--surface-border)] ' +
    'hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]',
  ghost:
    'bg-transparent text-[var(--fg-default)] hover:bg-[var(--surface-hover)] ' +
    'focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]',
  destructive:
    'bg-[var(--color-red,#EF4444)] text-white hover:opacity-90 ' +
    'focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[var(--radius-lg)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    loading = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-[background,opacity,box-shadow]',
        'duration-[var(--motion-fast)] ease-[var(--ease-standard)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {leadingIcon && <span className="inline-flex shrink-0">{leadingIcon}</span>}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
      {trailingIcon && <span className="inline-flex shrink-0">{trailingIcon}</span>}
    </button>
  )
})
