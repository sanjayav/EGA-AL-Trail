import { Beaker } from 'lucide-react'

import { currentUser } from '@/lib/auth'
import { listCustomerDpps } from '@/lib/customer-api'

export default async function ChemistryPage() {
  const user = await currentUser()
  const list = await listCustomerDpps({ limit: 200 })

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Zone 05 · Chemistry & Mill Test Certificates
        </p>
        <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Per-batch chemistry to EN 573-3 precision.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          Available at DPP 1.5 onward · full elemental composition, mechanical properties,
          IMDS-format export. v1.0 surfaces the alloy designation and references the underlying MTC.
        </p>
      </header>

      <div className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] p-5">
        <div className="flex items-start gap-3">
          <Beaker className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <p className="font-medium text-[var(--fg-default)]">Full chemistry ships at DPP 1.5</p>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--fg-muted)]">
              The 47 attributes added at v1.5 (Al/Si/Fe/Cu/Mn/Mg/Cr/Zn/Ti/Pb, tensile, yield,
              elongation, casthouse origin) require live MES integration. The schema is locked; the
              supplier turns it on per the version-upgrade workflow.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10 overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">UPI</th>
              <th className="px-5 py-3 text-left font-medium">Alloy</th>
              <th className="px-5 py-3 text-left font-medium">Brand</th>
              <th className="px-5 py-3 text-left font-medium">Form</th>
              <th className="px-5 py-3 text-right font-medium">Mass (kg)</th>
              <th className="px-5 py-3 text-left font-medium">MTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-divider)]">
            {list.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                >
                  No DPPs received yet.
                </td>
              </tr>
            )}
            {list.items.map((r) => (
              <tr key={r.upi} className="hover:bg-[var(--surface-hover)]">
                <td className="inline-block max-w-[280px] truncate px-5 py-3 align-middle font-mono text-[12px]">
                  {r.upi}
                </td>
                <td className="px-5 py-3 text-[var(--fg-default)]">{r.alloy}</td>
                <td className="px-5 py-3 text-[var(--fg-default)]">{r.brand}</td>
                <td className="px-5 py-3 text-[var(--fg-muted)]">{r.form.replace(/_/g, ' ')}</td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px]">
                  {Math.round(r.weightKg).toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  {r.digitalLinkUrl ? (
                    <a
                      href={r.digitalLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      view passport ↗
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
