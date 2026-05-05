import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { Badge, type BadgeTone } from '@dpp/ui'

import { listVerifierAudit, type VerifierAuditEntry } from '@/lib/verifier-api'

const PAGE_SIZE = 50

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'credential.issued', label: 'Credential issued' },
  { value: 'credential.revoked', label: 'Credential revoked' },
  { value: 'credential.rolled_over', label: 'Credential rolled over (batch)' },
  { value: 'dpp.rolled_over', label: 'DPP rolled over (per-DPP)' },
  { value: 'dpp.rollover_failed', label: 'Rollover failed' },
]

const ACTION_TONE: Record<string, BadgeTone> = {
  'credential.issued': 'accent',
  'credential.revoked': 'critical',
  'credential.rolled_over': 'info',
  'dpp.rolled_over': 'info',
  'dpp.rollover_failed': 'critical',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ action?: string; page?: string }>
}

export default async function VerifierAuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const action = params.action || undefined
  const data = await listVerifierAudit({
    action,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const showingFrom = data.total === 0 ? 0 : data.offset + 1
  const showingTo = Math.min(data.offset + data.items.length, data.total)
  const lastPage = Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1)

  return (
    <div className="px-10 py-10">
      <header className="mb-6 flex items-baseline justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Audit trail
          </p>
          <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
            Your signature ledger.
          </h1>
          <p className="mt-2 text-[14px] text-[var(--fg-muted)]">
            Hash-chained record of every action authored by your DID (shown in the sidebar).{' '}
            {data.total.toLocaleString()} entries · showing{' '}
            <span className="tabular font-mono">
              {showingFrom}–{showingTo}
            </span>
            .
          </p>
        </div>
      </header>

      <FilterBar selected={action ?? ''} />

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="mt-6 space-y-2">
          {data.items.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}

      {lastPage > 0 && <Pagination page={page} lastPage={lastPage} action={action} />}
    </div>
  )
}

function FilterBar({ selected }: { selected: string }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-4 py-3"
    >
      <label className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
          Action
        </span>
        <select
          name="action"
          defaultValue={selected}
          className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)]"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="ml-auto h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
      >
        Apply
      </button>
      <Link
        href="/verifier/audit"
        className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
      >
        Clear
      </Link>
    </form>
  )
}

function AuditRow({ entry }: { entry: VerifierAuditEntry }) {
  const date = new Date(entry.occurredAt)
  const tone = ACTION_TONE[entry.action] ?? 'neutral'
  const target = formatTarget(entry)

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <time
          dateTime={entry.occurredAt}
          title={entry.occurredAt}
          className="tabular font-mono text-[11px] text-[var(--fg-muted)]"
        >
          {date.toISOString().replace('T', ' ').slice(0, 19)}Z
        </time>
        <Badge tone={tone}>{entry.action}</Badge>
        {target && <span className="font-mono text-[11px] text-[var(--fg-subtle)]">{target}</span>}
        <span
          className="ml-auto font-mono text-[10px] text-[var(--fg-subtle)]"
          title={entry.currentHash}
        >
          {entry.currentHash.slice(0, 12)}…
        </span>
      </div>
      {Object.keys(entry.details).length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]">
            details
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] p-3 font-mono text-[11px] leading-snug text-[var(--fg-default)]">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </details>
      )}
    </li>
  )
}

function formatTarget(entry: VerifierAuditEntry): ReactNode {
  if (!entry.targetId) return entry.targetKind
  if (entry.targetKind === 'reference_cfp') {
    return (
      <span>
        credential{' '}
        <Link
          className="underline hover:text-[var(--color-accent)]"
          href={`/verifier/credentials/${entry.targetId}`}
        >
          #{entry.targetId}
        </Link>
      </span>
    )
  }
  if (entry.targetKind === 'dpp') return `dpp · ${entry.targetId}`
  return `${entry.targetKind} · ${entry.targetId}`
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] px-8 py-16 text-center">
      <p className="text-[14px] text-[var(--fg-default)]">No audit entries yet.</p>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
        Issue your first credential at{' '}
        <Link href="/verifier/issue" className="text-[var(--color-accent)] hover:underline">
          /verifier/issue
        </Link>{' '}
        and the trail will populate here.
      </p>
    </div>
  )
}

function Pagination({
  page,
  lastPage,
  action,
}: {
  page: number
  lastPage: number
  action?: string
}) {
  const href = (target: number) => {
    const sp = new URLSearchParams()
    if (action) sp.set('action', action)
    if (target > 0) sp.set('page', String(target))
    const qs = sp.toString()
    return (qs ? `/verifier/audit?${qs}` : '/verifier/audit') as Route
  }

  return (
    <nav className="mt-6 flex items-center justify-between text-[12px] text-[var(--fg-muted)]">
      <span className="tabular font-mono">
        Page {page + 1} of {lastPage + 1}
      </span>
      <div className="flex gap-2">
        {page > 0 && (
          <Link
            href={href(page - 1)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 leading-8 text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
          >
            ← Newer
          </Link>
        )}
        {page < lastPage && (
          <Link
            href={href(page + 1)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 leading-8 text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
          >
            Older →
          </Link>
        )}
      </div>
    </nav>
  )
}
