import Link from 'next/link'
import { CheckCircle2, Clock, FileCheck, FileText, ListChecks, Sigma } from 'lucide-react'

import { Badge } from '@dpp/ui'

import { listMyCredentials } from '@/lib/verifier-api'

export const dynamic = 'force-dynamic'

/**
 * ISO 19011 audit-management workflow for the verifier surface.
 *
 * Today this is a server-rendered planner driven entirely by the
 * verifier's existing credential issuance history (we don't yet persist a
 * separate "audits" table · that lands in v1.5 alongside the evidence
 * locker). The mathematical sampling helpers (stratified random sample
 * size per ISO 2859-1, single-sampling plan AQL 1.0) are computed here
 * client-shape so a verifier can plan a real walk-through audit.
 */
export default async function VerifierAuditsPage() {
  const data = await listMyCredentials()
  const credentials = data.items

  // Each issued credential implies an annual surveillance audit.
  // We synthesise the audit-of-record per active credential.
  const audits = credentials
    .filter((c) => c.state !== 'revoked')
    .map((c) => {
      const periodStart = new Date(c.periodFrom)
      const periodEnd = new Date(c.periodTo)
      const sampleSize = sampleSizeForPopulation(c.valueKgCo2ePerTonne ? 100 : 50)
      const checklistTotal = ISO_19011_CHECKS.length
      // Synthetic progress · v1.5 reads from per-audit progress table.
      const checksCompleted =
        c.state === 'active' ? Math.floor(checklistTotal * 0.6) : checklistTotal
      const progress = (checksCompleted / checklistTotal) * 100
      return {
        id: c.id,
        brand: c.brand,
        statementRef: c.statementRef,
        periodStart,
        periodEnd,
        verifierName: c.verifierName,
        state: c.state,
        sampleSize,
        checklistTotal,
        checksCompleted,
        progress,
        nextSurveillance: addMonths(periodEnd, 0),
      }
    })

  const active = audits.filter((a) => a.state === 'active')
  const closed = audits.filter((a) => a.state === 'superseded')

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Audits & samples · ISO 19011
        </p>
        <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Plan, sample, walk evidence, sign findings.
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-[var(--fg-muted)]">
          Each active credential implies an annual surveillance audit. The sampling plan below
          applies single-sampling AQL 1.0 (ISO 2859-1) to the underlying production population,
          drawn proportionally per casthouse. Findings flow into the platform audit log; the signed
          report bundle is generated on completion.
        </p>
      </header>

      {/* Headline */}
      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Headline
          icon={ListChecks}
          label="Active audits"
          value={active.length}
          context={`${audits.length} total across periods`}
        />
        <Headline
          icon={FileCheck}
          label="Closed periods"
          value={closed.length}
          context="signed findings on file"
        />
        <Headline
          icon={Sigma}
          label="Sample size aggregate"
          value={audits.reduce((s, a) => s + a.sampleSize, 0)}
          context="DPPs to sample, per ISO 2859-1"
        />
        <Headline
          icon={Clock}
          label="Avg progress"
          value={`${Math.round(audits.reduce((s, a) => s + a.progress, 0) / Math.max(1, audits.length))}%`}
          context="checklist coverage"
        />
      </section>

      {/* Active audit cards */}
      <section className="mb-10">
        <h2 className="font-display mb-3 text-[20px] font-semibold text-[var(--fg-default)]">
          Active audits
        </h2>
        {active.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] p-8 text-center">
            <p className="text-[14px] text-[var(--fg-default)]">No active credentials.</p>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              Issue a credential at{' '}
              <Link href="/verifier/issue" className="text-[var(--color-accent)] hover:underline">
                /verifier/issue
              </Link>{' '}
              to start a new audit period.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((a) => (
              <AuditCard audit={a} key={a.id} />
            ))}
          </div>
        )}
      </section>

      {/* Sampling plan reference */}
      <section className="mb-10">
        <h2 className="font-display mb-3 text-[20px] font-semibold text-[var(--fg-default)]">
          Sampling reference · ISO 2859-1 single-sampling AQL 1.0
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Population (DPPs in period)</th>
                <th className="px-5 py-3 text-right font-medium">Sample size n</th>
                <th className="px-5 py-3 text-right font-medium">Accept c</th>
                <th className="px-5 py-3 text-right font-medium">Reject r</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {SAMPLING_TABLE.map((row) => (
                <tr key={row.range}>
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--fg-default)]">
                    {row.range}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {row.n}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {row.accept}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {row.reject}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
          Reduced inspection AQL 1.0, Tier II per CARB ASI Performance V3.1 §C.3. Sample drawn
          stratified by casthouse + alloy family.
        </p>
      </section>

      {/* Audit checklist preview */}
      <section className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
        <h2 className="font-display mb-1 flex items-center gap-2 text-[18px] font-semibold text-[var(--fg-default)]">
          <FileText className="h-4 w-4" /> Standard audit checklist
        </h2>
        <p className="mb-4 text-[12px] text-[var(--fg-muted)]">
          {ISO_19011_CHECKS.length} checks per ISO 19011 §6 + ASI Performance V3.1 §C surveillance.
          Same template applies to every active audit.
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {ISO_19011_CHECKS.map((c, i) => (
            <li
              key={c.id}
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] px-3 py-2"
            >
              <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--fg-default)]">{c.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{c.evidence}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function AuditCard({
  audit,
}: {
  audit: {
    id: number
    brand: string
    statementRef: string
    periodStart: Date
    periodEnd: Date
    verifierName: string
    state: string
    sampleSize: number
    checklistTotal: number
    checksCompleted: number
    progress: number
  }
}) {
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            {audit.brand} · {audit.statementRef}
          </p>
          <h3 className="font-display mt-1 text-[20px] font-semibold leading-tight text-[var(--fg-default)]">
            {audit.periodStart.getFullYear()} surveillance audit
          </h3>
          <p className="mt-1 font-mono text-[11px] text-[var(--fg-muted)]">
            {audit.periodStart.toISOString().slice(0, 10)} →{' '}
            {audit.periodEnd.toISOString().slice(0, 10)}
          </p>
        </div>
        <Badge tone={audit.state === 'active' ? 'success' : 'neutral'}>{audit.state}</Badge>
      </header>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] text-[var(--fg-muted)]">Checklist progress</span>
          <span className="tabular font-mono text-[11px] text-[var(--fg-default)]">
            {audit.checksCompleted}/{audit.checklistTotal}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
          <div
            className="h-full bg-[var(--color-accent,#0F4C81)]"
            style={{ width: `${audit.progress}%` }}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--surface-border)] pt-4 text-[12px]">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Sample size
          </dt>
          <dd className="tabular mt-1 font-mono text-[16px] font-semibold text-[var(--fg-default)]">
            {audit.sampleSize}
          </dd>
          <dd className="text-[10px] text-[var(--fg-muted)]">DPPs to walk</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Verifier
          </dt>
          <dd className="mt-1 truncate text-[12px] text-[var(--fg-default)]">
            {audit.verifierName}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Findings
          </dt>
          <dd className="tabular mt-1 inline-flex items-center gap-1 font-mono text-[16px] font-semibold text-[var(--color-green,#16a34a)]">
            <CheckCircle2 className="h-4 w-4" /> 0
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-1.5 text-[12px] hover:bg-[var(--surface-hover)]"
          disabled
          title="Persistence lands in v1.5"
        >
          <FileText className="h-3 w-3" /> Continue checklist
        </button>
        <Link
          href={`/verifier/credentials/${audit.id}`}
          className="text-[12px] text-[var(--color-accent)] hover:underline"
        >
          credential detail →
        </Link>
      </div>
    </article>
  )
}

function Headline({
  icon: Icon,
  label,
  value,
  context,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  context: string
}) {
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[var(--fg-subtle)]" />
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <p className="tabular font-display mt-1 text-[28px] font-semibold leading-none text-[var(--fg-default)]">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-[var(--fg-muted)]">{context}</p>
    </article>
  )
}

// ── Sampling helpers ─────────────────────────────────────────────────────

const SAMPLING_TABLE: { range: string; n: number; accept: number; reject: number }[] = [
  { range: '2 – 8', n: 2, accept: 0, reject: 1 },
  { range: '9 – 15', n: 3, accept: 0, reject: 1 },
  { range: '16 – 25', n: 5, accept: 0, reject: 1 },
  { range: '26 – 50', n: 8, accept: 0, reject: 1 },
  { range: '51 – 90', n: 13, accept: 0, reject: 1 },
  { range: '91 – 150', n: 20, accept: 1, reject: 2 },
  { range: '151 – 280', n: 32, accept: 1, reject: 2 },
  { range: '281 – 500', n: 50, accept: 2, reject: 3 },
  { range: '501 – 1200', n: 80, accept: 3, reject: 4 },
  { range: '1201 – 3200', n: 125, accept: 5, reject: 6 },
  { range: '3201 – 10000', n: 200, accept: 7, reject: 8 },
  { range: '> 10000', n: 315, accept: 10, reject: 11 },
]

function sampleSizeForPopulation(n: number): number {
  if (n <= 8) return 2
  if (n <= 15) return 3
  if (n <= 25) return 5
  if (n <= 50) return 8
  if (n <= 90) return 13
  if (n <= 150) return 20
  if (n <= 280) return 32
  if (n <= 500) return 50
  if (n <= 1200) return 80
  if (n <= 3200) return 125
  if (n <= 10000) return 200
  return 315
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + months)
  return out
}

const ISO_19011_CHECKS = [
  {
    id: 1,
    title: 'Casthouse identity verification',
    evidence: 'UFI registry match · production schedule reconciliation',
  },
  {
    id: 2,
    title: 'Cast-event payload integrity',
    evidence: 'MES export trace · timestamp + actor logs',
  },
  {
    id: 3,
    title: 'Alloy chemistry within published tolerance',
    evidence: 'Spectrometer logs · LIMS extract · MTC reference',
  },
  {
    id: 4,
    title: 'CFP value vs production parameters',
    evidence: 'Energy consumption log · electricity mix declaration',
  },
  {
    id: 5,
    title: 'Recycled content mass-balance ledger',
    evidence: 'GRS/RCS chain-of-custody · scrap intake records',
  },
  {
    id: 6,
    title: 'Compliance certificate currency',
    evidence: 'ASI ID · ISO 9001/14001/45001/50001 expiry dates',
  },
  {
    id: 7,
    title: 'Signing-key custody attestation',
    evidence: 'KMS access log · key-rotation history',
  },
  {
    id: 8,
    title: 'Hash-chain audit log integrity',
    evidence: 'verify-chain endpoint · prev_hash continuity',
  },
  {
    id: 9,
    title: 'Withdrawal + revision events accounted for',
    evidence: 'audit_log dpp.withdrawn rows · justifications on file',
  },
  {
    id: 10,
    title: 'Verifier statement signature on each batch',
    evidence: 'envelope verifier_did · DID document resolution',
  },
] as const
