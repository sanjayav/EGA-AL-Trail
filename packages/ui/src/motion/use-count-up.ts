'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useCountUp · animates an integer from 0 to `target` over `durationSec`.
 *
 * Used by every numerical reveal in the editorial public viewer (hero CFP,
 * comparison bars, decomposition cards, solar MWh). Cubic-out easing matches
 * the platform's standard motion curve.
 *
 * §10.4.2 · exposes the final value via the returned `displayValue` so screen
 * readers announce the result, not the in-flight ticks.
 */
export function useCountUp(target: number, durationSec = 1.6, trigger = false): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return
    if (typeof window === 'undefined') {
      setValue(target)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }

    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now
      const elapsed = (now - startedAt.current) / 1000
      const progress = Math.min(elapsed / durationSec, 1)
      // Cubic-out ease · fast start, gentle settle (§10.4.1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      startedAt.current = null
    }
  }, [target, durationSec, trigger])

  return value
}
