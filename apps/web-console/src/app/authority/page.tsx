import Link from 'next/link'

import { Badge, Stat } from '@dpp/ui'

import { listAuditEntries, listDpps } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Authority Dashboard · read-only regulator surface (SDD §11).
 *
 * Auth: the calling principal must hold the `authority` role JWT, with the
 * `tnt` claim pinning the tenant under examination. The API enforces this
 * via `require_authority` on tier=authority reads; if the bearer token is
 * missing or wrong-role this page returns empty data with a clear notice.
 */
export default async function AuthorityPage() {
  const [list, audit] = await Promise.all([
    listDpps({ limit: 100 }),
    listAuditEntries({ limit: 100 }),
  ])

  return (
    <div className="px-10 py-10">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Authority access
          </p>
          <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
            Market surveillance, customs, CBAM.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-[var(--fg-muted)]">
            Credential-gated read of every issued passport, the full audit log,
            and tamper-evidence verification. Sign in with your authority DID and
            all data here is scoped to the tenant declared in your token.
          </p>
        </div>
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-2 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-3">
        <Stat label="Issued passports" value={list.total} />
        <Stat label="Audit entries (last page)" value={audit.items.length} />
        <Stat
          label="Latest issuance"
          value={
            list.items[0]?.issuedAt
              ? new Date(list.items[0].issuedAt).toISOString().slice(0, 10)
              : '—'
          }
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-[20px] font-semibold text-[var(--fg-default)]">
          Recently issued
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">UPI</th>
                <th className="px-5 py-3 text-left font-medium">Brand</th>
                <th className="px-5 py-3 text-left font-medium">Form</th>
                <th className="px-5 py-3 text-right font-medium">CFP (kg/t)</th>
                <th className="px-5 py-3 text-right font-medium">Recycled %</th>
                <th className="px-5 py-3 text-left font-medium">State</th>
                <th className="px-5 py-3 text-left font-medium">Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {list.items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                  >
                    No DPPs visible. Either none have been issued yet or your
                    authority token is missing the matching tenant claim.
                  </td>
                </tr>
              )}
              {list.items.slice(0, 25).map((d) => (
                <tr key={d.upi} className="hover:bg-[var(--surface-hover)]">
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-default)]">
                    {d.upi}
                  </td>
                  <td className="px-5 py-3 text-[var(--fg-default)]">{d.brand}</td>
                  <td className="px-5 py-3 text-[var(--fg-muted)]">{d.form}</td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {Math.round(d.cfpKgCo2ePerTonne).toLocaleString()}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {d.recycledContentPct.toFixed(1)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={d.state === 'published' ? 'success' : 'neutral'}>
                      {d.state}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {d.issuedAt ? d.issuedAt.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.items.length > 25 && (
          <p className="mt-2 text-[11px] text-[var(--fg-subtle)]">
            Showing first 25 of {list.total.toLocaleString()}. Bulk export by
            jurisdiction lands in Sprint 7.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-[20px] font-semibold text-[var(--fg-default)]">
          Recent audit entries
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Time</th>
                <th className="px-5 py-3 text-left font-medium">Action</th>
                <th className="px-5 py-3 text-left font-medium">Target</th>
                <th className="px-5 py-3 text-left font-medium">Actor</th>
                <th className="px-5 py-3 text-left font-medium">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {audit.items.slice(0, 20).map((a) => (
                <tr key={a.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {a.occurredAt.slice(0, 19).replace('T', ' ')}Z
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="info">{a.action}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {a.targetKind}
                    {a.targetId ? ` · ${a.targetId}` : ''}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {a.actorId ?? a.actorKind}
                  </td>
                  <td className="px-5 py-3 font-mono text-[10px] text-[var(--fg-subtle)]">
                    {a.currentHash.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
