import { Stat } from '@dpp/ui'

import { currentUser } from '@/lib/auth'
import { fetchRecycledAggregate } from '@/lib/customer-api'

export default async function RecycledPage() {
  const user = await currentUser()
  const data = await fetchRecycledAggregate()

  const max = data.items.length ? Math.max(...data.items.map((i) => i.recycledPct)) : 100

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Zone 03 · Recycled Content Monitor
        </p>
        <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Mass-balanced. Verified by ASI.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          Every percentage you see is verified under ASI Chain of Custody V2.1 (certificate #428)
          using the mass-balance accounting model. Pre-consumer scrap, post-consumer scrap, and
          internal run-around are tracked separately under DPP 2 onward.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-3">
        <Stat
          label="Weighted average"
          value={`${data.weightedAvgRecycledPct.toFixed(1)}%`}
          context="across all received DPPs"
        />
        <Stat
          label="Total mass"
          value={Math.round(data.totalWeightKg / 1000).toLocaleString()}
          unit="tonnes"
        />
        <Stat
          label="Recycled tonnes"
          value={Math.round(data.items.reduce((s, i) => s + i.recycledTonnes, 0)).toLocaleString()}
          unit="t"
          context="cumulative across brands"
        />
      </section>

      <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Brand</th>
              <th className="px-5 py-3 text-right font-medium">Total mass (t)</th>
              <th className="px-5 py-3 text-right font-medium">Recycled (t)</th>
              <th className="px-5 py-3 text-right font-medium">Recycled %</th>
              <th className="px-5 py-3 text-right font-medium">Visualisation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-divider)]">
            {data.items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                >
                  No DPPs received yet.
                </td>
              </tr>
            )}
            {data.items.map((it) => (
              <tr key={it.brand} className="hover:bg-[var(--surface-hover)]">
                <td className="px-5 py-3 text-[var(--fg-default)]">{it.brand}</td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px]">
                  {Math.round(it.totalWeightKg / 1000).toLocaleString()}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px] text-[var(--color-green)]">
                  {Math.round(it.recycledTonnes).toLocaleString()}
                </td>
                <td className="tabular px-5 py-3 text-right font-mono text-[12px]">
                  {it.recycledPct.toFixed(1)}%
                </td>
                <td className="px-5 py-3">
                  <div className="ml-auto flex w-48 items-center justify-end gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${(it.recycledPct / max) * 100}%`,
                          background: 'var(--color-green)',
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 font-mono text-[11px] text-[var(--fg-subtle)]">
        Chain of custody · ASI CoC V2.1 · Certificate #428 · Mass balance · Annual
      </p>
    </div>
  )
}
