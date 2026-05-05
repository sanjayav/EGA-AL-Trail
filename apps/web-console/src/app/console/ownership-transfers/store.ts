/**
 * In-memory store for ownership transfers · backs the Ownership Transfers
 * page until the FastAPI `passport_transfers` router lands.
 *
 * A transfer is one per-batch chain-of-custody event. Each carries:
 *  - The passport UPI (always cast-level · see CLAUDE.md "append-only first")
 *  - Issuer DID (the seller / current custodian)
 *  - Recipient DID (the buyer / next custodian)
 *  - Kind: ownership | custody | end_of_life
 *  - State machine: draft → pending_countersign → settled (or rejected /
 *    disputed). Settled transfers receive a Verifiable Credential ref.
 */

export type TransferKind = 'ownership' | 'custody' | 'end_of_life'

export type TransferState =
  | 'draft'
  | 'pending_countersign'
  | 'settled'
  | 'rejected'
  | 'disputed'

export interface Transfer {
  id: string
  passportUpi: string
  /** Friendly product label cached at issue time so the list renders without
   *  hitting the DPP record table. */
  productLabel: string
  fromOrg: string
  fromDid: string
  toOrg: string
  toDid: string
  kind: TransferKind
  state: TransferState
  initiatedAt: string
  countersignedAt: string | null
  settledAt: string | null
  credentialId: string | null
  bodySha256: string | null
  /** Optional commercial reference (PO, BoL, recycling manifest, etc). */
  reference: string | null
  /** Operator note for audit trail. */
  note: string | null
  initiatedBy: string
  countersignedBy: string | null
}

const SEED: Transfer[] = [
  {
    id: 't-2026-001',
    passportUpi: '08144060638123/C-20260415-77264/CEL-001',
    productLabel: 'CelestiAL Extrusion Billet · EN AW-6063',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'BMW AG · Dingolfing Plant',
    toDid: 'did:web:bmw.de:procurement',
    kind: 'ownership',
    state: 'pending_countersign',
    initiatedAt: '2026-04-30T09:15:00Z',
    countersignedAt: null,
    settledAt: null,
    credentialId: null,
    bodySha256: null,
    reference: 'PO-BMW-2026-0418',
    note: 'Q2 contract delivery #4 · 24t to Dingolfing.',
    initiatedBy: 'sustainability.lead@ega.ae',
    countersignedBy: null,
  },
  {
    id: 't-2026-002',
    passportUpi: '08144060638147/C-20260420-31402/CLR-007',
    productLabel: 'CelestiAL-R Sheet Ingot · EN AW-5754',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Audi AG · Ingolstadt',
    toDid: 'did:web:audi.de:procurement',
    kind: 'ownership',
    state: 'settled',
    initiatedAt: '2026-04-22T11:00:00Z',
    countersignedAt: '2026-04-23T08:14:00Z',
    settledAt: '2026-04-23T08:14:00Z',
    credentialId: 'VC-OWN-2026-002',
    bodySha256: '7a91…e44d',
    reference: 'PO-AUDI-2026-0099',
    note: '20t recycled-blend ingots, ASI CoC #428.',
    initiatedBy: 'sustainability.lead@ega.ae',
    countersignedBy: 'procurement@audi.de',
  },
  {
    id: 't-2026-003',
    passportUpi: '08144060638161/C-20260418-92013/STD-024',
    productLabel: 'Standard P1020 Sow · 680 kg',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Norsk Hydro Recycling',
    toDid: 'did:web:hydro.com:recycling',
    kind: 'end_of_life',
    state: 'settled',
    initiatedAt: '2026-04-18T14:22:00Z',
    countersignedAt: '2026-04-18T15:30:00Z',
    settledAt: '2026-04-18T15:30:00Z',
    credentialId: 'VC-EOL-2026-003',
    bodySha256: '8f3a…c41e',
    reference: 'EOL-MANIFEST-2026-0418',
    note: 'Closed-loop remelt declaration, ASI accredited handler.',
    initiatedBy: 'compliance.lead@ega.ae',
    countersignedBy: 'eol@hydro.com',
  },
  {
    id: 't-2026-004',
    passportUpi: '08144060638123/C-20260425-48721/CEL-018',
    productLabel: 'CelestiAL Extrusion Billet · EN AW-6063',
    fromOrg: 'EGA Casthouse Logistics',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Jebel Ali Port Terminal',
    toDid: 'did:web:dpworld.com:jebel-ali',
    kind: 'custody',
    state: 'pending_countersign',
    initiatedAt: '2026-05-04T07:30:00Z',
    countersignedAt: null,
    settledAt: null,
    credentialId: null,
    bodySha256: null,
    reference: 'BOL-2026-DUB-77419',
    note: 'Bill of lading 77419 · 12 bundles to Hamburg.',
    initiatedBy: 'logistics@ega.ae',
    countersignedBy: null,
  },
  {
    id: 't-2026-005',
    passportUpi: '08144060638147/C-20260411-22390/CLR-002',
    productLabel: 'CelestiAL-R Sheet Ingot · EN AW-5754',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Constellium Singen',
    toDid: 'did:web:constellium.com:singen',
    kind: 'ownership',
    state: 'rejected',
    initiatedAt: '2026-04-11T10:30:00Z',
    countersignedAt: '2026-04-11T16:45:00Z',
    settledAt: null,
    credentialId: null,
    bodySha256: null,
    reference: 'PO-CON-2026-0411',
    note: 'Counterparty rejected · alloy spec mismatch (5754 vs 5182 expected).',
    initiatedBy: 'sustainability.lead@ega.ae',
    countersignedBy: 'qa@constellium.com',
  },
  {
    id: 't-2026-006',
    passportUpi: '08144060638123/C-20260408-55102/CEL-014',
    productLabel: 'CelestiAL Extrusion Billet · EN AW-6063',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Mercedes-Benz AG',
    toDid: 'did:web:mercedes-benz.com:procurement',
    kind: 'ownership',
    state: 'settled',
    initiatedAt: '2026-04-08T13:00:00Z',
    countersignedAt: '2026-04-09T10:22:00Z',
    settledAt: '2026-04-09T10:22:00Z',
    credentialId: 'VC-OWN-2026-006',
    bodySha256: 'aa11…02bd',
    reference: 'PO-MBZ-2026-0124',
    note: 'EQS battery enclosure feedstock.',
    initiatedBy: 'sustainability.lead@ega.ae',
    countersignedBy: 'procurement@mercedes-benz.com',
  },
  {
    id: 't-2026-007',
    passportUpi: '08144060638161/C-20260402-13045/STD-009',
    productLabel: 'Standard P1020 Sow · 680 kg',
    fromOrg: 'EGA Commercial Operations',
    fromDid: 'did:web:dpp.ega.local',
    toOrg: 'Trimet Aluminium SE',
    toDid: 'did:web:trimet.com:essen',
    kind: 'ownership',
    state: 'disputed',
    initiatedAt: '2026-04-02T08:45:00Z',
    countersignedAt: '2026-04-04T14:30:00Z',
    settledAt: null,
    credentialId: null,
    bodySha256: null,
    reference: 'PO-TRIMET-2026-0142',
    note: 'CFP discrepancy raised · under DNV review.',
    initiatedBy: 'sustainability.lead@ega.ae',
    countersignedBy: 'qa@trimet.com',
  },
]

const STORE: Transfer[] = [...SEED]

export function listTransfers(): Transfer[] {
  return [...STORE].sort((a, b) => b.initiatedAt.localeCompare(a.initiatedAt))
}

export function getTransfer(id: string): Transfer | null {
  return STORE.find((t) => t.id === id) ?? null
}

export function addTransfer(input: Omit<Transfer, 'id' | 'initiatedAt' | 'countersignedAt' | 'settledAt' | 'credentialId' | 'bodySha256' | 'countersignedBy'>): Transfer {
  const t: Transfer = {
    ...input,
    id: `t-${new Date().getFullYear()}-${String(STORE.length + 1).padStart(3, '0')}`,
    initiatedAt: new Date().toISOString(),
    countersignedAt: null,
    settledAt: null,
    credentialId: null,
    bodySha256: null,
    countersignedBy: null,
  }
  STORE.unshift(t)
  return t
}

export function settleTransfer(id: string, by: string): Transfer | null {
  const t = STORE.find((x) => x.id === id)
  if (!t) return null
  const now = new Date().toISOString()
  t.state = 'settled'
  t.countersignedAt = now
  t.settledAt = now
  t.countersignedBy = by
  // Synthesize a deterministic VC id + body hash for the demo.
  t.credentialId = `VC-${t.kind.replace('_', '').toUpperCase()}-${t.id.slice(2)}`
  t.bodySha256 = randomHashShort()
  return t
}

export function rejectTransfer(id: string, by: string): Transfer | null {
  const t = STORE.find((x) => x.id === id)
  if (!t) return null
  t.state = 'rejected'
  t.countersignedAt = new Date().toISOString()
  t.countersignedBy = by
  return t
}

export function cancelTransfer(id: string): Transfer | null {
  const t = STORE.find((x) => x.id === id)
  if (!t) return null
  if (t.state !== 'pending_countersign' && t.state !== 'draft') return t
  t.state = 'rejected'
  t.note = `${t.note ?? ''}\nCancelled by issuer.`.trim()
  return t
}

function randomHashShort(): string {
  const hex = '0123456789abcdef'
  let a = ''
  let b = ''
  for (let i = 0; i < 4; i++) a += hex[Math.floor(Math.random() * 16)]
  for (let i = 0; i < 4; i++) b += hex[Math.floor(Math.random() * 16)]
  return `${a}…${b}`
}
