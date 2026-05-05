import Link from 'next/link'

import { currentUser } from '@/lib/auth'
import { listCustomerDpps } from '@/lib/customer-api'

interface SearchProps {
  searchParams: Promise<{ q?: string; brand?: string }>
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const user = await currentUser()
  const params = await searchParams
  const list = await listCustomerDpps({ limit: 200, brand: params.brand })

  const q = (params.q ?? '').trim().toLowerCase()
  const filtered = q
    ? list.items.filter(
        (r) =>
          r.upi.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          r.alloy.toLowerCase().includes(q),
      )
    : list.items

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Search
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Find any passport, fast.
        </h1>
      </header>

      <form className="mb-6 flex items-center gap-3" action="/portal/search">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="UPI, brand, alloy…"
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-4 py-3 text-[15px] outline-none focus:border-[var(--color-accent)]"
        />
        <select
          name="brand"
          defaultValue={params.brand ?? ''}
          className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-3 text-[14px]"
        >
          <option value="">All brands</option>
          <option value="CelestiAL">CelestiAL</option>
          <option value="CelestiAL-R">CelestiAL-R</option>
          <option value="Standard">Standard</option>
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-[14px] font-medium text-white hover:opacity-90"
        >
          Search
        </button>
      </form>

      <p className="mb-3 font-mono text-[11px] text-[var(--fg-subtle)]">
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
      </p>

      <ul className="divide-y divide-[var(--surface-divider)] rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        {filtered.length === 0 && (
          <li className="px-5 py-12 text-center text-[14px] text-[var(--fg-subtle)]">
            No passports match.
          </li>
        )}
        {filtered.map((r) => (
          <li key={r.upi} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 text-[13px]">
            <div className="min-w-0">
              <p className="font-mono text-[12px] truncate text-[var(--fg-default)]">{r.upi}</p>
              <p className="text-[12px] text-[var(--fg-muted)]">
                {r.brand} · {r.alloy} · {r.form.replace(/_/g, ' ')} · {Math.round(r.weightKg)} kg
              </p>
            </div>
            <span className="tabular font-mono text-[12px] text-[var(--fg-muted)]">
              {Math.round(r.cfpKgCo2ePerTonne).toLocaleString()} kg/t
            </span>
            <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
              {r.issuedAt?.slice(0, 10) ?? '—'}
            </span>
            {r.digitalLinkUrl && (
              <Link
                href={r.digitalLinkUrl}
                target="_blank"
                className="text-[var(--color-accent)] hover:underline"
              >
                view ↗
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
