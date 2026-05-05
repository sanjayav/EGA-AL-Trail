/**
 * Server-side fetcher for the Attribute Monitor.
 *
 * Read-only. The endpoint is gated to tenant_auditor or above; if the caller
 * doesn't carry the right role we return a synthetic empty report so the page
 * can render an `Access denied` state instead of crashing.
 */

import { ApiAuthError, authHeaders } from './api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type AttributeStatus = 'fresh' | 'stale' | 'breach' | 'missing'

export interface MonitorTotals {
  mandatory: number
  fresh: number
  stale: number
  breach: number
  missing: number
  sourcesTotal: number
  sourcesHealthy: number
}

export interface MonitorSource {
  id: number
  connectorKind: string | null
  supplierName: string | null
  permissionState: string
  lastSyncAt: string | null
  lastSyncStatus: string | null
}

export interface MonitorAttribute {
  attributeId: number
  attributePath: string
  label: string
  description: string | null
  regulatoryAnchor: string | null
  dppVersion: string
  necessity: string
  stepId: number
  stepSlug: string
  stepName: string
  stepTier: string
  dppCount: number
  lastSeenAt: string | null
  lastValue: unknown
  lastUpi: string | null
  status: AttributeStatus
  sources: MonitorSource[]
}

export interface MonitorReport {
  generatedAt: string
  totals: MonitorTotals
  items: MonitorAttribute[]
  accessDenied?: boolean
}

const EMPTY: MonitorReport = {
  generatedAt: new Date().toISOString(),
  totals: {
    mandatory: 0,
    fresh: 0,
    stale: 0,
    breach: 0,
    missing: 0,
    sourcesTotal: 0,
    sourcesHealthy: 0,
  },
  items: [],
  accessDenied: true,
}

export async function fetchAttributeMonitor(opts: {
  dppVersion?: string
  necessity?: string
}): Promise<MonitorReport> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return EMPTY
    throw err
  }
  const sp = new URLSearchParams()
  if (opts.dppVersion) sp.set('dpp_version', opts.dppVersion)
  if (opts.necessity !== undefined) sp.set('necessity', opts.necessity)
  const res = await fetch(`${API_BASE}/api/v1/monitoring/attributes?${sp.toString()}`, {
    headers: auth,
    cache: 'no-store',
  }).catch(() => null)
  if (!res) return EMPTY
  if (res.status === 401 || res.status === 403) return EMPTY
  if (!res.ok) return EMPTY
  return (await res.json()) as MonitorReport
}
