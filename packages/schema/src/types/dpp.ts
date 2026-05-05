/**
 * Hand-authored TypeScript mirror of dpp/v1.0.0.json.
 *
 * These types are the load-bearing surface used by every consumer (web-public,
 * web-console, sim, ts-types). The JSON Schema is authoritative — these types
 * must mirror it exactly. CI runs ajv validation against schema + a fixture set
 * to keep them honest.
 */

import type { DppVersion } from '../versions'

export type Iso8601DateTime = string
export type Iso8601Date = string
export type Iso639Lang = string
export type Iso3166Country = string
export type Did = string
export type Gtin = string
export type Gln = string
export type GsDigitalLink = string
export type Url = string
export type Percent = number
export type MassKg = number
export type LengthMm = number

export type AccessTier = 'public' | 'legitimate' | 'authority'
export type Granularity = 'operator' | 'facility' | 'model' | 'batch' | 'item'
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'n_a' | 'pending'
export type LifecycleState = 'draft' | 'published' | 'revised' | 'withdrawn' | 'expired'
export type AssuranceLevel = 'limited' | 'reasonable'
export type SystemBoundary = 'cradle_to_gate' | 'cradle_to_grave' | 'gate_to_gate'
export type ChainOfCustodyModel =
  | 'mass_balance'
  | 'controlled_blending'
  | 'physical_segregation'
  | 'book_and_claim'
export type FacilityRole = 'mine' | 'refinery' | 'smelter' | 'casthouse' | 'rolling_mill'

export type AlloyBrand = 'CelestiAL' | 'CelestiAL-R' | 'Standard' | 'High-Purity' | 'Foundry Alloy'
export type ProductForm =
  | 'extrusion_billet'
  | 'sheet_ingot'
  | 'foundry_ingot'
  | 't_bar'
  | 'sow'
  | 'standard_ingot'
  | 'properzi'
  | 'hdc_small'
  | 'b_ingot'

export type ProductionRoute = 'primary_solar' | 'primary_grid' | 'secondary' | 'mixed'

export interface VerifierReference {
  did: Did
  name: string
  credentialId?: string
  validFrom?: Iso8601Date
  validUntil?: Iso8601Date
}

export interface UPI {
  castNumber: string
  gtin: Gtin
  lotNumber?: string
  itemSerial?: string
  digitalLinkUrl: GsDigitalLink
  taricCode?: string
  hsCode?: string
  esprProductCategory?: string
}

export interface Identification {
  alloyEn: string
  alloyAa: string
  designationNumber: string
  temper?: string
  productionRoute: ProductionRoute
  brand: AlloyBrand
  form: ProductForm
  applicableStandards: string[]
}

export interface Producer {
  uoi: Gln
  name: string
  trademark: string
  registeredAddress: string
  regulatoryContact?: { team?: string; email?: string; phone?: string }
  authorisedRepresentative?: { name?: string; address?: string }
}

export interface Facility {
  ufi: Gln
  name: string
  role: FacilityRole
  country?: Iso3166Country
}

export interface Origin {
  country: Iso3166Country
  meltAndPourCountry: Iso3166Country
  manufacturingDate: Iso8601Date
  facilities: Facility[]
}

export interface Product {
  name: string
  purposeStatement: string
  intendedMarket?: string[]
}

export interface Physical {
  netWeightKg: MassKg
  diameterMm?: LengthMm
  lengthMm?: LengthMm
  widthMm?: LengthMm
  thicknessMm?: LengthMm
  tolerances?: { diameter?: string; lengthBow?: string; squareness?: string }
}

export interface Chemistry {
  purityGrade: string
}

export interface ReportingPeriod {
  from: Iso8601Date
  to: Iso8601Date
}

export interface Carbon {
  valueKgCo2ePerTonne: number
  declaredUnit?: string
  systemBoundary: SystemBoundary
  methodology: string
  reportingPeriod: ReportingPeriod
  verifier: VerifierReference
  verificationStatementRef?: string
  assuranceLevel: AssuranceLevel
  industryAverageKgCo2ePerTonne?: number
}

export interface RecycledContent {
  totalPercent: Percent
  chainOfCustodyModel: ChainOfCustodyModel
  verifier: VerifierReference
  asiCertificateRef?: string
}

export interface ComplianceEntry {
  name: string
  reference?: string
  status: ComplianceStatus
  issuer?: string
  certificateRef?: string
  validFrom?: Iso8601Date
  validUntil?: Iso8601Date
}

export interface Compliance {
  regulations: ComplianceEntry[]
  certifications: ComplianceEntry[]
  complianceDocumentationUrl?: Url
}

export interface Circularity {
  recyclabilityIndicator: string
  materialRecoveryPotential: string
  endOfLifeUrl?: Url
  reuseInformation: string
  recyclingInformation: string
  disposalInformation: string
  treatmentFacilityInfo?: string
  disassemblyInformation?: string
}

export interface EsprAspects {
  durability: string
  reliability: string
  reusability: string
  upgradability?: string
  repairability?: string
  maintenance?: string
  energyEfficiency: string
  resourceEfficiency: string
}

export interface Sustainability {
  sustainablePurchasing: string
  handling: string
  esgProgramUrl?: Url
}

export interface SocEntry {
  iupacName: string
  otherNames?: string[]
  ecNumber?: string
  casNumber?: string
  locationInProduct?: 'homogeneous' | 'coating' | 'core' | 'interface'
  concentrationDescriptor?: string
  value?: number
  unit?: string
  safeUseInstructions?: string
  endOfLifeInstructions?: string
  scipNotificationId?: string
}

export interface SubstancesOfConcern {
  summaryStatement: 'no_svhc_above_threshold' | 'svhc_above_threshold' | 'not_applicable'
  entries?: SocEntry[]
}

export interface UseAndLife {
  installationInformation?: string
  useInstructions?: string
  maintenanceInformation?: string
  repairInformation?: string
  warnings?: string
  safetyInformation?: string
}

export interface DocumentRef {
  title: string
  url: Url
  type?: 'mtc' | 'lca_report' | 'verification_statement' | 'certificate' | 'user_manual' | 'sds' | 'other'
  sha256?: string
}

export interface Documentation {
  documents?: DocumentRef[]
}

export interface AccessRights {
  model: 'three_tier_vc_gated'
  publicFields?: string[]
}

export interface Meta {
  createdAt: Iso8601DateTime
  lastUpdated: Iso8601DateTime
  expiresAt: Iso8601DateTime
  lifecycleState: LifecycleState
  languages: Iso639Lang[]
  issuerDid: Did
  accessRights: AccessRights
  tenantId?: number
  revisionOf?: string
  revisionReason?: string
}

/** Canonical DPP record — schema 1.0.0, manifest version 1.0. */
export interface Dpp {
  schemaVersion: '1.0.0'
  dppVersion: DppVersion
  upi: UPI
  identification: Identification
  producer: Producer
  origin: Origin
  product: Product
  physical: Physical
  chemistry: Chemistry
  carbon: Carbon
  recycledContent: RecycledContent
  compliance: Compliance
  circularity: Circularity
  espr: EsprAspects
  sustainability: Sustainability
  soc: SubstancesOfConcern
  useAndLife: UseAndLife
  documentation: Documentation
  meta: Meta
}
