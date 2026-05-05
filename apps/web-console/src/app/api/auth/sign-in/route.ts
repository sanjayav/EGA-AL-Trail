/**
 * Demo sign-in route · sets the `dpp_role` cookie based on a posted role and
 * redirects to that role's default landing surface (SDD §13.3.1).
 *
 * Real auth swaps this for an OIDC callback handler against Microsoft Entra
 * (v1.5 milestone).
 */

import { NextResponse } from 'next/server'

import { DEFAULT_LANDING, type Role } from '@/lib/auth'

const ROLES: Role[] = [
  'platform_admin',
  'platform_support',
  'tenant_admin',
  'dpp_operator',
  'dpp_reviewer',
  'tenant_auditor',
  'it_administrator',
  'customer_user',
  'customer_admin',
  'verifier',
  'authority',
]

export async function POST(req: Request): Promise<Response> {
  const fd = await req.formData()
  const role = String(fd.get('role') ?? 'dpp_operator') as Role
  const target = ROLES.includes(role) ? role : ('dpp_operator' as Role)
  const landing = DEFAULT_LANDING[target] ?? '/console/dpps'

  const res = NextResponse.redirect(new URL(landing, req.url), { status: 303 })
  res.cookies.set('dpp_role', target, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  // Mark that the user has explicitly signed in so the landing page knows to
  // skip itself for return visitors.
  res.cookies.set('dpp_signed_in', '1', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
