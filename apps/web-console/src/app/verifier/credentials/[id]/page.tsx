import { notFound } from 'next/navigation'

import { Badge, Stat } from '@dpp/ui'

import { fetchAffectedDpps, listMyCredentials } from '@/lib/verifier-api'
import { CredentialActions } from '@/components/verifier/CredentialActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CredentialDetailPage({ params }: PageProps) {
  const { id } = await params
  const credentialId = Number(id)
  if (!Number.isInteger(credentialId)) notFound()

  const [list, affected] = await Promise.all([listMyCredentials(), fetchAffectedDpps(credentialId)])
  const credential = list.items.find((c) => c.id === credentialId)
  if (!credential) notFound()

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Credential #{credential.id}
        </p>
        <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          {credential.brand} ·{' '}
          <span className="tabular font-mono text-[var(--color-gold-deep,var(--color-accent))]">
            {Math.round(credential.valueKgCo2ePerTonne).toLocaleString()}
          </span>{' '}
          <span className="font-mono text-[18px] text-[var(--fg-muted)]">kg CO₂e/t</span>
        </h1>
      </header>

      <section className="mb-10 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="State"
          value={
            <Badge
              tone={
                credential.state === 'active'
                  ? 'success'
                  : credential.state === 'revoked'
                    ? 'critical'
                    : 'neutral'
              }
            >
              {credential.state}
            </Badge>
          }
        />
        <Stat label="Period" value={credential.periodFrom} context={`→ ${credential.periodTo}`} />
        <Stat label="Assurance" value={credential.assuranceLevel} />
        <Stat
          label="Affected DPPs"
          value={affected?.byBrandCount ?? 0}
          context={`${affected?.byStatementRefCount ?? 0} already cite this statement`}
        />
      </section>

      <section className="mb-10 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Statement reference
        </p>
        <p className="mt-2 font-mono text-[14px] text-[var(--fg-default)]">
          {credential.statementRef}
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Verifier DID
        </p>
        <p className="mt-2 break-all font-mono text-[13px] text-[var(--fg-default)]">
          {credential.verifierDid}
        </p>
      </section>

      <CredentialActions
        credentialId={credential.id}
        state={credential.state}
        affectedCount={affected?.byBrandCount ?? 0}
      />

      {affected && affected.samples.length > 0 && (
        <section className="mt-10 overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <div className="border-b border-[var(--surface-divider)] px-5 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
              Affected DPPs (sample of {affected.samples.length} of {affected.byBrandCount})
            </p>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">UPI</th>
                <th className="px-5 py-3 text-left font-medium">Issued</th>
                <th className="px-5 py-3 text-right font-medium">Current CFP</th>
                <th className="px-5 py-3 text-left font-medium">Cites</th>
                <th className="px-5 py-3 text-left font-medium">Will change?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {affected.samples.map((s) => (
                <tr key={s.upi} className="hover:bg-[var(--surface-hover)]">
                  <td className="inline-block max-w-[280px] truncate px-5 py-3 align-middle font-mono text-[12px]">
                    {s.upi}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--fg-muted)]">
                    {s.issuedAt?.slice(0, 10) ?? '—'}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px]">
                    {Math.round(s.currentCfp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {s.currentStatementRef ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    {s.willChange ? (
                      <Badge tone="warning">rollover pending</Badge>
                    ) : (
                      <Badge tone="success">already on this credential</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
