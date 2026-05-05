import Link from 'next/link'

import type { ViewerDpp } from '@/lib/dpp-client'
import { AUDIENCES, audienceLabel, audienceTagline } from '@/lib/audience'
import type { DemoAudience } from '@dpp/ui'

const SHORT: Record<DemoAudience, string> = {
  public: 'Public',
  customer: 'Customer',
  verifier: 'Verifier',
  authority: 'Authority',
}

/** Server-rendered audience switcher.
 * Uses URL params (?view=customer) so deep-links share · no client state. */
export function AudienceSwitcher({ dpp, upiPath }: { dpp: ViewerDpp; upiPath: string }) {
  const active = dpp.audience
  return (
    <section className="border-y border-[var(--surface-divider)] bg-[var(--surface-recessed)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between md:py-3">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Viewing as · {audienceLabel(active)}
          </p>
          <p className="text-[12px] text-[var(--fg-muted)]">{audienceTagline(active)}</p>
        </div>
        <nav className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--surface-divider)] bg-[var(--color-paper)] p-1">
          {AUDIENCES.map((aud) => {
            const isActive = aud === active
            return (
              <Link
                key={aud}
                href={{ pathname: `/dpp/${upiPath}`, query: aud === 'public' ? {} : { view: aud } }}
                className={[
                  'inline-flex h-7 items-center rounded-[var(--radius-pill)] px-3 text-[11px] font-medium uppercase tracking-[0.1em] transition',
                  isActive
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)] shadow-sm'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
                ].join(' ')}
              >
                {SHORT[aud]}
              </Link>
            )
          })}
        </nav>
      </div>
    </section>
  )
}
