import Link from 'next/link'

import { Badge, type BadgeTone } from '@dpp/ui'

import { AuditChainVerifier } from '@/components/console/AuditChainVerifier'
import { listAuditEntries, type AuditEntry, type AuditFilters } from '@/lib/api'

const PAGE_SIZE = 50

const ACTION_OPTIONS = [
  { value: '', label: 'Any action' },
  { value: 'dpp.issued', label: 'DPP issued' },
  { value: 'dpp.withdrawn', label: 'DPP withdrawn' },
  { value: 'dpp.rolled_over', label: 'DPP rolled over' },
  { value: 'dpp.rollover_failed', label: 'Rollover failed' },
  { value: 'dpp.bundle_exported', label: 'Bundle exported' },
  { value: 'credential.issued', label: 'Credential issued' },
  { value: 'credential.revoked', label: 'Credential revoked' },
  { value: 'credential.rolled_over', label: 'Credential rolled over' },
  { value: 'webhook.created', label: 'Webhook created' },
  { value: 'webhook.deleted', label: 'Webhook deleted' },
]

const ACTOR_OPTIONS = [
  { value: '', label: 'Any actor' },
  { value: 'system', label: 'System' },
  { value: 'user', label: 'Operator' },
  { value: 'external_verifier', label: 'External verifier' },
  { value: 'platform', label: 'Platform' },
  { value: 'api_key', label: 'API key' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'Any severity' },
  { value: 'info', label: 'Info' },
  { value: 'notice', label: 'Notice' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
]

const SEVERITY_TONE: Record<string, BadgeTone> = {
  debug: 'neutral',
  info: 'neutral',
  notice: 'info',
  warn: 'warning',
  error: 'critical',
  critical: 'critical',
}

const ACTION_TONE: Record<string, BadgeTone> = {
  'dpp.issued': 'success',
  'dpp.withdrawn': 'warning',
  'dpp.rolled_over': 'info',
  'dpp.rollover_failed': 'critical',
  'dpp.bundle_exported': 'neutral',
  'credential.issued': 'accent',
  'credential.revoked': 'critical',
  'credential.rolled_over': 'info',
  'webhook.created': 'neutral',
  'webhook.deleted': 'neutral',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    action?: string
    actorKind?: string
    severity?: string
    page?: string
  }>
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const filters: AuditFilters = {
    action: params.action || undefined,
    actorKind: params.actorKind || undefined,
    severity: params.severity || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }

  const list = await listAuditEntries(filters)
  const showingFrom = list.total === 0 ? 0 : list.offset + 1
  const showingTo = Math.min(list.offset + list.items.length, list.total)

  return (
    <div className="px-8 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
            Audit log
          </h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)]">
            Hash-chained record of every mutation. {list.total.toLocaleString()} entries · showing{' '}
            <span className="font-mono tabular">
              {showingFrom}–{showingTo}
            </span>
            .
          </p>
        </div>
        <AuditChainVerifier />
      </header>

      <FilterBar current={filters} />

      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="mt-6 space-y-2">
          {list.items.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}

      <Pagination page={page} total={list.total} pageSize={PAGE_SIZE} filters={filters} />
    </div>
  )
}

function FilterBar({ current }: { current: AuditFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-4 py-3"
    >
      <FilterSelect name="action" label="Action" value={current.action ?? ''} options={ACTION_OPTIONS} />
      <FilterSelect
        name="actorKind"
        label="Actor"
        value={current.actorKind ?? ''}
        options={ACTOR_OPTIONS}
      />
      <FilterSelect
        name="severity"
        label="Severity"
        value={current.severity ?? ''}
        options={SEVERITY_OPTIONS}
      />
      <button
        type="submit"
        className="ml-auto h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
      >
        Apply filters
      </button>
      <Link
        href="/console/audit"
        className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
      >
        Clear
      </Link>
    </form>
  )
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
      <span className="font-mono uppercase tracking-[0.1em] text-[10px] text-[var(--fg-subtle)]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const date = new Date(entry.occurredAt)
  const tone = ACTION_TONE[entry.action] ?? 'neutral'
  const sev = SEVERITY_TONE[entry.severity] ?? 'neutral'
  const target = formatTarget(entry)

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <time
          dateTime={entry.occurredAt}
          title={entry.occurredAt}
          className="font-mono tabular text-[11px] text-[var(--fg-muted)]"
        >
          {date.toISOString().replace('T', ' ').slice(0, 19)}Z
        </time>
        <Badge tone={tone}>{entry.action}</Badge>
        {entry.severity !== 'info' && <Badge tone={sev}>{entry.severity}</Badge>}
        <span className="text-[12px] text-[var(--fg-muted)]">
          by{' '}
          <span className="text-[var(--fg-default)]">
            {entry.actorId ?? entry.actorKind}
          </span>
        </span>
        {target && (
          <span className="ml-auto font-mono text-[11px] text-[var(--fg-subtle)]">{target}</span>
        )}
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
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-[var(--fg-subtle)]">
        <span>id #{entry.id}</span>
        <span title={entry.currentHash}>
          hash {entry.currentHash.slice(0, 12)}…{entry.currentHash.slice(-6)}
        </span>
        {entry.prevHash && (
          <span title={entry.prevHash}>
            prev {entry.prevHash.slice(0, 12)}…{entry.prevHash.slice(-6)}
          </span>
        )}
      </div>
    </li>
  )
}

function formatTarget(entry: AuditEntry): string | null {
  if (!entry.targetId) return entry.targetKind
  if (entry.targetKind === 'dpp') return `dpp · ${entry.targetId}`
  if (entry.targetKind === 'reference_cfp') return `credential #${entry.targetId}`
  return `${entry.targetKind} · ${entry.targetId}`
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] px-8 py-16 text-center">
      <p className="text-[14px] text-[var(--fg-default)]">No audit entries match these filters.</p>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
        Adjust the filters above, or fire a preset on{' '}
        <Link href="/console/pipeline" className="text-[var(--color-accent)] hover:underline">
          /console/pipeline
        </Link>{' '}
        to generate activity.
      </p>
    </div>
  )
}

function Pagination({
  page,
  total,
  pageSize,
  filters,
}: {
  page: number
  total: number
  pageSize: number
  filters: AuditFilters
}) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  if (lastPage === 0) return null

  function href(targetPage: number): string {
    const sp = new URLSearchParams()
    if (filters.action) sp.set('action', filters.action)
    if (filters.actorKind) sp.set('actorKind', filters.actorKind)
    if (filters.severity) sp.set('severity', filters.severity)
    if (targetPage > 0) sp.set('page', String(targetPage))
    const qs = sp.toString()
    return qs ? `/console/audit?${qs}` : '/console/audit'
  }

  return (
    <nav className="mt-6 flex items-center justify-between text-[12px] text-[var(--fg-muted)]">
      <span className="font-mono tabular">
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
