import { NextResponse } from 'next/server'

import { proxyFetch } from '@/lib/api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export async function POST(req: Request) {
  const { name, url, events } = (await req.json()) as {
    name?: string
    url?: string
    events?: string[]
  }
  if (!name || !url || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ detail: 'name, url and events are required' }, { status: 400 })
  }
  const upstream = await proxyFetch(`${API_BASE}/api/v1/customer/webhooks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, url, events }),
  })
  if (!upstream)
    return NextResponse.json({ detail: 'API unreachable or sign in required' }, { status: 502 })
  const body = await upstream.json().catch(() => ({}))
  return NextResponse.json(body, { status: upstream.status })
}
