/**
 * Server-side API client for the FastAPI backend.
 *
 * Stays narrow on purpose · every read goes through one of these typed
 * functions so we can centralise auth header injection, retry policy, and
 * tenant-id propagation. All calls forward the verified bearer token via
 * `authHeaders()`; tenant resolution happens server-side from the JWT
 * claims, never from caller-supplied headers.
 */

import { ApiAuthError, authHeaders } from './api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response | null> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return null
    throw err
  }
  return fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), ...auth },
    cache: 'no-store',
  }).catch(() => null)
}

export interface DppRow {
  upi: string
  brand: string
  alloy: string
  form: string
  weightKg: number
  cfpKgCo2ePerTonne: number
  recycledContentPct: number
  state: string
  issuedAt: string | null
  digitalLinkUrl: string | null
}

export interface DppListResult {
  items: DppRow[]
  total: number
  limit: number
  offset: number
}

export interface PresetSummary {
  id: string
  label: string
  summary: string
  brand: string
  form: string
  alloyEn: string
  carbon: { valueKgCo2ePerTonne: number; industryAverageKgCo2ePerTonne: number }
  recycledContent: { totalPercent: number }
}

export interface AuditEntry {
  id: number
  occurredAt: string
  actorKind: 'user' | 'system' | 'external_verifier' | 'platform' | 'api_key'
  actorId: string | null
  action: string
  targetKind: string
  targetId: string | null
  severity: 'debug' | 'info' | 'notice' | 'warn' | 'error' | 'critical'
  details: Record<string, unknown>
  prevHash: string | null
  currentHash: string
}

export interface AuditListResult {
  items: AuditEntry[]
  total: number
  limit: number
  offset: number
}

export interface AuditFilters {
  action?: string
  actorKind?: string
  severity?: string
  targetKind?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

async function safeJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null
  return (await res.json()) as T
}

export interface VerifierBrandLine {
  id: number
  brand: string
  facilityUfi: string | null
  periodFrom: string
  periodTo: string
  valueKgCo2ePerTonne: number
  statementRef: string
  assuranceLevel: string
  state: 'active' | 'superseded' | 'revoked'
  createdAt: string
}

export interface VerifierRegistryEntry {
  verifierDid: string
  verifierName: string
  brands: VerifierBrandLine[]
  stateCounts: { active: number; superseded: number; revoked: number }
  latestStatementRef: string | null
  latestPeriodTo: string | null
  dependentDppCount: number
}

export async function listVerifierRegistry(): Promise<VerifierRegistryEntry[]> {
  const res = await authedFetch(`${API_BASE}/api/v1/verifier-registry`)
  if (!res) return []
  const body = await safeJson<{ items: VerifierRegistryEntry[] }>(res)
  return body?.items ?? []
}

export async function listAuditEntries(filters: AuditFilters = {}): Promise<AuditListResult> {
  const params = new URLSearchParams()
  if (filters.action) params.set('action', filters.action)
  if (filters.actorKind) params.set('actor_kind', filters.actorKind)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.targetKind) params.set('target_kind', filters.targetKind)
  if (filters.since) params.set('since', filters.since)
  if (filters.until) params.set('until', filters.until)
  params.set('limit', String(filters.limit ?? 100))
  params.set('offset', String(filters.offset ?? 0))
  const res = await authedFetch(`${API_BASE}/api/v1/audit?${params}`)
  const fallback = {
    items: [],
    total: 0,
    limit: filters.limit ?? 100,
    offset: filters.offset ?? 0,
  }
  if (!res) return fallback
  return (await safeJson<AuditListResult>(res)) ?? fallback
}

export async function listDpps(
  opts: { limit?: number; brand?: string; state?: string; offset?: number } = {},
): Promise<DppListResult> {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.brand) params.set('brand', opts.brand)
  if (opts.state) params.set('state', opts.state)
  if (opts.offset) params.set('offset', String(opts.offset))
  const res = await authedFetch(`${API_BASE}/api/v1/dpps/?${params}`)
  if (!res) return { items: [], total: 0, limit: opts.limit ?? 50, offset: 0 }
  return (
    (await safeJson<DppListResult>(res)) ?? {
      items: [],
      total: 0,
      limit: opts.limit ?? 50,
      offset: 0,
    }
  )
}

export interface FullDppView {
  upi: string
  state: string
  dpp: Record<string, unknown>
  envelope: Record<string, unknown> | null
  signatureRef: {
    algorithm: string
    value: string | null
    bodySha256: string | null
  } | null
  issuedAt: string | null
  expiresAt: string | null
}

export async function fetchDppFull(upi: string): Promise<FullDppView | null> {
  const res = await authedFetch(`${API_BASE}/api/v1/dpps/${upi}?tier=internal`)
  if (!res) return null
  const body = await res.json().catch(() => null)
  if (!res.ok || !body) return null
  return body as FullDppView
}

export async function listPresets(): Promise<PresetSummary[]> {
  // Presets are tenant-config and authenticated; non-authed boots get empty.
  const res = await authedFetch(`${API_BASE}/api/v1/presets/`)
  if (!res) return []
  const body = await safeJson<{ items: PresetSummary[] }>(res)
  return body?.items ?? []
}

export async function firePreset(
  presetId: string,
): Promise<{ ok: boolean; upi?: string; detail?: string }> {
  // For v1.0 we POST a synthesized cast event built from the preset.
  // The simulator package owns the canonical builder; we duplicate the minimum
  // here so the console works without depending on @dpp/sim's CLI.
  const trackingId = crypto.randomUUID()
  const event = {
    schemaVersion: '1.0.0',
    trackingId,
    source: { kind: 'simulator', actor: 'web-console', presetId },
    occurredAt: new Date().toISOString(),
    tenantId: 1,
    cast: await _castFromPreset(presetId),
  }
  const res = await authedFetch(`${API_BASE}/api/v1/cast-events/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!res) return { ok: false, detail: 'API unreachable or sign in required' }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    return { ok: false, detail: body.detail ?? `HTTP ${res.status}` }
  }
  const body = (await res.json()) as { upi?: string }
  return { ok: true, upi: body.upi }
}

async function _castFromPreset(presetId: string) {
  const res = await authedFetch(`${API_BASE}/api/v1/presets/${presetId}`)
  if (!res || !res.ok) throw new Error(`preset ${presetId} not found`)
  const p = (await res.json()) as Record<string, any>
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const castNumber = `C-${today}-${Math.floor(Math.random() * 90000 + 10000)}`
  return {
    castNumber,
    alloyEn: p.alloyEn,
    alloyAa: p.alloyAa,
    brand: p.brand,
    form: p.form,
    temper: p.temper,
    weightKg: p.weightKg,
    ...(p.dimensions?.diameterMm !== undefined && { diameterMm: p.dimensions.diameterMm }),
    ...(p.dimensions?.lengthMm !== undefined && { lengthMm: p.dimensions.lengthMm }),
    ...(p.dimensions?.widthMm !== undefined && { widthMm: p.dimensions.widthMm }),
    ...(p.dimensions?.thicknessMm !== undefined && { thicknessMm: p.dimensions.thicknessMm }),
    casthouseUfi: p.casthouseUfi,
    smelterUfi: p.smelterUfi,
    purityGrade: p.purityGrade,
  }
}
