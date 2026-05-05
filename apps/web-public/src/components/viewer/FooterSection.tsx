import { ExternalLink } from 'lucide-react'

import type { ViewerDpp } from '@/lib/dpp-client'

/** Three-column dark footer with passport metadata + QR + platform credit. §10.5.10 */
export function FooterSection({ dpp }: { dpp: ViewerDpp }) {
  const meta = dpp.dpp.meta as {
    issuerDid?: string
    expiresAt?: string
    accessRights?: { model?: string }
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
  // Sample DPPs render a placeholder; real DPPs hit the QR endpoint.
  const qrUrl = dpp.upi.startsWith('sample/')
    ? null
    : `${apiBase}/api/v1/dpps/${dpp.upi}/qr.svg`
  return (
    <footer className="bg-[var(--color-ink)] px-6 py-20 text-[var(--color-paper)] md:px-12">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-paper)]/60">
            Manufacturer
          </p>
          <p className="mt-3 font-display text-[18px]">Emirates Global Aluminium</p>
          <p className="mt-2 max-w-xs text-[13px] text-[var(--color-paper)]/70">
            ASI Performance #27. World's first solar-powered aluminium producer at scale.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-paper)]/60">
            Passport metadata
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px] text-[var(--color-paper)]/85 tabular">
            <dt className="text-[var(--color-paper)]/55">Issued</dt>
            <dd>{dpp.issuedAt?.slice(0, 10) ?? '—'}</dd>
            <dt className="text-[var(--color-paper)]/55">Valid until</dt>
            <dd>{meta.expiresAt?.slice(0, 10) ?? '—'}</dd>
            <dt className="text-[var(--color-paper)]/55">Schema</dt>
            <dd>v1.0.0</dd>
            <dt className="text-[var(--color-paper)]/55">Access tier</dt>
            <dd>{dpp.tier}</dd>
          </dl>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-paper)]/60">
            Standards anchor
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--color-paper)]/80">
            <li>ESPR (EU) 2024/1781</li>
            <li>JRC Steel DPP §7 (adapted)</li>
            <li>ISO 14067:2018</li>
            <li>GS1 Digital Link 1.4</li>
            <li>W3C Verifiable Credentials 2.0</li>
          </ul>
        </div>
        <div className="flex flex-col items-end justify-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-paper)]/60">
            Scan
          </p>
          <div className="mt-3 grid h-32 w-32 place-items-center rounded-[var(--radius-md)] bg-[var(--color-paper)] p-2">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt={`QR code for passport ${dpp.upi}`} className="h-full w-full" />
            ) : (
              <span className="text-center font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--color-ink)]/60">
                Sample passport · QR available on live DPPs
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-[rgba(245,241,232,0.15)] pt-6 text-[12px] text-[var(--color-paper)]/55 md:flex-row">
        <p>© Emirates Global Aluminium · CelestiAL® is a registered trademark of EGA.</p>
        <a
          href="/about"
          className="inline-flex items-center gap-1.5 hover:text-[var(--color-gold)] transition-colors"
        >
          Verified and served by EGA DPP Platform
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </footer>
  )
}
