import { Badge, Stat } from '@dpp/ui'

import { fetchPlatformOverview, fetchTrustList, listTenantsAdmin } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const [overview, tenants, trust] = await Promise.all([
    fetchPlatformOverview(),
    listTenantsAdmin(),
    fetchTrustList(),
  ])

  return (
    <div className="px-10 py-10">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Super Admin
          </p>
          <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
            Platform overview.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-[var(--fg-muted)]">
            Read-only view of every tenant, every active verifier credential, and the trust list of
            issuer DIDs. Provisioning + Stripe Billing land in Sprint 8 · until then, manage via the
            migration + KMS path.
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
        <Stat label="Tenants" value={overview?.tenants ?? 0} />
        <Stat label="DPPs issued" value={overview?.dpps ?? 0} />
        <Stat label="Active credentials" value={overview?.activeCredentials ?? 0} />
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-[20px] font-semibold text-[var(--fg-default)]">
          Tenants
        </h2>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Slug</th>
                <th className="px-5 py-3 text-left font-medium">Legal name</th>
                <th className="px-5 py-3 text-left font-medium">Tier</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">DPPs</th>
                <th className="px-5 py-3 text-right font-medium">Active creds</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {tenants.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                  >
                    No tenants yet · sign in as a platform admin and provision one via the migration
                    + manual seed (auto-provisioning lands in Sprint 8).
                  </td>
                </tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--surface-hover)]">
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--fg-default)]">
                    {t.slug}
                  </td>
                  <td className="px-5 py-3 text-[var(--fg-default)]">{t.legalName}</td>
                  <td className="px-5 py-3 text-[var(--fg-muted)]">{t.tier}</td>
                  <td className="px-5 py-3">
                    <Badge tone={t.status === 'active' ? 'success' : 'neutral'}>{t.status}</Badge>
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {t.dppCount.toLocaleString()}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {t.activeCredentialCount}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {t.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display mb-3 text-[20px] font-semibold text-[var(--fg-default)]">
          Trust list
        </h2>
        <p className="mb-3 max-w-2xl text-[12px] text-[var(--fg-muted)]">
          Distinct verifier DIDs that have ever issued a credential on the platform. Editable
          allow-list lands in Sprint 8 · for now this is the authoritative ledger.
        </p>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Verifier</th>
                <th className="px-5 py-3 text-left font-medium">DID</th>
                <th className="px-5 py-3 text-right font-medium">Credentials</th>
                <th className="px-5 py-3 text-left font-medium">Latest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-divider)]">
              {trust.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                  >
                    No verifier has signed a credential yet.
                  </td>
                </tr>
              )}
              {trust.map((v) => (
                <tr key={v.did} className="hover:bg-[var(--surface-hover)]">
                  <td className="px-5 py-3 text-[var(--fg-default)]">{v.name}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {v.did}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                    {v.credentials}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {v.latest ? v.latest.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Pending Sprint 8
        </p>
        <ul className="mt-2 space-y-1 text-[13px] text-[var(--fg-muted)]">
          <li>· Tenant provisioning wizard with first-run config</li>
          <li>· Stripe Billing for subscription tier + usage metering</li>
          <li>· Per-tenant feature flag matrix</li>
          <li>· Schema manifest version manager (DPP 1.0 → 4)</li>
          <li>· Editable trust list with revocation propagation</li>
          <li>· Tenant impersonation log + on-call runbooks</li>
        </ul>
      </section>
    </div>
  )
}
