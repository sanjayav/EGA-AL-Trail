/**
 * Type-level token catalogue. Mirrors the CSS custom properties in tokens.css.
 *
 * Use these constants for non-CSS contexts (e.g. SVG fills, charts, OG images).
 * For everything CSS-renderable, prefer the CSS variables directly so theme
 * switching works automatically.
 */

export const ENTERPRISE_TOKENS = {
  color: {
    ink: '#0A0A0A',
    inkSoft: '#404040',
    graphite: '#6B7280',
    silver: '#D1D5DB',
    fog: '#F3F4F6',
    paper: '#FFFFFF',
    cream: '#FAFAF7',
    accent: '#0F4C81',
    accentSoft: '#E6EEF7',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
  },
  font: {
    display: "'Inter', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  motion: { fast: 150, base: 240, hero: 480 },
} as const

export const EDITORIAL_TOKENS = {
  color: {
    ink: '#0A0908',
    inkSoft: '#1F1B16',
    graphite: '#6B6055',
    paper: '#F5F1E8',
    paperSoft: '#EDE6D6',
    paperMuted: '#DDD3BD',
    gold: '#D4A574',
    goldDeep: '#B8895A',
    goldSoft: '#F2E2C4',
    green: '#5A7A3A',
  },
  font: {
    display: "'Fraunces', ui-serif, Georgia, serif",
    body: "'Geist', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  motion: { fast: 200, base: 400, hero: 1200, barFill: 1600, orchestrated: 3000 },
  carbon: {
    bauxiteMining: '#8B7355',
    bauxiteTransport: '#9C8569',
    aluminaProduction: '#B89968',
    aluminaTransport: '#C4A574',
    anodeProduction: '#D4A574',
    electricity: '#E0B584',
    electrolysis: '#EBC494',
    casting: '#F5D4A4',
  },
} as const

/** Spacing scale · 4px base, multiples allowed (§4.4) */
export const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192] as const

export type Spacing = (typeof SPACING)[number]
export type EnterpriseToken = typeof ENTERPRISE_TOKENS
export type EditorialToken = typeof EDITORIAL_TOKENS
