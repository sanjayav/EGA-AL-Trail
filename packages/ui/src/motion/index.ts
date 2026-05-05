/**
 * Shared motion utilities · easing curves, durations, hooks.
 *
 * Used by both the editorial public viewer (heavy choreography) and the
 * enterprise console (subtle state transitions). Centralised so timings stay
 * coherent across the platform.
 *
 * Spec sources: §4.6, §10.4
 */

export const EASE_STANDARD = [0.16, 1, 0.3, 1] as const
export const EASE_DECELERATE = [0, 0, 0.2, 1] as const

/** Enterprise console motion ladder (§4.6) */
export const ENTERPRISE_DURATIONS = {
  fast: 0.15,
  base: 0.24,
  hero: 0.48,
} as const

/** Editorial public viewer motion ladder (§10.4.1) */
export const EDITORIAL_DURATIONS = {
  micro: 0.15,
  reveal: 0.5,
  headline: 1.0,
  barFill: 1.6,
  orchestrated: 3.0,
} as const

/** Standard fade-up reveal · used by every section header in the public viewer. */
export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE_STANDARD },
} as const

/** Headline reveal · slower, taller offset. */
export const heroFadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.0, ease: EASE_STANDARD },
} as const

/**
 * Stagger-children helpers for sequenced reveals.
 * §10.4: 50–80ms within a group, 150–200ms between groups.
 */
export const staggerChildren = (delayChildren = 0.2, stagger = 0.06) => ({
  initial: 'initial',
  animate: 'animate',
  variants: {
    initial: {},
    animate: {
      transition: { delayChildren, staggerChildren: stagger },
    },
  },
})

export const childFadeUp = {
  variants: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_STANDARD } },
  },
}
