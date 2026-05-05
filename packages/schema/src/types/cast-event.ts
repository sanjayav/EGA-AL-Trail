/**
 * Hand-authored mirror of cast-event/v1.0.0.json.
 *
 * Every ingestion source produces this exact payload — simulator, public-data,
 * manual entry, MES (v2). The DPP generator consumes only this canonical shape.
 */

import type { AlloyBrand, Gln, Iso8601DateTime, ProductForm } from './dpp'

export type CastEventSourceKind =
  | 'simulator'
  | 'public_data'
  | 'manual_entry'
  | 'csv_import'
  | 'mes_rest'
  | 'mes_kafka'
  | 'mes_opcua'

export interface CastEventSource {
  kind: CastEventSourceKind
  actor?: string
  presetId?: string
  publicSourceUrl?: string
}

export interface CastPayload {
  castNumber: string
  alloyEn: string
  alloyAa?: string
  brand: AlloyBrand
  form: ProductForm
  temper?: string
  weightKg: number
  diameterMm?: number
  lengthMm?: number
  widthMm?: number
  thicknessMm?: number
  casthouseUfi: Gln
  smelterUfi?: Gln
  purityGrade?: string
  customerReference?: string
}

export interface CastEvent {
  schemaVersion: '1.0.0'
  trackingId: string
  source: CastEventSource
  occurredAt: Iso8601DateTime
  tenantId: number
  cast: CastPayload
  overrides?: Record<string, unknown>
}
