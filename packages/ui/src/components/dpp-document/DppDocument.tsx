/**
 * Structured Digital Product Passport document · modelled on the RecAL /
 * Alumil 6060 batch profile reference DPP and the JRC ESPR working draft.
 *
 * This is a single server-rendered, print-friendly layout that contains the
 * canonical sections a regulator, customer, or verifier expects to see:
 *
 *   1. Document header (issuer logo, title, product photo, QR, anchor status)
 *   2. General product information + producer + main usage + certificates
 *   3. Material composition (EN 573-3 chemistry table)
 *   4. Manufacturing process flow (numbered circles + arrows)
 *   5. Environmental impact (LCA bar chart vs. industry baseline)
 *   6. End-of-life and sustainability instructions
 *   7. Contact + disclaimer
 *
 * Replaces the editorial Hero/Story/Carbon/Genealogy/Compliance/Verification
 * cluster for the canonical document view; those motion-heavy sections were
 * keeping the viewer from looking like a real DPP.
 */

import QRCode from 'qrcode'

export interface DppDocumentInput {
  /** Canonical DPP body · `dpp/v1.0.0` schema. */
  dpp: Record<string, unknown>
  /** ISO timestamp the passport was issued. */
  issuedAt?: string | null
  /** Whether this is a demo passport (badges a marker on the disclaimer). */
  isDemo?: boolean
}

export async function DppDocument({ dpp }: { dpp: DppDocumentInput }) {
  const ident = (dpp.dpp.identification ?? {}) as Record<string, unknown>
  const upi = (dpp.dpp.upi ?? {}) as Record<string, unknown>
  const product = (dpp.dpp.product ?? {}) as Record<string, unknown>
  const producer = (dpp.dpp.producer ?? {}) as Record<string, unknown>
  const physical = (dpp.dpp.physical ?? {}) as Record<string, unknown>
  const carbon = (dpp.dpp.carbon ?? {}) as Record<string, unknown>
  const recycled = (dpp.dpp.recycledContent ?? {}) as Record<string, unknown>
  const compliance = (dpp.dpp.compliance ?? { regulations: [], certifications: [] }) as {
    regulations?: Array<Record<string, unknown>>
    certifications?: Array<Record<string, unknown>>
  }
  const chemistry = (dpp.dpp.chemistry ?? {}) as Record<string, unknown>
  const flow = (dpp.dpp.processFlow ?? []) as Array<Record<string, unknown>>
  const circularity = (dpp.dpp.circularity ?? {}) as Record<string, unknown>
  const useAndLife = (dpp.dpp.useAndLife ?? {}) as Record<string, unknown>
  const meta = (dpp.dpp.meta ?? {}) as Record<string, unknown>

  const brand = nonEmpty(ident.brand) ?? 'EGA Aluminium'
  const alloyEn = nonEmpty(ident.alloyEn) ?? null
  const formRaw = (ident.formLabel as string) ?? (ident.form as string) ?? null
  const formLabel = formRaw ? humanise(formRaw) : null
  // Title chain: prefer a sensible composite over a noisy `product.name` like
  // "(5xxx)" that ships from incomplete-fill demo data. Real published DPPs
  // get the alloy + form (e.g. "CelestiAL · EN AW-6063 sheet ingot").
  const rawProductName = nonEmpty(product.name)
  const composite = [brand, alloyEn].filter(Boolean).join(' · ')
  const productName =
    rawProductName && rawProductName.length > 4 && !rawProductName.startsWith('(')
      ? rawProductName
      : composite || 'Aluminium passport'
  const subtitle =
    nonEmpty(product.purposeStatement) ??
    [formLabel, alloyEn ? `Alloy ${alloyEn}` : null].filter(Boolean).join(' · ')
  const recycledPct = Number(recycled.totalPercent ?? 0)
  const cfp = Number(carbon.valueKgCo2ePerTonne ?? 0)
  const industryAvg = Number(carbon.industryAverageKgCo2ePerTonne ?? 14600)
  const issuedAt = (meta.lastUpdated as string | undefined) ?? dpp.issuedAt ?? ''
  const castNumber = nonEmpty(upi.castNumber) ?? nonEmpty(ident.castNumber) ?? null
  const itemSerial = nonEmpty(upi.itemSerial) ?? null
  const lotNumber = nonEmpty(upi.lotNumber) ?? null
  const gtin = nonEmpty(upi.gtin) ?? null
  const media = (dpp.dpp.media ?? {}) as Record<string, unknown>
  const productImage = nonEmpty(media.productImage)
  const productImageAlt = nonEmpty(media.productImageAlt) ?? productName
  // Real GS1 Digital Link QR · encodes the canonical resolver URL so a phone
  // scan opens the public passport. Generated server-side as an SVG string,
  // dangerouslySetInnerHTML'd into the header so it ships static (no client
  // JS required).
  const digitalLink =
    nonEmpty(upi.digitalLinkUrl) ??
    (gtin && (itemSerial || castNumber)
      ? `https://id.ega.example/01/${gtin}/21/${itemSerial ?? castNumber}`
      : 'https://id.ega.example/01/00000000000000/21/0001')
  const qrSvg = await QRCode.toString(digitalLink, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0a0a0a', light: '#ffffff' },
  })

  return (
    <article className="dpp-doc bg-[var(--color-paper)]">
      <DocStyle />

      {/* 1. Header · issuer logo, title, photo, QR, status */}
      <header className="dpp-doc__header">
        <div className="dpp-doc__header-grid">
          {/* Left: producer mark */}
          <div className="dpp-doc__crest">
            <div className="dpp-doc__crest-mark">
              <span>EGA</span>
            </div>
            <p className="dpp-doc__crest-caption">Logo of the manufacturer</p>
          </div>

          {/* Middle: title block */}
          <div className="dpp-doc__titleblock">
            <p className="dpp-doc__eyebrow">
              Digital Product Passport
              <span className="dpp-doc__eyebrow-divider">·</span>
              Schema v{(dpp.dpp.dppVersion as string) ?? '1.0'}
            </p>
            <h1 className="dpp-doc__title">{productName}</h1>
            {subtitle && <p className="dpp-doc__subtitle">{subtitle}</p>}
            <div className="dpp-doc__status-row">
              <StatusPill kind="ok" label="Anchored" />
              <StatusPill kind="info" label={`Issued ${issuedAt.slice(0, 10) || '—'}`} />
              {recycledPct > 0 && (
                <StatusPill kind="green" label={`${recycledPct}% recycled content`} />
              )}
            </div>
          </div>

          {/* Right: product photo + QR */}
          <div className="dpp-doc__rightcol">
            <div className="dpp-doc__photo">
              {productImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productImage}
                  alt={productImageAlt}
                  className="dpp-doc__photo-img"
                  loading="lazy"
                />
              ) : (
                <ProductSilhouette form={(ident.form as string) ?? 'extrusion_billet'} />
              )}
            </div>
            <div className="dpp-doc__qr">
              <a
                href={digitalLink}
                className="dpp-doc__qr-frame dpp-doc__qr-frame--real"
                aria-label={`Open digital passport at ${digitalLink}`}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="dpp-doc__qr-caption">DPP · GS1 Digital Link</p>
            </div>
          </div>
        </div>
        <div className="dpp-doc__rule" />
      </header>

      {/* 2. Four-column metadata strip · RecAL pattern */}
      <section className="dpp-doc__strip">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 py-8 md:grid-cols-4">
          <DocColumn title="General Product Information">
            <DocItem label="Product ID" value={itemSerial ?? '—'} />
            <DocItem label="GTIN" value={gtin ?? '—'} mono />
            <DocItem label="Lot / batch" value={lotNumber ?? '—'} mono />
            <DocItem label="Date of production" value={issuedAt.slice(0, 10) || '—'} />
            <DocItem label="Cast number" value={castNumber ?? '—'} mono />
            <DocItem
              label="Form"
              value={`${formLabel ?? '—'}${physical.netWeightKg ? ` · ${(physical.netWeightKg as number).toLocaleString()} kg` : ''}`}
            />
            <DocItem label="Recycled aluminium (%)" value={`${recycledPct}%`} />
            <DocItem
              label="Alloy"
              value={[alloyEn, nonEmpty(ident.alloyAa)].filter(Boolean).join(' · ') || '—'}
            />
          </DocColumn>

          <DocColumn title="Producer">
            <DocItem label="Manufacturer" value={(producer.name as string) ?? 'EGA'} />
            <DocItem label="Trademark" value={(producer.trademark as string) ?? 'EGA'} />
            <DocItem label="Registered office" value={(producer.registeredAddress as string) ?? '—'} />
            <DocItem label="UOI" value={(producer.uoi as string) ?? '—'} mono />
            <DocItem label="Country" value="United Arab Emirates" />
          </DocColumn>

          <DocColumn title="Main Usage">
            <ul className="dpp-doc__bullets">
              {((product.customerUseCases as string[] | undefined) ?? ['Industrial']).map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </DocColumn>

          <DocColumn title="Certificates">
            <ul className="dpp-doc__cert-list">
              {(compliance.certifications ?? []).slice(0, 6).map((c, i) => (
                <li key={i}>
                  <span className="dpp-doc__cert-name">{c.name as string}</span>
                  <span className="dpp-doc__cert-ref">{c.reference as string}</span>
                </li>
              ))}
            </ul>
          </DocColumn>
        </div>
      </section>

      {/* 3. Material composition */}
      <Section title="Material Composition" eyebrow="EN 573-3">
        <div className="grid gap-6 md:grid-cols-[200px_1fr] md:items-start">
          <ul className="dpp-doc__bullets">
            <li>
              Primary aluminium: <strong>{100 - recycledPct}%</strong>
            </li>
            <li>
              Secondary (recycled): <strong>{recycledPct}%</strong>
            </li>
            <li>
              Alloy type: <strong>{alloyEn}</strong>
            </li>
            <li>
              Purity grade: <strong>{(chemistry.purityGrade as string) ?? 'P1020A'}</strong>
            </li>
            <li>
              Temper: <strong>{(ident.temper as string) ?? 'F'}</strong>
            </li>
          </ul>
          <ChemistryTable chemistry={chemistry} />
        </div>
      </Section>

      {/* 4. Manufacturing process flow */}
      <Section title="Manufacturing Process" eyebrow="7 stages · Al Taweelah, UAE">
        <ProcessFlow steps={flow} />
      </Section>

      {/* 5. Environmental impact (LCA) */}
      <Section title="Environmental Impact (LCA)" eyebrow="ISO 14067:2018 · cradle-to-gate">
        <LcaChart
          cfp={cfp}
          industryAvg={industryAvg}
          brand={brand}
          decomposition={(carbon as Record<string, unknown>).decomposition as Record<string, number> | undefined}
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="dpp-doc__callout">
            <p className="dpp-doc__callout-label">Total CO₂ (this product)</p>
            <p className="dpp-doc__callout-value">{(cfp / 1000).toFixed(2)} t CO₂e / t Al</p>
            <p className="dpp-doc__callout-detail">
              Verified by {(((carbon.verifier as Record<string, unknown>) ?? {}).name as string) ??
                'DNV AS'} · statement {(carbon.verificationStatementRef as string) ?? '—'}
            </p>
          </div>
          <div className="dpp-doc__callout dpp-doc__callout--muted">
            <p className="dpp-doc__callout-label">Industry average</p>
            <p className="dpp-doc__callout-value">{(industryAvg / 1000).toFixed(2)} t CO₂e / t Al</p>
            <p className="dpp-doc__callout-detail">
              IAI v2.0 global average · this product is{' '}
              <strong>{Math.round((1 - cfp / industryAvg) * 100)}%</strong> below baseline.
            </p>
          </div>
        </div>
      </Section>

      {/* 6. EoL & Sustainability */}
      <Section title="EoL and Sustainability" eyebrow="Designed for closed-loop remelt">
        <ol className="dpp-doc__numbered">
          <li>
            <strong>Identify aluminium content.</strong> Check product labels or manufacturer
            specifications to confirm alloy designation ({alloyEn}).
          </li>
          <li>
            <strong>Disassemble (if applicable).</strong>{' '}
            {(((circularity.endOfLife as Record<string, unknown>) ?? {})
              .disassemblyInstructions as string) ??
              'Sort by alloy family per EN 573-3. Remove non-aluminium attachments before remelt.'}
          </li>
          <li>
            <strong>Check local disposal & recycling regulations.</strong> Aluminium is infinitely
            recyclable. Re-melting yield: {(circularity.remeltingYieldPercent as number) ?? 95}%.
          </li>
          <li>
            <strong>Clean & prepare for recycling.</strong> Remove painted/lacquered fragments and
            non-aluminium attachments to avoid contamination.
          </li>
          <li>
            <strong>Drop off at a recycling facility.</strong>{' '}
            {(((circularity.endOfLife as Record<string, unknown>) ?? {}).handlerNetwork as string) ??
              'European Aluminium Recycling Federation members.'}
          </li>
        </ol>
      </Section>

      {/* 7. Contact + Disclaimer */}
      <footer className="dpp-doc__footer">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-6 py-10 md:grid-cols-2">
          <div>
            <p className="dpp-doc__eyebrow-small">Contact</p>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--fg-default)]">
              <li>Address: {(producer.registeredAddress as string) ?? '—'}</li>
              <li>Website: {(producer.website as string) ?? 'https://www.ega.ae'}</li>
              {(() => {
                const reg = producer.regulatoryContact as Record<string, unknown> | undefined
                const email = reg?.email
                return typeof email === 'string' ? <li>Email: {email}</li> : null
              })()}
            </ul>
          </div>
          <div>
            <p className="dpp-doc__eyebrow-small">Disclaimer</p>
            <p className="mt-2 text-[12px] leading-[1.65] text-[var(--fg-muted)]">
              The information provided in this Digital Product Passport is issued by the producer
              named above under their sole responsibility. Verification statements are issued by
              independent third parties listed under Certificates and are reproducible from the
              W3C Verifiable Credential exposed via the export menu.{' '}
              {dpp.isDemo && (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                  · DEMO PASSPORT · values are illustrative
                </span>
              )}
            </p>
          </div>
        </div>
      </footer>
    </article>
  )
}

// ── Subcomponents ───────────────────────────────────────────────────────

function nonEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function humanise(v: string): string {
  return v.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusPill({ label, kind }: { label: string; kind: 'ok' | 'info' | 'green' }) {
  return (
    <span className={`dpp-doc__pill dpp-doc__pill--${kind}`}>
      <span className="dpp-doc__pill-dot" />
      {label}
    </span>
  )
}

function DocColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="dpp-doc__col-title">{title}</h3>
      <div className="dpp-doc__col-rule" />
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function DocItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="dpp-doc__item-label">{label}</p>
      <p className={`dpp-doc__item-value${mono ? ' font-mono text-[12px]' : ''}`}>{value}</p>
    </div>
  )
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section className="dpp-doc__section">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="dpp-doc__section-title">{title}</h2>
          {eyebrow && <p className="dpp-doc__section-eyebrow">{eyebrow}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

const CHEM_COLUMNS: { key: string; label: string }[] = [
  { key: 'siPct', label: 'Si' },
  { key: 'fePct', label: 'Fe' },
  { key: 'cuPct', label: 'Cu' },
  { key: 'mnPct', label: 'Mn' },
  { key: 'mgPct', label: 'Mg' },
  { key: 'crPct', label: 'Cr' },
  { key: 'znPct', label: 'Zn' },
  { key: 'tiPct', label: 'Ti' },
  { key: 'otherEachMaxPct', label: 'Other ea.' },
  { key: 'otherTotalMaxPct', label: 'Other tot.' },
  { key: 'alPct', label: 'Al' },
]

function ChemistryTable({ chemistry }: { chemistry: Record<string, unknown> }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--surface-divider)]">
      <table className="dpp-doc__chem-table">
        <thead>
          <tr>
            <th colSpan={CHEM_COLUMNS.length} className="dpp-doc__chem-caption">
              Chemical composition (% w/w) per EN 573-3
            </th>
          </tr>
          <tr>
            {CHEM_COLUMNS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {CHEM_COLUMNS.map((c) => {
              const raw = chemistry[c.key]
              const v = typeof raw === 'number' ? raw.toFixed(2) : '—'
              return <td key={c.key}>{v}</td>
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ProcessFlow({ steps }: { steps: Array<Record<string, unknown>> }) {
  if (!steps || steps.length === 0) return null
  return (
    <div className="dpp-doc__flow">
      <ol className="dpp-doc__flow-track">
        {steps.map((s, i) => (
          <li key={i} className="dpp-doc__flow-step">
            <div className="dpp-doc__flow-circle">
              <span className="dpp-doc__flow-num">{(s.ordinal as number) ?? i + 1}</span>
            </div>
            {i < steps.length - 1 && <span aria-hidden className="dpp-doc__flow-arrow">→</span>}
          </li>
        ))}
      </ol>
      <ol className="dpp-doc__flow-detail">
        {steps.map((s, i) => (
          <li key={i}>
            <p className="dpp-doc__flow-name">{s.name as string}</p>
            <p className="dpp-doc__flow-meta">{s.site as string}</p>
            <p className="dpp-doc__flow-tech">{s.technology as string}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

const STAGE_LABELS: Record<string, string> = {
  bauxiteMining: 'Bauxite mining',
  bauxiteTransport: 'Bauxite transport',
  aluminaProduction: 'Alumina refining',
  aluminaTransport: 'Alumina transport',
  anodeProduction: 'Anode production',
  electricity: 'Electricity (Scope 2)',
  electrolysis: 'Electrolysis (Scope 1)',
  casting: 'Casthouse casting',
}

function LcaChart({
  cfp,
  industryAvg,
  brand,
  decomposition,
}: {
  cfp: number
  industryAvg: number
  brand: string
  decomposition?: Record<string, number>
}) {
  // Bars (illustrative): this product, EU primary average, global primary
  // average (IAI v2.0), Chinese primary average. Aligned to RecAL reference.
  const bars: { label: string; value: number; tone: 'product' | 'baseline' }[] = [
    { label: brand, value: cfp / 1000, tone: 'product' },
    { label: 'EU avg', value: 6.8, tone: 'baseline' },
    { label: 'Global avg', value: industryAvg / 1000, tone: 'baseline' },
    { label: 'CN avg', value: 20.0, tone: 'baseline' },
  ]
  const max = Math.max(...bars.map((b) => b.value)) * 1.15

  const stageEntries = decomposition
    ? Object.entries(decomposition).sort((a, b) => b[1] - a[1])
    : []
  const stageMax = stageEntries.length > 0 ? Math.max(...stageEntries.map(([, v]) => v)) : 0

  return (
    <div className="dpp-doc__lca">
      <div className="dpp-doc__chart">
        <div className="dpp-doc__chart-bars">
          {bars.map((b) => {
            const h = (b.value / max) * 100
            return (
              <div key={b.label} className="dpp-doc__bar-col">
                <span className="dpp-doc__bar-value">{b.value.toFixed(1)}</span>
                <div
                  className={`dpp-doc__bar dpp-doc__bar--${b.tone}`}
                  style={{ height: `${h}%` }}
                  aria-label={`${b.label} ${b.value.toFixed(1)} t CO2e per t Al`}
                />
                <span className="dpp-doc__bar-label">{b.label}</span>
              </div>
            )
          })}
        </div>
        <p className="dpp-doc__chart-axis">t CO₂e / t Al · cradle-to-gate · ISO 14067</p>
      </div>

      {stageEntries.length > 0 && (
        <div className="dpp-doc__stages">
          <p className="dpp-doc__stages-title">Decomposition by life-cycle stage</p>
          <ol className="dpp-doc__stages-list">
            {stageEntries.map(([key, value]) => {
              const pct = stageMax > 0 ? (value / stageMax) * 100 : 0
              const sharePct = cfp > 0 ? Math.round((value / cfp) * 100) : 0
              return (
                <li key={key} className="dpp-doc__stages-row">
                  <span className="dpp-doc__stages-label">{STAGE_LABELS[key] ?? humanise(key)}</span>
                  <span className="dpp-doc__stages-track">
                    <span className="dpp-doc__stages-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="dpp-doc__stages-value">
                    <strong>{value.toLocaleString()}</strong>
                    <span className="dpp-doc__stages-share">{sharePct}%</span>
                  </span>
                </li>
              )
            })}
            <li className="dpp-doc__stages-row dpp-doc__stages-row--total">
              <span className="dpp-doc__stages-label">Total cradle-to-gate</span>
              <span className="dpp-doc__stages-track" />
              <span className="dpp-doc__stages-value">
                <strong>{cfp.toLocaleString()}</strong>
                <span className="dpp-doc__stages-share">kg CO₂e/t</span>
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}

function ProductSilhouette({ form }: { form: string }) {
  // Tiny inline silhouette so the document has a visual anchor without a
  // hosted asset · billet (cylinder), sow ingot (block), sheet ingot (slab).
  if (form === 'sheet_ingot') {
    return (
      <svg viewBox="0 0 120 80" className="h-full w-full">
        <rect x="10" y="22" width="100" height="42" rx="3" fill="#d6d3cc" stroke="#888" />
        <rect x="10" y="22" width="100" height="6" fill="#a8a4a0" />
      </svg>
    )
  }
  if (form === 'sow') {
    return (
      <svg viewBox="0 0 120 80" className="h-full w-full">
        <polygon
          points="20,55 35,30 95,30 110,55 100,65 30,65"
          fill="#d6d3cc"
          stroke="#888"
        />
      </svg>
    )
  }
  // extrusion billet (cylinder, side view)
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <ellipse cx="22" cy="40" rx="10" ry="22" fill="#bdbab2" stroke="#888" />
      <rect x="22" y="18" width="80" height="44" fill="#d6d3cc" stroke="#888" />
      <ellipse cx="102" cy="40" rx="10" ry="22" fill="#e8e6df" stroke="#888" />
    </svg>
  )
}

function QrPlaceholder() {
  // Inline patterned QR · visual only. Real QR is exposed via /api/demo-export.
  const cells = Array.from({ length: 49 }, (_, i) => {
    // Deterministic noise so the QR looks plausible across renders
    const r = (i * 1103515245 + 12345) >>> 0
    return r % 3 !== 0
  })
  return (
    <div className="dpp-doc__qr-frame">
      <div className="dpp-doc__qr-grid">
        {cells.map((on, i) => (
          <span key={i} className={on ? 'dpp-doc__qr-on' : 'dpp-doc__qr-off'} />
        ))}
        <span className="dpp-doc__qr-marker dpp-doc__qr-marker--tl" />
        <span className="dpp-doc__qr-marker dpp-doc__qr-marker--tr" />
        <span className="dpp-doc__qr-marker dpp-doc__qr-marker--bl" />
      </div>
    </div>
  )
}

function DocStyle() {
  return (
    <style>{`
      .dpp-doc { color: var(--fg-default); }
      .dpp-doc__header { background: var(--color-paper); }
      .dpp-doc__rule { height: 1px; background: var(--surface-divider); }

      .dpp-doc__header-grid {
        max-width: 1100px;
        margin: 0 auto;
        padding: 36px 32px 28px;
        display: grid;
        grid-template-columns: 160px 1fr 200px;
        column-gap: 28px;
        align-items: start;
      }
      .dpp-doc__titleblock {
        text-align: center;
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0;
      }
      .dpp-doc__rightcol {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }
      @media (max-width: 760px) {
        .dpp-doc__header-grid {
          grid-template-columns: 1fr;
          gap: 18px;
        }
        .dpp-doc__rightcol { align-items: flex-start; }
      }

      .dpp-doc__crest { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
      .dpp-doc__crest-mark {
        display: grid; place-items: center;
        width: 100px; height: 100px;
        border-radius: 4px;
        background: var(--color-ink);
        color: var(--color-paper);
        font-family: var(--font-display);
        font-size: 36px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .dpp-doc__crest-caption {
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-subtle);
      }

      .dpp-doc__eyebrow {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--fg-subtle);
      }
      .dpp-doc__eyebrow-divider { margin: 0 6px; opacity: 0.5; }
      .dpp-doc__title {
        margin-top: 6px;
        font-family: var(--font-display);
        font-size: clamp(28px, 4.4vw, 44px);
        line-height: 1.1;
        letter-spacing: -0.015em;
        font-weight: 600;
        color: var(--fg-default);
      }
      .dpp-doc__subtitle {
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.55;
        color: var(--fg-muted);
        max-width: 480px;
        margin-left: auto;
        margin-right: auto;
      }
      .dpp-doc__status-row {
        margin-top: 14px;
        display: inline-flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
      }
      .dpp-doc__pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 11px; font-weight: 500;
        border: 1px solid var(--surface-divider);
        background: var(--color-paper);
      }
      .dpp-doc__pill-dot { display: inline-block; width: 6px; height: 6px; border-radius: 9999px; }
      .dpp-doc__pill--ok .dpp-doc__pill-dot { background: var(--color-green, #5a7a3a); }
      .dpp-doc__pill--green { color: #3f6c3e; }
      .dpp-doc__pill--green .dpp-doc__pill-dot { background: #5a7a3a; }
      .dpp-doc__pill--info { color: var(--fg-muted); }
      .dpp-doc__pill--info .dpp-doc__pill-dot { background: var(--fg-subtle); }

      .dpp-doc__photo {
        width: 200px;
        height: 140px;
        background: var(--color-paper-soft, #f7f5ee);
        border: 1px solid var(--surface-divider);
        border-radius: 6px;
        display: grid; place-items: center;
        padding: 0;
        overflow: hidden;
      }
      .dpp-doc__photo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .dpp-doc__qr-frame--real {
        display: block;
        width: 96px;
        height: 96px;
        padding: 6px;
        border: 1px solid var(--surface-divider);
        background: #fff;
        border-radius: 4px;
        line-height: 0;
      }
      .dpp-doc__qr-frame--real svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .dpp-doc__qr {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
      }
      .dpp-doc__qr-frame {
        padding: 4px;
        border: 1px solid var(--surface-divider);
        background: var(--color-paper);
      }
      .dpp-doc__qr-grid {
        position: relative;
        display: grid;
        grid-template-columns: repeat(7, 8px);
        gap: 1px;
        width: 63px; height: 63px;
      }
      .dpp-doc__qr-grid .dpp-doc__qr-on { background: var(--color-ink); }
      .dpp-doc__qr-grid .dpp-doc__qr-off { background: transparent; }
      .dpp-doc__qr-marker {
        position: absolute;
        width: 16px; height: 16px;
        border: 3px solid var(--color-ink);
        background: var(--color-paper);
      }
      .dpp-doc__qr-marker::after {
        content: ''; display: block;
        width: 4px; height: 4px;
        background: var(--color-ink);
        margin: 3px auto;
      }
      .dpp-doc__qr-marker--tl { top: 0; left: 0; }
      .dpp-doc__qr-marker--tr { top: 0; right: 0; }
      .dpp-doc__qr-marker--bl { bottom: 0; left: 0; }
      .dpp-doc__qr-caption {
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-subtle);
      }

      .dpp-doc__strip {
        background: var(--color-paper);
        border-top: 1px solid var(--surface-divider);
        border-bottom: 1px solid var(--surface-divider);
      }
      .dpp-doc__col-title {
        font-family: var(--font-display);
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.005em;
        color: var(--fg-default);
      }
      .dpp-doc__col-rule {
        margin: 6px 0 12px;
        height: 1px;
        background: var(--color-ink);
        opacity: 0.7;
      }
      .dpp-doc__item-label {
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--fg-subtle);
      }
      .dpp-doc__item-value {
        font-size: 13px;
        color: var(--fg-default);
        margin-top: 2px;
      }
      .dpp-doc__bullets {
        list-style: disc;
        padding-left: 18px;
        font-size: 13px;
        line-height: 1.55;
        color: var(--fg-default);
      }
      .dpp-doc__bullets > li + li { margin-top: 4px; }
      .dpp-doc__cert-list { font-size: 12px; }
      .dpp-doc__cert-list > li { padding: 6px 0; border-bottom: 1px dashed var(--surface-divider); }
      .dpp-doc__cert-list > li:last-child { border-bottom: 0; }
      .dpp-doc__cert-name {
        display: block;
        font-weight: 600;
        color: var(--fg-default);
      }
      .dpp-doc__cert-ref {
        display: block;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
      }

      .dpp-doc__section { background: var(--color-paper); border-bottom: 1px solid var(--surface-divider); }
      .dpp-doc__section:nth-of-type(odd) { background: var(--color-paper-soft, #fafaf7); }
      .dpp-doc__section-title {
        font-family: var(--font-display);
        font-size: clamp(20px, 2.6vw, 28px);
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--fg-default);
      }
      .dpp-doc__section-eyebrow {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-subtle);
      }

      /* Chemistry table */
      .dpp-doc__chem-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--color-paper);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .dpp-doc__chem-caption {
        background: var(--color-ink);
        color: var(--color-paper);
        font-family: var(--font-display);
        text-align: left;
        padding: 8px 12px;
        font-size: 12px;
        letter-spacing: 0.05em;
        font-weight: 500;
      }
      .dpp-doc__chem-table th, .dpp-doc__chem-table td {
        border: 1px solid var(--surface-divider);
        padding: 7px 10px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .dpp-doc__chem-table thead tr:nth-child(2) th {
        background: var(--color-paper-soft, #f3f0e7);
        font-weight: 600;
      }

      /* Process flow */
      .dpp-doc__flow { display: flex; flex-direction: column; gap: 18px; }
      .dpp-doc__flow-track {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        list-style: none;
        padding: 0;
      }
      .dpp-doc__flow-step { display: flex; align-items: center; gap: 8px; }
      .dpp-doc__flow-circle {
        width: 56px; height: 56px;
        border: 1.5px solid var(--color-ink);
        border-radius: 9999px;
        display: grid; place-items: center;
        background: var(--color-paper);
      }
      .dpp-doc__flow-num {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 14px;
      }
      .dpp-doc__flow-arrow {
        color: var(--fg-subtle);
        font-size: 18px;
      }
      .dpp-doc__flow-detail {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 14px 18px;
      }
      .dpp-doc__flow-name {
        font-size: 12.5px; font-weight: 600;
        color: var(--fg-default);
      }
      .dpp-doc__flow-meta {
        font-size: 11px; color: var(--fg-muted); margin-top: 2px;
      }
      .dpp-doc__flow-tech {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        margin-top: 3px;
        line-height: 1.5;
      }

      /* LCA */
      .dpp-doc__lca {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media (min-width: 900px) {
        .dpp-doc__lca { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); }
      }
      .dpp-doc__stages {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 6px;
        padding: 22px 22px 18px;
      }
      .dpp-doc__stages-title {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-subtle);
        margin-bottom: 14px;
      }
      .dpp-doc__stages-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .dpp-doc__stages-row {
        display: grid;
        grid-template-columns: 160px 1fr 92px;
        align-items: center;
        gap: 12px;
        font-size: 11.5px;
      }
      .dpp-doc__stages-label {
        color: var(--fg-default);
        font-weight: 500;
      }
      .dpp-doc__stages-track {
        height: 8px;
        background: var(--color-paper-soft, #f3f0e7);
        border-radius: 9999px;
        overflow: hidden;
        position: relative;
      }
      .dpp-doc__stages-fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: linear-gradient(90deg, #d09d4f, #8a541d);
        border-radius: 9999px;
      }
      .dpp-doc__stages-value {
        text-align: right;
        font-family: var(--font-mono);
        font-variant-numeric: tabular-nums;
        font-size: 12px;
        color: var(--fg-default);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .dpp-doc__stages-value .dpp-doc__stages-share {
        font-size: 10px;
        color: var(--fg-subtle);
        font-weight: 400;
      }
      .dpp-doc__stages-row--total {
        margin-top: 6px;
        padding-top: 10px;
        border-top: 1px solid var(--surface-divider);
      }
      .dpp-doc__stages-row--total .dpp-doc__stages-label {
        font-weight: 600;
      }
      .dpp-doc__stages-row--total .dpp-doc__stages-track { background: transparent; }

      /* LCA chart */
      .dpp-doc__chart {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 6px;
        padding: 24px 24px 18px;
      }
      .dpp-doc__chart-bars {
        display: flex; align-items: flex-end; justify-content: space-around; gap: 16px;
        height: 240px;
      }
      .dpp-doc__bar-col { display: flex; flex-direction: column; align-items: center; flex: 1 1 0; }
      .dpp-doc__bar {
        width: 60%; min-width: 24px;
        background: var(--fg-subtle);
        opacity: 0.85;
      }
      .dpp-doc__bar--product { background: var(--color-green, #5a7a3a); opacity: 1; }
      .dpp-doc__bar-value {
        font-family: var(--font-mono);
        font-size: 11px;
        margin-bottom: 6px;
        color: var(--fg-default);
      }
      .dpp-doc__bar-label {
        margin-top: 8px;
        font-size: 11px;
        color: var(--fg-muted);
        text-align: center;
      }
      .dpp-doc__chart-axis {
        margin-top: 10px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        text-align: right;
        letter-spacing: 0.08em;
      }
      .dpp-doc__callout {
        border: 1px solid var(--surface-divider);
        border-radius: 4px;
        padding: 14px 16px;
        background: var(--color-paper);
      }
      .dpp-doc__callout--muted { background: var(--color-paper-soft, #fafaf7); }
      .dpp-doc__callout-label {
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-subtle);
      }
      .dpp-doc__callout-value {
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        color: var(--fg-default);
        margin-top: 4px;
      }
      .dpp-doc__callout-detail {
        font-size: 11px;
        line-height: 1.55;
        color: var(--fg-muted);
        margin-top: 6px;
      }

      /* Numbered EoL list */
      .dpp-doc__numbered {
        list-style: none;
        counter-reset: dpp-num;
        padding: 0;
        margin: 0;
      }
      .dpp-doc__numbered > li {
        counter-increment: dpp-num;
        position: relative;
        padding: 12px 0 12px 44px;
        border-bottom: 1px dashed var(--surface-divider);
        font-size: 13px;
        line-height: 1.6;
        color: var(--fg-default);
      }
      .dpp-doc__numbered > li:last-child { border-bottom: 0; }
      .dpp-doc__numbered > li::before {
        content: counter(dpp-num);
        position: absolute;
        left: 0; top: 14px;
        width: 28px; height: 28px;
        border-radius: 9999px;
        background: var(--color-ink);
        color: var(--color-paper);
        display: grid; place-items: center;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
      }

      .dpp-doc__footer { background: var(--color-paper-soft, #fafaf7); border-top: 1px solid var(--surface-divider); }
      .dpp-doc__eyebrow-small {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--color-ink);
        font-weight: 600;
      }

      @media print {
        .dpp-doc__photo { print-color-adjust: exact; }
      }
    `}</style>
  )
}
