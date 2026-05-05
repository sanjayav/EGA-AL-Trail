import { NextResponse } from 'next/server'

import { firePreset } from '@/lib/api'

/**
 * Server-only wrapper around firePreset() so the API base URL stays on the server
 * and we can attach auth headers / tenant context in v1.5.
 */
export async function POST(req: Request) {
  const { presetId } = (await req.json()) as { presetId?: string }
  if (!presetId) return NextResponse.json({ ok: false, detail: 'presetId required' }, { status: 400 })
  const result = await firePreset(presetId)
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
