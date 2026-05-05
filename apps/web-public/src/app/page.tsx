import Link from 'next/link'

/**
 * Root landing · quick links into the available demo DPPs and a brief
 * orientation. Production deploys redirect / to a marketing site or the
 * tenant's own home page.
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        Digital Product Passport · v1.0
      </div>
      <h1 className="font-display mt-4 text-[clamp(40px,6vw,72px)] font-light leading-[1.05] text-[var(--fg-default)]">
        Verifiable provenance for premium aluminium.
      </h1>
      <p className="font-display mt-6 max-w-xl text-[20px] italic text-[var(--fg-muted)]">
        Scan a CelestiAL QR code or open a passport directly from the operator console. Every page
        is server-rendered, every claim is signed, every scroll position reveals more depth.
      </p>

      <section className="mt-16 grid gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Demo passports
        </h2>
        <ul className="mt-2 grid gap-2 text-[15px]">
          <li>
            <Link
              href="/dpp/sample/celestial"
              className="text-[var(--color-gold-deep)] underline-offset-4 hover:underline"
            >
              CelestiAL Extrusion Billet (sample) →
            </Link>
          </li>
          <li>
            <Link
              href="/dpp/sample/celestial-r"
              className="text-[var(--color-gold-deep)] underline-offset-4 hover:underline"
            >
              CelestiAL-R Sheet Ingot (sample) →
            </Link>
          </li>
          <li>
            <Link
              href="/dpp/sample/standard"
              className="text-[var(--color-gold-deep)] underline-offset-4 hover:underline"
            >
              Standard Sow Ingot (sample) →
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-16 border-t border-[var(--surface-border)] pt-8">
        <p className="font-mono text-[13px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Issue a live passport
        </p>
        <p className="mt-2 text-[15px] text-[var(--fg-muted)]">
          Run <code className="font-mono text-[14px]">pnpm sim:fire celestial</code> against the
          local API; the QR&nbsp;code resolves back to this site at{' '}
          <code className="font-mono text-[14px]">/dpp/&lt;upi&gt;</code>.
        </p>
      </section>
    </main>
  )
}
