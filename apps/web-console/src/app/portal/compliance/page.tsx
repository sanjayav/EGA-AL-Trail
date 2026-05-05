import { CheckCircle2, AlertCircle } from 'lucide-react'

import { Badge, Stat } from '@dpp/ui'

import { currentUser } from '@/lib/auth'
import { fetchComplianceSummary } from '@/lib/customer-api'

export default async function CompliancePage() {
  const user = await currentUser()
  const data = await fetchComplianceSummary()

  const fullCoverage = data.items.filter((i) => i.coveragePct === 100).length
  const partial = data.items.filter((i) => i.coveragePct > 0 && i.coveragePct < 100).length
  const gaps = data.items.filter((i) => i.coveragePct === 0).length

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Zone 01 · Compliance Dashboard
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Every regulation, every shipment.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          REACH, RoHS, PFAS, conflict minerals, ASI Performance, ASI CoC, the
          ISO management standards · checked across every DPP you've received.
          Drill into any row to see the underlying certificates.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="DPPs covered" value={data.totalDpps.toLocaleString()} />
        <Stat label="Full coverage" value={fullCoverage} unit="programmes" />
        <Stat
          label="Partial coverage"
          value={partial}
          context="needs follow-up"
        />
        <Stat
          label="Gaps"
          value={gaps}
          context={gaps === 0 ? 'all clear' : 'requires action'}
        />
      </section>

      <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Programme</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Coverage</th>
              <th className="px-5 py-3 text-right font-medium">Compliant</th>
              <th className="px-5 py-3 text-right font-medium">Pending</th>
              <th className="px-5 py-3 text-right font-medium">Gaps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-divider)]">
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                >
                  No DPPs received yet. Your supplier needs to issue and send at
                  least one passport before this dashboard populates.
                </td>
              </tr>
            )}
            {data.items.map((item) => (
              <tr key={item.name} className="hover:bg-[var(--surface-hover)]">
                <td className="px-5 py-3 text-[var(--fg-default)]">{item.name}</td>
                <td className="px-5 py-3">
                  {item.coveragePct === 100 ? (
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-green)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <Badge tone="success">Compliant</Badge>
                    </span>
                  ) : item.coveragePct > 0 ? (
                    <Badge tone="warning">Partial</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-red)]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <Badge tone="critical">Gap</Badge>
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="ml-auto flex items-center justify-end gap-3">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${item.coveragePct}%`,
                          background:
                            item.coveragePct === 100
                              ? 'var(--color-green)'
                              : item.coveragePct > 0
                                ? 'var(--color-amber)'
                                : 'var(--color-red)',
                        }}
                      />
                    </div>
                    <span className="tabular w-12 text-right font-mono text-[12px] text-[var(--fg-default)]">
                      {item.coveragePct.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-default)]">
                  {item.compliant.toLocaleString()}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-muted)]">
                  {item.pending.toLocaleString()}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--fg-muted)]">
                  {item.nonCompliant.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
