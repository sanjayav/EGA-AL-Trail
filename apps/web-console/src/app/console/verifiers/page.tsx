import Link from 'next/link'

import { Badge } from '@dpp/ui'

import { listVerifierRegistry, type VerifierRegistryEntry } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function VerifiersPage() {
  const items = await listVerifierRegistry()

  const totalActive = items.reduce((acc, v) => acc + v.stateCounts.active, 0)
  const totalDependent = items.reduce((acc, v) => acc + v.dependentDppCount, 0)

  return (
    <div className="px-8 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
            External verifiers
          </h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)]">
            {items.length.toLocaleString()} verifier{items.length === 1 ? '' : 's'} ·{' '}
            <span className="tabular font-mono">{totalActive}</span> active credential
            {totalActive === 1 ? '' : 's'} ·{' '}
            <span className="tabular font-mono">{totalDependent.toLocaleString()}</span> DPP
            {totalDependent === 1 ? '' : 's'} currently depend on these signatures.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((v) => (
            <VerifierCard key={v.verifierDid} verifier={v} />
          ))}
        </div>
      )}
    </div>
  )
}

function VerifierCard({ verifier: v }: { verifier: VerifierRegistryEntry }) {
  const today = new Date().toISOString().slice(0, 10)
  const expiring = v.latestPeriodTo && v.latestPeriodTo < today

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--fg-default)]">{v.verifierName}</h2>
          <p className="mt-1 break-all font-mono text-[11px] text-[var(--fg-muted)]">
            {v.verifierDid}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular font-mono text-[20px] font-semibold leading-none text-[var(--fg-default)]">
            {v.dependentDppCount.toLocaleString()}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            DPPs depend on this
          </span>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {v.stateCounts.active > 0 && <Badge tone="success">{v.stateCounts.active} active</Badge>}
        {v.stateCounts.superseded > 0 && (
          <Badge tone="neutral">{v.stateCounts.superseded} superseded</Badge>
        )}
        {v.stateCounts.revoked > 0 && (
          <Badge tone="critical">{v.stateCounts.revoked} revoked</Badge>
        )}
        {expiring && <Badge tone="warning">latest credential expired</Badge>}
      </div>

      <table className="mt-4 w-full text-[12px]">
        <thead className="text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
          <tr>
            <th className="py-1 pr-2 text-left font-medium">Brand</th>
            <th className="py-1 pr-2 text-left font-medium">Period</th>
            <th className="py-1 pr-2 text-right font-medium">Value (kg/t)</th>
            <th className="py-1 pl-2 text-left font-medium">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--surface-divider)]">
          {v.brands.slice(0, 6).map((b) => (
            <tr key={b.id}>
              <td className="py-2 pr-2 text-[var(--fg-default)]">{b.brand}</td>
              <td className="tabular py-2 pr-2 font-mono text-[11px] text-[var(--fg-muted)]">
                {b.periodFrom} → {b.periodTo}
              </td>
              <td className="tabular py-2 pr-2 text-right font-mono text-[11px] text-[var(--fg-default)]">
                {Math.round(b.valueKgCo2ePerTonne).toLocaleString()}
              </td>
              <td className="py-2 pl-2">
                <span
                  className={
                    b.state === 'active'
                      ? 'text-[var(--color-green,#16A34A)]'
                      : b.state === 'revoked'
                        ? 'text-[#991B1B]'
                        : 'text-[var(--fg-muted)]'
                  }
                >
                  {b.state}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {v.brands.length > 6 && (
        <p className="mt-2 text-[11px] text-[var(--fg-subtle)]">
          + {v.brands.length - 6} earlier credential{v.brands.length - 6 === 1 ? '' : 's'} in
          history
        </p>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-[var(--surface-border)] pt-3 text-[12px]">
        <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
          {v.latestStatementRef ? `latest: ${v.latestStatementRef}` : 'no active credential'}
        </span>
        <Link
          href={`/console/audit?actorKind=external_verifier`}
          className="text-[var(--color-accent)] hover:underline"
        >
          activity in audit log →
        </Link>
      </footer>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] px-8 py-16 text-center">
      <p className="text-[14px] text-[var(--fg-default)]">No external verifiers yet.</p>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
        Once a verifier (DNV, Bureau Veritas, ASI, a notified body) issues their first credential on
        this tenant, they'll appear here.
      </p>
    </div>
  )
}
