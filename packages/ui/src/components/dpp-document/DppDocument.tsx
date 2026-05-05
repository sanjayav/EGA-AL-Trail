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
  // Documents bundled with the passport · keyed by id for cert/reg lookup.
  // Two sources: demo passports put them at top-level `documents`; API DPPs
  // put them in `documentation.documents` per the JSON Schema. Merge both.
  const documentation = (dpp.dpp.documentation ?? {}) as Record<string, unknown>
  const docsFromDocumentation = (documentation.documents as
    | Array<Record<string, unknown>>
    | undefined) ?? []
  const docsTopLevel = (dpp.dpp.documents as Array<Record<string, unknown>> | undefined) ?? []
  // Normalise both shapes onto a common one (`title` and `url` are the
  // schema-required fields; demo data uses `label`).
  const documents: Array<Record<string, unknown>> = [
    ...docsFromDocumentation,
    ...docsTopLevel,
  ].map(
    (d) =>
      ({
        ...d,
        title: (d.title as string | undefined) ?? (d.label as string | undefined) ?? '',
        label: (d.label as string | undefined) ?? (d.title as string | undefined) ?? '',
      }) as Record<string, unknown>,
  )
  const documentsById = new Map<string, Record<string, unknown>>()
  for (const d of documents) {
    const id = d.id as string | undefined
    if (id) documentsById.set(id, d)
  }
  // Best-effort fallback: try to match a cert/reg to a document by name when
  // no documentId is set (covers API-issued DPPs that don't carry the link).
  function docFor(item: Record<string, unknown>): Record<string, unknown> | null {
    const id = item.documentId as string | undefined
    if (id && documentsById.has(id)) return documentsById.get(id)!
    const name = (item.name as string | undefined)?.toLowerCase() ?? ''
    if (!name) return null
    for (const d of documents) {
      const label = ((d.label as string | undefined) ?? '').toLowerCase()
      if (label.includes(name) || name.includes(label.split(' · ')[0] ?? '')) return d
    }
    return null
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
            <DocItem
              label="Registered office"
              value={(producer.registeredAddress as string) ?? '—'}
            />
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
              {(compliance.certifications ?? []).slice(0, 6).map((c, i) => {
                const doc = docFor(c)
                return (
                  <li key={i} className="dpp-doc__cert-row">
                    <div className="min-w-0 flex-1">
                      <span className="dpp-doc__cert-name">{c.name as string}</span>
                      <span className="dpp-doc__cert-ref">{c.reference as string}</span>
                    </div>
                    {doc ? (
                      <a
                        href={doc.url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="dpp-doc__cert-dl"
                        title={`Download ${(doc.label as string) ?? 'certificate'}`}
                        aria-label={`Download ${(doc.label as string) ?? (c.name as string)}`}
                      >
                        PDF ↓
                      </a>
                    ) : null}
                  </li>
                )
              })}
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

      {/* 3b. Compliance & Regulations · every cert + reg gets a download */}
      <Section
        title="Compliance &amp; Regulations"
        eyebrow="Every certificate and regulation below links to its evidence document"
      >
        <ComplianceRegister
          certifications={compliance.certifications ?? []}
          regulations={compliance.regulations ?? []}
          docFor={docFor}
        />
      </Section>

      {/* 4. Manufacturing process flow */}
      <Section title="Manufacturing Process" eyebrow="7 stages · Al Taweelah, UAE">
        <ProcessFlow steps={flow} />
      </Section>

      {/* 5. Environmental impact (LCA) */}
      <Section
        title="Environmental Impact (LCA)"
        eyebrow="ISO 14040/44 + ISO 14067:2018 · DNV-verified · per EGA's published methodology"
      >
        <LcaSection
          cfp={cfp}
          industryAvg={industryAvg}
          brand={brand}
          carbon={carbon}
        />
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
            {(((circularity.endOfLife as Record<string, unknown>) ?? {})
              .handlerNetwork as string) ?? 'European Aluminium Recycling Federation members.'}
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
              independent third parties listed under Certificates and are reproducible from the W3C
              Verifiable Credential exposed via the export menu.{' '}
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

// CO₂ contribution colour scale used by both the process timeline and the
// LCA decomposition. Anchored to EGA's published LCA shares (alumina + anode
// production are the bulk of cradle-to-gate CFP; mining and casting are
// minor; the smelting line is dominant when grid power feeds it, low when
// PPA-backed solar covers it).
const CO2_TONE: Record<string, { label: string; bar: string; chip: string }> = {
  low:     { label: 'Low CO₂ contribution',     bar: '#6e8c4d', chip: 'rgba(110,140,77,0.14)' },
  medium:  { label: 'Medium CO₂ contribution',  bar: '#c08c2a', chip: 'rgba(192,140,42,0.14)' },
  high:    { label: 'High CO₂ contribution',    bar: '#b66323', chip: 'rgba(182,99,35,0.16)' },
  highest: { label: 'Dominant CO₂ contribution', bar: '#8a1e1e', chip: 'rgba(138,30,30,0.14)' },
}

// Sensible 7-stage default for DPPs that don't carry their own processFlow
// (every DPP issued by the live API today). Keeps the public viewer rich
// even when the per-DPP data is sparse — the platform-level claim is that
// this IS the EGA Al Taweelah chain, regardless of the cast.
const DEFAULT_PROCESS_FLOW: Array<Record<string, unknown>> = [
  {
    ordinal: 1,
    name: 'Bauxite mining',
    site: 'GAC Sangaredi, Guinea',
    technology: 'Open-pit haul truck + rail to Kamsar port',
    inputs: ['Bauxite ore (Al₂O₃ ≥ 50%)'],
    outputs: ['Wet bauxite (1.45 t/t alumina)'],
    standards: ['IRMA', 'ASI Performance V3'],
    co2eShare: 'low',
  },
  {
    ordinal: 2,
    name: 'Alumina refining',
    site: 'EGA Al Taweelah Refinery, UAE',
    technology: 'Bayer process · low-temperature digestion',
    inputs: ['Bauxite', 'Caustic soda', 'Steam'],
    outputs: ['Smelter-grade alumina (Al₂O₃)'],
    standards: ['ISO 14001', 'ISO 50001'],
    co2eShare: 'highest',
  },
  {
    ordinal: 3,
    name: 'Anode production',
    site: 'EGA Al Taweelah Anode Plant',
    technology: 'Prebaked anode · petroleum coke + coal-tar pitch',
    inputs: ['Calcined petroleum coke', 'Coal tar pitch', 'Recycled butts'],
    outputs: ['Prebaked anodes'],
    standards: ['EN ISO 9001'],
    co2eShare: 'medium',
  },
  {
    ordinal: 4,
    name: 'Smelting (Hall–Héroult)',
    site: 'EGA Al Taweelah Potlines (DX+ Ultra)',
    technology: 'DX+ Ultra · 465 kA · 95.2% current efficiency',
    inputs: ['Alumina', 'Anodes', 'Cryolite bath', 'DC power'],
    outputs: ['Molten aluminium (P1020A)'],
    standards: ['ASI Performance V3'],
    co2eShare: 'high',
  },
  {
    ordinal: 5,
    name: 'Casthouse casting',
    site: 'EGA Al Taweelah Casthouse',
    technology: 'Direct-chill (DC) casting · in-line metal treatment',
    inputs: ['Molten metal', 'Alloying additions'],
    outputs: ['Sow ingots / extrusion billets / sheet ingots'],
    standards: ['EN 573-3', 'ASI Performance V3'],
    co2eShare: 'low',
  },
  {
    ordinal: 6,
    name: 'Quality lab',
    site: 'EGA Al Taweelah QC Lab',
    technology: 'Optical Emission Spectrometry (ARL iSpark) · UTM',
    inputs: ['Cast samples'],
    outputs: ['Chemistry release · spec conformance'],
    standards: ['ISO 9001'],
    co2eShare: 'low',
  },
  {
    ordinal: 7,
    name: 'Packaging & dispatch',
    site: 'EGA Al Taweelah Logistics',
    technology: 'Steel strapping · plastic-free wrap',
    inputs: ['Inspected ingots', 'Steel banding'],
    outputs: ['Bundled shipment with DPP-anchored QR'],
    standards: ['ASI Chain-of-Custody'],
    co2eShare: 'low',
  },
]

function ProcessFlow({ steps }: { steps: Array<Record<string, unknown>> }) {
  // Fall back to the canonical 7-stage chain when this DPP didn't carry
  // its own processFlow (e.g. API-issued DPPs today). The chain is the
  // same EGA Al Taweelah pipeline either way — only the per-stage data
  // changes when a real MES feed lands.
  const effective = steps && steps.length > 0 ? steps : DEFAULT_PROCESS_FLOW
  return (
    <div className="dpp-doc__flow">
      {/* Header strip · legend + EGA disclosure citation */}
      <div className="dpp-doc__flow-legend">
        <div className="dpp-doc__flow-legend-items">
          {(['low', 'medium', 'high', 'highest'] as const).map((k) => (
            <span key={k} className="dpp-doc__flow-legend-item">
              <span
                className="dpp-doc__flow-legend-swatch"
                style={{ background: CO2_TONE[k]!.bar }}
                aria-hidden
              />
              {CO2_TONE[k]!.label}
            </span>
          ))}
        </div>
        <a
          className="dpp-doc__flow-legend-source"
          href="/dpp-assets/docs/technology-booklet.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Source: EGA Technology Booklet (Dec 2021) ↗
        </a>
      </div>

      {/* The visual timeline · stage card + connector arrow + stage card …
       * Each card carries ordinal, name, site, technology, inputs, outputs,
       * standards, and a CO₂-contribution stripe coloured by `co2eShare`. */}
      <ol className="dpp-doc__flow-track">
        {effective.map((s, i) => {
          const ord = (s.ordinal as number) ?? i + 1
          const tone = CO2_TONE[(s.co2eShare as string) ?? 'low'] ?? CO2_TONE.low!
          const inputs = (s.inputs as string[] | undefined) ?? []
          const outputs = (s.outputs as string[] | undefined) ?? []
          const standards = (s.standards as string[] | undefined) ?? []
          return (
            <li key={i} className="dpp-doc__flow-step">
              <article
                className="dpp-doc__flow-card"
                style={{ ['--tone-bar' as string]: tone.bar, ['--tone-chip' as string]: tone.chip }}
              >
                <header className="dpp-doc__flow-card-head">
                  <span className="dpp-doc__flow-num">{String(ord).padStart(2, '0')}</span>
                  <span
                    className="dpp-doc__flow-tone"
                    title={tone.label}
                    aria-label={tone.label}
                  />
                </header>
                <p className="dpp-doc__flow-name">{s.name as string}</p>
                <p className="dpp-doc__flow-meta">{s.site as string}</p>
                <p className="dpp-doc__flow-tech">{s.technology as string}</p>
                {(inputs.length > 0 || outputs.length > 0) && (
                  <dl className="dpp-doc__flow-io">
                    {inputs.length > 0 && (
                      <>
                        <dt>In</dt>
                        <dd>{inputs.join(' · ')}</dd>
                      </>
                    )}
                    {outputs.length > 0 && (
                      <>
                        <dt>Out</dt>
                        <dd>{outputs.join(' · ')}</dd>
                      </>
                    )}
                  </dl>
                )}
                {standards.length > 0 && (
                  <ul className="dpp-doc__flow-tags">
                    {standards.map((s2) => (
                      <li key={s2}>{s2}</li>
                    ))}
                  </ul>
                )}
              </article>
              {i < effective.length - 1 && (
                <span aria-hidden className="dpp-doc__flow-arrow">
                  →
                </span>
              )}
            </li>
          )
        })}
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

// ── New top-level LCA section ─────────────────────────────────────────
//
// This wraps everything an auditor / customer expects to see when an
// aluminium DPP claims a CFP number: the EGA-published system boundary,
// the verifier-stated methodology, the per-stage decomposition, the
// industry baseline comparison, the scope-1/2/3 split, and the public
// disclosure links (LCA report, CFP statement, technology booklet,
// product booklet).

function LcaSection({
  cfp,
  industryAvg,
  brand,
  carbon,
}: {
  cfp: number
  industryAvg: number
  brand: string
  carbon: Record<string, unknown>
}) {
  const decomposition = (carbon.decomposition as Record<string, number> | undefined) ?? undefined
  const verifier = (carbon.verifier as Record<string, unknown> | undefined) ?? {}
  const verifierName = (verifier.name as string) ?? 'DNV AS'
  const statementRef = (carbon.verificationStatementRef as string) ?? '—'
  const reportingPeriod = (carbon.reportingPeriod as Record<string, unknown> | undefined) ?? {}
  const periodFrom = (reportingPeriod.from as string) ?? '2023-01-01'
  const periodTo = (reportingPeriod.to as string) ?? '2023-12-31'
  const declaredUnit = (carbon.declaredUnit as string) ?? '1 t aluminium ingot (factory gate)'
  const methodology =
    (carbon.methodology as string) ??
    'ISO 14067:2018 + IAI Carbon Footprint Methodology v2.0 + PCR 2022:08 v1.0'
  const systemBoundary = (carbon.systemBoundary as string) ?? 'cradle_to_gate'
  const assuranceLevel = (carbon.assuranceLevel as string) ?? 'limited'

  return (
    <div className="dpp-doc__lca-section">
      {/* 1 · System boundary diagram (EGA-published scope) */}
      <SystemBoundaryDiagram boundary={systemBoundary} />

      {/* 2 · Methodology + verification */}
      <div className="dpp-doc__lca-method">
        <h4 className="dpp-doc__lca-h">Methodology &amp; verification</h4>
        <dl className="dpp-doc__lca-method-grid">
          <Field label="Declared unit" value={declaredUnit} />
          <Field
            label="System boundary"
            value={systemBoundary === 'cradle_to_gate' ? 'Cradle-to-gate (modules A1–A3)' : systemBoundary}
          />
          <Field label="Methodology" value={methodology} />
          <Field
            label="Allocation rule"
            value="Mass-balance for alumina + co-products; physical allocation elsewhere (per EGA LCA §4.3)"
          />
          <Field label="Cut-off" value="< 1% by mass; < 1% energy/emissions" />
          <Field
            label="Geographic scope"
            value="Bauxite: Guinea (GAC); Refining/Smelting/Casting: Al Taweelah, UAE"
          />
          <Field label="Reporting period" value={`${periodFrom} → ${periodTo}`} />
          <Field
            label="Verifier"
            value={`${verifierName} · ${assuranceLevel.toUpperCase()} assurance · ${statementRef}`}
          />
        </dl>
      </div>

      {/* 3 · CFP comparison + decomposition */}
      <div className="dpp-doc__lca-grid">
        <LcaChart cfp={cfp} industryAvg={industryAvg} brand={brand} />
        {decomposition && <Decomposition cfp={cfp} decomposition={decomposition} />}
      </div>

      {/* 4 · Headline callouts */}
      <div className="dpp-doc__lca-callouts">
        <div className="dpp-doc__callout">
          <p className="dpp-doc__callout-label">Total CO₂ (this product)</p>
          <p className="dpp-doc__callout-value">{(cfp / 1000).toFixed(2)} t CO₂e / t Al</p>
          <p className="dpp-doc__callout-detail">
            Verified by {verifierName} · statement <span className="font-mono">{statementRef}</span>
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

      {/* 5 · Scope-1/2/3 split */}
      <ScopeSplit decomposition={decomposition} cfp={cfp} />

      {/* 6 · Public disclosures */}
      <Disclosures />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="dpp-doc__lca-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function SystemBoundaryDiagram({ boundary }: { boundary: string }) {
  // EGA-published LCA boundary (per the public LCA report linked below).
  // A1–A3 modules are the "cradle-to-gate" scope EGA reports today; A4 →
  // C4 + D show the optional cradle-to-grave extension and are rendered
  // muted to make the gate (factory boundary) obvious to the reader.
  const stages = [
    { id: 'A1', label: 'Bauxite mining', tone: 'in' },
    { id: 'A1', label: 'Bauxite transport', tone: 'in' },
    { id: 'A1', label: 'Alumina refining', tone: 'in' },
    { id: 'A2', label: 'Anode production', tone: 'in' },
    { id: 'A3', label: 'Smelting (Hall–Héroult)', tone: 'in' },
    { id: 'A3', label: 'Casthouse casting', tone: 'in' },
  ]
  const downstream = [
    { id: 'A4', label: 'Distribution', tone: 'out' },
    { id: 'B1–B7', label: 'Use phase', tone: 'out' },
    { id: 'C1–C4', label: 'End-of-life', tone: 'out' },
    { id: 'D', label: 'Net-loop benefit (recycling credit)', tone: 'out' },
  ]
  const isC2G = boundary === 'cradle_to_gate'
  return (
    <div className="dpp-doc__sb">
      <header className="dpp-doc__sb-head">
        <h4 className="dpp-doc__lca-h">System boundary</h4>
        <p className="dpp-doc__sb-meta">
          EGA reports {isC2G ? 'cradle-to-gate (A1–A3)' : boundary} per ISO 14040/44 and ISO
          14067:2018. Modules to the right of the factory gate are disclosed for transparency
          but are not part of the verified CFP figure above.
        </p>
      </header>
      <div className="dpp-doc__sb-rail">
        <ol className="dpp-doc__sb-list dpp-doc__sb-list--in">
          {stages.map((s, i) => (
            <li key={`${s.id}-${i}`} className="dpp-doc__sb-cell dpp-doc__sb-cell--in">
              <span className="dpp-doc__sb-mod">{s.id}</span>
              <span className="dpp-doc__sb-label">{s.label}</span>
            </li>
          ))}
        </ol>
        <div className="dpp-doc__sb-gate" aria-label="Factory gate">
          <span className="dpp-doc__sb-gate-line" />
          <span className="dpp-doc__sb-gate-label">FACTORY GATE</span>
          <span className="dpp-doc__sb-gate-line" />
        </div>
        <ol className="dpp-doc__sb-list dpp-doc__sb-list--out">
          {downstream.map((s) => (
            <li key={s.id} className="dpp-doc__sb-cell dpp-doc__sb-cell--out">
              <span className="dpp-doc__sb-mod">{s.id}</span>
              <span className="dpp-doc__sb-label">{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="dpp-doc__sb-legend">
        <span className="dpp-doc__sb-legend-chip dpp-doc__sb-legend-chip--in">
          Verified scope (CFP figure)
        </span>
        <span className="dpp-doc__sb-legend-chip dpp-doc__sb-legend-chip--out">
          Disclosed downstream · informational only
        </span>
      </div>
    </div>
  )
}

function Decomposition({
  cfp,
  decomposition,
}: {
  cfp: number
  decomposition: Record<string, number>
}) {
  const stageEntries = Object.entries(decomposition).sort((a, b) => b[1] - a[1])
  const stageMax = stageEntries.length > 0 ? Math.max(...stageEntries.map(([, v]) => v)) : 0
  return (
    <div className="dpp-doc__stages">
      <p className="dpp-doc__stages-title">Decomposition by life-cycle stage</p>
      <ol className="dpp-doc__stages-list">
        {stageEntries.map(([key, value]) => {
          const pct = stageMax > 0 ? (value / stageMax) * 100 : 0
          const sharePct = cfp > 0 ? Math.round((value / cfp) * 100) : 0
          return (
            <li key={key} className="dpp-doc__stages-row">
              <span className="dpp-doc__stages-label">
                {STAGE_LABELS[key] ?? humanise(key)}
              </span>
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
  )
}

function ScopeSplit({
  decomposition,
  cfp,
}: {
  decomposition: Record<string, number> | undefined
  cfp: number
}) {
  // Map EGA's decomposition keys to GHG Protocol scopes. Where the source
  // data doesn't break this down explicitly, we apply the conservative
  // mapping the LCA report uses: electrolysis = scope 1 (anode oxidation +
  // PFC), electricity = scope 2, all upstream production = scope 3.
  const SCOPE_MAP: Record<string, 1 | 2 | 3> = {
    electrolysis: 1,
    casting: 1,
    electricity: 2,
    bauxiteMining: 3,
    bauxiteTransport: 3,
    aluminaProduction: 3,
    aluminaTransport: 3,
    anodeProduction: 3,
  }
  const scopes: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
  if (decomposition) {
    for (const [k, v] of Object.entries(decomposition)) {
      const s = SCOPE_MAP[k] ?? 3
      scopes[s] += v
    }
  }
  const total = scopes[1] + scopes[2] + scopes[3] || cfp || 1
  const SCOPE_META: Record<1 | 2 | 3, { label: string; note: string; color: string }> = {
    1: {
      label: 'Scope 1 · direct',
      note: 'Anode oxidation + PFC + on-site combustion',
      color: '#8a541d',
    },
    2: {
      label: 'Scope 2 · purchased energy',
      note: 'Grid + PPA-backed solar electricity',
      color: '#0F4C81',
    },
    3: {
      label: 'Scope 3 · upstream',
      note: 'Bauxite, alumina, anode raw materials, transport',
      color: '#5a7a3a',
    },
  }
  return (
    <div className="dpp-doc__scope">
      <h4 className="dpp-doc__lca-h">GHG Protocol scope split</h4>
      <div className="dpp-doc__scope-bar" role="img" aria-label="Scope share">
        {([1, 2, 3] as const).map((s) => {
          const w = (scopes[s] / total) * 100
          if (w <= 0) return null
          return (
            <span
              key={s}
              className="dpp-doc__scope-seg"
              style={{ width: `${w}%`, background: SCOPE_META[s].color }}
              aria-label={`${SCOPE_META[s].label}: ${Math.round(w)}%`}
            />
          )
        })}
      </div>
      <ul className="dpp-doc__scope-legend">
        {([1, 2, 3] as const).map((s) => {
          const w = (scopes[s] / total) * 100
          return (
            <li key={s}>
              <span
                className="dpp-doc__scope-swatch"
                style={{ background: SCOPE_META[s].color }}
                aria-hidden
              />
              <div>
                <p className="dpp-doc__scope-label">{SCOPE_META[s].label}</p>
                <p className="dpp-doc__scope-note">{SCOPE_META[s].note}</p>
              </div>
              <span className="dpp-doc__scope-share">
                {Math.round(scopes[s])} kg · {Math.round(w)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ComplianceRegister({
  certifications,
  regulations,
  docFor,
}: {
  certifications: Array<Record<string, unknown>>
  regulations: Array<Record<string, unknown>>
  docFor: (item: Record<string, unknown>) => Record<string, unknown> | null
}) {
  const STATUS_TONE: Record<string, { label: string; chip: string; color: string }> = {
    compliant: {
      label: 'Compliant',
      chip: 'rgba(22,163,74,0.10)',
      color: 'var(--color-green, #16a34a)',
    },
    pending: {
      label: 'Pending',
      chip: 'rgba(217,119,6,0.10)',
      color: 'var(--color-amber, #d97706)',
    },
    expired: {
      label: 'Expired',
      chip: 'rgba(220,38,38,0.10)',
      color: 'var(--color-red, #dc2626)',
    },
    not_applicable: {
      label: 'N/A',
      chip: 'rgba(120,113,108,0.10)',
      color: 'var(--fg-muted)',
    },
  }
  const renderRow = (item: Record<string, unknown>, kind: 'cert' | 'reg') => {
    const doc = docFor(item)
    const status = (item.status as string) ?? 'compliant'
    const tone = STATUS_TONE[status] ?? STATUS_TONE.compliant!
    const validUntil = item.validUntil as string | undefined
    const evidenceRef = item.evidenceRef as string | undefined
    return (
      <li key={`${kind}-${item.name as string}`} className="dpp-doc__creg-row">
        <span
          className="dpp-doc__creg-status"
          style={{ background: tone.chip, color: tone.color }}
          title={tone.label}
        >
          {tone.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="dpp-doc__creg-name">{item.name as string}</p>
          <p className="dpp-doc__creg-ref">
            {item.reference as string}
            {evidenceRef ? <> · evidence <span className="font-mono">{evidenceRef}</span></> : null}
            {validUntil ? <> · valid to <span className="font-mono">{validUntil}</span></> : null}
          </p>
        </div>
        {doc ? (
          <a
            href={doc.url as string}
            target="_blank"
            rel="noreferrer"
            className="dpp-doc__creg-dl"
            aria-label={`Download evidence for ${item.name as string}`}
          >
            <span className="dpp-doc__creg-dl-icon" aria-hidden>
              PDF
            </span>
            <span className="dpp-doc__creg-dl-label">
              {(doc.label as string) ?? 'Download evidence'}
            </span>
            <span className="dpp-doc__creg-dl-meta">
              {((doc.sizeKb as number | undefined) ?? 0).toLocaleString()} KB ↓
            </span>
          </a>
        ) : (
          <span className="dpp-doc__creg-no-doc">No document on file</span>
        )}
      </li>
    )
  }
  return (
    <div className="dpp-doc__creg">
      <div className="dpp-doc__creg-block">
        <h4 className="dpp-doc__creg-h">
          Certifications
          <span className="dpp-doc__creg-count">{certifications.length}</span>
        </h4>
        <ul className="dpp-doc__creg-list">
          {certifications.map((c) => renderRow(c, 'cert'))}
        </ul>
      </div>
      <div className="dpp-doc__creg-block">
        <h4 className="dpp-doc__creg-h">
          Regulations
          <span className="dpp-doc__creg-count">{regulations.length}</span>
        </h4>
        <ul className="dpp-doc__creg-list">
          {regulations.map((r) => renderRow(r, 'reg'))}
        </ul>
      </div>
    </div>
  )
}

function Disclosures() {
  // The four EGA public-disclosure documents that anchor every claim on
  // this passport. Sourced and bundled at apps/web-public/public/dpp-assets/docs/.
  const docs = [
    {
      href: '/dpp-assets/docs/lca.pdf',
      title: 'Life-cycle assessment of EGA primary aluminium ingot',
      kind: 'LCA report · ISO 14040/44',
      year: '2024',
    },
    {
      href: '/dpp-assets/docs/cfp-statement.pdf',
      title: 'CelestiAL CFP verification statement (DNV)',
      kind: 'ISO 14067:2018 · third-party verified',
      year: 'Aug 2025',
    },
    {
      href: '/dpp-assets/docs/technology-booklet.pdf',
      title: 'EGA Technology Booklet · DX+ Ultra cell line',
      kind: 'Process technology disclosure',
      year: 'Dec 2021',
    },
    {
      href: '/dpp-assets/docs/product-booklet.pdf',
      title: 'EGA Product Booklet',
      kind: 'Product portfolio + claims',
      year: 'Apr 2026',
    },
  ]
  return (
    <div className="dpp-doc__disclosures">
      <h4 className="dpp-doc__lca-h">Public disclosures referenced by this passport</h4>
      <ul className="dpp-doc__disclosures-grid">
        {docs.map((d) => (
          <li key={d.href}>
            <a
              className="dpp-doc__disclosures-card"
              href={d.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="dpp-doc__disclosures-icon" aria-hidden>
                PDF
              </span>
              <span className="dpp-doc__disclosures-body">
                <span className="dpp-doc__disclosures-kind">
                  {d.kind} · <span className="font-mono">{d.year}</span>
                </span>
                <span className="dpp-doc__disclosures-title">{d.title}</span>
              </span>
              <span className="dpp-doc__disclosures-arrow" aria-hidden>
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LcaChart({
  cfp,
  industryAvg,
  brand,
}: {
  cfp: number
  industryAvg: number
  brand: string
}) {
  // Bars: this product, EU primary average, global primary average (IAI
  // v2.0), Chinese primary average. References cited inline so the reader
  // can see where each baseline comes from.
  const bars: { label: string; value: number; tone: 'product' | 'baseline'; source?: string }[] = [
    { label: brand, value: cfp / 1000, tone: 'product', source: 'this product · DNV-verified' },
    { label: 'EU avg', value: 6.8, tone: 'baseline', source: 'European Aluminium 2022' },
    {
      label: 'IAI global',
      value: industryAvg / 1000,
      tone: 'baseline',
      source: 'IAI v2.0 sector average',
    },
    { label: 'CN avg', value: 20.0, tone: 'baseline', source: 'IAI Chinese primary average' },
  ]
  const max = Math.max(...bars.map((b) => b.value)) * 1.15

  return (
    <div className="dpp-doc__chart">
      <p className="dpp-doc__chart-eyebrow">Industry comparison</p>
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
                title={b.source}
              />
              <span className="dpp-doc__bar-label">{b.label}</span>
            </div>
          )
        })}
      </div>
      <p className="dpp-doc__chart-axis">t CO₂e / t Al · cradle-to-gate · ISO 14067</p>
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
        <polygon points="20,55 35,30 95,30 110,55 100,65 30,65" fill="#d6d3cc" stroke="#888" />
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
      .dpp-doc__cert-row { display: flex; align-items: flex-start; gap: 8px; }
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
      .dpp-doc__cert-dl {
        flex-shrink: 0;
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.10em;
        color: var(--color-accent);
        text-decoration: none;
        padding: 3px 6px;
        border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--surface-divider));
        border-radius: 4px;
        white-space: nowrap;
      }
      .dpp-doc__cert-dl:hover {
        background: color-mix(in srgb, var(--color-accent) 8%, transparent);
        border-color: var(--color-accent);
      }

      /* Compliance & Regulations register */
      .dpp-doc__creg {
        display: grid;
        grid-template-columns: 1fr;
        gap: 28px;
      }
      @media (min-width: 900px) {
        .dpp-doc__creg { grid-template-columns: 1fr 1fr; }
      }
      .dpp-doc__creg-block {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        padding: 18px 18px 14px;
      }
      .dpp-doc__creg-h {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--font-display);
        font-size: 13px;
        font-weight: 600;
        color: var(--fg-default);
        margin: 0 0 12px;
      }
      .dpp-doc__creg-count {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.10em;
        color: var(--fg-subtle);
        padding: 2px 7px;
        border-radius: 9999px;
        background: var(--color-paper-soft, #f3f0e7);
      }
      .dpp-doc__creg-list {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column;
        gap: 8px;
      }
      .dpp-doc__creg-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid var(--surface-divider);
        border-radius: 6px;
        background: var(--color-paper);
      }
      .dpp-doc__creg-status {
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 3px 7px;
        border-radius: 9999px;
        white-space: nowrap;
      }
      .dpp-doc__creg-name {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--fg-default);
        line-height: 1.3;
      }
      .dpp-doc__creg-ref {
        margin-top: 2px;
        font-size: 10.5px;
        color: var(--fg-muted);
        line-height: 1.4;
      }
      .dpp-doc__creg-dl {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
        column-gap: 8px;
        align-items: center;
        max-width: 220px;
        text-decoration: none;
        color: inherit;
        padding: 6px 10px;
        border: 1px solid var(--surface-divider);
        border-radius: 6px;
        background: var(--color-paper-soft, #f3f0e7);
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }
      .dpp-doc__creg-dl:hover {
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 6%, var(--color-paper));
        transform: translateY(-1px);
      }
      .dpp-doc__creg-dl-icon {
        grid-row: 1 / span 2;
        display: grid; place-items: center;
        width: 28px; height: 32px;
        border: 1px solid var(--surface-divider);
        border-radius: 4px;
        background: var(--color-paper);
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.10em;
        color: var(--fg-muted);
      }
      .dpp-doc__creg-dl-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--fg-default);
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dpp-doc__creg-dl-meta {
        font-family: var(--font-mono);
        font-size: 9.5px;
        color: var(--color-accent);
        letter-spacing: 0.06em;
      }
      .dpp-doc__creg-no-doc {
        font-family: var(--font-mono);
        font-size: 9.5px;
        color: var(--fg-subtle);
        font-style: italic;
      }
      @media (prefers-reduced-motion: reduce) {
        .dpp-doc__creg-dl { transition: none; }
        .dpp-doc__creg-dl:hover { transform: none; }
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

      /* ── Manufacturing process · stage cards on a horizontal rail ─── */
      .dpp-doc__flow { display: flex; flex-direction: column; gap: 16px; }
      .dpp-doc__flow-legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
      }
      .dpp-doc__flow-legend-items {
        display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
        font-size: 10.5px; color: var(--fg-muted);
      }
      .dpp-doc__flow-legend-item {
        display: inline-flex; align-items: center; gap: 6px;
      }
      .dpp-doc__flow-legend-swatch {
        display: inline-block; width: 10px; height: 10px; border-radius: 2px;
      }
      .dpp-doc__flow-legend-source {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        color: var(--color-accent);
        text-decoration: none;
      }
      .dpp-doc__flow-legend-source:hover { text-decoration: underline; }

      .dpp-doc__flow-track {
        display: flex;
        align-items: stretch;
        gap: 6px;
        flex-wrap: wrap;
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .dpp-doc__flow-step {
        display: flex; align-items: center; gap: 6px;
        flex: 1 1 200px;
        min-width: 200px;
      }
      .dpp-doc__flow-card {
        position: relative;
        flex: 1 1 0;
        min-width: 0;
        padding: 14px 14px 12px;
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        background: var(--color-paper);
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow: hidden;
      }
      .dpp-doc__flow-card::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 3px;
        background: var(--tone-bar, var(--surface-border));
      }
      .dpp-doc__flow-card-head {
        display: flex; align-items: center; justify-content: space-between;
      }
      .dpp-doc__flow-num {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: var(--fg-subtle);
      }
      .dpp-doc__flow-tone {
        display: inline-block;
        width: 8px; height: 8px;
        border-radius: 9999px;
        background: var(--tone-bar, var(--surface-border));
      }
      .dpp-doc__flow-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--fg-default);
        line-height: 1.25;
      }
      .dpp-doc__flow-meta {
        font-size: 11px;
        color: var(--fg-muted);
        line-height: 1.35;
      }
      .dpp-doc__flow-tech {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        line-height: 1.45;
        padding: 4px 6px;
        background: var(--tone-chip, var(--color-paper-soft, #f3f0e7));
        border-radius: 4px;
      }
      .dpp-doc__flow-io {
        display: grid;
        grid-template-columns: 24px 1fr;
        gap: 4px 6px;
        margin-top: 2px;
      }
      .dpp-doc__flow-io dt {
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.14em;
        color: var(--fg-subtle);
      }
      .dpp-doc__flow-io dd {
        font-size: 10.5px;
        color: var(--fg-default);
        line-height: 1.4;
      }
      .dpp-doc__flow-tags {
        display: flex; flex-wrap: wrap; gap: 4px;
        list-style: none; padding: 0; margin-top: 4px;
      }
      .dpp-doc__flow-tags li {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--surface-divider);
        border-radius: 9999px;
        color: var(--fg-muted);
      }
      .dpp-doc__flow-arrow {
        color: var(--fg-subtle);
        font-size: 18px;
        flex-shrink: 0;
      }

      /* ── LCA section wrapper ─────────────────────────────────────── */
      .dpp-doc__lca-section {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }
      .dpp-doc__lca-h {
        font-family: var(--font-display);
        font-size: 14px;
        font-weight: 600;
        color: var(--fg-default);
        margin: 0 0 12px;
      }
      .dpp-doc__lca-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media (min-width: 900px) {
        .dpp-doc__lca-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); }
      }
      .dpp-doc__lca-callouts {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 700px) {
        .dpp-doc__lca-callouts { grid-template-columns: 1fr 1fr; }
      }

      /* ── System boundary diagram ─────────────────────────────────── */
      .dpp-doc__sb {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        padding: 22px 22px 18px;
      }
      .dpp-doc__sb-head { margin-bottom: 16px; }
      .dpp-doc__sb-meta {
        font-size: 11.5px;
        color: var(--fg-muted);
        line-height: 1.6;
        max-width: 70ch;
      }
      .dpp-doc__sb-rail {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        align-items: stretch;
      }
      @media (min-width: 880px) {
        .dpp-doc__sb-rail {
          grid-template-columns: minmax(0, 3fr) auto minmax(0, 2fr);
          gap: 20px;
          align-items: center;
        }
      }
      .dpp-doc__sb-list {
        list-style: none;
        padding: 0; margin: 0;
        display: grid;
        gap: 6px;
      }
      .dpp-doc__sb-list--in  { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
      .dpp-doc__sb-list--out { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
      .dpp-doc__sb-cell {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 10px 10px;
        border-radius: 6px;
        border: 1px solid var(--surface-divider);
      }
      .dpp-doc__sb-cell--in {
        background: color-mix(in srgb, var(--color-green, #5a7a3a) 10%, var(--color-paper));
        border-color: color-mix(in srgb, var(--color-green, #5a7a3a) 36%, var(--surface-divider));
      }
      .dpp-doc__sb-cell--out {
        background: var(--color-paper);
        opacity: 0.72;
      }
      .dpp-doc__sb-mod {
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.14em;
        color: var(--fg-subtle);
      }
      .dpp-doc__sb-label {
        font-size: 11.5px;
        color: var(--fg-default);
        line-height: 1.3;
      }
      .dpp-doc__sb-gate {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 0 6px;
      }
      @media (min-width: 880px) {
        .dpp-doc__sb-gate { height: 100%; }
      }
      .dpp-doc__sb-gate-line {
        flex: 1;
        width: 0;
        border-left: 2px dashed var(--color-ink, #1c1917);
        min-height: 24px;
      }
      .dpp-doc__sb-gate-label {
        writing-mode: horizontal-tb;
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.20em;
        color: var(--color-ink, #1c1917);
        white-space: nowrap;
      }
      @media (min-width: 880px) {
        .dpp-doc__sb-gate-label {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
        }
      }
      .dpp-doc__sb-legend {
        margin-top: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 9.5px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
      }
      .dpp-doc__sb-legend-chip {
        padding: 4px 8px;
        border-radius: 9999px;
        border: 1px solid var(--surface-divider);
        color: var(--fg-muted);
      }
      .dpp-doc__sb-legend-chip--in {
        color: color-mix(in srgb, var(--color-green, #5a7a3a) 90%, black);
        background: color-mix(in srgb, var(--color-green, #5a7a3a) 12%, transparent);
        border-color: color-mix(in srgb, var(--color-green, #5a7a3a) 30%, var(--surface-divider));
      }

      /* ── Methodology / verification grid ─────────────────────────── */
      .dpp-doc__lca-method {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        padding: 22px 22px 18px;
      }
      .dpp-doc__lca-method-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px 22px;
        margin: 0;
      }
      @media (min-width: 700px) {
        .dpp-doc__lca-method-grid { grid-template-columns: 1fr 1fr; }
      }
      .dpp-doc__lca-field {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2px;
      }
      .dpp-doc__lca-field dt {
        font-family: var(--font-mono);
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-subtle);
      }
      .dpp-doc__lca-field dd {
        font-size: 12px;
        color: var(--fg-default);
        line-height: 1.45;
      }

      /* ── Scope-1/2/3 split ───────────────────────────────────────── */
      .dpp-doc__scope {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        padding: 22px 22px 18px;
      }
      .dpp-doc__scope-bar {
        display: flex;
        height: 16px;
        border-radius: 9999px;
        overflow: hidden;
        background: var(--surface-divider);
      }
      .dpp-doc__scope-seg { display: block; height: 100%; }
      .dpp-doc__scope-legend {
        list-style: none; padding: 0;
        margin-top: 14px;
        display: grid;
        gap: 10px;
      }
      .dpp-doc__scope-legend li {
        display: grid;
        grid-template-columns: 14px 1fr auto;
        gap: 12px;
        align-items: center;
      }
      .dpp-doc__scope-swatch {
        display: inline-block; width: 12px; height: 12px;
        border-radius: 3px;
      }
      .dpp-doc__scope-label {
        font-size: 12px; font-weight: 600; color: var(--fg-default);
      }
      .dpp-doc__scope-note {
        font-size: 11px; color: var(--fg-muted); margin-top: 1px;
      }
      .dpp-doc__scope-share {
        font-family: var(--font-mono);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: var(--fg-default);
      }

      /* ── Public disclosures grid ─────────────────────────────────── */
      .dpp-doc__disclosures {
        background: var(--color-paper);
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        padding: 22px 22px 20px;
      }
      .dpp-doc__disclosures-grid {
        list-style: none; padding: 0; margin: 0;
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr;
      }
      @media (min-width: 700px) {
        .dpp-doc__disclosures-grid { grid-template-columns: 1fr 1fr; }
      }
      .dpp-doc__disclosures-card {
        display: grid;
        grid-template-columns: 36px 1fr 16px;
        gap: 12px;
        align-items: center;
        padding: 12px 12px;
        border: 1px solid var(--surface-divider);
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        background: var(--color-paper);
        transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
      }
      .dpp-doc__disclosures-card:hover {
        border-color: var(--color-accent);
        box-shadow: 0 6px 16px -10px rgba(15,23,42,0.20);
        transform: translateY(-1px);
      }
      .dpp-doc__disclosures-icon {
        display: grid; place-items: center;
        width: 36px; height: 44px;
        border: 1px solid var(--surface-divider);
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        background: var(--color-paper-soft, #f3f0e7);
      }
      .dpp-doc__disclosures-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .dpp-doc__disclosures-kind {
        font-family: var(--font-mono);
        font-size: 9.5px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: var(--fg-subtle);
      }
      .dpp-doc__disclosures-title {
        font-size: 12.5px; font-weight: 600; color: var(--fg-default); line-height: 1.3;
      }
      .dpp-doc__disclosures-arrow {
        font-size: 14px; color: var(--fg-subtle);
      }

      .dpp-doc__chart-eyebrow {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-subtle);
        margin: 0 0 10px;
      }

      @media (prefers-reduced-motion: reduce) {
        .dpp-doc__disclosures-card { transition: none; }
        .dpp-doc__disclosures-card:hover { transform: none; }
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
