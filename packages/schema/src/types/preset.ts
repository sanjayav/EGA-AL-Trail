/**
 * Simulator preset shape — used by the @dpp/sim package and the operator
 * console's Sources tab. Presets seed cast events with EGA-verified values.
 */

import type { AlloyBrand, ChainOfCustodyModel, Did, Gln, ProductForm } from './dpp'

export interface PresetCarbonDecomposition {
  bauxiteMining: number
  bauxiteTransport: number
  aluminaProduction: number
  aluminaTransport: number
  anodeProduction: number
  electricity: number
  electrolysis: number
  casting: number
}

export interface PresetCarbon {
  valueKgCo2ePerTonne: number
  industryAverageKgCo2ePerTonne: number
  verifierName: string
  verifierDid: Did
  verificationStatementRef: string
  assuranceLevel: 'limited' | 'reasonable'
  reportingPeriod: { from: string; to: string }
  decomposition: PresetCarbonDecomposition
}

export interface PresetRecycledContent {
  totalPercent: number
  preConsumerPercent?: number
  postConsumerPercent?: number
  internalRunaroundPercent?: number
  chainOfCustodyModel: ChainOfCustodyModel
  verifierName: string
  verifierDid: Did
  asiCertificateRef: string
}

export interface PresetStory {
  headline: string
  subhead: string
  energyMixSolarPercent: number
  ppaReference: string | null
}

export interface PresetCompliance {
  asiPerformance: string
  asiCoc: string
  iso9001: string
  iso14001: string
  iso45001: string
}

export interface PresetDimensions {
  diameterMm?: number
  lengthMm?: number
  widthMm?: number
  thicknessMm?: number
}

export interface SimulatorPreset {
  id: string
  label: string
  summary: string
  brand: AlloyBrand
  form: ProductForm
  alloyEn: string
  alloyAa: string
  purityGrade: string
  temper: string
  dimensions: PresetDimensions
  weightKg: number
  casthouseUfi: Gln
  smelterUfi: Gln
  carbon: PresetCarbon
  recycledContent: PresetRecycledContent
  story: PresetStory
  compliance: PresetCompliance
}
