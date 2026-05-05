import Link from 'next/link'

import { Badge } from '@dpp/ui'

import { listMyCredentials, type VerifierCredential } from '@/lib/verifier-api'

const STATE_TONE: Record<VerifierCredential['state'], 'success' | 'neutral' | 'critical'> = {
  active: 'success',
  superseded: 'neutral',
  revoked: 'critical',
}

export default async function CredentialsListPage() {
  const data = await listMyCredentials()

  return (
    <div className="px-10 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            My credentials
          </p>
          <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
            Issuance ledger.
          </h1>
        </div>
        <Link
          href="/verifier/issue"
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          Issue new credential →
        </Link>
      </header>

      <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Brand</th>
              <th className="px-5 py-3 text-left font-medium">Period</th>
              <th className="px-5 py-3 text-right font-medium">Value (kg/t)</th>
              <th className="px-5 py-3 text-left font-medium">Statement</th>
              <th className="px-5 py-3 text-left font-medium">Assurance</th>
              <th className="px-5 py-3 text-left font-medium">State</th>
              <th className="px-5 py-3 text-left font-medium">Issued</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-divider)]">
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                >
                  No credentials issued yet. Use{' '}
                  <Link
                    href="/verifier/issue"
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    Issue credential
                  </Link>{' '}
                  to publish the first one.
                </td>
              </tr>
            )}
            {data.items.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                <td className="px-5 py-3 text-[var(--fg-default)]">{c.brand}</td>
                <td className="tabular px-5 py-3 font-mono text-[12px] text-[var(--fg-muted)]">
                  {c.periodFrom} → {c.periodTo}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                  {Math.round(c.valueKgCo2ePerTonne).toLocaleString()}
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-[var(--fg-muted)]">
                  {c.statementRef}
                </td>
                <td className="px-5 py-3 text-[var(--fg-muted)]">{c.assuranceLevel}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATE_TONE[c.state]}>{c.state}</Badge>
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-[var(--fg-muted)]">
                  {c.createdAt.slice(0, 10)}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/verifier/credentials/${c.id}`}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
