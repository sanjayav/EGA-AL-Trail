'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@dpp/ui'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export function FirePresetButton({ presetId }: { presetId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; upi?: string; detail?: string } | null>(null)

  function handle() {
    start(async () => {
      const res = await fetch('/api/fire', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presetId }),
      })
      const body = (await res.json()) as { ok: boolean; upi?: string; detail?: string }
      setResult(body)
      if (body.ok) router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handle} loading={pending} disabled={pending}>
        {pending ? 'Firing…' : 'Fire event'}
      </Button>
      {result?.ok && result.upi && (
        <a
          href={`${API_BASE.replace(':8000', ':3000')}/dpp/${result.upi}`}
          className="text-[12px] text-[var(--color-accent)] hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          view DPP →
        </a>
      )}
      {result && !result.ok && (
        <span className="text-[12px] text-[var(--color-red)]">{result.detail}</span>
      )}
    </div>
  )
}
