import { NextResponse } from 'next/server'

import { proxyFetch } from '@/lib/api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

/**
 * Proxy bundle exports through the Next.js server. The customer-org claim
 * is now derived from the verified session JWT · never from request input.
 * The ZIP body streams through with bundle-receipt headers preserved.
 */
export async function POST(req: Request) {
  const { upis, label } = (await req.json()) as {
    upis?: string[]
    label?: string
  }
  if (!Array.isArray(upis) || upis.length === 0) {
    return NextResponse.json({ detail: 'upis is required' }, { status: 400 })
  }

  const upstream = await proxyFetch(`${API_BASE}/api/v1/customer/exports/bundle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ upis, label }),
  })

  if (!upstream || !upstream.ok) {
    const detail = upstream
      ? (((await upstream.json().catch(() => ({}))) as { detail?: string }).detail ??
        `HTTP ${upstream.status}`)
      : 'API unreachable or sign in required'
    return NextResponse.json({ detail }, { status: upstream?.status ?? 502 })
  }

  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'application/zip',
    'content-disposition': upstream.headers.get('content-disposition') ?? 'attachment',
  })
  for (const key of ['x-bundle-receipt-id', 'x-bundle-sha256', 'x-bundle-item-count']) {
    const v = upstream.headers.get(key)
    if (v) headers.set(key, v)
  }
  return new Response(upstream.body, { status: 200, headers })
}
