import type { Route } from 'next'
import Link from 'next/link'
import { AlertCircle, Beaker, CheckCircle2, Clock, Database, ShieldAlert } from 'lucide-react'

import { Badge, type BadgeTone } from '@dpp/ui'

import {
  fetchAttributeMonitor,
  type AttributeStatus,
  type MonitorAttribute,
  type MonitorReport,
} from '@/lib/monitoring-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUS_LABELS: Record<AttributeStatus, string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  breach: 'Breach',
  missing: 'Missing',
}

const STATUS_TONE: Record<AttributeStatus, BadgeTone> = {
  fresh: 'success',
  stale: 'warning',
  breach: 'critical',
  missing: 'neutral',
}

const TIER_LABEL: Record<string, string> = {
  upstream: 'Upstream',
  production: 'Production',
  downstream: 'Downstream',
  verification: 'Verification',
}

const STATUS_OPTIONS: { value: '' | AttributeStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'stale', label: 'Stale' },
  { value: 'breach', label: 'Breach' },
  { value: 'missing', label: 'Missing' },
]

const TIER_OPTIONS = ['', 'upstream', 'production', 'downstream', 'verification'] as const

interface PageProps {
  searchParams: Promise<{
    dpp_version?: string
    status?: string
    tier?: string
    q?: string
  }>
}

export default async function MonitoringPage({ searchParams }: PageProps) {
  const params = await searchParams
  const dppVersion = params.dpp_version ?? '1.0'
  const statusFilter = (params.status ?? '') as '' | AttributeStatus
  const tierFilter = params.tier ?? ''
  const q = (params.q ?? '').trim().toLowerCase()

  const report = await fetchAttributeMonitor({ dppVersion, necessity: 'mandatory' })

  if (report.accessDenied) {
    return (
      <div className="px-8 py-12">
        <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-[var(--color-amber,#d97706)]" />
          <h1 className="mt-3 text-[20px] font-semibold text-[var(--fg-default)]">
            Access denied
          </h1>
          <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
            Attribute monitoring is restricted to tenant auditors and admins. Sign in with a role
            that includes audit read access.
          </p>
        </div>
      </div>
    )
  }

  const filtered = report.items.filter((it) => {
    if (statusFilter && it.status !== statusFilter) return false
    if (tierFilter && it.stepTier !== tierFilter) return false
    if (q) {
      const hay = `${it.attributePath} ${it.label} ${it.regulatoryAnchor ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const coveragePct =
    report.totals.mandatory === 0
      ? 0
      : Math.round(
          ((report.totals.fresh + report.totals.stale) / report.totals.mandatory) * 100,
        )

  function chipHref(patch: Record<string, string>): Route {
    const sp = new URLSearchParams()
    if (dppVersion !== '1.0') sp.set('dpp_version', dppVersion)
    if (statusFilter) sp.set('status', statusFilter)
    if (tierFilter) sp.set('tier', tierFilter)
    if (q) sp.set('q', q)
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    const qs = sp.toString()
    return (qs ? `/console/monitoring?${qs}` : '/console/monitoring') as Route
  }

  return (
    <div className="px-8 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Operations · attribute monitor
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[var(--fg-default)]">
            Mandatory attribute health
          </h1>
          <p className="mt-1 max-w-3xl text-[14px] text-[var(--fg-muted)]">
            Every mandatory dynamic attribute the platform must capture for DPP {dppVersion},
            joined with its data sources and the most recent issued value. Use this surface to
            spot stale feeds before they show up as a regulatory finding.
          </p>
        </div>
        <span className="rounded-[var(--radius-pill)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
          generated {relTime(report.generatedAt)}
        </span>
      </header>

      <KpiStrip report={report} coveragePct={coveragePct} />

      {/* Filters */}
      <section className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-4 py-3">
        <form
          method="GET"
          className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-muted)]"
        >
          {dppVersion !== '1.0' && (
            <input type="hidden" name="dpp_version" value={dppVersion} />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            Status
          </span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            Tier
          </span>
          <select
            name="tier"
            defaultValue={tierFilter}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)]"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === '' ? 'All tiers' : (TIER_LABEL[t] ?? t)}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search path or label"
            className="ml-2 h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)]"
          />
          <button
            type="submit"
            className="ml-1 h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
          >
            Apply
          </button>
        </form>
        {(statusFilter || tierFilter || q) && (
          <Link
            href={chipHref({ status: '', tier: '', q: '' })}
            className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
          {filtered.length} of {report.items.length} shown
        </span>
      </section>

      {/* Table */}
      <section className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="mon-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Attribute</th>
              <th>Stage</th>
              <th>Last value</th>
              <th>Coverage</th>
              <th>Sources</th>
              <th>Anchor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="mon-empty">
                  No attributes match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((it) => <AttributeRow key={it.attributeId} item={it} />)
            )}
          </tbody>
        </table>
      </section>

      <style>{MON_CSS}</style>
    </div>
  )
}

function KpiStrip({ report, coveragePct }: { report: MonitorReport; coveragePct: number }) {
  const t = report.totals
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi
        icon={<Database className="h-4 w-4" />}
        label="Mandatory attrs"
        value={t.mandatory}
        sub={`DPP ${report.items[0]?.dppVersion ?? '1.0'}`}
        tone="default"
      />
      <Kpi
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Fresh"
        value={t.fresh}
        sub="≤ 24h since last issuance"
        tone="success"
      />
      <Kpi
        icon={<Clock className="h-4 w-4" />}
        label="Stale"
        value={t.stale}
        sub="24-72h"
        tone="warning"
      />
      <Kpi
        icon={<AlertCircle className="h-4 w-4" />}
        label="Breach"
        value={t.breach}
        sub="> 72h"
        tone="critical"
      />
      <Kpi
        icon={<Beaker className="h-4 w-4" />}
        label="Missing"
        value={t.missing}
        sub="never populated"
        tone="muted"
      />
      <Kpi
        icon={<Database className="h-4 w-4" />}
        label="Coverage"
        value={`${coveragePct}%`}
        sub={`${t.sourcesHealthy}/${t.sourcesTotal} sources healthy`}
        tone={coveragePct >= 80 ? 'success' : coveragePct >= 50 ? 'warning' : 'critical'}
      />
    </section>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  tone: 'default' | 'success' | 'warning' | 'critical' | 'muted'
}) {
  const accent =
    tone === 'success'
      ? 'var(--color-green, #16a34a)'
      : tone === 'warning'
        ? 'var(--color-amber, #d97706)'
        : tone === 'critical'
          ? 'var(--color-red, #dc2626)'
          : tone === 'muted'
            ? 'var(--fg-subtle)'
            : 'var(--color-accent)'
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: accent }} aria-hidden>
          {icon}
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
          {label}
        </p>
      </div>
      <p
        className="tabular mt-2 font-mono text-[26px] font-semibold leading-none"
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--fg-muted)]">{sub}</p>
    </article>
  )
}

function AttributeRow({ item }: { item: MonitorAttribute }) {
  const granted = item.sources.filter((s) => s.permissionState === 'granted').length
  const healthy = item.sources.filter((s) => s.lastSyncStatus === 'success').length
  const valuePreview = formatValue(item.lastValue)

  return (
    <tr>
      <td>
        <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
      </td>
      <td>
        <details className="mon-row-detail">
          <summary>
            <p className="font-medium text-[var(--fg-default)]">{item.label}</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--fg-subtle)]">
              {item.attributePath}
            </p>
          </summary>
          <div className="mon-row-body">
            {item.description && (
              <p className="text-[12px] text-[var(--fg-muted)]">{item.description}</p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Necessity
              </dt>
              <dd className="text-[var(--fg-default)]">{item.necessity}</dd>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Owning step
              </dt>
              <dd className="text-[var(--fg-default)]">
                {item.stepName} · {item.stepTier}
              </dd>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Last DPP
              </dt>
              <dd className="break-all font-mono text-[var(--fg-default)]">
                {item.lastUpi ?? '—'}
              </dd>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Last value
              </dt>
              <dd className="font-mono text-[var(--fg-default)]">
                {valuePreview ?? '—'}
              </dd>
            </dl>
            {item.sources.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {item.sources.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] px-2 py-1.5 text-[11px]"
                  >
                    <span className={`mon-dot is-${sourceTone(s)}`} aria-hidden />
                    <span className="font-mono uppercase tracking-wider text-[var(--fg-subtle)]">
                      {s.connectorKind ?? 'manual'}
                    </span>
                    <span className="text-[var(--fg-default)]">
                      {s.supplierName ?? 'Internal capture'}
                    </span>
                    <span className="ml-auto text-[var(--fg-muted)]">
                      {s.permissionState.replace(/_/g, ' ')} ·{' '}
                      {s.lastSyncAt ? `synced ${relTime(s.lastSyncAt)}` : 'never synced'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </td>
      <td>
        <p className="text-[12px] text-[var(--fg-default)]">{item.stepName}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
          {item.stepTier}
        </p>
      </td>
      <td>
        <p className="font-mono text-[12px] text-[var(--fg-default)]">
          {valuePreview ?? <span className="text-[var(--fg-subtle)]">—</span>}
        </p>
        {item.lastSeenAt && (
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{relTime(item.lastSeenAt)}</p>
        )}
      </td>
      <td>
        <p className="tabular font-mono text-[12px] text-[var(--fg-default)]">{item.dppCount}</p>
        <p className="text-[10px] text-[var(--fg-subtle)]">DPPs carrying value</p>
      </td>
      <td>
        {item.sources.length === 0 ? (
          <span className="text-[12px] text-[var(--fg-subtle)]">no source</span>
        ) : (
          <div className="flex items-center gap-1">
            {item.sources.slice(0, 4).map((s) => (
              <span
                key={s.id}
                className={`mon-dot is-${sourceTone(s)}`}
                title={`${s.connectorKind ?? 'manual'} · ${s.permissionState} · ${
                  s.lastSyncStatus ?? 'never'
                }`}
              />
            ))}
            {item.sources.length > 4 && (
              <span className="text-[10px] text-[var(--fg-muted)]">
                +{item.sources.length - 4}
              </span>
            )}
            <span className="ml-2 text-[11px] text-[var(--fg-muted)]">
              {healthy}/{item.sources.length} healthy · {granted} granted
            </span>
          </div>
        )}
      </td>
      <td>
        <p className="text-[11px] leading-snug text-[var(--fg-muted)]">
          {item.regulatoryAnchor ?? '—'}
        </p>
      </td>
    </tr>
  )
}

function sourceTone(s: { permissionState: string; lastSyncStatus: string | null }): string {
  if (s.permissionState !== 'granted') return 'warn'
  if (s.lastSyncStatus === 'success') return 'ok'
  if (s.lastSyncStatus === 'error') return 'error'
  return 'idle'
}

function formatValue(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3)
  if (typeof v === 'string') return v.length > 60 ? `${v.slice(0, 57)}…` : v
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  try {
    const json = JSON.stringify(v)
    return json.length > 80 ? `${json.slice(0, 77)}…` : json
  } catch {
    return String(v)
  }
}

function relTime(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  const ms = Date.now() - t
  if (ms < 0) return 'just now'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hrs = Math.round(min / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

const MON_CSS = `
.mon-table { width: 100%; border-collapse: collapse; }
.mon-table thead { background: var(--surface-recessed); }
.mon-table th {
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  padding: 10px 12px;
  border-bottom: 1px solid var(--surface-border);
}
.mon-table td {
  padding: 12px 12px;
  vertical-align: top;
  border-bottom: 1px solid var(--surface-border);
  font-size: 13px;
  color: var(--fg-default);
}
.mon-table tr:last-child td { border-bottom: 0; }
.mon-table tr:hover td { background: var(--surface-hover); }

.mon-empty {
  padding: 28px 12px;
  text-align: center;
  color: var(--fg-muted);
  font-style: italic;
}

.mon-row-detail summary {
  list-style: none;
  cursor: pointer;
  outline: none;
}
.mon-row-detail summary::-webkit-details-marker { display: none; }
.mon-row-detail summary:hover p:first-child {
  color: var(--color-accent);
}
.mon-row-detail[open] summary p:first-child {
  color: var(--color-accent);
}
.mon-row-body {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-recessed);
  border: 1px solid var(--surface-border);
}

.mon-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 9999px;
  background: var(--surface-border);
}
.mon-dot.is-ok    { background: var(--color-green, #16a34a); }
.mon-dot.is-warn  { background: var(--color-amber, #d97706); }
.mon-dot.is-error { background: var(--color-red, #dc2626); }
.mon-dot.is-idle  { background: var(--fg-subtle); }
`
