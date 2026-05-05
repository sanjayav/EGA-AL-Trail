import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Idiomatic conditional className helper used across all surfaces.
 * Combines `clsx` (conditional classes) with `tailwind-merge` (last-write-wins
 * for conflicting Tailwind utilities).
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
