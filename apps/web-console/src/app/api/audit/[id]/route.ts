import { NextResponse } from 'next/server'

import { proxyFetch } from '@/lib/api-auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const upstream = await proxyFetch(`${API_BASE}/api/v1/audit/${id}`)
  if (!upstream)
    return NextResponse.json({ detail: 'API unreachable or sign in required' }, { status: 502 })
  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
