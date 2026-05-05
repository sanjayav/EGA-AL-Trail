'use client'

import { useState, useTransition } from 'react'

import { Badge, Button } from '@dpp/ui'

interface VerifyResult {
  verified: boolean
  rowsChecked: number
  breakCount: number
  firstBreak: {
    entryId: number
    expectedHash: string
    storedHash: string
    reason: string
  } | null
}

export function AuditChainVerifier() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run() {
    setError(null)
    start(async () => {
      const res = await fetch('/api/audit/verify-chain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        setResult(null)
        return
      }
      setResult((await res.json()) as VerifyResult)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} loading={pending} disabled={pending} variant="secondary">
        {pending ? 'Verifying…' : 'Verify chain integrity'}
      </Button>
      {error && <Badge tone="critical">{error}</Badge>}
      {result && result.verified && (
        <span className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
          <Badge tone="success">Chain verified</Badge>
          <span className="tabular font-mono">
            {result.rowsChecked.toLocaleString()} entries · SHA-256 reconciled
          </span>
        </span>
      )}
      {result && !result.verified && (
        <span className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
          <Badge tone="critical">Chain broken</Badge>
          <span className="tabular font-mono">
            {result.breakCount} break{result.breakCount === 1 ? '' : 's'} · first at #
            {result.firstBreak?.entryId}
            {result.firstBreak ? ` (${result.firstBreak.reason})` : ''}
          </span>
        </span>
      )}
    </div>
  )
}
