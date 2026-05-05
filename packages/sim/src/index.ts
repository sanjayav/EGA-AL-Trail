/**
 * @dpp/sim — programmatic API to fire canonical cast events.
 *
 * Used by the operator console's Sources tab and by the CLI under bin/dpp-sim.
 * In v2 the live MES connector replaces this for production casts; the
 * simulator stays for workshop mode and disaster-recovery drills.
 */

import {
  presets,
  type CastEvent,
  type SimulatorPreset,
  type CastEventSourceKind,
} from '@dpp/schema'

export interface FireOptions {
  presetId: keyof typeof presets
  apiBaseUrl?: string
  tenantId?: number
  actor?: string
  sourceKind?: CastEventSourceKind
  /** Override any cast field — used by workshop mode's configurator. */
  overrides?: Partial<CastEvent['cast']>
}

export interface FireResult {
  trackingId: string
  status: string
  upi?: string
  digitalLinkUrl?: string
}

export function buildCastEvent(opts: FireOptions): CastEvent {
  const preset = presets[opts.presetId] as SimulatorPreset | undefined
  if (!preset) {
    throw new Error(`unknown preset: ${String(opts.presetId)}`)
  }

  const trackingId = crypto.randomUUID()
  const castNumber = `C-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    Math.random() * 90000 + 10000,
  )}`

  return {
    schemaVersion: '1.0.0',
    trackingId,
    source: {
      kind: opts.sourceKind ?? 'simulator',
      actor: opts.actor ?? 'sim-cli',
      presetId: preset.id,
    },
    occurredAt: new Date().toISOString(),
    tenantId: opts.tenantId ?? 1,
    cast: {
      castNumber,
      alloyEn: preset.alloyEn,
      alloyAa: preset.alloyAa,
      brand: preset.brand,
      form: preset.form,
      temper: preset.temper,
      weightKg: preset.weightKg,
      ...(preset.dimensions.diameterMm !== undefined && {
        diameterMm: preset.dimensions.diameterMm,
      }),
      ...(preset.dimensions.lengthMm !== undefined && { lengthMm: preset.dimensions.lengthMm }),
      ...(preset.dimensions.widthMm !== undefined && { widthMm: preset.dimensions.widthMm }),
      ...(preset.dimensions.thicknessMm !== undefined && {
        thicknessMm: preset.dimensions.thicknessMm,
      }),
      casthouseUfi: preset.casthouseUfi,
      smelterUfi: preset.smelterUfi,
      purityGrade: preset.purityGrade,
      ...opts.overrides,
    },
  }
}

export async function fire(opts: FireOptions): Promise<FireResult> {
  const apiBase = opts.apiBaseUrl ?? process.env.DPP_API_BASE_URL ?? 'http://localhost:8000'
  const event = buildCastEvent(opts)

  const res = await fetch(`${apiBase}/api/v1/cast-events/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(event),
  })
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      `API rejected cast event (${res.status}): ${JSON.stringify(body.detail ?? body)}`,
    )
  }
  return {
    trackingId: String(body.tracking_id),
    status: String(body.status),
    upi: body.upi ? String(body.upi) : undefined,
    digitalLinkUrl: body.digital_link_url ? String(body.digital_link_url) : undefined,
  }
}

export function listPresets(): { id: string; label: string; summary: string }[] {
  return Object.values(presets).map((p) => ({
    id: (p as SimulatorPreset).id,
    label: (p as SimulatorPreset).label,
    summary: (p as SimulatorPreset).summary,
  }))
}
