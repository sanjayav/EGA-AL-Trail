/**
 * Demo passport bank · three production-style DPP bodies for the EGA portfolio
 * (CelestiAL primary, CelestiAL-R recycled-blend, Standard P1020). Used as a
 * deterministic source of truth so any UPI that resolves to one of these three
 * products renders the same rich passport regardless of database state.
 *
 * Data shape mirrors `packages/schema/schemas/dpp/v1.0.0.json` and is enriched
 * with sections that the JRC ESPR working draft and the EU Battery Regulation
 * digital-passport blueprint expect: documentation vault, manufacturing
 * process flow, EU LCA EF 3.1 impact categories, substances of concern (SoC),
 * supply chain map with country flags, end-of-life routing, regulatory
 * contact, GS1 Digital Link metadata.
 *
 * Each passport ships every field; the audience filter in `audience.ts`
 * narrows the visible surface for public/customer/verifier/authority views.
 */

export type DemoAudience = 'public' | 'customer' | 'verifier' | 'authority'

export type DemoSlug = 'celestial' | 'celestial-r' | 'standard'

export interface DemoPassport {
  slug: DemoSlug
  upiCanonical: string
  qrPayload: string
  signature: { algorithm: string; value: string; bodySha256: string }
  body: Record<string, unknown>
}

const ISSUED_AT = new Date('2026-04-22T08:30:00Z').toISOString()
const EXPIRES_AT = new Date('2036-04-22T08:30:00Z').toISOString() // ESPR Art 10(3) · 10 years

const ISSUER_DID = 'did:web:dpp.ega.local'

const COMMON_PRODUCER = {
  uoi: '08144060638100',
  name: 'Emirates Global Aluminium PJSC',
  trademark: 'EGA',
  registeredAddress: 'P.O. Box 111023, Abu Dhabi, United Arab Emirates',
  legalForm: 'Public Joint Stock Company',
  registryId: 'CN-1167145',
  website: 'https://www.ega.ae',
  regulatoryContact: {
    name: 'Sustainability & Compliance Office',
    email: 'compliance@ega.ae',
    phone: '+971 2 555 0100',
    team: 'EGA Group Compliance · DPP Programme',
  },
}

const COMMON_FACILITIES = [
  { ufi: 'GN-SANGAREDI', name: 'GAC Sangaredi (Guinea Alumina Corp)', role: 'mine', country: 'GN', latLon: [11.066, -13.74] },
  { ufi: 'AE-TAWEELAH-REFINERY', name: 'EGA Al Taweelah Alumina Refinery', role: 'refinery', country: 'AE', latLon: [24.781, 54.713] },
  { ufi: 'AE-TAWEELAH-ANODE', name: 'EGA Al Taweelah Anode Plant', role: 'anode_plant', country: 'AE', latLon: [24.781, 54.713] },
  { ufi: 'AE-TAWEELAH-SMELTER', name: 'EGA Al Taweelah Smelter (Potlines 1–3)', role: 'smelter', country: 'AE', latLon: [24.78, 54.715] },
  { ufi: 'AE-TAWEELAH-CASTHOUSE', name: 'EGA Al Taweelah Casthouse', role: 'casthouse', country: 'AE', latLon: [24.78, 54.717] },
]

const COMMON_PROCESS_FLOW = [
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
    inputs: ['Alumina', 'Anodes', 'Electricity (DEWA solar PPA)'],
    outputs: ['Liquid aluminium (≥99.85% Al)'],
    standards: ['IAI v2.0', 'ISO 14067:2018'],
    co2eShare: 'highest',
  },
  {
    ordinal: 5,
    name: 'Casthouse casting',
    site: 'EGA Al Taweelah Casthouse',
    technology: 'Direct-chill (DC) casting · in-line metal treatment',
    inputs: ['Liquid metal', 'Alloying elements', 'Grain refiner (TiB₂)'],
    outputs: ['Cast products (billet / sow / sheet ingot)'],
    standards: ['EN 573-3', 'EN 1559-3'],
    co2eShare: 'low',
  },
  {
    ordinal: 6,
    name: 'Quality lab',
    site: 'EGA Al Taweelah QC Lab',
    technology: 'Optical Emission Spectrometry (ARL iSpark) · UTM',
    inputs: ['Cast tap samples'],
    outputs: ['Chemistry & mechanical certificates'],
    standards: ['ISO/IEC 17025'],
    co2eShare: 'negligible',
  },
  {
    ordinal: 7,
    name: 'Packaging & dispatch',
    site: 'EGA Al Taweelah Logistics',
    technology: 'Steel strapping · plastic-free wrap',
    inputs: ['Cast units'],
    outputs: ['Customer-ready bundles + DPP QR'],
    standards: ['GS1 Digital Link'],
    co2eShare: 'negligible',
  },
]

const COMMON_REGULATORY = {
  regulations: [
    { name: 'EU CBAM', reference: 'EU 2023/956', status: 'compliant', evidenceRef: 'CBAM-EGA-2026-Q1' },
    { name: 'EU ESPR', reference: 'EU 2024/1781', status: 'compliant', evidenceRef: 'ESPR-DPP-EGA-001' },
    { name: 'REACH', reference: 'EC 1907/2006', status: 'compliant', evidenceRef: 'REACH-EGA-2025' },
    { name: 'RoHS 2', reference: '2011/65/EU', status: 'compliant', evidenceRef: 'RoHS-EGA-2025' },
    { name: 'PFAS · REACH Annex XVII', reference: 'EU 2024/879', status: 'compliant', evidenceRef: 'PFAS-EGA-2025' },
    { name: 'EU Aluminium Delegated Act', reference: 'EU 2025/486 (draft)', status: 'compliant', evidenceRef: 'ALU-DA-EGA-2025' },
    { name: 'Conflict Minerals (3TG)', reference: 'EU 2017/821', status: 'not_applicable', evidenceRef: null },
  ],
  certifications: [
    { name: 'ASI Performance V3', reference: 'ASI Performance #27 · Al Taweelah May 2019; Jebel Ali 2021', status: 'compliant', validUntil: '2027-05-01' },
    { name: 'ASI Chain of Custody V2.1', reference: 'ASI CoC #428', status: 'compliant', validUntil: '2027-05-01' },
    { name: 'ISO 9001:2015', reference: 'BSI FS 612893', status: 'compliant', validUntil: '2026-09-15' },
    { name: 'ISO 14001:2015', reference: 'BSI EMS 591222', status: 'compliant', validUntil: '2026-09-15' },
    { name: 'ISO 45001:2018', reference: 'BSI OHS 615001', status: 'compliant', validUntil: '2026-09-15' },
    { name: 'ISO 50001:2018', reference: 'BSI ENMS 614720', status: 'compliant', validUntil: '2026-09-15' },
    { name: 'ISO/IEC 17025:2017', reference: 'EIAC LAB 0029', status: 'compliant', validUntil: '2027-03-30' },
  ],
}

// Real documents staged in `apps/<app>/public/dpp-assets/docs/` · copied from
// the repo-root /public/ folder during build. Two PDFs (LCA + CFP statement)
// are the actual EGA-published artefacts; the rest stub to those two for now
// so links don't 404.
const COMMON_DOCUMENTS = [
  { id: 'doc-cfp', label: 'Carbon Footprint Verification Statement (ISO 14067:2018)', issuer: 'DNV AS', kind: 'pdf', sizeKb: 1430, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '8f3a…c41e', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'ISO 14067' },
  { id: 'doc-lca-full', label: 'Life Cycle Assessment · EGA Primary Aluminium Ingot Production', issuer: 'EGA Sustainability', kind: 'pdf', sizeKb: 4830, url: '/dpp-assets/docs/lca.pdf', sha256: 'da77…42cf', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'LCA' },
  { id: 'doc-product-booklet', label: 'EGA Product Booklet (April 2026)', issuer: 'Emirates Global Aluminium', kind: 'pdf', sizeKb: 5240, url: '/dpp-assets/docs/product-booklet.pdf', sha256: 'aa11…02bd', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'Product' },
  { id: 'doc-tech-booklet', label: 'EGA Technology Booklet (Dec 2021)', issuer: 'Emirates Global Aluminium', kind: 'pdf', sizeKb: 6712, url: '/dpp-assets/docs/technology-booklet.pdf', sha256: 'bc44…78de', requiresAudience: ['customer', 'verifier', 'authority'], tag: 'Technology' },
  { id: 'doc-asi-perf', label: 'ASI Performance Standard V3 · Certificate', issuer: 'Aluminium Stewardship Initiative', kind: 'pdf', sizeKb: 980, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '2b71…99af', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'ASI' },
  { id: 'doc-asi-coc', label: 'ASI Chain of Custody V2.1 · Certificate', issuer: 'Aluminium Stewardship Initiative', kind: 'pdf', sizeKb: 1102, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '4ad6…1f88', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'ASI' },
  { id: 'doc-iso-14001', label: 'ISO 14001:2015 Environmental Management', issuer: 'BSI', kind: 'pdf', sizeKb: 605, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: 'fe21…3a8d', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'ISO' },
  { id: 'doc-iso-9001', label: 'ISO 9001:2015 Quality Management', issuer: 'BSI', kind: 'pdf', sizeKb: 612, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: 'a3bd…7cf0', requiresAudience: ['customer', 'verifier', 'authority'], tag: 'ISO' },
  { id: 'doc-iso-45001', label: 'ISO 45001:2018 Occupational Health & Safety', issuer: 'BSI', kind: 'pdf', sizeKb: 590, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '12cd…be71', requiresAudience: ['customer', 'verifier', 'authority'], tag: 'ISO' },
  { id: 'doc-msds', label: 'Material Safety Data Sheet (MSDS)', issuer: 'EGA Quality Lab', kind: 'pdf', sizeKb: 412, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '99e1…02ab', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'MSDS' },
  { id: 'doc-test-report', label: 'Mill Test Certificate (EN 10204 3.1)', issuer: 'EGA Quality Lab', kind: 'pdf', sizeKb: 880, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '5d72…e3f1', requiresAudience: ['customer', 'verifier', 'authority'], tag: 'Quality' },
  { id: 'doc-reach', label: 'REACH Compliance Declaration', issuer: 'EGA Compliance', kind: 'pdf', sizeKb: 220, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: '7caa…8d44', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'REACH' },
  { id: 'doc-rohs', label: 'RoHS 2 Declaration', issuer: 'EGA Compliance', kind: 'pdf', sizeKb: 198, url: '/dpp-assets/docs/cfp-statement.pdf', sha256: 'ae09…74c2', requiresAudience: ['public', 'customer', 'verifier', 'authority'], tag: 'RoHS' },
  { id: 'doc-cbam', label: 'CBAM Embedded Emissions Report', issuer: 'EGA Compliance', kind: 'pdf', sizeKb: 1520, url: '/dpp-assets/docs/lca.pdf', sha256: 'b1e8…a009', requiresAudience: ['verifier', 'authority'], tag: 'CBAM' },
]

const COMMON_PEF = {
  // EU EF 3.1 · 16 impact categories (illustrative values per tonne Al)
  declaredUnit: '1 tonne of finished product (factory gate)',
  method: 'EF 3.1 · Recommendations of the European Commission for PEF',
  impacts: [
    { code: 'CC', label: 'Climate change', unit: 'kg CO₂e', value: 4273 },
    { code: 'OD', label: 'Ozone depletion', unit: 'kg CFC-11 eq', value: 0.000031 },
    { code: 'IR', label: 'Ionising radiation', unit: 'kBq U-235 eq', value: 145 },
    { code: 'POF', label: 'Photochemical ozone formation', unit: 'kg NMVOC eq', value: 12.4 },
    { code: 'PM', label: 'Particulate matter', unit: 'disease incidence', value: 0.00031 },
    { code: 'AP', label: 'Acidification', unit: 'mol H+ eq', value: 38.7 },
    { code: 'EP-fw', label: 'Eutrophication, freshwater', unit: 'kg P eq', value: 0.21 },
    { code: 'EP-mar', label: 'Eutrophication, marine', unit: 'kg N eq', value: 4.6 },
    { code: 'EP-ter', label: 'Eutrophication, terrestrial', unit: 'mol N eq', value: 12.8 },
    { code: 'ETf', label: 'Ecotoxicity, freshwater', unit: 'CTUe', value: 18450 },
    { code: 'HTC', label: 'Human toxicity, cancer', unit: 'CTUh', value: 0.00000041 },
    { code: 'HTNC', label: 'Human toxicity, non-cancer', unit: 'CTUh', value: 0.0000074 },
    { code: 'LU', label: 'Land use', unit: 'Pt', value: 28350 },
    { code: 'WU', label: 'Water use', unit: 'm³ depriv.', value: 412 },
    { code: 'RU-min', label: 'Resource use, minerals & metals', unit: 'kg Sb eq', value: 0.0091 },
    { code: 'RU-foss', label: 'Resource use, fossils', unit: 'MJ', value: 41200 },
  ],
}

const COMMON_SOC = {
  // Substances of Concern declared per ECHA SCIP & ESPR Art 11
  hasSocAboveThreshold: false,
  thresholdPercent: 0.1,
  summaryStatement: 'No substances of very high concern (SVHC) declared above 0.1% w/w in the article.',
  substances: [],
  scipReference: null,
  refreshedAt: ISSUED_AT,
}

const COMMON_CIRCULARITY = {
  recyclabilityIndicator: 'A',
  recyclabilityScore: 95,
  designedForDisassembly: true,
  remeltingYieldPercent: 95,
  remeltingEnergyKwhPerTonne: 700,
  recyclingInfrastructure: 'Globally available · aluminium is infinitely recyclable without quality loss.',
  endOfLife: {
    routes: [
      { code: 'recycle_loop', label: 'Closed-loop remelt', preferred: true, share: 80 },
      { code: 'recycle_open', label: 'Open-loop remelt', preferred: true, share: 18 },
      { code: 'landfill', label: 'Landfill', preferred: false, share: 2 },
    ],
    disassemblyInstructions: 'Sort by alloy family per EN 573-3. Remove non-aluminium attachments (plastic caps, steel banding). Avoid contamination with painted/lacquered scrap unless declared.',
    handlerNetwork: 'European Aluminium Recycling Federation members (organisation.eu/recyclers)',
  },
}

const COMMON_USE_AND_LIFE = {
  expectedLifetimeYears: 50,
  durabilityStatement: 'Aluminium does not corrode and retains structural performance for >50 years in typical built-environment use.',
  reliabilityStatement: 'No fatigue degradation under ambient conditions; tested per EN 1999-1-1 Eurocode 9.',
  installationInformation: 'No special handling required beyond standard load-bearing protocols.',
  maintenanceInformation: 'Wash with neutral pH solution; avoid abrasive cleaners on anodised surfaces.',
  safetyInformation: 'Mechanical edges may be sharp post-cutting. PPE per ISO 45001 site procedure.',
  warnings: 'Do not heat above 600 °C in confined spaces (oxide dust hazard).',
  repairScore: 'B',
  repairabilityNotes: 'Cast products are remelted, not repaired in field; structural failure typically retired to scrap stream.',
}

const COMMON_LABELS = [
  { code: 'asi_performance', label: 'ASI Performance Standard', authority: 'Aluminium Stewardship Initiative', issuedAt: '2024-05-01', logoSlug: 'asi' },
  { code: 'asi_coc', label: 'ASI Chain of Custody', authority: 'Aluminium Stewardship Initiative', issuedAt: '2024-05-01', logoSlug: 'asi' },
  { code: 'iso_14001', label: 'ISO 14001 Environmental Management', authority: 'BSI', issuedAt: '2024-09-15', logoSlug: 'iso' },
  { code: 'cradle_to_cradle', label: 'Cradle to Cradle Bronze (Aluminium category)', authority: 'C2C PII', issuedAt: '2024-11-12', logoSlug: 'c2c' },
]

interface BuildArgs {
  slug: DemoSlug
  productName: string
  upiCanonical: string
  gtin: string
  itemSerial: string
  lotNumber: string
  alloyEn: string
  alloyAa: string
  designationNumber: string
  temper: string
  productionRoute: 'primary_solar' | 'primary_grid' | 'recycled_blend'
  brand: string
  brandTagline: string
  form: string
  formLabel: string
  weightKg: number
  dimensions: Record<string, number>
  cfp: number
  cfpDecomposition: Record<string, number>
  cfpVerifier: string
  cfpVerifierDid: string
  cfpStatementRef: string
  recycledTotal: number
  recycledPostConsumer: number
  recycledPreConsumer: number
  recycledRunaround: number
  story: { headline: string; subhead: string; energyMixSolarPercent: number; ppaReference: string | null }
  chemistry: Record<string, number>
  applicableStandards: string[]
  customerUseCases: string[]
  materialOriginNote: string
}

function buildBody(a: BuildArgs): Record<string, unknown> {
  const digitalLink = `https://id.ega.example/01/${a.gtin}/10/${a.lotNumber}/21/${a.itemSerial}`
  // Override climate-change impact with the product-specific CFP so PEF table
  // and Carbon section don't disagree.
  const pef = {
    ...COMMON_PEF,
    impacts: COMMON_PEF.impacts.map((i) => (i.code === 'CC' ? { ...i, value: a.cfp } : i)),
  }

  return {
    schemaVersion: '1.0.0',
    dppVersion: '1.0',

    upi: {
      castNumber: `C-DEMO-${a.slug.toUpperCase()}-001`,
      gtin: a.gtin,
      itemSerial: a.itemSerial,
      lotNumber: a.lotNumber,
      hsCode: '7601.10',
      taricCode: '7601100000',
      esprProductCategory: 'aluminium_semis',
      digitalLinkUrl: digitalLink,
    },

    media: {
      productImage: `/dpp-assets/products/${a.slug}.jpg`,
      productImageAlt: `EGA ${a.brand} ${a.formLabel}`,
    },

    identification: {
      alloyEn: a.alloyEn,
      alloyAa: a.alloyAa,
      designationNumber: a.designationNumber,
      temper: a.temper,
      productionRoute: a.productionRoute,
      brand: a.brand,
      form: a.form,
      formLabel: a.formLabel,
      castNumber: `C-DEMO-${a.slug.toUpperCase()}-001`,
      casthouseUfi: 'AE-TAWEELAH-CASTHOUSE',
      applicableStandards: a.applicableStandards,
    },

    producer: COMMON_PRODUCER,

    origin: {
      country: 'AE',
      meltAndPourCountry: 'AE',
      manufacturingDate: ISSUED_AT.slice(0, 10),
      bauxiteSource: 'GN',
      bauxiteSourceNote: a.materialOriginNote,
      facilities: COMMON_FACILITIES,
    },

    product: {
      name: a.productName,
      purposeStatement: a.brandTagline,
      customerUseCases: a.customerUseCases,
    },

    physical: {
      netWeightKg: a.weightKg,
      ...a.dimensions,
      tolerances: {
        diameter: 0.5,
        lengthBow: 1.5,
        squareness: 0.5,
      },
    },

    chemistry: {
      purityGrade: 'P1020A',
      targetAlloyEn: a.alloyEn,
      targetAlloyAa: a.alloyAa,
      ...a.chemistry,
      fullElementalBreakdown: a.chemistry, // hidden from public by default
    },

    carbon: {
      valueKgCo2ePerTonne: a.cfp,
      declaredUnit: '1000 kg of aluminium ingot (factory gate)',
      systemBoundary: 'cradle_to_gate',
      methodology: 'ISO 14067:2018 + IAI v2.0 + PCR 2022:08 v1.0',
      reportingPeriod: { from: '2025-01-01', to: '2025-12-31' },
      verifier: { did: a.cfpVerifierDid, name: a.cfpVerifier, type: 'verification_statement' },
      verificationStatementRef: a.cfpStatementRef,
      assuranceLevel: 'limited',
      industryAverageKgCo2ePerTonne: 14600,
      decomposition: a.cfpDecomposition,
    },

    pef: pef,

    recycledContent: {
      totalPercent: a.recycledTotal,
      postConsumerPercent: a.recycledPostConsumer,
      preConsumerPercent: a.recycledPreConsumer,
      internalRunaroundPercent: a.recycledRunaround,
      chainOfCustodyModel: 'mass_balance',
      verifier: { did: 'did:web:bureauveritas.com:reco', name: 'Bureau Veritas' },
      asiCertificateRef: 'ASI CoC #428',
      methodology: 'ASI Chain of Custody V2.1 mass-balance allocation',
    },

    compliance: COMMON_REGULATORY,

    soc: COMMON_SOC,
    circularity: COMMON_CIRCULARITY,
    useAndLife: COMMON_USE_AND_LIFE,

    labels: COMMON_LABELS,
    documents: COMMON_DOCUMENTS,
    processFlow: COMMON_PROCESS_FLOW,

    story: a.story,

    audit: {
      events: [
        { at: '2025-08-12T07:00:00Z', actor: 'casthouse.ops@ega.ae', action: 'cast tap-out recorded', target: 'cast' },
        { at: '2025-08-12T11:42:00Z', actor: 'qc.lab@ega.ae', action: 'spectro chemistry validated', target: 'chemistry' },
        { at: '2025-08-13T09:15:00Z', actor: 'sustainability.lead@ega.ae', action: 'CFP attached & verified', target: 'carbon' },
        { at: '2026-04-22T08:30:00Z', actor: 'sustainability.lead@ega.ae', action: 'passport published', target: 'dpp' },
      ],
    },

    meta: {
      createdAt: ISSUED_AT,
      lastUpdated: ISSUED_AT,
      expiresAt: EXPIRES_AT,
      lifecycleState: 'published',
      languages: ['en', 'ar', 'de'],
      issuerDid: ISSUER_DID,
      accessRights: {
        model: 'three_tier_vc_gated',
        publicFields: [
          'upi',
          'identification',
          'producer',
          'origin.country',
          'origin.bauxiteSource',
          'product',
          'physical',
          'carbon',
          'recycledContent',
          'compliance',
          'circularity',
          'labels',
          'story',
        ],
      },
      tenantId: 1,
      complianceScore: 98,
    },
  }
}

const PASSPORTS: Record<DemoSlug, DemoPassport> = {
  celestial: {
    slug: 'celestial',
    upiCanonical: 'sample/celestial',
    qrPayload: 'https://id.ega.example/01/08144060638123/10/CL-2025-08/21/CEL-DEMO-001',
    signature: {
      algorithm: 'Ed25519Signature2020',
      value: 'z58QAk2Pj7sB7ya3RrdXz1m7DCAzfXNAxuJxYiCEL2DEmoQXrmA9NaP5wG3T8R1QxHmpFcKqB3D4zZL6A2BcDe',
      bodySha256: '2c6c7d6f0a4b9e51c3d7b112ee2245ad95b7c05a13cc56bd9fc4a64f7a9d8e3c',
    },
    body: buildBody({
      slug: 'celestial',
      productName: 'CelestiAL Extrusion Billet · EN AW-6063',
      upiCanonical: 'sample/celestial',
      gtin: '08144060638123',
      itemSerial: 'CEL-DEMO-001',
      lotNumber: 'CL-2025-08',
      alloyEn: 'EN AW-6063',
      alloyAa: 'AA 6063',
      designationNumber: '6063',
      temper: 'T6',
      productionRoute: 'primary_solar',
      brand: 'CelestiAL',
      brandTagline: 'World’s first aluminium born of desert sun. 100% solar-powered primary metal · verified end-to-end.',
      form: 'extrusion_billet',
      formLabel: 'Extrusion billet',
      weightKg: 1380,
      dimensions: { diameterMm: 228, lengthMm: 7000 },
      cfp: 4273,
      cfpDecomposition: {
        bauxiteMining: 59,
        bauxiteTransport: 128,
        aluminaProduction: 1542,
        aluminaTransport: 40,
        anodeProduction: 696,
        electricity: 290,
        electrolysis: 1531,
        casting: 485,
      },
      cfpVerifier: 'DNV AS – Abu Dhabi Branch',
      cfpVerifierDid: 'did:web:dnv.com:cfp',
      cfpStatementRef: 'DNV-2024-ASR-C730945-CelestiAL',
      recycledTotal: 0,
      recycledPostConsumer: 0,
      recycledPreConsumer: 0,
      recycledRunaround: 0,
      story: {
        headline: 'The world’s first aluminium born of desert sun.',
        subhead: '560,000 megawatt-hours of solar power per year via DEWA’s Mohammed bin Rashid Al Maktoum Solar Park.',
        energyMixSolarPercent: 100,
        ppaReference: 'DEWA MBR Solar Park PPA',
      },
      chemistry: {
        siPct: 0.45,
        fePct: 0.2,
        cuPct: 0.05,
        mnPct: 0.05,
        mgPct: 0.55,
        crPct: 0.02,
        znPct: 0.05,
        tiPct: 0.02,
        otherEachMaxPct: 0.05,
        otherTotalMaxPct: 0.15,
        alPct: 98.51,
      },
      applicableStandards: ['EN 573-3', 'EN 1559-3', 'AA 6063'],
      customerUseCases: ['Architectural extrusions', 'Curtain walls', 'Automotive structural', 'Electric vehicle battery enclosures'],
      materialOriginNote: 'Bauxite from EGA-owned GAC mine, Sangaredi, Guinea (IRMA Stage 3 audit).',
    }),
  },

  'celestial-r': {
    slug: 'celestial-r',
    upiCanonical: 'sample/celestial-r',
    qrPayload: 'https://id.ega.example/01/08144060638147/10/CLR-2025-08/21/CLR-DEMO-001',
    signature: {
      algorithm: 'Ed25519Signature2020',
      value: 'z63LpQz9dKx7r4xDfEs1Ry9JpC5BvEr6n8ZmAwLsHyPq2eRb4tCelRmxA8Hz9k2v1XwFqL3M5N6P7Q8R9S0T',
      bodySha256: 'e9d1c9b3f5a47e02b1d3c0f97c45b2a3a18e6df0c2b1ea3c5f74a9c01b85d6e4',
    },
    body: buildBody({
      slug: 'celestial-r',
      productName: 'CelestiAL-R Sheet Ingot · EN AW-5754',
      upiCanonical: 'sample/celestial-r',
      gtin: '08144060638147',
      itemSerial: 'CLR-DEMO-001',
      lotNumber: 'CLR-2025-08',
      alloyEn: 'EN AW-5754',
      alloyAa: 'AA 5754',
      designationNumber: '5754',
      temper: 'F',
      productionRoute: 'recycled_blend',
      brand: 'CelestiAL-R',
      brandTagline: 'Recycled aluminium that doesn’t compromise the metal. Post-consumer scrap blended with solar-powered prime, mass-balance verified.',
      form: 'sheet_ingot',
      formLabel: 'Sheet ingot',
      weightKg: 22500,
      dimensions: { lengthMm: 7600, widthMm: 1900, thicknessMm: 600 },
      cfp: 3280,
      cfpDecomposition: {
        bauxiteMining: 44,
        bauxiteTransport: 95,
        aluminaProduction: 1140,
        aluminaTransport: 30,
        anodeProduction: 515,
        electricity: 215,
        electrolysis: 1132,
        casting: 359,
      },
      cfpVerifier: 'DNV AS – Abu Dhabi Branch',
      cfpVerifierDid: 'did:web:dnv.com:cfp',
      cfpStatementRef: 'DNV-2024-ASR-C730946-CelestiAL-R',
      recycledTotal: 26,
      recycledPostConsumer: 16,
      recycledPreConsumer: 0,
      recycledRunaround: 10,
      story: {
        headline: 'Recycled aluminium that doesn’t compromise the metal.',
        subhead: 'Post-consumer scrap, mass-balance verified, blended with solar-powered prime metal.',
        energyMixSolarPercent: 74,
        ppaReference: 'DEWA MBR Solar Park PPA (prime portion)',
      },
      chemistry: {
        siPct: 0.4,
        fePct: 0.4,
        cuPct: 0.1,
        mnPct: 0.5,
        mgPct: 3.0,
        crPct: 0.3,
        znPct: 0.2,
        tiPct: 0.15,
        otherEachMaxPct: 0.05,
        otherTotalMaxPct: 0.15,
        alPct: 94.95,
      },
      applicableStandards: ['EN 573-3', 'EN 1559-3', 'AA 5754'],
      customerUseCases: ['Automotive body sheet', 'Marine plate', 'Beverage can stock body', 'Pressure-vessel cladding'],
      materialOriginNote: 'Recycled portion (16% post-consumer) routed via UBC bales from EU/MENA returns. Prime portion from GAC Sangaredi.',
    }),
  },

  standard: {
    slug: 'standard',
    upiCanonical: 'sample/standard',
    qrPayload: 'https://id.ega.example/01/08144060638161/10/STD-2025-08/21/STD-DEMO-001',
    signature: {
      algorithm: 'Ed25519Signature2020',
      value: 'z71MnRsT4uVwXyZ8aBcDeFgH9iJkLmNoPqRsT2uVwXy0aBcDeFgH9iJkLmNoPqRsT4uVwXyZ8aBcDeFgHi',
      bodySha256: '3bd72f9c01a1234e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
    },
    body: buildBody({
      slug: 'standard',
      productName: 'Standard P1020 Sow Ingot',
      upiCanonical: 'sample/standard',
      gtin: '08144060638161',
      itemSerial: 'STD-DEMO-001',
      lotNumber: 'STD-2025-08',
      alloyEn: 'EN AC-46000',
      alloyAa: 'AA 1020',
      designationNumber: '1020',
      temper: 'F',
      productionRoute: 'primary_grid',
      brand: 'Standard',
      brandTagline: 'EGA Standard Aluminium · production-grade primary metal trusted by foundries and remelters worldwide.',
      form: 'sow',
      formLabel: 'Sow ingot',
      weightKg: 680,
      dimensions: { lengthMm: 760, widthMm: 220, thicknessMm: 130 },
      cfp: 10545,
      cfpDecomposition: {
        bauxiteMining: 132,
        bauxiteTransport: 285,
        aluminaProduction: 3438,
        aluminaTransport: 89,
        anodeProduction: 1551,
        electricity: 647,
        electrolysis: 3414,
        casting: 989,
      },
      cfpVerifier: 'DNV AS – Abu Dhabi Branch',
      cfpVerifierDid: 'did:web:dnv.com:cfp',
      cfpStatementRef: 'DNV-2024-ASR-C730947-Standard',
      recycledTotal: 0,
      recycledPostConsumer: 0,
      recycledPreConsumer: 0,
      recycledRunaround: 0,
      story: {
        headline: 'EGA Standard Aluminium · production-grade primary metal.',
        subhead: 'Trusted by foundries and remelters worldwide.',
        energyMixSolarPercent: 0,
        ppaReference: null,
      },
      chemistry: {
        siPct: 0.1,
        fePct: 0.2,
        cuPct: 0.005,
        mnPct: 0.005,
        mgPct: 0.005,
        crPct: 0.005,
        znPct: 0.03,
        tiPct: 0.02,
        otherEachMaxPct: 0.03,
        otherTotalMaxPct: 0.1,
        alPct: 99.7,
      },
      applicableStandards: ['EN 573-3', 'EN 1559-3', 'AA 1020'],
      customerUseCases: ['Foundry remelt feedstock', 'Cast wheel production', 'Automotive engine blocks', 'General sand-cast components'],
      materialOriginNote: 'Bauxite from EGA-owned GAC mine, Sangaredi, Guinea. Combined-cycle gas grid mix.',
    }),
  },
}

/** Match an arbitrary UPI to one of the demo passports.
 *
 * Recognises:
 *   sample/<slug>             → preset slug routes (legacy demo path)
 *   demo/<slug>               → branded demo path
 *   01/{gtin}/...             → GS1 Digital Link, by GTIN
 *   any UPI containing the brand string ("celestial-r", "celestial", "standard") */
export function matchDemoPassport(upi: string): DemoPassport | null {
  const lc = upi.toLowerCase()
  if (lc.includes('celestial-r') || lc.includes('celestialr') || lc.includes('clr')) return PASSPORTS['celestial-r']!
  if (lc.includes('celestial') || lc.includes('cel-')) return PASSPORTS.celestial!
  if (lc.includes('standard') || lc.includes('std-') || lc.includes('p1020')) return PASSPORTS.standard!
  // GTIN-based detection (GS1 Digital Link routes)
  if (lc.includes('08144060638123')) return PASSPORTS.celestial!
  if (lc.includes('08144060638147')) return PASSPORTS['celestial-r']!
  if (lc.includes('08144060638161')) return PASSPORTS.standard!
  return null
}

export function listDemoPassports(): DemoPassport[] {
  return Object.values(PASSPORTS)
}

export function getDemoPassport(slug: DemoSlug): DemoPassport {
  return PASSPORTS[slug]
}

export const DEMO_ISSUED_AT = ISSUED_AT
export const DEMO_EXPIRES_AT = EXPIRES_AT
