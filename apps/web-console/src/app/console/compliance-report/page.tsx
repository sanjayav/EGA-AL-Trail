import { Badge, type BadgeTone } from '@dpp/ui'

export const revalidate = 30

/* ── mock data ─────────────────────────────────────────────────────────── */

const CBAM_DEADLINE = new Date('2027-02-18')

interface PassportModel {
  name: string
  brand: string
  anchored: number
  pending: number
  draft: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  compliancePct: number
}

const MODELS: PassportModel[] = [
  {
    name: 'CelestiAL Extrusion Billet 6063',
    brand: 'CelestiAL',
    anchored: 12,
    pending: 2,
    draft: 0,
    risk: 'LOW',
    compliancePct: 86,
  },
  {
    name: 'CelestiAL-R Extrusion Billet 6061',
    brand: 'CelestiAL-R',
    anchored: 8,
    pending: 1,
    draft: 1,
    risk: 'LOW',
    compliancePct: 80,
  },
  {
    name: 'Standard Slab 1070',
    brand: 'Standard',
    anchored: 4,
    pending: 3,
    draft: 2,
    risk: 'MEDIUM',
    compliancePct: 44,
  },
  {
    name: 'High-Purity Billet 1050',
    brand: 'High-Purity',
    anchored: 2,
    pending: 0,
    draft: 1,
    risk: 'LOW',
    compliancePct: 67,
  },
  {
    name: 'Foundry Alloy A356',
    brand: 'Foundry',
    anchored: 0,
    pending: 1,
    draft: 3,
    risk: 'HIGH',
    compliancePct: 0,
  },
  {
    name: 'Standard Rolling Ingot 1050A',
    brand: 'Standard',
    anchored: 0,
    pending: 0,
    draft: 2,
    risk: 'HIGH',
    compliancePct: 0,
  },
]

const RISK_TONE: Record<string, BadgeTone> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'critical',
}

export default async function ComplianceReportPage() {
  const totalPassports = MODELS.reduce((s, m) => s + m.anchored + m.pending + m.draft, 0)
  const totalAnchored = MODELS.reduce((s, m) => s + m.anchored, 0)
  const totalPending = MODELS.reduce((s, m) => s + m.pending, 0)
  const overallCompliance =
    totalPassports > 0 ? Math.round((totalAnchored / totalPassports) * 100) : 0

  const daysUntilDeadline = Math.ceil(
    (CBAM_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div className="px-8 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
            Compliance Report
          </h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)]">
            Passport readiness and regulatory deadline tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]">
            Print Report
          </button>
          <button className="h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 text-[12px] font-medium text-white hover:opacity-90">
            Export CSV
          </button>
        </div>
      </header>

      {/* ── Deadline banner ────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[16px]">⚠️</span>
          <p className="text-[13px] text-[var(--fg-default)]">
            All aluminium on EU market must have anchored passports by{' '}
            <span className="font-semibold">18 Feb 2027</span>
          </p>
        </div>
        <span
          className="font-mono text-[24px] font-bold"
          style={{
            color:
              daysUntilDeadline > 180
                ? 'var(--color-green, #16a34a)'
                : daysUntilDeadline > 90
                  ? 'var(--color-amber, #d97706)'
                  : 'var(--color-red, #dc2626)',
          }}
        >
          {daysUntilDeadline}{' '}
          <span className="text-[12px] font-normal text-[var(--fg-muted)]">days</span>
        </span>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Passports" value={totalPassports} sub="Across all models" />
        <KpiCard label="Anchored" value={totalAnchored} sub="On-chain" tone="green" />
        <KpiCard label="Pending Anchor" value={totalPending} sub="In queue" tone="amber" />
        <KpiCard
          label="Compliance Rate"
          value={`${overallCompliance}%`}
          sub="Target: 100%"
          tone={overallCompliance >= 80 ? 'green' : overallCompliance >= 50 ? 'amber' : 'red'}
        />
      </section>

      {/* ── By model breakdown ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          By Aluminium Product
        </h2>
        <ul className="space-y-3">
          {MODELS.map((m) => (
            <li
              key={m.name}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--fg-default)]">{m.name}</p>
                <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                  {m.anchored} anchored · {m.pending} pending · {m.draft} draft
                </p>
                {/* progress bar */}
                <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${m.compliancePct}%`,
                      background:
                        m.compliancePct >= 80
                          ? 'var(--color-green, #16a34a)'
                          : m.compliancePct >= 50
                            ? 'var(--color-amber, #d97706)'
                            : 'var(--color-red, #dc2626)',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <Badge tone={RISK_TONE[m.risk] ?? 'neutral'}>{m.risk} RISK</Badge>
                <span className="font-mono text-[16px] font-semibold text-[var(--fg-default)]">
                  {m.compliancePct}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string | number
  sub: string
  tone?: 'default' | 'green' | 'amber' | 'red'
}) {
  const color =
    tone === 'green'
      ? 'var(--color-green, #16a34a)'
      : tone === 'amber'
        ? 'var(--color-amber, #d97706)'
        : tone === 'red'
          ? 'var(--color-red, #dc2626)'
          : 'var(--fg-default)'
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-[28px] font-semibold leading-none" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[var(--fg-muted)]">{sub}</p>
    </article>
  )
}
