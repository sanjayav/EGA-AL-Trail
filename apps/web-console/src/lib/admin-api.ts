/**
 * Server-side fetcher for the platform-admin API surface.
 * Locked to platform_admin role · the API enforces.
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

export interface PlatformOverview {
  tenants: number
  dpps: number
  activeCredentials: number
}

export interface TenantRow {
  id: number
  slug: string
  legalName: string
  status: string
  tier: string
  createdAt: string
  dppCount: number
  activeCredentialCount: number
}

export interface TrustListEntry {
  did: string
  name: string
  credentials: number
  latest: string | null
}

export async function fetchPlatformOverview(): Promise<PlatformOverview | null> {
  const res = await authedFetch(`${API_BASE}/api/v1/admin/overview`)
  if (!res) return null
  return safeJson<PlatformOverview>(res)
}

export async function listTenantsAdmin(): Promise<TenantRow[]> {
  const res = await authedFetch(`${API_BASE}/api/v1/admin/tenants`)
  if (!res) return []
  const body = await safeJson<{ items: TenantRow[] }>(res)
  return body?.items ?? []
}

export async function fetchTrustList(): Promise<TrustListEntry[]> {
  const res = await authedFetch(`${API_BASE}/api/v1/admin/trust-list`)
  if (!res) return []
  const body = await safeJson<{ items: TrustListEntry[] }>(res)
  return body?.items ?? []
}
