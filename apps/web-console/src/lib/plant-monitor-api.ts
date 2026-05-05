/**
 * Server-side fetcher for the Plant Monitor.
 *
 * Read-only. The endpoint is gated to tenant_auditor or above; on 401/403 we
 * return a synthetic empty snapshot flagged with `accessDenied` so the page
 * can render an inline `Access denied` panel rather than crashing.
 */

import { ApiAuthError, authHeaders } from './api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type SignalStatus = 'ok' | 'warn' | 'breach' | 'no_data'
export type SignalGroup =
  | 'electrolysis'
  | 'power'
  | 'casthouse'
  | 'carbon'
  | 'circularity'
  | 'verification'

export type SourceKind =
  | 'sensor'
  | 'mes'
  | 'spectrometer'
  | 'weighbridge'
  | 'ems'
  | 'ledger'
  | 'external_feed'
  | 'derived'
  | 'manual'

export interface PipelineStop {
  name: string
  kind: string
  note: string | null
}

export interface Provenance {
  sourceKind: SourceKind
  sourceLabel: string
  frequencySeconds: number
  latencySecondsP50: number
  dataQuality: string | null
  realData: boolean
  pipeline: PipelineStop[]
}

export interface Signal {
  key: string
  group: SignalGroup
  label: string
  unit: string
  value: number | null
  targetMin: number | null
  targetMax: number | null
  status: SignalStatus
  trend: number[]
  regulatoryAnchor: string | null
  description: string
  ownerStep: string | null
  isSynthetic: boolean
  provenance: Provenance
}

export interface GroupRollup {
  key: SignalGroup
  label: string
  ok: number
  warn: number
  breach: number
  noData: number
  total: number
}

export interface Breach {
  key: string
  label: string
  value: number | null
  unit: string
  targetMin: number | null
  targetMax: number | null
  regulatoryAnchor: string | null
}

export interface PlantStatus {
  generatedAt: string
  plantName: string
  lineCount: number
  groups: GroupRollup[]
  breaches: Breach[]
  signals: Signal[]
  accessDenied?: boolean
}

const EMPTY: PlantStatus = {
  generatedAt: new Date().toISOString(),
  plantName: '',
  lineCount: 0,
  groups: [],
  breaches: [],
  signals: [],
  accessDenied: true,
}

export async function fetchPlantStatus(): Promise<PlantStatus> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return EMPTY
    throw err
  }
  const res = await fetch(`${API_BASE}/api/v1/plant-monitor/status`, {
    headers: auth,
    cache: 'no-store',
  }).catch(() => null)
  if (!res) return EMPTY
  if (res.status === 401 || res.status === 403) return EMPTY
  if (!res.ok) return EMPTY
  return (await res.json()) as PlantStatus
}

export interface SignalSeriesPoint {
  ts: string
  value: number
}

export interface SignalStats {
  min?: number
  max?: number
  mean?: number
  p50?: number
  p95?: number
  stddev?: number
  samples?: number
}

export interface BreachEvent {
  from: string
  to: string
  extreme: number
}

export interface RecycledBatch {
  upi: string
  brand: string
  castNumber: string
  recycledContentPct: number
  issuedAt: string
}

export interface SignalDetail {
  reading: Signal
  rangeLabel: string
  rangeKey: string
  series: SignalSeriesPoint[]
  stats: SignalStats
  breachEvents: BreachEvent[]
  recentBatches?: RecycledBatch[]
  accessDenied?: boolean
  notFound?: boolean
}

export async function fetchSignalDetail(
  signalKey: string,
  range: '24h' | '7d' | '30d' = '24h',
): Promise<SignalDetail> {
  const empty: SignalDetail = {
    reading: {
      key: signalKey,
      group: 'circularity',
      label: '',
      unit: '',
      value: null,
      targetMin: null,
      targetMax: null,
      status: 'no_data',
      trend: [],
      regulatoryAnchor: null,
      description: '',
      ownerStep: null,
      isSynthetic: true,
      provenance: {
        sourceKind: 'derived',
        sourceLabel: '',
        frequencySeconds: 0,
        latencySecondsP50: 0,
        dataQuality: null,
        realData: false,
        pipeline: [],
      },
    },
    rangeLabel: '',
    rangeKey: range,
    series: [],
    stats: {},
    breachEvents: [],
  }
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return { ...empty, accessDenied: true }
    throw err
  }
  const res = await fetch(
    `${API_BASE}/api/v1/plant-monitor/signal/${encodeURIComponent(signalKey)}?range=${range}`,
    { headers: auth, cache: 'no-store' },
  ).catch(() => null)
  if (!res) return empty
  if (res.status === 401 || res.status === 403) return { ...empty, accessDenied: true }
  if (res.status === 404) return { ...empty, notFound: true }
  if (!res.ok) return empty
  return (await res.json()) as SignalDetail
}
