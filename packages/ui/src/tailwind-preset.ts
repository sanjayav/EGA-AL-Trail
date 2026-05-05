/**
 * Tailwind v4 preset · wires the shared tokens into Tailwind's @theme layer.
 *
 * Tailwind v4 reads design tokens via the @theme CSS directive rather than
 * a JS config object. This file is kept for compatibility with toolchains
 * that still expect a JS preset (Storybook, codemods); the canonical
 * configuration lives in src/tokens/tailwind.css.
 */

import type { Config } from 'tailwindcss'

const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Themed colours resolve via CSS custom properties so a single utility
        // class works across both `enterprise` and `editorial` themes.
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        graphite: 'var(--color-graphite)',
        paper: 'var(--surface-page)',
        'paper-soft': 'var(--surface-recessed)',
        accent: 'var(--color-accent, var(--color-gold))',
        'accent-soft': 'var(--color-accent-soft, var(--color-gold-soft))',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        hero: 'var(--motion-hero)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      borderRadius: {
        xs: 'var(--radius-xs, 2px)',
        sm: 'var(--radius-sm, 4px)',
        md: 'var(--radius-md, 6px)',
        lg: 'var(--radius-lg, 8px)',
        xl: 'var(--radius-xl, 12px)',
        pill: 'var(--radius-pill, 9999px)',
      },
    },
  },
} satisfies Partial<Config>

export default preset
