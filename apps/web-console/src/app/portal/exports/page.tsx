import { listCustomerDpps } from '@/lib/customer-api'
import { ExportTable } from '@/components/portal/ExportTable'

export default async function ExportsPage() {
  const list = await listCustomerDpps({ limit: 500 })

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Zone 04 · Audit-Ready Document Export
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          One ZIP, every claim, signed.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          Select the DPPs you want bundled. The platform generates a signed ZIP
          containing the canonical JSON-LD bodies, original VC envelopes,
          hash-chained audit slice, and a receipt cryptographically signed by
          the issuer DID. Take this directly into a Tier 1 audit.
        </p>
      </header>

      <ExportTable rows={list.items} />
    </div>
  )
}
