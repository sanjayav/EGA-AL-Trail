'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CheckCircle2, GitBranch, ShieldOff } from 'lucide-react'

import { Button } from '@dpp/ui'

interface RolloverResult {
  succeeded: string[]
  skipped: string[]
  failed: { upi: string; error: string }[]
}

export function CredentialActions({
  credentialId,
  state,
  affectedCount,
}: {
  credentialId: number
  state: 'active' | 'superseded' | 'revoked'
  affectedCount: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rollover, setRollover] = useState<RolloverResult | null>(null)
  const [revoked, setRevoked] = useState<{ affected: string[] } | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  function runRollover(dryRun: boolean) {
    setError(null)
    setRollover(null)
    start(async () => {
      const res = await fetch(`/api/verifier/credentials/${credentialId}/rollover`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun }),
      })
      const body = (await res.json().catch(() => ({}))) as
        | (RolloverResult & { detail?: string })
        | { detail?: string }
      if (!res.ok) {
        setError((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
        return
      }
      setRollover(body as RolloverResult)
      if (!dryRun) router.refresh()
    })
  }

  function revoke() {
    if (!confirmRevoke) {
      setConfirmRevoke(true)
      return
    }
    setError(null)
    start(async () => {
      const res = await fetch(`/api/verifier/credentials/${credentialId}/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      const body = (await res.json().catch(() => ({}))) as {
        affectedDppUpis?: string[]
        detail?: string
      }
      if (!res.ok) {
        setError(body.detail ?? `HTTP ${res.status}`)
        return
      }
      setRevoked({ affected: body.affectedDppUpis ?? [] })
      setConfirmRevoke(false)
      router.refresh()
    })
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        Actions
      </p>

      {state !== 'active' && (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] p-3 text-[13px] text-[var(--fg-muted)]">
          This credential is <strong className="text-[var(--fg-default)]">{state}</strong>.
          Issuance, rollover, and revocation are unavailable. Issue a new credential to publish
          updated values.
        </p>
      )}

      {state === 'active' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ActionCard
            icon={GitBranch}
            title="Roll forward"
            blurb={`${affectedCount} active DPP${affectedCount === 1 ? '' : 's'} can be regenerated and re-signed against this credential.`}
          >
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => runRollover(true)}
                disabled={pending}
              >
                Dry run
              </Button>
              <Button onClick={() => runRollover(false)} disabled={pending} loading={pending}>
                {pending ? 'Rolling over…' : 'Run rollover'}
              </Button>
            </div>
          </ActionCard>

          <ActionCard
            icon={ShieldOff}
            title="Revoke"
            blurb="Mark this credential revoked. Existing DPP envelopes are preserved; affected DPPs are surfaced for follow-up."
          >
            <Button
              variant={confirmRevoke ? 'destructive' : 'secondary'}
              onClick={revoke}
              disabled={pending}
            >
              {confirmRevoke ? 'Confirm revoke' : 'Revoke credential'}
            </Button>
          </ActionCard>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-red-50 p-3 text-[13px] text-red-900">
          {error}
        </p>
      )}

      {rollover && (
        <div className="border-[var(--color-green)]/40 mt-5 rounded-[var(--radius-md)] border bg-[#DCFCE7] p-4 text-[13px] text-[#166534]">
          <CheckCircle2 className="mb-2 h-4 w-4" />
          <p className="font-medium">Rollover complete</p>
          <p className="mt-1">
            {rollover.succeeded.length} re-signed · {rollover.skipped.length} already current ·{' '}
            {rollover.failed.length} failed
          </p>
          {rollover.failed.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[12px]">
              {rollover.failed.map((f) => (
                <li key={f.upi}>
                  <code className="font-mono">{f.upi}</code> · {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {revoked && (
        <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-[13px] text-red-900">
          <p className="font-medium">Credential revoked.</p>
          {revoked.affected.length > 0 && (
            <p className="mt-1">
              {revoked.affected.length} DPP{revoked.affected.length === 1 ? '' : 's'} cite the
              now-revoked statement and require follow-up.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function ActionCard({
  icon: Icon,
  title,
  blurb,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] p-4">
      <Icon className="h-4 w-4 text-[var(--color-accent)]" />
      <p className="font-medium text-[var(--fg-default)]">{title}</p>
      <p className="text-[13px] text-[var(--fg-muted)]">{blurb}</p>
      <div>{children}</div>
    </div>
  )
}
