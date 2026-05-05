/**
 * Server-side fetcher for customer-portal endpoints.
 *
 * The customer's organisation is now derived from the verified session JWT
 * (the `org` claim minted in api-auth.ts). Callers no longer pass `org`
 * because it cannot be trusted at the boundary · only the IdP-issued claim
 * is authoritative.
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

async function safeJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null
  return (await res.json()) as T
}

export interface CustomerDppRow {
  upi: string
  brand: string
  alloy: string
  form: string
  weightKg: number
  cfpKgCo2ePerTonne: number
  recycledContentPct: number
  issuedAt: string | null
  digitalLinkUrl: string | null
  verifierName: string | null
  asiCertificateRef: string | null
}

export async function listCustomerDpps(
  opts: { brand?: string; limit?: number } = {},
): Promise<{ items: CustomerDppRow[]; total: number }> {
  const params = new URLSearchParams()
  if (opts.brand) params.set('brand', opts.brand)
  if (opts.limit) params.set('limit', String(opts.limit))
  const res = await authedFetch(`${API_BASE}/api/v1/customer/dpps?${params}`)
  if (!res) return { items: [], total: 0 }
  const body = await safeJson<{ items: CustomerDppRow[]; total: number }>(res)
  return body ?? { items: [], total: 0 }
}

export interface ComplianceItem {
  name: string
  compliant: number
  nonCompliant: number
  pending: number
  notApplicable: number
  coveragePct: number
}

export async function fetchComplianceSummary(): Promise<{
  totalDpps: number
  items: ComplianceItem[]
}> {
  const res = await authedFetch(`${API_BASE}/api/v1/customer/compliance/summary`)
  if (!res) return { totalDpps: 0, items: [] }
  return (
    (await safeJson<{ totalDpps: number; items: ComplianceItem[] }>(res)) ?? {
      totalDpps: 0,
      items: [],
    }
  )
}

export interface CarbonAggregateItem {
  brand: string
  count: number
  avgCfpKgCo2ePerTonne: number
  minCfpKgCo2ePerTonne: number
  maxCfpKgCo2ePerTonne: number
  totalWeightKg: number
  embodiedTonnesCo2e: number
}

export async function fetchCarbonAggregate(): Promise<{
  industryAverageKgCo2ePerTonne: number
  items: CarbonAggregateItem[]
}> {
  const res = await authedFetch(`${API_BASE}/api/v1/customer/carbon/aggregate`)
  if (!res) return { industryAverageKgCo2ePerTonne: 14600, items: [] }
  return (
    (await safeJson<{
      industryAverageKgCo2ePerTonne: number
      items: CarbonAggregateItem[]
    }>(res)) ?? { industryAverageKgCo2ePerTonne: 14600, items: [] }
  )
}

export interface RecycledAggregateItem {
  brand: string
  totalWeightKg: number
  recycledTonnes: number
  recycledPct: number
}

export async function fetchRecycledAggregate(): Promise<{
  totalWeightKg: number
  weightedAvgRecycledPct: number
  items: RecycledAggregateItem[]
}> {
  const res = await authedFetch(`${API_BASE}/api/v1/customer/recycled/aggregate`)
  if (!res) return { totalWeightKg: 0, weightedAvgRecycledPct: 0, items: [] }
  return (
    (await safeJson<{
      totalWeightKg: number
      weightedAvgRecycledPct: number
      items: RecycledAggregateItem[]
    }>(res)) ?? { totalWeightKg: 0, weightedAvgRecycledPct: 0, items: [] }
  )
}

export interface WebhookRow {
  id: number
  name: string
  url: string
  events: string[]
  state: string
  lastDeliveryAt: string | null
  failureCount: number
  createdAt: string
}

export async function listWebhooks(): Promise<{
  items: WebhookRow[]
  supportedEvents: string[]
}> {
  const res = await authedFetch(`${API_BASE}/api/v1/customer/webhooks`)
  if (!res) return { items: [], supportedEvents: [] }
  return (
    (await safeJson<{ items: WebhookRow[]; supportedEvents: string[] }>(res)) ?? {
      items: [],
      supportedEvents: [],
    }
  )
}
