import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  Factory,
  Gauge,
  Network,
  Server,
  Workflow,
  Zap,
} from 'lucide-react'

import {
  fetchSignalDetail,
  type BreachEvent,
  type PipelineStop,
  type Provenance,
  type SignalDetail,
  type SignalSeriesPoint,
  type SignalStatus,
  type SourceKind,
} from '@/lib/plant-monitor-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RANGE_OPTIONS: { key: '24h' | '7d' | '30d'; label: string }[] = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
]

const STATUS_LABEL: Record<SignalStatus, string> = {
  ok: 'In band',
  warn: 'Warn',
  breach: 'Breach',
  no_data: 'No data',
}

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  sensor: 'Field sensor',
  mes: 'MES rollup',
  spectrometer: 'Lab spectrometer',
  weighbridge: 'Weighbridge',
  ems: 'Energy mgmt system',
  ledger: 'Mass-balance ledger',
  external_feed: 'External feed',
  derived: 'Derived signal',
  manual: 'Manual entry',
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  device: Gauge,
  system: Factory,
  api: Server,
  store: Database,
  aggregator: Workflow,
  dashboard: Network,
}

interface PageProps {
  params: Promise<{ key: string }>
  searchParams: Promise<{ range?: string }>
}

export default async function SignalDetailPage({ params, searchParams }: PageProps) {
  const { key } = await params
  const { range: rangeRaw } = await searchParams
  const range = (RANGE_OPTIONS.find((o) => o.key === rangeRaw)?.key ?? '24h') as
    | '24h'
    | '7d'
    | '30d'
  const detail = await fetchSignalDetail(key, range)

  if (detail.accessDenied) {
    return (
      <div className="px-8 py-12">
        <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-10 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-[var(--color-amber,#d97706)]" />
          <h1 className="mt-3 text-[20px] font-semibold text-[var(--fg-default)]">Access denied</h1>
          <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
            Signal detail is restricted to tenant auditors and admins.
          </p>
        </div>
      </div>
    )
  }
  if (detail.notFound) notFound()

  const r = detail.reading
  const inBand =
    r.value !== null &&
    (r.targetMin === null || r.value >= r.targetMin) &&
    (r.targetMax === null || r.value <= r.targetMax)
  const isLive = r.provenance.realData

  // Stand-in signals get a different layout — no fake chart, no fake stats,
  // no fake breach trail. Just the operating-band spec, the regulatory
  // anchor, and the planned data lineage.
  if (!isLive) {
    return (
      <div className="px-8 py-8">
        <Link
          href="/console/plant-monitor"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Plant Monitor
        </Link>

        <header className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              Reference target · {r.group} · sensor not yet commissioned
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
              {r.label}
            </h1>
            <p className="mt-1 max-w-3xl text-[14px] text-[var(--fg-muted)]">{r.description}</p>
          </div>
          <span className="pmd-pill" style={{ borderColor: 'var(--fg-subtle)', color: 'var(--fg-subtle)' }}>
            Pre-instrumentation
          </span>
        </header>

        {/* Spec card · operating band + regulatory anchor */}
        <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Operating band
          </p>
          <p className="tabular mt-2 font-mono text-[32px] font-semibold leading-none text-[var(--fg-default)]">
            {formatBand(r.targetMin, r.targetMax, r.unit)}
          </p>
          <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
            Once the sensor described below comes online, values inside this band render green;
            outside, the platform raises an alert and links the breach in the Compliance Report.
          </p>
          {r.regulatoryAnchor && (
            <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] px-3 py-2 text-[12px] italic text-[var(--fg-muted)]">
              Regulatory anchor: <span className="not-italic">{r.regulatoryAnchor}</span>
            </p>
          )}
        </section>

        {/* Planned provenance — same component, but the headline reads
         * differently because `realData=false` */}
        <ProvenancePanel provenance={r.provenance} />

        <style>{PMD_CSS}</style>
      </div>
    )
  }

  return (
    <div className="px-8 py-8">
      <Link
        href="/console/plant-monitor"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Plant Monitor
      </Link>

      <header className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Signal · {r.group} · live data
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
            {r.label}
          </h1>
          <p className="mt-1 max-w-3xl text-[14px] text-[var(--fg-muted)]">{r.description}</p>
        </div>
        <span className={`pmd-pill pmd-pill--${r.status}`}>
          <span className={`pmd-dot pmd-dot--${r.status}`} aria-hidden />
          {STATUS_LABEL[r.status]}
        </span>
      </header>

      {/* Hero metric + range chooser + chart */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2.2fr]">
        <article className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Current value
          </p>
          <p className="tabular mt-2 font-mono text-[44px] font-semibold leading-none text-[var(--fg-default)]">
            {formatNumber(r.value)}{' '}
            <span className="text-[16px] font-normal text-[var(--fg-muted)]">{r.unit}</span>
          </p>
          <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
            Target: <span className="font-mono">{formatBand(r.targetMin, r.targetMax, r.unit)}</span>
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            {inBand ? '✓ inside the operating band' : '⚠ outside the operating band'}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {Object.entries({
              Min: detail.stats.min,
              Max: detail.stats.max,
              Mean: detail.stats.mean,
              p50: detail.stats.p50,
              p95: detail.stats.p95,
              Stddev: detail.stats.stddev,
            }).map(([k, v]) => (
              <Stat key={k} label={k} value={v === undefined ? '—' : formatNumber(v)} />
            ))}
          </dl>

          {r.regulatoryAnchor && (
            <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] px-3 py-2 text-[11px] italic text-[var(--fg-muted)]">
              Regulatory anchor: <span className="not-italic">{r.regulatoryAnchor}</span>
            </p>
          )}
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">Trend</h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                {detail.rangeLabel}
              </p>
            </div>
            <nav className="flex gap-1.5">
              {RANGE_OPTIONS.map((o) => (
                <Link
                  key={o.key}
                  href={`/console/plant-monitor/${encodeURIComponent(r.key)}?range=${o.key}` as Route}
                  className={[
                    'rounded-[var(--radius-pill)] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
                    o.key === range
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'border-[var(--surface-border)] bg-[var(--surface-page)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
                  ].join(' ')}
                >
                  {o.label}
                </Link>
              ))}
            </nav>
          </div>
          <BigChart series={detail.series} status={r.status} targetMin={r.targetMin} targetMax={r.targetMax} />
          {detail.breachEvents.length > 0 && (
            <p className="mt-2 text-[11px] text-[var(--color-red,#dc2626)]">
              {detail.breachEvents.length} breach event{detail.breachEvents.length === 1 ? '' : 's'} in this window
            </p>
          )}
        </article>
      </section>

      {/* Provenance — "How we collect this" */}
      <ProvenancePanel provenance={r.provenance} />

      {/* Breach trail */}
      {detail.breachEvents.length > 0 && (
        <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-red,#dc2626)] bg-[color:rgba(220,38,38,0.04)] p-5">
          <h2 className="text-[14px] font-semibold text-[var(--color-red,#dc2626)]">
            Breach events in this window
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {detail.breachEvents.map((b, i) => (
              <BreachItem key={i} event={b} unit={r.unit} />
            ))}
          </ul>
        </section>
      )}

      {/* Recycled-content extra: per-batch breakdown */}
      {detail.recentBatches && detail.recentBatches.length > 0 && (
        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
          <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">
            Recent batches contributing to this number
          </h2>
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            Each row is a published DPP. The 24h rolling number above is the volume-weighted mean
            of every cast issued since the cut-off, sourced directly from the signed envelope.
          </p>
          <table className="pmd-table mt-3">
            <thead>
              <tr>
                <th>UPI</th>
                <th>Brand</th>
                <th>Cast number</th>
                <th>Recycled %</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentBatches.map((b) => (
                <tr key={b.upi}>
                  <td className="break-all font-mono text-[11px]">{b.upi}</td>
                  <td>{b.brand}</td>
                  <td className="font-mono text-[11px]">{b.castNumber}</td>
                  <td className="tabular font-mono">{b.recycledContentPct.toFixed(1)}%</td>
                  <td className="font-mono text-[11px] text-[var(--fg-muted)]">
                    {relTime(b.issuedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <style>{PMD_CSS}</style>
    </div>
  )
}

function ProvenancePanel({ provenance }: { provenance: Provenance }) {
  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">
            How we collect this
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
            The live data lineage from instrument to dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {provenance.realData ? (
            <span className="rounded-[var(--radius-pill)] bg-[color:rgba(22,163,74,0.10)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-green,#16a34a)]">
              Live data
            </span>
          ) : (
            <span className="rounded-[var(--radius-pill)] bg-[var(--surface-recessed)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Stand-in (sensor not yet wired)
            </span>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Source
          </dt>
          <dd className="mt-0.5 text-[var(--fg-default)]">
            {SOURCE_KIND_LABEL[provenance.sourceKind] ?? provenance.sourceKind}
          </dd>
          <dd className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{provenance.sourceLabel}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Read frequency
          </dt>
          <dd className="mt-0.5 font-mono text-[var(--fg-default)]">
            {humanFrequency(provenance.frequencySeconds)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            End-to-end latency (p50)
          </dt>
          <dd className="mt-0.5 font-mono text-[var(--fg-default)]">
            {humanDuration(provenance.latencySecondsP50)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Pipeline hops
          </dt>
          <dd className="mt-0.5 font-mono text-[var(--fg-default)]">{provenance.pipeline.length}</dd>
        </div>
      </dl>

      {/* Pipeline diagram */}
      <ol className="pmd-pipeline mt-5">
        {provenance.pipeline.map((stop, i) => {
          const Icon = KIND_ICON[stop.kind] ?? Workflow
          return (
            <li key={`${stop.name}-${i}`} className="pmd-pipeline-stop">
              <span className={`pmd-pipeline-step pmd-pipeline-step--${stop.kind}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--fg-default)]">{stop.name}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  {stop.kind}
                </p>
                {stop.note && (
                  <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{stop.note}</p>
                )}
              </div>
              {i < provenance.pipeline.length - 1 && <span className="pmd-pipeline-arrow" aria-hidden />}
            </li>
          )
        })}
      </ol>

      {provenance.dataQuality && (
        <p className="mt-5 rounded-[var(--radius-sm)] bg-[var(--surface-recessed)] px-3 py-2 text-[12px] text-[var(--fg-muted)]">
          <span className="font-mono uppercase tracking-wider text-[var(--fg-subtle)]">
            Data quality:
          </span>{' '}
          {provenance.dataQuality}
        </p>
      )}
    </section>
  )
}

function BigChart({
  series,
  status,
  targetMin,
  targetMax,
}: {
  series: SignalSeriesPoint[]
  status: SignalStatus
  targetMin: number | null
  targetMax: number | null
}) {
  if (series.length < 2) {
    return (
      <div className="grid h-48 place-items-center text-[12px] text-[var(--fg-muted)]">
        Not enough data to plot.
      </div>
    )
  }
  const values = series.map((p) => p.value)
  const includeBands = [targetMin, targetMax].filter((v): v is number => v !== null)
  const yMin = Math.min(...values, ...includeBands)
  const yMax = Math.max(...values, ...includeBands)
  const ySpan = yMax - yMin || 1
  const padY = ySpan * 0.08
  const minY = yMin - padY
  const maxY = yMax + padY
  const span = maxY - minY

  const w = 720
  const h = 220
  const padL = 40
  const padR = 12
  const padT = 10
  const padB = 24
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const xFor = (i: number) => padL + (innerW * i) / Math.max(1, series.length - 1)
  const yFor = (v: number) => padT + innerH - ((v - minY) / span) * innerH

  const linePts = series.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(' ')

  const stroke =
    status === 'breach'
      ? 'var(--color-red, #dc2626)'
      : status === 'warn'
        ? 'var(--color-amber, #d97706)'
        : status === 'no_data'
          ? 'var(--fg-subtle)'
          : 'var(--color-accent)'
  const fill =
    status === 'breach'
      ? 'rgba(220,38,38,0.08)'
      : status === 'warn'
        ? 'rgba(217,119,6,0.08)'
        : 'rgba(15,76,129,0.08)'

  // X-axis ticks: 5 evenly spaced
  const tickCount = 5
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    series[Math.round(((series.length - 1) * i) / (tickCount - 1))],
  ).filter(Boolean) as SignalSeriesPoint[]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-56 w-full"
      role="img"
      aria-label="signal trend"
    >
      {/* Target band */}
      {targetMin !== null && targetMax !== null && (
        <rect
          x={padL}
          y={yFor(targetMax)}
          width={innerW}
          height={Math.max(0, yFor(targetMin) - yFor(targetMax))}
          fill="rgba(22,163,74,0.07)"
          stroke="rgba(22,163,74,0.30)"
          strokeDasharray="3 3"
        />
      )}
      {/* Threshold lines for one-sided bounds */}
      {targetMin !== null && targetMax === null && (
        <line
          x1={padL}
          y1={yFor(targetMin)}
          x2={padL + innerW}
          y2={yFor(targetMin)}
          stroke="rgba(22,163,74,0.5)"
          strokeDasharray="3 3"
        />
      )}
      {targetMax !== null && targetMin === null && (
        <line
          x1={padL}
          y1={yFor(targetMax)}
          x2={padL + innerW}
          y2={yFor(targetMax)}
          stroke="rgba(22,163,74,0.5)"
          strokeDasharray="3 3"
        />
      )}
      {/* Y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="var(--surface-border)" />
      {/* X axis */}
      <line
        x1={padL}
        y1={padT + innerH}
        x2={padL + innerW}
        y2={padT + innerH}
        stroke="var(--surface-border)"
      />
      {/* Y-axis labels */}
      <text x={padL - 6} y={yFor(maxY) + 4} fontSize="9" textAnchor="end" fill="var(--fg-muted)">
        {formatNumber(maxY)}
      </text>
      <text
        x={padL - 6}
        y={yFor(minY) + 4}
        fontSize="9"
        textAnchor="end"
        fill="var(--fg-muted)"
      >
        {formatNumber(minY)}
      </text>
      {/* X-axis ticks */}
      {ticks.map((p, i) => {
        const x = xFor(Math.round(((series.length - 1) * i) / (tickCount - 1)))
        return (
          <g key={p.ts}>
            <line x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 4} stroke="var(--surface-border)" />
            <text x={x} y={padT + innerH + 16} fontSize="9" textAnchor="middle" fill="var(--fg-muted)">
              {tickLabel(p.ts)}
            </text>
          </g>
        )
      })}
      {/* Area fill under the line */}
      <polygon
        points={`${padL},${padT + innerH} ${linePts} ${padL + innerW},${padT + innerH}`}
        fill={fill}
      />
      {/* Line */}
      <polyline points={linePts} fill="none" stroke={stroke} strokeWidth="1.6" />
    </svg>
  )
}

function BreachItem({ event, unit }: { event: BreachEvent; unit: string }) {
  return (
    <li className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-2 text-[12px]">
      <p className="font-medium text-[var(--fg-default)]">
        {fullTime(event.from)} → {fullTime(event.to)}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-muted)]">
        Extreme: {formatNumber(event.extreme)} {unit}
      </p>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--fg-default)]">{value}</dd>
    </>
  )
}

function formatNumber(v: number | null | undefined): string {
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

function tickLabel(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function fullTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hh}:${mm}`
}

function humanFrequency(s: number): string {
  if (s <= 1) return `${s} s · real-time`
  if (s < 60) return `every ${s} s`
  if (s < 3600) return `every ${Math.round(s / 60)} min`
  if (s < 86400) return `every ${Math.round(s / 3600)} h`
  return `every ${Math.round(s / 86400)} d`
}

function humanDuration(s: number): string {
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

const PMD_CSS = `
.pmd-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 9999px;
  background: var(--surface-border);
}
.pmd-dot--ok      { background: var(--color-green, #16a34a); }
.pmd-dot--warn    { background: var(--color-amber, #d97706); }
.pmd-dot--breach  { background: var(--color-red, #dc2626); }
.pmd-dot--no_data { background: var(--fg-subtle); }

.pmd-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--surface-border);
}
.pmd-pill--ok     { border-color: var(--color-green, #16a34a); color: var(--color-green, #16a34a); background: color-mix(in srgb, var(--color-green, #16a34a) 8%, transparent); }
.pmd-pill--warn   { border-color: var(--color-amber, #d97706); color: var(--color-amber, #d97706); background: color-mix(in srgb, var(--color-amber, #d97706) 8%, transparent); }
.pmd-pill--breach { border-color: var(--color-red, #dc2626); color: var(--color-red, #dc2626); background: color-mix(in srgb, var(--color-red, #dc2626) 8%, transparent); }
.pmd-pill--no_data{ color: var(--fg-subtle); }

.pmd-pipeline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.pmd-pipeline-stop {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: var(--surface-recessed);
}
.pmd-pipeline-step {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9999px;
  flex-shrink: 0;
  border: 2px solid var(--surface-border);
  background: var(--surface-page);
}
.pmd-pipeline-step--device     { border-color: var(--color-accent, #0F4C81); color: var(--color-accent, #0F4C81); }
.pmd-pipeline-step--system     { border-color: #6366f1; color: #6366f1; }
.pmd-pipeline-step--api        { border-color: #14b8a6; color: #14b8a6; }
.pmd-pipeline-step--store      { border-color: #d97706; color: #d97706; }
.pmd-pipeline-step--aggregator { border-color: #a855f7; color: #a855f7; }
.pmd-pipeline-step--dashboard  { border-color: #16a34a; color: #16a34a; }

.pmd-table {
  width: 100%;
  border-collapse: collapse;
}
.pmd-table th {
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  padding: 8px 10px;
  border-bottom: 1px solid var(--surface-border);
}
.pmd-table td {
  padding: 10px;
  border-bottom: 1px solid var(--surface-border);
  font-size: 12px;
  color: var(--fg-default);
}
.pmd-table tr:last-child td { border-bottom: 0; }
.pmd-table tr:hover td { background: var(--surface-hover); }
`
