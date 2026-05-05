/**
 * Operator cockpit data · KPIs + recent cast-event activity.
 */

import { ApiAuthError, authHeaders } from './api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function authedFetch(url: string): Promise<Response | null> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return null
    throw err
  }
  return fetch(url, { headers: auth, cache: 'no-store' }).catch(() => null)
}

async function safeJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null
  return (await res.json()) as T
}

export interface PipelineMetrics {
  issued24h: number
  issuedToday: number
  issuedPerMinute: number
  successRatePct: number
  avgCfp24h: number | null
  errorCount24h: number
  p50LatencySeconds: number | null
  p95LatencySeconds: number | null
  queueDepth: number
  byBrand24h: { brand: string; count: number }[]
  byStatus24h: { status: string; count: number }[]
  sparkline15min: number[]
}

export interface RecentEvent {
  castEventId: number
  trackingId: string
  castNumber: string | null
  brand: string | null
  alloy: string | null
  weightKg: number | null
  receivedAt: string
  status: 'received' | 'validated' | 'generated' | 'signed' | 'published' | 'failed'
  upi: string | null
  cfpKgCo2ePerTonne: number | null
  issuedAt: string | null
  error: string | null
  pipelineSeconds: number | null
}

export async function fetchMetrics(): Promise<PipelineMetrics | null> {
  const res = await authedFetch(`${API_BASE}/api/v1/pipeline/metrics`)
  if (!res) return null
  return safeJson<PipelineMetrics>(res)
}

export async function fetchRecentEvents(limit = 50): Promise<RecentEvent[]> {
  const res = await authedFetch(`${API_BASE}/api/v1/pipeline/recent-events?limit=${limit}`)
  if (!res) return []
  const body = await safeJson<{ items: RecentEvent[] }>(res)
  return body?.items ?? []
}

export interface TimeseriesPoint {
  date: string
  count: number
  avgCfp: number | null
  avgRecycled: number | null
}

export async function fetchTimeseries(days = 30): Promise<TimeseriesPoint[]> {
  const res = await authedFetch(`${API_BASE}/api/v1/pipeline/timeseries?days=${days}`)
  if (!res) return []
  const body = await safeJson<{ items: TimeseriesPoint[] }>(res)
  return body?.items ?? []
}
