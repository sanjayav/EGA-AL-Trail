/**
 * Server-side fetcher for DPP records · used by the public viewer.
 *
 * For sample/* routes, returns a synthesized DPP from the @dpp/schema preset.
 * For real UPIs, hits the FastAPI resolver. Always returns the public-tier
 * filtered view; never the authority/legitimate-interest tiers.
 */

import { presets, type SimulatorPreset } from '@dpp/schema'

import {
  DEMO_EXPIRES_AT,
  DEMO_ISSUED_AT,
  matchDemoPassport,
  type DemoAudience,
  type DemoPassport,
} from '@dpp/ui'
import { filterBodyByAudience } from './audience'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const RESOLVER_BASE = process.env.NEXT_PUBLIC_RESOLVER_BASE_URL ?? 'http://localhost:3000'

export type ViewerDpp = {
  upi: string
  state: string
  tier: 'public' | 'legitimate' | 'authority'
  audience: DemoAudience
  isDemo: boolean
  issuedAt: string | null
  expiresAt: string | null
  signatureRef: { algorithm: string; value: string; bodySha256: string } | null
  dpp: Record<string, unknown>
}

const SAMPLE_PRESET_BY_SLUG: Record<string, keyof typeof presets> = {
  celestial: 'celestial',
  'celestial-r': 'celestial-r',
  standard: 'standard',
}

export async function fetchDpp(
  upi: string,
  audience: DemoAudience = 'public',
): Promise<ViewerDpp | null> {
  // 1. Demo passport bank · UPI-pattern matched. Always served filtered by
  // audience so any cast number tied to one of the three EGA products renders
  // the same rich, regulator-aligned passport.
  const demo = matchDemoPassport(upi)
  if (demo) return materialiseDemo(demo, upi, audience)

  // 2. Legacy sample preset routes (kept for backwards compatibility).
  if (upi.startsWith('sample/')) {
    const slug = upi.slice('sample/'.length)
    const presetId = SAMPLE_PRESET_BY_SLUG[slug]
    if (!presetId) return null
    const preset = presets[presetId] as SimulatorPreset
    return synthesizeFromPreset(preset, audience)
  }

  // 3. Live UPIs · fetch from the API. If the API is down or returns 404,
  // fall back to the CelestiAL demo so a cold install still renders something
  // pretty for the operator demo.
  try {
    const res = await fetch(`${API_BASE}/api/v1/dpps/${encodeURIComponent(upi)}?tier=public`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      const fallback = matchDemoPassport('celestial')
      return fallback ? materialiseDemo(fallback, upi, audience) : null
    }
    const live = (await res.json()) as Omit<ViewerDpp, 'audience' | 'isDemo'>
    return {
      ...live,
      audience,
      isDemo: false,
      dpp: filterBodyByAudience(live.dpp, audience),
    }
  } catch {
    const fallback = matchDemoPassport('celestial')
    return fallback ? materialiseDemo(fallback, upi, audience) : null
  }
}

function materialiseDemo(demo: DemoPassport, upi: string, audience: DemoAudience): ViewerDpp {
  return {
    upi: upi || demo.upiCanonical,
    state: 'published',
    tier: 'public',
    audience,
    isDemo: true,
    issuedAt: DEMO_ISSUED_AT,
    expiresAt: DEMO_EXPIRES_AT,
    signatureRef: demo.signature,
    dpp: filterBodyByAudience(demo.body, audience),
  }
}

function synthesizeFromPreset(preset: SimulatorPreset, audience: DemoAudience): ViewerDpp {
  const now = new Date()
  const expires = new Date(now)
  expires.setFullYear(expires.getFullYear() + 10)
  const upi = `sample/${preset.id}`

  const body: Record<string, unknown> = {
      schemaVersion: '1.0.0',
      dppVersion: '1.0',
      upi: {
        castNumber: `C-SAMPLE-${preset.id}`,
        gtin: '08174060638123',
        digitalLinkUrl: `${RESOLVER_BASE}/01/08174060638123/10/SAMPLE/21/0001`,
      },
      identification: {
        alloyEn: preset.alloyEn,
        alloyAa: preset.alloyAa,
        designationNumber: preset.alloyEn,
        temper: preset.temper,
        productionRoute: preset.brand === 'CelestiAL' ? 'primary_solar' : 'primary_grid',
        brand: preset.brand,
        form: preset.form,
        applicableStandards: ['EN 573-3', 'EN 1559-3'],
      },
      producer: {
        uoi: '0814406063810',
        name: 'Emirates Global Aluminium PJSC',
        trademark: 'EGA',
        registeredAddress: 'P.O. Box 111023, Abu Dhabi, UAE',
      },
      origin: {
        country: 'AE',
        meltAndPourCountry: 'AE',
        manufacturingDate: now.toISOString().slice(0, 10),
        facilities: [
          { ufi: preset.casthouseUfi, name: 'Al Taweelah Casthouse', role: 'casthouse', country: 'AE' },
          { ufi: preset.smelterUfi, name: 'Al Taweelah Smelter', role: 'smelter', country: 'AE' },
        ],
      },
      product: { name: preset.label, purposeStatement: preset.summary },
      physical: {
        netWeightKg: preset.weightKg,
        ...preset.dimensions,
      },
      carbon: {
        valueKgCo2ePerTonne: preset.carbon.valueKgCo2ePerTonne,
        declaredUnit: '1000 kg of aluminium ingot (factory gate)',
        systemBoundary: 'cradle_to_gate',
        methodology: 'ISO 14067:2018 + IAI v2.0 + PCR 2022:08 v1.0',
        reportingPeriod: preset.carbon.reportingPeriod,
        verifier: { did: preset.carbon.verifierDid, name: preset.carbon.verifierName },
        verificationStatementRef: preset.carbon.verificationStatementRef,
        assuranceLevel: preset.carbon.assuranceLevel,
        industryAverageKgCo2ePerTonne: preset.carbon.industryAverageKgCo2ePerTonne,
        decomposition: preset.carbon.decomposition,
      },
      recycledContent: {
        totalPercent: preset.recycledContent.totalPercent,
        chainOfCustodyModel: preset.recycledContent.chainOfCustodyModel,
        verifier: {
          did: preset.recycledContent.verifierDid,
          name: preset.recycledContent.verifierName,
        },
        asiCertificateRef: preset.recycledContent.asiCertificateRef,
      },
      compliance: {
        regulations: [
          { name: 'REACH', reference: 'EC 1907/2006', status: 'compliant' },
          { name: 'RoHS 2', reference: '2011/65/EU', status: 'compliant' },
          { name: 'PFAS', reference: 'REACH PFAS', status: 'compliant' },
        ],
        certifications: [
          { name: 'ASI Performance', reference: preset.compliance.asiPerformance, status: 'compliant' },
          { name: 'ASI CoC', reference: preset.compliance.asiCoc, status: 'compliant' },
          { name: 'ISO 9001', reference: preset.compliance.iso9001, status: 'compliant' },
          { name: 'ISO 14001', reference: preset.compliance.iso14001, status: 'compliant' },
          { name: 'ISO 45001', reference: preset.compliance.iso45001, status: 'compliant' },
        ],
      },
      story: preset.story,
      meta: {
        createdAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        expiresAt: expires.toISOString(),
        lifecycleState: 'published',
        languages: ['en'],
        issuerDid: 'did:web:dpp.ega.local',
        accessRights: { model: 'three_tier_vc_gated' },
      },
  }

  return {
    upi,
    state: 'published',
    tier: 'public',
    audience,
    isDemo: true,
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    signatureRef: {
      algorithm: 'Ed25519Signature2020',
      value: 'z' + 'sample'.repeat(8),
      bodySha256: 'sample'.repeat(10).slice(0, 64),
    },
    dpp: filterBodyByAudience(body, audience),
  }
}
