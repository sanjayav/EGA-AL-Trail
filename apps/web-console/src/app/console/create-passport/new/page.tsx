import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { fetchProductDetail, fetchProductManifest, listProductPortfolio } from '@/lib/product-api'
import type {
  ProductDetail,
  ProductManifest,
  ProductPortfolio,
  ProductSummary,
} from '@/lib/product-api'

import { NewPassportWizard } from './NewPassportWizard'
import type { ProductBundle } from './NewPassportWizard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isFeatured(p: ProductSummary): boolean {
  const featured = (p.details as Record<string, unknown>)?.featured
  return featured === true
}

function lockedVersions(p: ProductSummary): string[] {
  return p.dppConfigs.filter((c) => c.state === 'locked').map((c) => c.version)
}

export default async function NewPassportEntryPage() {
  const portfolio = await listProductPortfolio()
  const products = (portfolio?.products ?? []).filter(isFeatured)

  const bundles: ProductBundle[] = await Promise.all(
    products.map(async (p) => {
      const versions = lockedVersions(p)
      const primaryVersion = versions[0] ?? '1.0'
      const [detail, manifest, fullManifest] = await Promise.all([
        fetchProductDetail(p.id),
        versions.length > 0 ? fetchProductManifest(p.id, primaryVersion) : null,
        // v4 manifest includes everything (versionsInScope = ['1.0','1.5','2','3','4']),
        // letting us compute per-version attribute deltas client-side.
        fetchProductManifest(p.id, '4'),
      ])
      return {
        product: p,
        detail: detail as ProductDetail | null,
        manifest: manifest as ProductManifest | null,
        fullManifest: fullManifest as ProductManifest | null,
        availableVersions: versions,
      }
    }),
  )

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      <div className="mx-auto w-full max-w-[1180px] px-7 py-6">
        <Link
          href="/console/create-passport"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)] transition hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to passports
        </Link>
      </div>

      {bundles.length === 0 ? (
        <EmptyState portfolio={portfolio} />
      ) : (
        <NewPassportWizard bundles={bundles} canonicalChain={portfolio?.canonicalChain ?? []} />
      )}
    </div>
  )
}

function EmptyState({ portfolio }: { portfolio: ProductPortfolio | null }) {
  return (
    <div className="mx-auto w-full max-w-[760px] px-7 pb-16">
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--surface-border)] bg-white p-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-accent)]">
          No featured products
        </p>
        <h1 className="mt-2 text-[22px] font-semibold text-[var(--fg-default)]">
          The portfolio has no featured products with locked DPP configurations.
        </h1>
        <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
          {portfolio?.products?.length ?? 0} product
          {(portfolio?.products?.length ?? 0) === 1 ? '' : 's'} found, but none flagged{' '}
          <code>details.featured = true</code>. Visit{' '}
          <Link
            href="/console/onboarding"
            className="font-medium text-[var(--color-accent)] underline"
          >
            Onboarding
          </Link>{' '}
          to lock a (product, version) pair.
        </p>
      </div>
    </div>
  )
}
