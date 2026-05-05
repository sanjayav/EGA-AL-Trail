/**
 * @dpp/schema — canonical schemas, version manifests, and seed presets.
 *
 * The JSON Schema documents in ./schemas are the single source of truth.
 * Hand-authored TypeScript types in ./types mirror them for compile-time safety.
 * On schema change, regenerate types via `pnpm --filter @dpp/schema codegen`.
 */

export * from './types/dpp'
export * from './types/cast-event'
export * from './types/envelope'
export * from './types/preset'
export * from './versions'
export * from './validator'

import dppV1 from '../schemas/dpp/v1.0.0.json' with { type: 'json' }
import castEventV1 from '../schemas/cast-event/v1.0.0.json' with { type: 'json' }
import envelopeV1 from '../schemas/envelope/v1.0.0.json' with { type: 'json' }

import celestial from '../presets/celestial.json' with { type: 'json' }
import celestialR from '../presets/celestial-r.json' with { type: 'json' }
import standard from '../presets/standard.json' with { type: 'json' }

export const schemas = {
  dpp: { 'v1.0.0': dppV1 },
  castEvent: { 'v1.0.0': castEventV1 },
  envelope: { 'v1.0.0': envelopeV1 },
} as const

export const presets = {
  celestial,
  'celestial-r': celestialR,
  standard,
} as const

export type PresetId = keyof typeof presets
