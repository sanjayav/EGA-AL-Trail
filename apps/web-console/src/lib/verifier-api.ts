/**
 * Verifier-tier API client. Auth comes from a verifier-role JWT minted by
 * the IdP (or the dev-mode HS256 fallback in api-auth.ts). The DID claim
 * pins the verifier's identity server-side; we never pass DID via header
 * any more.
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

export interface VerifierCredential {
  id: number
  brand: string
  facilityUfi: string | null
  periodFrom: string
  periodTo: string
  valueKgCo2ePerTonne: number
  industryAverage: number | null
  verifierDid: string
  verifierName: string
  statementRef: string
  assuranceLevel: string
  state: 'active' | 'superseded' | 'revoked'
  createdAt: string
}

export async function listMyCredentials(): Promise<{
  items: VerifierCredential[]
  verifier: string | null
}> {
  const res = await authedFetch(`${API_BASE}/api/v1/verifier/credentials`)
  if (!res) return { items: [], verifier: null }
  return (
    (await safeJson<{ items: VerifierCredential[]; verifier: string }>(res)) ?? {
      items: [],
      verifier: null,
    }
  )
}

export interface AffectedDppsResult {
  credentialId: number
  brand: string
  statementRef: string
  byStatementRefCount: number
  byBrandCount: number
  samples: {
    upi: string
    issuedAt: string | null
    currentCfp: number
    currentStatementRef: string | null
    willChange: boolean
  }[]
}

export async function fetchAffectedDpps(
  credentialId: number,
): Promise<AffectedDppsResult | null> {
  const res = await authedFetch(
    `${API_BASE}/api/v1/verifier/credentials/${credentialId}/affected-dpps`,
  )
  if (!res) return null
  return safeJson<AffectedDppsResult>(res)
}

export interface VerifierAuditEntry {
  id: number
  occurredAt: string
  action: string
  targetKind: string
  targetId: string | null
  severity: string
  details: Record<string, unknown>
  currentHash: string
}

export interface VerifierAuditPage {
  items: VerifierAuditEntry[]
  total: number
  limit: number
  offset: number
}

/**
 * Audit entries authored by *this* verifier. The endpoint pins
 * `actor_id = principal.did` server-side, so we cannot leak entries from
 * other verifiers even if a malicious caller fabricates filter params.
 */
export async function listVerifierAudit(
  opts: { action?: string; limit?: number; offset?: number } = {},
): Promise<VerifierAuditPage> {
  const params = new URLSearchParams()
  if (opts.action) params.set('action', opts.action)
  params.set('limit', String(opts.limit ?? 100))
  params.set('offset', String(opts.offset ?? 0))
  const res = await authedFetch(`${API_BASE}/api/v1/verifier/audit?${params}`)
  const fallback: VerifierAuditPage = {
    items: [],
    total: 0,
    limit: opts.limit ?? 100,
    offset: opts.offset ?? 0,
  }
  if (!res) return fallback
  return (await safeJson<VerifierAuditPage>(res)) ?? fallback
}
