/**
 * API-bound auth · mint or pass through the bearer token Next proxies forward
 * to the FastAPI backend.
 *
 * Two modes:
 *   - Dev (DPP_ENV !== 'production'):
 *       The console mints an HS256 JWT signed with DPP_JWT_DEV_SECRET that
 *       carries the active SessionUser's role / tenant_id / did / org.
 *       The API verifies this with the same secret. This is the same
 *       fallback path the API allows in dev (see auth/jwt_verify.py).
 *   - Prod:
 *       A real OIDC session middleware lands a JWT on the user's session
 *       cookie. Proxies forward that token unmodified. We read the
 *       'dpp_session_token' cookie here. (The OIDC integration is wired
 *       in apps/web-console/src/app/login/route.ts when present.)
 */

import { cookies } from 'next/headers'
import { SignJWT } from 'jose'

import { currentUser, type SessionUser } from './auth'

const JWT_ISSUER = process.env.DPP_JWT_ISSUER ?? 'https://idp.dpp.ega.local'
const JWT_AUDIENCE = process.env.DPP_JWT_AUDIENCE ?? 'dpp-api'
const JWT_DEV_SECRET = process.env.DPP_JWT_DEV_SECRET ?? 'test-jwt-secret-not-for-production-use'
const IS_PROD = process.env.DPP_ENV === 'production' || process.env.NODE_ENV === 'production'

const VERIFIER_DID_BY_USER: Record<string, string> = {
  // Dev affordance: when the in-memory verifier user signs in, mint a token
  // that carries DNV's DID. v1.5 derives DID from the verifier's wallet
  // claim instead of this lookup.
  'u-dnv': 'did:web:dnv.com:cfp',
}

const ORG_BY_USER: Record<string, string> = {
  // Dev affordance for the customer portal: the in-memory BMW user gets the
  // 'bmw' org claim. Real customers will carry this in their IdP profile.
  'u-bmw': 'bmw',
  'u-bmw-admin': 'bmw',
}

export async function getApiToken(): Promise<string> {
  if (IS_PROD) {
    const store = await cookies()
    const token = store.get('dpp_session_token')?.value
    if (!token) {
      throw new ApiAuthError('no session token; sign in to continue')
    }
    return token
  }
  // Dev path · mint locally from the cookie role.
  const user = await currentUser()
  return mintDevToken(user)
}

export async function authHeaders(): Promise<HeadersInit> {
  const token = await getApiToken()
  return { Authorization: `Bearer ${token}` }
}

async function mintDevToken(user: SessionUser): Promise<string> {
  const secret = new TextEncoder().encode(JWT_DEV_SECRET)
  const did = VERIFIER_DID_BY_USER[user.id]
  const org = ORG_BY_USER[user.id]

  const builder = new SignJWT({
    role: user.role,
    tnt: user.tenantId,
    email: user.email,
    ...(did ? { did } : {}),
    ...(org ? { org } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('15m')

  return builder.sign(secret)
}

export class ApiAuthError extends Error {}

/**
 * Pass-through fetch helper for Next proxies. Forwards Authorization +
 * declines to inject hardcoded tenant/verifier/customer headers.
 */
export async function proxyFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response | null> {
  let auth: HeadersInit
  try {
    auth = await authHeaders()
  } catch (err) {
    if (err instanceof ApiAuthError) return null
    throw err
  }
  const headers = { ...(init.headers ?? {}), ...auth }
  return fetch(url, { ...init, headers, cache: 'no-store' }).catch(() => null)
}
