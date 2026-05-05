import { ApiAuthError, authHeaders } from './api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export const DPP_VERSIONS = ['1.0', '1.5', '2', '3', '4'] as const
export type DppVersion = (typeof DPP_VERSIONS)[number]

export interface ProcessStep {
  id: number
  slug: string
  name: string
  ordinal: number
  tier: string
  description: string | null
}

export interface ProductConfigSummary {
  version: string
  state: 'draft' | 'locked' | 'retired'
  lockedAt: string | null
  lockedBy: string | null
}

export interface ProductSummary {
  id: number
  slug: string
  name: string
  brand: string
  alloyFamily: string
  form: string
  description: string | null
  details: Record<string, unknown>
  chainStepIds: number[]
  dppConfigs: ProductConfigSummary[]
}

export interface ProductPortfolio {
  canonicalChain: ProcessStep[]
  products: ProductSummary[]
}

export interface ProductChainStep {
  stepId: number
  slug: string
  name: string
  tier: string
  ordinal: number
  description: string | null
  notes: string | null
}

export interface ProductDppConfig {
  version: string
  state: 'draft' | 'locked' | 'retired'
  selections: Record<string, number[]>
  lockedAt: string | null
  lockedBy: string | null
  updatedAt?: string
}

export interface DataSource {
  id: number
  productId: number
  stepId: number
  origin: 'internal' | 'third_party'
  supplierName: string | null
  supplierDid: string | null
  connectorKind: string | null
  connectorConfig: Record<string, unknown>
  permissionState: 'not_requested' | 'requested' | 'granted' | 'denied'
  lastSyncAt: string | null
  lastSyncStatus: 'success' | 'error' | 'pending' | null
}

export interface ProductDetail {
  product: ProductSummary
  chain: ProductChainStep[]
  dppConfigs: ProductDppConfig[]
  dataSources: DataSource[]
}

export interface ManifestAttribute {
  id: number
  version: string
  attributePath: string
  label: string
  necessity: 'mandatory' | 'voluntary'
  regulatoryAnchor: string | null
  description: string | null
  newAtThisVersion: boolean
}

export interface ManifestStep {
  stepId: number
  slug: string
  name: string
  tier: string
  ordinal: number
  attributes: ManifestAttribute[]
}

export interface ProductManifest {
  product: ProductSummary
  version: string
  versionsInScope: string[]
  config: ProductDppConfig | null
  stepsWithAttrs: ManifestStep[]
}

export interface ReadinessStep {
  stepId: number
  slug: string
  name: string
  hasSource: boolean
  origin: 'internal' | 'third_party' | null
  supplierName: string | null
  permissionState: DataSource['permissionState'] | null
  lastSyncStatus: DataSource['lastSyncStatus']
}

export interface ProductReadiness {
  product: ProductSummary
  version: string
  configLocked: boolean
  everyStepHasSource: boolean
  thirdPartyGranted: boolean
  ready: boolean
  stepStatus: ReadinessStep[]
  missingSourceStepIds: number[]
  pendingThirdParties: DataSource[]
}

export interface DataSourceInput {
  process_step_id: number
  origin: DataSource['origin']
  supplier_name?: string | null
  supplier_did?: string | null
  connector_kind?: string | null
  connector_config?: Record<string, unknown>
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return null
    throw err
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...auth },
    cache: 'no-store',
  }).catch(() => null)
}

async function safeJson<T>(res: Response | null): Promise<T | null> {
  if (!res?.ok) return null
  return (await res.json()) as T
}

async function postJson<T>(path: string, body?: unknown): Promise<T | null> {
  const res = await authedFetch(path, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return safeJson<T>(res)
}

export async function seedProductConfiguration(): Promise<{
  seeded: Record<string, number>
} | null> {
  return postJson('/api/v1/products/seed')
}

export async function listProductPortfolio(): Promise<ProductPortfolio | null> {
  return safeJson<ProductPortfolio>(await authedFetch('/api/v1/products'))
}

export async function fetchProductDetail(productId: number): Promise<ProductDetail | null> {
  return safeJson<ProductDetail>(await authedFetch(`/api/v1/products/${productId}`))
}

export async function fetchProductManifest(
  productId: number,
  version: string,
): Promise<ProductManifest | null> {
  return safeJson<ProductManifest>(
    await authedFetch(`/api/v1/products/${productId}/manifest/${version}`),
  )
}

export async function fetchProductReadiness(
  productId: number,
  version: string,
): Promise<ProductReadiness | null> {
  return safeJson<ProductReadiness>(
    await authedFetch(`/api/v1/products/${productId}/readiness/${version}`),
  )
}

export async function saveProductDppConfig(
  productId: number,
  version: string,
  selections: Record<string, number[]>,
): Promise<ProductDppConfig | null> {
  return postJson(`/api/v1/products/${productId}/configs/${version}`, { selections })
}

export async function lockProductDppConfig(
  productId: number,
  version: string,
): Promise<ProductDppConfig | null> {
  return postJson(`/api/v1/products/${productId}/configs/${version}/lock`)
}

export async function upsertProductDataSource(
  productId: number,
  source: DataSourceInput,
): Promise<DataSource | null> {
  return postJson(`/api/v1/products/${productId}/data-sources`, source)
}

export async function setProductDataSourcePermission(
  sourceId: number,
  state: 'requested' | 'granted' | 'denied',
): Promise<DataSource | null> {
  return postJson(`/api/v1/products/data-sources/${sourceId}/permission`, { state })
}
