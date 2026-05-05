import type { Route } from 'next'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Factory,
  Flame,
  Gauge,
  Leaf,
  Recycle,
  ShieldCheck,
  Zap,
} from 'lucide-react'

import {
  fetchPlantStatus,
  type GroupRollup,
  type Signal,
  type SignalGroup,
  type SignalStatus,
} from '@/lib/plant-monitor-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUS_LABEL: Record<SignalStatus, string> = {
  ok: 'In band',
  warn: 'Warn',
  breach: 'Breach',
  no_data: 'No data',
}

const STATUS_RANK: Record<SignalStatus, number> = {
  breach: 0,
  warn: 1,
  no_data: 2,
  ok: 3,
}

const GROUP_LABEL: Record<SignalGroup, string> = {
  electrolysis: 'Electrolysis cell line',
  power: 'Power & energy mix',
  casthouse: 'Casthouse & QC',
  carbon: 'Carbon footprint',
  circularity: 'Circularity',
  verification: 'Verification & compliance',
}

const GROUP_ICON: Record<SignalGroup, React.ComponentType<{ className?: string }>> = {
  electrolysis: Cpu,
  power: Zap,
  casthouse: Factory,
  carbon: Leaf,
  circularity: Recycle,
  verification: ShieldCheck,
}

// The four signals an aluminium operator must glance at every shift — the
// equivalent of state-of-charge / state-of-health / temperature in a battery
// BMS. These get the biggest cards on the page.
const WATCHLIST_KEYS: string[] = [
  'circularity.recycled_content_pct',
  'carbon.cfp_rolling_kg_per_t',
  'electrolysis.dc_efficiency_pct',
  'electrolysis.anode_effect_minutes_per_pot_day',
]

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; group?: string; source?: string }>
}

export default async function PlantMonitorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = (params.q ?? '').trim().toLowerCase()
  const statusFilter = params.status ?? ''
  const groupFilter = params.group ?? ''
  const sourceFilter = params.source ?? ''

  const snap = await fetchPlantStatus()

  if (snap.accessDenied) {
    return (
      <div className="px-8 py-12">
        <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-10 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-[var(--color-amber,#d97706)]" />
          <h1 className="mt-3 text-[20px] font-semibold text-[var(--fg-default)]">
            Access denied
          </h1>
          <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
            Plant monitor is restricted to tenant auditors and admins.
          </p>
        </div>
      </div>
    )
  }

  // ── Roll-ups ──────────────────────────────────────────────────────────
  const totalOk = snap.groups.reduce((s, g) => s + g.ok, 0)
  const totalWarn = snap.groups.reduce((s, g) => s + g.warn, 0)
  const totalBreach = snap.groups.reduce((s, g) => s + g.breach, 0)
  const totalNoData = snap.groups.reduce((s, g) => s + g.noData, 0)
  const totalSignals = snap.signals.length

  const overall: SignalStatus =
    totalBreach > 0 ? 'breach' : totalWarn > 0 ? 'warn' : totalNoData > 0 ? 'no_data' : 'ok'

  // Live-wired vs stand-in
  const livePct = totalSignals === 0 ? 0 : Math.round((snap.signals.filter((s) => !s.isSynthetic).length / totalSignals) * 100)

  // Watchlist signals (preserve catalogue order)
  const watchlist = WATCHLIST_KEYS.map((k) => snap.signals.find((s) => s.key === k)).filter(
    (s): s is Signal => s !== undefined,
  )

  // Active alerts: breaches and warns, sorted by severity then label
  const alerts = snap.signals
    .filter((s) => s.status === 'breach' || s.status === 'warn')
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.label.localeCompare(b.label))

  // Filtered signals for the explorer table
  const filtered = snap.signals.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (groupFilter && s.group !== groupFilter) return false
    if (sourceFilter && s.provenance.sourceKind !== sourceFilter) return false
    if (q) {
      const hay = `${s.label} ${s.key} ${s.regulatoryAnchor ?? ''} ${s.provenance.sourceLabel}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <div className="px-8 py-8">
      {/* Hero verdict ----------------------------------------------------- */}
      <Hero
        status={overall}
        plantName={snap.plantName}
        lineCount={snap.lineCount}
        generatedAt={snap.generatedAt}
        breachCount={totalBreach}
        warnCount={totalWarn}
        topBreach={alerts.find((a) => a.status === 'breach') ?? null}
        signalsTracked={totalSignals}
        livePct={livePct}
      />

      {/* Active alerts feed ---------------------------------------------- */}
      {alerts.length > 0 && (
        <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <header className="flex items-center justify-between border-b border-[var(--surface-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4"
                style={{ color: totalBreach > 0 ? 'var(--color-red, #dc2626)' : 'var(--color-amber, #d97706)' }}
              />
              <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">
                Active alerts ({alerts.length})
              </h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              {totalBreach} breach · {totalWarn} warn
            </p>
          </header>
          <ul>
            {alerts.map((s) => (
              <li key={s.key}>
                <Link
                  href={`/console/plant-monitor/${encodeURIComponent(s.key)}` as Route}
                  className="alert-row"
                >
                  <span className={`pm-dot pm-dot--${s.status}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--fg-default)]">{s.label}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                      {GROUP_LABEL[s.group]}
                      {s.regulatoryAnchor ? ` · ${s.regulatoryAnchor}` : ''}
                    </p>
                  </div>
                  <p className="alert-row-value">
                    <span className="tabular font-mono text-[14px] font-semibold text-[var(--fg-default)]">
                      {formatNumber(s.value)}
                    </span>{' '}
                    <span className="text-[11px] text-[var(--fg-muted)]">{s.unit}</span>
                  </p>
                  <p className="alert-row-target font-mono text-[11px] text-[var(--fg-muted)]">
                    target {formatBand(s.targetMin, s.targetMax, s.unit)}
                  </p>
                  <span
                    className={`pm-pill pm-pill--${s.status}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-subtle)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Watchlist (4 hero signals) -------------------------------------- */}
      <section className="mt-6">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">Watchlist</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            The four signals that decide whether today's casts are passport-ready
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {watchlist.map((s) => (
            <WatchlistCard key={s.key} signal={s} />
          ))}
        </div>
      </section>

      {/* Group health bar ------------------------------------------------ */}
      <section className="mt-8">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">
            Group health
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Each row is a production sub-system · click to filter the table below
          </p>
        </header>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {snap.groups.map((g) => (
            <GroupHealthRow key={g.key} group={g} />
          ))}
        </div>
      </section>

      {/* Signals explorer ------------------------------------------------ */}
      <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">All signals</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              {filtered.length} of {totalSignals}
            </span>
          </div>
          <form
            method="GET"
            className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)]"
          >
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search signal, anchor, source…"
              className="h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)]"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px]"
            >
              <option value="">All status</option>
              <option value="ok">In band</option>
              <option value="warn">Warn</option>
              <option value="breach">Breach</option>
              <option value="no_data">No data</option>
            </select>
            <select
              name="group"
              defaultValue={groupFilter}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px]"
            >
              <option value="">All groups</option>
              {(Object.keys(GROUP_LABEL) as SignalGroup[]).map((k) => (
                <option key={k} value={k}>
                  {GROUP_LABEL[k]}
                </option>
              ))}
            </select>
            <select
              name="source"
              defaultValue={sourceFilter}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-2 text-[12px]"
            >
              <option value="">All sources</option>
              <option value="sensor">Sensor</option>
              <option value="mes">MES</option>
              <option value="spectrometer">Spectrometer</option>
              <option value="weighbridge">Weighbridge</option>
              <option value="ems">EMS</option>
              <option value="ledger">Ledger</option>
              <option value="external_feed">External feed</option>
              <option value="derived">Derived</option>
              <option value="manual">Manual</option>
            </select>
            <button
              type="submit"
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
            >
              Apply
            </button>
            {(q || statusFilter || groupFilter || sourceFilter) && (
              <Link href="/console/plant-monitor" className="hover:text-[var(--fg-default)]">
                Clear
              </Link>
            )}
          </form>
        </header>
        <table className="pm-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Group</th>
              <th>Value</th>
              <th>Target</th>
              <th>Source</th>
              <th>Latency</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="pm-empty">
                  No signals match the filter.
                </td>
              </tr>
            ) : (
              filtered.map((s) => <SignalRow key={s.key} signal={s} />)
            )}
          </tbody>
        </table>
      </section>

      {/* How we collect monitoring data ---------------------------------- */}
      <CollectionLanes />

      <style>{PM_CSS}</style>
    </div>
  )
}

// ── Hero verdict ────────────────────────────────────────────────────────

function Hero({
  status,
  plantName,
  lineCount,
  generatedAt,
  breachCount,
  warnCount,
  topBreach,
  signalsTracked,
  livePct,
}: {
  status: SignalStatus
  plantName: string
  lineCount: number
  generatedAt: string
  breachCount: number
  warnCount: number
  topBreach: Signal | null
  signalsTracked: number
  livePct: number
}) {
  const verdictHeadline =
    status === 'breach'
      ? `${breachCount} signal${breachCount === 1 ? '' : 's'} breached — passport issuance at risk`
      : status === 'warn'
        ? `${warnCount} signal${warnCount === 1 ? '' : 's'} drifting — review before next shift`
        : status === 'no_data'
          ? 'Some signals have no data yet'
          : 'All systems nominal'
  const VerdictIcon = status === 'ok' ? CheckCircle2 : status === 'breach' ? Flame : AlertTriangle

  return (
    <section className={`pm-hero pm-hero--${status}`}>
      <div className="pm-hero-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Operations · plant monitor
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[var(--fg-default)]">
          {plantName}
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] text-[var(--fg-muted)]">
          Continuous health check of every aluminium-DPP-relevant process signal —
          {signalsTracked} signals across {lineCount} lines, the BMS-equivalent for the casthouse.
        </p>
      </div>
      <div className="pm-hero-right">
        <div className="pm-verdict">
          <span className={`pm-verdict-icon pm-verdict-icon--${status}`}>
            <VerdictIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              Plant verdict · {STATUS_LABEL[status]}
            </p>
            <p className="mt-1 text-[15px] font-semibold leading-tight text-[var(--fg-default)]">
              {verdictHeadline}
            </p>
            {topBreach && (
              <Link
                href={`/console/plant-monitor/${encodeURIComponent(topBreach.key)}` as Route}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-red,#dc2626)] hover:underline"
              >
                Investigate “{topBreach.label}” <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
          <span>generated {relTime(generatedAt)}</span>
          <span>·</span>
          <span>{livePct}% live-wired</span>
          <span>·</span>
          <span>{100 - livePct}% stand-in</span>
        </p>
      </div>
    </section>
  )
}

// ── Watchlist card ──────────────────────────────────────────────────────

function WatchlistCard({ signal }: { signal: Signal }) {
  const href = `/console/plant-monitor/${encodeURIComponent(signal.key)}` as Route
  const last = signal.trend.length > 0 ? signal.trend[signal.trend.length - 1]! : null
  const first = signal.trend.length > 0 ? signal.trend[0]! : null
  const delta = last !== null && first !== null ? last - first : null
  const deltaPct = last !== null && first !== null && first !== 0 ? (delta! / first) * 100 : null
  return (
    <Link href={href} className={`pm-watch pm-watch--${signal.status}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium leading-snug text-[var(--fg-default)]">
            {signal.label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {signal.regulatoryAnchor ?? GROUP_LABEL[signal.group]}
          </p>
        </div>
        {signal.isSynthetic ? (
          <span className="rounded-[var(--radius-pill)] bg-[var(--surface-recessed)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[var(--fg-subtle)]">
            stand-in
          </span>
        ) : (
          <span className="rounded-[var(--radius-pill)] bg-[color:rgba(22,163,74,0.10)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[var(--color-green,#16a34a)]">
            live
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular font-mono text-[34px] font-semibold leading-none text-[var(--fg-default)]">
          {formatNumber(signal.value)}
        </span>
        <span className="text-[12px] text-[var(--fg-muted)]">{signal.unit}</span>
        <span
          className={`pm-pill pm-pill--${signal.status}`}
          style={{ marginLeft: 'auto' }}
          aria-label={STATUS_LABEL[signal.status]}
        >
          {STATUS_LABEL[signal.status]}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-[var(--fg-subtle)]">
        target {formatBand(signal.targetMin, signal.targetMax, signal.unit)}
        {deltaPct !== null && (
          <span className="ml-2">
            {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}% over window
          </span>
        )}
      </p>
      <Sparkline trend={signal.trend} status={signal.status} />
      <p className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)]">
        Open analytics <ArrowRight className="h-3 w-3" />
      </p>
    </Link>
  )
}

function Sparkline({ trend, status }: { trend: number[]; status: SignalStatus }) {
  if (trend.length < 2) return <div className="mt-3 h-12" />
  const min = Math.min(...trend)
  const max = Math.max(...trend)
  const span = max - min || 1
  const w = 200
  const h = 48
  const step = w / (trend.length - 1)
  const pts = trend
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(' ')
  const stroke =
    status === 'breach'
      ? 'var(--color-red, #dc2626)'
      : status === 'warn'
        ? 'var(--color-amber, #d97706)'
        : status === 'no_data'
          ? 'var(--fg-subtle)'
          : 'var(--color-green, #16a34a)'
  const fill =
    status === 'breach'
      ? 'rgba(220,38,38,0.10)'
      : status === 'warn'
        ? 'rgba(217,119,6,0.10)'
        : 'rgba(22,163,74,0.10)'
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-3 h-12 w-full"
      role="img"
      aria-label="trend"
    >
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={fill} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" />
    </svg>
  )
}

// ── Group health row (compact stacked bar) ─────────────────────────────

function GroupHealthRow({ group }: { group: GroupRollup }) {
  const Icon = GROUP_ICON[group.key]
  const total = Math.max(1, group.total)
  const segments = [
    { kind: 'breach', count: group.breach, color: 'var(--color-red, #dc2626)' },
    { kind: 'warn', count: group.warn, color: 'var(--color-amber, #d97706)' },
    { kind: 'ok', count: group.ok, color: 'var(--color-green, #16a34a)' },
    { kind: 'no_data', count: group.noData, color: 'var(--fg-subtle)' },
  ].filter((s) => s.count > 0)
  return (
    <Link
      href={
        `/console/plant-monitor?group=${encodeURIComponent(group.key)}` as Route
      }
      className="pm-grouprow"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight text-[var(--fg-default)]">
            {group.label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {group.total} signal{group.total === 1 ? '' : 's'} · {group.ok} ok · {group.warn} warn ·{' '}
            {group.breach} breach
            {group.noData ? ` · ${group.noData} no data` : ''}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-subtle)]" />
      </div>
      <div className="pm-grouprow-bar">
        {segments.map((seg) => (
          <span
            key={seg.kind}
            style={{
              width: `${(seg.count / total) * 100}%`,
              background: seg.color,
            }}
          />
        ))}
      </div>
    </Link>
  )
}

// ── Signals explorer table row ─────────────────────────────────────────

function SignalRow({ signal }: { signal: Signal }) {
  const href = `/console/plant-monitor/${encodeURIComponent(signal.key)}` as Route
  return (
    <tr>
      <td>
        <Link href={href} className="font-medium text-[var(--fg-default)] hover:text-[var(--color-accent)]">
          {signal.label}
        </Link>
        <p className="mt-0.5 break-all font-mono text-[10px] text-[var(--fg-subtle)]">
          {signal.key}
        </p>
      </td>
      <td className="text-[12px] text-[var(--fg-muted)]">{GROUP_LABEL[signal.group]}</td>
      <td>
        <span className={`pm-dot pm-dot--${signal.status} mr-2`} aria-hidden />
        <span className="tabular font-mono text-[var(--fg-default)]">
          {formatNumber(signal.value)}
        </span>{' '}
        <span className="text-[11px] text-[var(--fg-muted)]">{signal.unit}</span>
      </td>
      <td className="font-mono text-[11px] text-[var(--fg-muted)]">
        {formatBand(signal.targetMin, signal.targetMax, signal.unit)}
      </td>
      <td>
        <p className="text-[12px] text-[var(--fg-default)]">
          {signal.provenance.sourceKind}
          {!signal.isSynthetic && (
            <span className="ml-1 rounded-[var(--radius-pill)] bg-[color:rgba(22,163,74,0.10)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[var(--color-green,#16a34a)]">
              live
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--fg-subtle)]">{signal.provenance.sourceLabel}</p>
      </td>
      <td className="font-mono text-[11px] text-[var(--fg-muted)]">
        {humanFrequency(signal.provenance.frequencySeconds)}
      </td>
      <td>
        <Link
          href={href}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] hover:underline"
        >
          Open <ArrowRight className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}

// ── Collection lanes (how monitoring data lands in the platform) ───────

function CollectionLanes() {
  const lanes: { kind: string; title: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      kind: 'sensor',
      title: 'Sensor → MES',
      text:
        'Pot SCADA, mould thermocouples, energy meters · Honeywell Experion rolls 1Hz raw to 5-min summaries.',
      icon: Gauge,
    },
    {
      kind: 'weighbridge',
      title: 'Weighbridge → ASI ledger',
      text:
        'Every scrap truck weighed and classified pre/post-consumer · recorded into the ASI Chain-of-Custody allocator.',
      icon: Recycle,
    },
    {
      kind: 'derived',
      title: 'DPP rollups',
      text: 'CFP, recycled %, and DoD coverage are SQL aggregates over the signed dpp_records.body envelope.',
      icon: Activity,
    },
    {
      kind: 'verifier',
      title: 'Verifier feeds',
      text:
        'DNV CFP statements + ASI certificates land via the verifier portal as DID-signed PDFs · validity windows scan daily.',
      icon: ShieldCheck,
    },
  ]
  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] p-5">
      <header className="mb-3">
        <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">
          How monitoring data lands in the platform
        </h2>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
          Four intake lanes cover every signal above. Open any tile to see the exact instruments,
          frequency, and pipeline hops behind a number.
        </p>
      </header>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map((l, i) => {
          const Icon = l.icon
          return (
            <li
              key={l.kind}
              className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-4"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  Lane {i + 1}
                </p>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-[var(--fg-default)]">{l.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--fg-muted)]">{l.text}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ── helpers ────────────────────────────────────────────────────────────

function formatNumber(v: number | null): string {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2).replace(/\.?0+$/, '')
}

function formatBand(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return 'context'
  if (min !== null && max !== null) return `${formatNumber(min)} – ${formatNumber(max)} ${unit}`
  if (min !== null) return `≥ ${formatNumber(min)} ${unit}`
  return `≤ ${formatNumber(max!)} ${unit}`
}

function humanFrequency(s: number): string {
  if (s <= 1) return 'real-time'
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.round(s / 60)} min`
  if (s < 86400) return `${Math.round(s / 3600)} h`
  return `${Math.round(s / 86400)} d`
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

const PM_CSS = `
/* ── Hero verdict ─────────────────────────────────────────────────────── */
.pm-hero {
  display: grid;
  gap: 18px;
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
}
@media (min-width: 1080px) {
  .pm-hero { grid-template-columns: 1.4fr 1fr; align-items: center; }
}
.pm-hero--breach { border-color: var(--color-red, #dc2626); background: color-mix(in srgb, var(--color-red, #dc2626) 4%, var(--surface-page)); }
.pm-hero--warn   { border-color: var(--color-amber, #d97706); background: color-mix(in srgb, var(--color-amber, #d97706) 4%, var(--surface-page)); }
.pm-hero--ok     { border-color: color-mix(in srgb, var(--color-green, #16a34a) 40%, var(--surface-border)); }
.pm-hero-right { min-width: 0; }
.pm-verdict {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
}
.pm-verdict-icon {
  display: grid; place-items: center;
  width: 40px; height: 40px;
  border-radius: 9999px;
  background: var(--surface-recessed);
  color: var(--fg-muted);
  flex-shrink: 0;
}
.pm-verdict-icon--ok     { background: color-mix(in srgb, var(--color-green, #16a34a) 14%, transparent); color: var(--color-green, #16a34a); }
.pm-verdict-icon--warn   { background: color-mix(in srgb, var(--color-amber, #d97706) 14%, transparent); color: var(--color-amber, #d97706); }
.pm-verdict-icon--breach { background: color-mix(in srgb, var(--color-red, #dc2626) 14%, transparent); color: var(--color-red, #dc2626); }

/* ── Status atoms ────────────────────────────────────────────────────── */
.pm-dot {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 9999px;
  background: var(--surface-border);
}
.pm-dot--ok      { background: var(--color-green, #16a34a); }
.pm-dot--warn    { background: var(--color-amber, #d97706); }
.pm-dot--breach  { background: var(--color-red, #dc2626); animation: pm-pulse 1.6s ease-in-out infinite; }
.pm-dot--no_data { background: var(--fg-subtle); }
@keyframes pm-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.32); }
  50%      { box-shadow: 0 0 0 6px rgba(220,38,38,0.04); }
}
.pm-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  border: 1px solid var(--surface-border);
}
.pm-pill--ok     { border-color: var(--color-green, #16a34a); color: var(--color-green, #16a34a); background: color-mix(in srgb, var(--color-green, #16a34a) 8%, transparent); }
.pm-pill--warn   { border-color: var(--color-amber, #d97706); color: var(--color-amber, #d97706); background: color-mix(in srgb, var(--color-amber, #d97706) 8%, transparent); }
.pm-pill--breach { border-color: var(--color-red, #dc2626); color: var(--color-red, #dc2626); background: color-mix(in srgb, var(--color-red, #dc2626) 8%, transparent); }
.pm-pill--no_data{ color: var(--fg-subtle); }

/* ── Alert row ───────────────────────────────────────────────────────── */
.alert-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 2fr) auto auto auto auto;
  gap: 14px;
  align-items: center;
  padding: 10px 18px;
  border-bottom: 1px solid var(--surface-border);
  text-decoration: none;
  color: inherit;
  transition: background-color 150ms ease;
}
.alert-row:last-child { border-bottom: 0; }
.alert-row:hover { background: var(--surface-hover); }
.alert-row-value { text-align: right; }
.alert-row-target { text-align: right; }
@media (max-width: 760px) {
  .alert-row { grid-template-columns: 12px 1fr auto; }
  .alert-row-value, .alert-row-target { display: none; }
}

/* ── Watchlist card ──────────────────────────────────────────────────── */
.pm-watch {
  display: flex; flex-direction: column;
  padding: 16px 16px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.pm-watch::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  background: var(--surface-border);
}
.pm-watch--ok::before     { background: var(--color-green, #16a34a); }
.pm-watch--warn::before   { background: var(--color-amber, #d97706); }
.pm-watch--breach::before { background: var(--color-red, #dc2626); }
.pm-watch--no_data::before{ background: var(--fg-subtle); }
.pm-watch:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px -10px rgba(15, 76, 129, 0.30);
}

/* ── Group health row ────────────────────────────────────────────────── */
.pm-grouprow {
  display: block;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  text-decoration: none;
  color: inherit;
  transition: border-color 150ms ease;
}
.pm-grouprow:hover { border-color: var(--color-accent); }
.pm-grouprow-bar {
  margin-top: 10px;
  display: flex;
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
  background: var(--surface-border);
}
.pm-grouprow-bar > span { display: block; height: 100%; }

/* ── Signals explorer table ──────────────────────────────────────────── */
.pm-table { width: 100%; border-collapse: collapse; }
.pm-table thead { background: var(--surface-recessed); }
.pm-table th {
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  padding: 10px 14px;
  border-bottom: 1px solid var(--surface-border);
}
.pm-table td {
  padding: 12px 14px;
  vertical-align: top;
  border-bottom: 1px solid var(--surface-border);
  font-size: 13px;
  color: var(--fg-default);
}
.pm-table tr:last-child td { border-bottom: 0; }
.pm-table tr:hover td { background: var(--surface-hover); }
.pm-empty { padding: 28px 14px; text-align: center; color: var(--fg-muted); font-style: italic; }

@media (prefers-reduced-motion: reduce) {
  .pm-dot--breach { animation: none; }
  .pm-watch, .alert-row, .pm-grouprow { transition: none; }
  .pm-watch:hover { transform: none; }
}
`
