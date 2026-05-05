'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleDashed,
  CircleDot,
  CircleHelp,
  Database,
  FileCheck,
  FlaskConical,
  Layers,
  Library,
  Loader2,
  Lock,
  Package,
  Plug,
  Sparkles,
  Truck,
  UserPlus,
  Workflow,
} from 'lucide-react'

import type {
  ManifestStep,
  ProcessStep,
  ProductChainStep,
  ProductDetail,
  ProductManifest,
  ProductSummary,
} from '@/lib/product-api'

import { createDraftAction } from '../actions'

export interface ProductBundle {
  product: ProductSummary
  detail: ProductDetail | null
  manifest: ProductManifest | null
  fullManifest?: ProductManifest | null
  availableVersions: string[]
}

interface Props {
  bundles: ProductBundle[]
  canonicalChain: ProcessStep[]
}

const ALL_DPP_VERSIONS: { id: string; label: string; tagline: string; status: 'available' | 'planned' }[] = [
  { id: '1.0', label: 'DPP 1.0', tagline: 'Trust-building manifest · 106 attributes', status: 'available' },
  { id: '1.5', label: 'DPP 1.5', tagline: 'Cell telemetry + supplier sourcing', status: 'planned' },
  { id: '2', label: 'DPP 2.0', tagline: 'CBAM Registry + Aluminium Delegated Act', status: 'planned' },
  { id: '3', label: 'DPP 3.0', tagline: 'Recycled-content mass-balance, end-of-life', status: 'planned' },
  { id: '4', label: 'DPP 4.0', tagline: 'Full PEF (16 categories) + biodiversity', status: 'planned' },
]

type StepId = 'product' | 'process' | 'version' | 'parameters' | 'cast'

const STEPS: { id: StepId; label: string; subtitle: string; icon: typeof Sparkles }[] = [
  { id: 'product', label: 'Product', subtitle: 'Pick the EGA product', icon: Sparkles },
  { id: 'process', label: 'Process', subtitle: 'Confirm the production chain', icon: Workflow },
  { id: 'version', label: 'DPP version', subtitle: 'Choose schema version', icon: Layers },
  { id: 'parameters', label: 'Parameters', subtitle: 'Review locked attribute roster', icon: FileCheck },
  { id: 'cast', label: 'Cast', subtitle: 'Identify this passport', icon: Package },
]

export function NewPassportWizard({ bundles, canonicalChain }: Props) {
  const router = useRouter()
  const [stepId, setStepId] = useState<StepId>('product')
  const [productId, setProductId] = useState<number | null>(null)
  const [version, setVersion] = useState<string>('1.0')
  const [castNumber, setCastNumber] = useState<string>('')
  const [itemSerial, setItemSerial] = useState<string>('')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const bundle = useMemo(
    () => bundles.find((b) => b.product.id === productId) ?? null,
    [bundles, productId],
  )

  const stepIndex = STEPS.findIndex((s) => s.id === stepId)

  const canAdvance = useMemo(() => {
    if (stepId === 'product') return productId !== null
    if (stepId === 'process') return bundle !== null
    if (stepId === 'version') return version !== ''
    if (stepId === 'parameters') return bundle?.manifest !== null
    if (stepId === 'cast') return castNumber.trim().length > 0
    return false
  }, [stepId, productId, bundle, version, castNumber])

  function go(direction: 'next' | 'prev') {
    const idx = stepIndex + (direction === 'next' ? 1 : -1)
    if (idx < 0 || idx >= STEPS.length) return
    setStepId(STEPS[idx]!.id)
  }

  function submit() {
    if (!productId || !castNumber.trim()) return
    setSubmitErr(null)
    startTransition(async () => {
      const res = await createDraftAction({
        productId,
        dppVersion: version,
        castNumber: castNumber.trim(),
        itemSerial: itemSerial.trim() || undefined,
      })
      if (!res.ok) {
        setSubmitErr(res.error)
        return
      }
      router.push(`/console/create-passport/${res.draftId}`)
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-7 pb-16">
      <Header stepIndex={stepIndex} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <Sidebar stepId={stepId} setStepId={setStepId} furthestReached={furthestStep(stepIndex, productId, bundle)} />

        <div className="min-w-0">
          <div className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {stepId === 'product' && (
              <ProductStep
                bundles={bundles}
                productId={productId}
                onPick={(id) => {
                  setProductId(id)
                  // Default to first locked version of that product if any
                  const b = bundles.find((x) => x.product.id === id)
                  if (b && b.availableVersions.length > 0) setVersion(b.availableVersions[0]!)
                }}
              />
            )}
            {stepId === 'process' && bundle && (
              <ProcessStepView bundle={bundle} canonicalChain={canonicalChain} />
            )}
            {stepId === 'version' && bundle && (
              <VersionStep bundle={bundle} version={version} setVersion={setVersion} />
            )}
            {stepId === 'parameters' && bundle && (
              <ParametersStep bundle={bundle} version={version} />
            )}
            {stepId === 'cast' && bundle && (
              <CastStep
                bundle={bundle}
                version={version}
                castNumber={castNumber}
                setCastNumber={setCastNumber}
                itemSerial={itemSerial}
                setItemSerial={setItemSerial}
              />
            )}
          </div>

          {submitErr && (
            <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span>{submitErr}</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => go('prev')}
              disabled={stepIndex === 0 || pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-white px-4 text-[13px] font-medium text-[var(--fg-default)] transition hover:bg-[var(--color-fog)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => go('next')}
                disabled={!canAdvance || pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canAdvance || pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Create draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header({ stepIndex }: { stepIndex: number }) {
  const pct = ((stepIndex + 1) / STEPS.length) * 100
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-accent)]">
        New passport · step {stepIndex + 1} of {STEPS.length}
      </p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
        {STEPS[stepIndex]?.label}{' '}
        <span className="text-[var(--fg-muted)]">— {STEPS[stepIndex]?.subtitle}</span>
      </h1>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Sidebar stepper ─────────────────────────────────────────────────────────

function Sidebar({
  stepId,
  setStepId,
  furthestReached,
}: {
  stepId: StepId
  setStepId: (s: StepId) => void
  furthestReached: number
}) {
  return (
    <nav aria-label="Wizard steps" className="hidden lg:block">
      <ol className="space-y-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isCurrent = stepId === s.id
          const isPast = i < furthestReached
          const reachable = i <= furthestReached
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => setStepId(s.id)}
                className={[
                  'group flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition',
                  isCurrent
                    ? 'border-[var(--color-accent)] bg-[var(--color-fog)]'
                    : reachable
                      ? 'border-transparent hover:bg-[var(--color-fog)]'
                      : 'cursor-not-allowed border-transparent opacity-40',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    isPast
                      ? 'bg-[#16a34a] text-white'
                      : isCurrent
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--fg-subtle)]',
                  ].join(' ')}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--fg-default)]">
                    {s.label}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--fg-muted)]">
                    {s.subtitle}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function furthestStep(currentIdx: number, productId: number | null, bundle: ProductBundle | null): number {
  // The user can navigate back-and-forth through visited steps but not skip ahead
  // beyond the gates. The simplest definition: furthestReached = currentIdx if
  // upstream gates pass, else the gate index.
  if (productId === null) return 0 // can only see step 0
  if (!bundle) return 1
  return Math.max(currentIdx, 1)
}

// ── Step 1: Product ─────────────────────────────────────────────────────────

function ProductStep({
  bundles,
  productId,
  onPick,
}: {
  bundles: ProductBundle[]
  productId: number | null
  onPick: (id: number) => void
}) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[var(--fg-default)]">
        Which EGA product is this passport for?
      </h2>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Each product has its own production chain, alloy family, and locked DPP attribute roster.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {bundles.map((b) => {
          const p = b.product
          const isSelected = productId === p.id
          const details = (p.details ?? {}) as Record<string, unknown>
          const industry = typeof details.primaryIndustry === 'string' ? details.primaryIndustry : null
          const site = typeof details.site === 'string' ? details.site : null

          const imageSrc =
            p.slug === 'celestial'
              ? '/products/celestial.jpg'
              : p.slug === 'celestial_r'
                ? '/products/celestial-r.jpg'
                : p.slug === 'standard'
                  ? '/products/standard.jpg'
                  : null

          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className={[
                  'flex h-full w-full flex-col items-stretch overflow-hidden rounded-[var(--radius-md)] border-2 bg-white text-left transition',
                  isSelected
                    ? 'border-[var(--color-accent)] shadow-[0_0_0_4px_var(--color-fog)]'
                    : 'border-[var(--surface-border)] hover:border-[var(--color-accent)]/50',
                ].join(' ')}
              >
                {imageSrc && (
                  <div className="relative h-32 w-full overflow-hidden bg-[var(--surface-hover)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/90 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-default)] backdrop-blur">
                      {p.brand}
                    </span>
                  </div>
                )}
                <div className="flex h-full flex-col items-start p-5">
                {!imageSrc && (
                  <span
                    className={[
                      'mb-3 inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 text-[10px] font-semibold uppercase tracking-wider',
                      p.brand === 'CelestiAL'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : p.brand === 'CelestiAL-R'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[var(--surface-hover)] text-[var(--fg-default)]',
                    ].join(' ')}
                  >
                    {p.brand}
                  </span>
                )}
                <h3 className="text-[15px] font-semibold text-[var(--fg-default)]">{p.name}</h3>
                <p className="mt-1 font-mono text-[10px] text-[var(--fg-subtle)]">{p.alloyFamily}</p>
                {p.description && (
                  <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-[var(--fg-muted)]">
                    {p.description}
                  </p>
                )}
                <dl className="mt-auto grid w-full grid-cols-2 gap-x-2 gap-y-1 pt-4 text-[11px]">
                  {site && (
                    <>
                      <dt className="text-[var(--fg-subtle)]">Site</dt>
                      <dd className="text-right font-medium text-[var(--fg-default)]">{site}</dd>
                    </>
                  )}
                  <dt className="text-[var(--fg-subtle)]">Form</dt>
                  <dd className="text-right font-medium text-[var(--fg-default)]">
                    {p.form.replace(/_/g, ' ')}
                  </dd>
                  {industry && (
                    <>
                      <dt className="text-[var(--fg-subtle)]">Industry</dt>
                      <dd className="text-right font-medium text-[var(--fg-default)]">{industry}</dd>
                    </>
                  )}
                  <dt className="text-[var(--fg-subtle)]">Chain</dt>
                  <dd className="text-right font-medium text-[var(--fg-default)]">
                    {b.detail?.chain.length ?? p.chainStepIds.length} stages
                  </dd>
                  <dt className="text-[var(--fg-subtle)]">Versions</dt>
                  <dd className="flex justify-end gap-1">
                    {b.availableVersions.length === 0 ? (
                      <span className="text-[var(--fg-subtle)]">—</span>
                    ) : (
                      b.availableVersions.map((v) => (
                        <span
                          key={v}
                          className="rounded-[var(--radius-pill)] bg-[var(--color-fog)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--fg-default)]"
                        >
                          v{v}
                        </span>
                      ))
                    )}
                  </dd>
                </dl>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ── Step 2: Process ─────────────────────────────────────────────────────────

const TIER_PALETTE: Record<string, { bg: string; ring: string; label: string }> = {
  upstream: { bg: 'bg-[#F5E9D9]', ring: 'ring-[#D4A574]', label: 'Upstream' },
  production: { bg: 'bg-[#DBEAFE]', ring: 'ring-[#3B82F6]', label: 'Production' },
  downstream: { bg: 'bg-[#DCFCE7]', ring: 'ring-[#16a34a]', label: 'Downstream' },
  verification: { bg: 'bg-[#EDE9FE]', ring: 'ring-[#7C3AED]', label: 'Verification' },
}

function tierStyle(tier: string) {
  return TIER_PALETTE[tier] ?? { bg: 'bg-[var(--surface-hover)]', ring: 'ring-[var(--surface-border)]', label: tier }
}

function stepIcon(slug: string) {
  if (slug === 'mining') return Database
  if (slug === 'refining') return FlaskConical
  if (slug === 'anode_production') return FlaskConical
  if (slug === 'power_generation') return Plug
  if (slug === 'smelting') return Sparkles
  if (slug === 'alloying') return FlaskConical
  if (slug === 'casting') return Workflow
  if (slug === 'homogenisation') return Workflow
  if (slug === 'lab_qc') return FileCheck
  if (slug === 'semis') return Workflow
  if (slug === 'packaging') return Package
  if (slug === 'verification') return Lock
  if (slug === 'customer') return Truck
  return Circle
}

function ProcessStepView({
  bundle,
  canonicalChain,
}: {
  bundle: ProductBundle
  canonicalChain: ProcessStep[]
}) {
  const fallbackChain: ProductChainStep[] = bundle.product.chainStepIds.flatMap(
    (id, i): ProductChainStep[] => {
      const step = canonicalChain.find((s) => s.id === id)
      if (!step) return []
      return [
        {
          stepId: id,
          slug: step.slug,
          name: step.name,
          tier: step.tier,
          ordinal: i + 1,
          description: step.description,
          notes: null as string | null,
        },
      ]
    },
  )
  const chain: ProductChainStep[] = bundle.detail?.chain ?? fallbackChain

  const slug = bundle.product.slug
  const heroSrc =
    slug === 'celestial'
      ? '/products/celestial.jpg'
      : slug === 'celestial_r'
        ? '/products/celestial-r.jpg'
        : slug === 'standard'
          ? '/products/standard.jpg'
          : null

  // Default-focus the first production-tier stage so the canvas opens with a
  // visually anchored focal point rather than the bauxite bar at the start.
  const defaultFocus =
    chain.find((c) => c.tier === 'production')?.stepId ?? chain[0]?.stepId ?? null
  const [focusedId, setFocusedId] = useState<number | null>(defaultFocus)
  const focused = chain.find((c) => c.stepId === focusedId) ?? chain[0]

  return (
    <section>
      <style>{PROCESS_3D_CSS}</style>

      {heroSrc && (
        <div className="relative mb-5 h-40 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-hover)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc} alt={bundle.product.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 text-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/80">
              {bundle.product.brand} · {bundle.product.alloyFamily}
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-tight">{bundle.product.name}</p>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[18px] font-semibold text-[var(--fg-default)]">
          {bundle.product.name} · production chain
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {chain.length} stages · 3D view
        </p>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Click any tile on the rail to focus it. Stages flow this product from raw bauxite to your
        customer&rsquo;s door · the data each one carries feeds the passport in step 5.
      </p>

      {/* 3D stage rail */}
      <div className="proc3d-stage" role="region" aria-label="Production chain visualisation">
        <span className="proc3d-rail" aria-hidden />
        <span
          className="proc3d-rail-flow"
          aria-hidden
          style={{
            // Animated dot moves along the rail at a constant pace.
            animationDuration: `${Math.max(6, chain.length)}s`,
          }}
        />
        <ol className="proc3d-track" style={{ ['--n' as string]: chain.length }}>
          {chain.map((c, i) => {
            const t = tierStyle(c.tier)
            const Icon = stepIcon(c.slug)
            const isFocused = c.stepId === focused?.stepId
            const focusIdx = chain.findIndex((x) => x.stepId === focused?.stepId)
            const distance = Math.abs(i - focusIdx)
            const isAbove = i % 2 === 0
            return (
              <li
                key={c.stepId}
                style={{
                  ['--i' as string]: i,
                  ['--dist' as string]: distance,
                }}
                className={[
                  'proc3d-tile',
                  isFocused ? 'is-focused' : '',
                  isAbove ? 'is-above' : 'is-below',
                  `tier-${c.tier}`,
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => setFocusedId(c.stepId)}
                  aria-pressed={isFocused}
                  aria-label={`${c.ordinal}. ${c.name}`}
                  className="proc3d-tile-btn"
                >
                  <span className="proc3d-tile-orbit" aria-hidden />
                  <span className="proc3d-tile-face">
                    <span
                      className={[
                        'proc3d-tile-icon',
                        t.bg,
                        t.ring,
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4 text-[var(--fg-default)]" />
                    </span>
                    <span className="proc3d-tile-num">
                      {String(c.ordinal).padStart(2, '0')}
                    </span>
                    <span className="proc3d-tile-name">{c.name}</span>
                    <span
                      className={[
                        'proc3d-tile-tier',
                        t.bg,
                      ].join(' ')}
                    >
                      {t.label}
                    </span>
                  </span>
                  {/* connector arrow to the next tile */}
                  {i < chain.length - 1 && (
                    <span aria-hidden className="proc3d-tile-connector">→</span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Focused stage detail panel */}
      {focused && (
        <ProcessFocusedDetail step={focused} totalSteps={chain.length} />
      )}

      {/* Compact dot navigator */}
      <div className="proc3d-nav">
        {chain.map((c) => {
          const isFocused = c.stepId === focused?.stepId
          const t = tierStyle(c.tier)
          return (
            <button
              key={c.stepId}
              type="button"
              onClick={() => setFocusedId(c.stepId)}
              className={[
                'proc3d-nav-dot',
                isFocused ? 'is-focused' : '',
                `tier-${c.tier}`,
              ].join(' ')}
              aria-label={`Jump to ${c.name}`}
              title={`${c.ordinal}. ${c.name}`}
            >
              <span className={`proc3d-nav-dot-ring ${t.ring}`} aria-hidden />
              <span className="proc3d-nav-dot-num">{c.ordinal}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ProcessFocusedDetail({
  step,
  totalSteps,
}: {
  step: ProductChainStep
  totalSteps: number
}) {
  const t = tierStyle(step.tier)
  const Icon = stepIcon(step.slug)
  return (
    <article className="proc3d-detail">
      <div className="proc3d-detail-head">
        <span className={['proc3d-detail-icon', t.bg, t.ring].join(' ')}>
          <Icon className="h-5 w-5 text-[var(--fg-default)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Stage {step.ordinal} of {totalSteps} · {t.label}
          </p>
          <h3 className="mt-1 text-[20px] font-semibold leading-tight text-[var(--fg-default)]">
            {step.name}
          </h3>
        </div>
        <span
          className={[
            'rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
            t.bg,
          ].join(' ')}
        >
          {t.label}
        </span>
      </div>
      {step.description && (
        <p className="mt-3 text-[13px] leading-6 text-[var(--fg-default)]">{step.description}</p>
      )}
      {step.notes && (
        <p className="mt-2 italic text-[12px] text-[var(--fg-muted)]">{step.notes}</p>
      )}
    </article>
  )
}

const PROCESS_3D_CSS = `
.proc3d-stage {
  position: relative;
  margin-top: 28px;
  height: 320px;
  perspective: 1400px;
  perspective-origin: 50% 60%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 24px;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(ellipse at 50% 100%, rgba(15,76,129,0.08), transparent 60%),
    linear-gradient(180deg, transparent 0%, var(--color-fog) 100%);
  border: 1px solid var(--surface-border);
}

.proc3d-rail {
  position: absolute;
  left: 24px;
  right: 24px;
  top: 50%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--surface-border) 8%,
    var(--surface-border) 92%,
    transparent 100%
  );
  transform: translateY(-50%) translateZ(-30px);
  pointer-events: none;
}

.proc3d-rail-flow {
  position: absolute;
  top: 50%;
  width: 8px; height: 8px;
  border-radius: 9999px;
  background: var(--color-accent);
  box-shadow: 0 0 12px rgba(15,76,129,0.6);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: proc3d-flow linear infinite;
}
@keyframes proc3d-flow {
  0%   { left: 6%; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { left: 94%; opacity: 0; }
}

.proc3d-track {
  display: grid;
  grid-template-columns: repeat(var(--n, 12), 180px);
  gap: 28px;
  align-items: center;
  height: 100%;
  list-style: none;
  margin: 0;
  padding: 0 4px;
  transform-style: preserve-3d;
}

.proc3d-tile {
  position: relative;
  transform-style: preserve-3d;
  /* Subtle alternating offset around the rail. Above-rail tiles ride higher,
   * below-rail tiles ride lower. Distance from focus pushes tiles back in z. */
  transform:
    translateY(calc(var(--offset, 0) * 1px))
    translateZ(calc(var(--dist, 0) * -22px))
    rotateY(calc(var(--rotate, 0) * 1deg));
  transition: transform 360ms cubic-bezier(0.16, 1, 0.3, 1), filter 240ms ease;
  animation: proc3d-rise 540ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}
.proc3d-tile.is-above {
  --offset: -38;
  --rotate: -2;
}
.proc3d-tile.is-below {
  --offset: 38;
  --rotate: 2;
}
.proc3d-tile.is-focused {
  --rotate: 0;
  transform: translateY(0) translateZ(46px) scale(1.06);
  z-index: 5;
}
@keyframes proc3d-rise {
  from { opacity: 0; transform: translateY(20px) rotateX(20deg); }
  to   { opacity: 1; }
}

.proc3d-tile-btn {
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: block;
  transform-style: preserve-3d;
  outline: none;
}

.proc3d-tile-orbit {
  position: absolute;
  inset: -16px;
  border-radius: 22px;
  background: radial-gradient(circle at 50% 50%, rgba(15,76,129,0.20), transparent 70%);
  opacity: 0;
  transition: opacity 240ms ease;
  pointer-events: none;
  filter: blur(2px);
}
.proc3d-tile.is-focused .proc3d-tile-orbit { opacity: 1; }
.proc3d-tile-btn:hover .proc3d-tile-orbit { opacity: 0.8; }

.proc3d-tile-face {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 14px;
  background: linear-gradient(160deg, #ffffff 0%, #f7f8fb 100%);
  border: 1.5px solid var(--surface-border);
  box-shadow:
    0 6px 18px -8px rgba(15,23,42,0.18),
    0 1px 2px rgba(15,23,42,0.04);
  text-align: left;
  transition: border-color 240ms ease, box-shadow 240ms ease;
}
.proc3d-tile.is-focused .proc3d-tile-face {
  border-color: var(--color-accent);
  box-shadow:
    0 16px 36px -12px rgba(15,76,129,0.40),
    0 4px 10px -4px rgba(15,76,129,0.16),
    0 0 0 1px var(--color-accent) inset;
}
.proc3d-tile.tier-upstream .proc3d-tile-face {
  background: linear-gradient(160deg, #ffffff, #fff7e7);
}
.proc3d-tile.tier-production .proc3d-tile-face {
  background: linear-gradient(160deg, #ffffff, var(--color-accent-soft));
}
.proc3d-tile.tier-downstream .proc3d-tile-face {
  background: linear-gradient(160deg, #ffffff, #ecfdf5);
}
.proc3d-tile.tier-verification .proc3d-tile-face {
  background: linear-gradient(160deg, #ffffff, #f3e8ff);
}

.proc3d-tile-icon {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
  border-color: var(--ring-color, var(--surface-border));
  flex-shrink: 0;
}
.proc3d-tile-num {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--fg-subtle);
}
.proc3d-tile-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-default);
  line-height: 1.3;
  /* Two-line clamp to keep tile heights even */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.proc3d-tile-tier {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.proc3d-tile-connector {
  position: absolute;
  top: 50%;
  right: -22px;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--fg-subtle);
  opacity: 0.6;
  pointer-events: none;
}

/* Focused detail panel */
.proc3d-detail {
  margin-top: 18px;
  padding: 18px 20px 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  animation: proc3d-detail-fade 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes proc3d-detail-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.proc3d-detail-head { display: flex; align-items: flex-start; gap: 14px; }
.proc3d-detail-icon {
  display: grid; place-items: center;
  width: 44px; height: 44px;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
  flex-shrink: 0;
}

/* Bottom dot navigator */
.proc3d-nav {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.proc3d-nav-dot {
  position: relative;
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 9999px;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: transform 200ms ease;
}
.proc3d-nav-dot:hover { transform: scale(1.1); }
.proc3d-nav-dot.is-focused { transform: scale(1.2); }
.proc3d-nav-dot-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
}
.proc3d-nav-dot.is-focused .proc3d-nav-dot-ring {
  box-shadow: 0 0 0 3px rgba(15,76,129,0.18);
}
.proc3d-nav-dot-num {
  position: relative;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--fg-default);
}

@media (prefers-reduced-motion: reduce) {
  .proc3d-tile, .proc3d-tile.is-focused {
    transform: none;
    animation: none;
    transition: none;
  }
  .proc3d-rail-flow { animation: none; }
  .proc3d-detail { animation: none; }
}
`

// ── Step 3: Version ─────────────────────────────────────────────────────────

const VERSION_DELTAS: Record<string, { headline: string; bullets: string[] }> = {
  '1.0': {
    headline: 'Trust-building manifest',
    bullets: [
      'UPI · GS1 Digital Link',
      'Alloy chemistry (EN 573-3)',
      'CFP · ISO 14067 cradle-to-gate',
      'Recycled content (ASI CoC v2.1)',
      'Ed25519-signed W3C VC envelope',
    ],
  },
  '1.5': {
    headline: 'Cell telemetry + sourcing',
    bullets: [
      'Cell amperage & current efficiency',
      'AE frequency, anode quality',
      'Supplier sourcing detail',
      'ISO 17025 lab traceability',
    ],
  },
  '2': {
    headline: 'EU regulatory tier',
    bullets: [
      'CBAM Registry references',
      'Aluminium Delegated Act site CFP',
      'Guarantees of Origin (GoO)',
      'CBAM free-allocation logic',
    ],
  },
  '3': {
    headline: 'Circularity + end-of-life',
    bullets: [
      'GRS / RCS scrap mass-balance',
      'Spent pot-lining recycling',
      'End-of-life routing manifest',
      'Disassembly & repair guidance',
    ],
  },
  '4': {
    headline: 'Full PEF + biodiversity',
    bullets: [
      'Product Environmental Footprint (16 categories)',
      'Biodiversity impact score',
      'Water-stress weighted footprint',
      'Land-use change accounting',
    ],
  },
}

function VersionStep({
  bundle,
  version,
  setVersion,
}: {
  bundle: ProductBundle
  version: string
  setVersion: (v: string) => void
}) {
  const available = new Set(bundle.availableVersions)
  const [hovered, setHovered] = useState<string | null>(null)
  const fullSteps = bundle.fullManifest?.stepsWithAttrs ?? []
  const allAttrs = fullSteps.flatMap((s) => s.attributes)

  const totalsByVersion: Record<string, { total: number; mandatory: number; addedHere: number }> = {}
  for (const v of ALL_DPP_VERSIONS) {
    const upTo = ALL_DPP_VERSIONS.slice(
      0,
      ALL_DPP_VERSIONS.findIndex((x) => x.id === v.id) + 1,
    ).map((x) => x.id)
    const upToSet = new Set(upTo)
    const inScope = allAttrs.filter((a) => upToSet.has(a.version))
    const mandatory = inScope.filter((a) => a.necessity === 'mandatory').length
    const addedHere = allAttrs.filter((a) => a.version === v.id).length
    totalsByVersion[v.id] = { total: inScope.length, mandatory, addedHere }
  }

  const focusId = hovered ?? version
  const focusVersion = ALL_DPP_VERSIONS.find((v) => v.id === focusId) ?? ALL_DPP_VERSIONS[0]!
  const focusCounts = totalsByVersion[focusId] ?? { total: 0, mandatory: 0, addedHere: 0 }
  const focusDelta = VERSION_DELTAS[focusId] ?? { headline: '', bullets: [] }
  const focusIndex = ALL_DPP_VERSIONS.findIndex((v) => v.id === focusId)

  return (
    <section>
      <style>{VERSION_ATLAS_CSS}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Version atlas
          </p>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight text-[var(--fg-default)]">
            Choose your DPP schema
          </h2>
          <p className="mt-1 max-w-[640px] text-[13px] text-[var(--fg-muted)]">
            Every version is cumulative · each step on the path layers new attributes onto the
            prior. Hover any tile to peek; click to lock it in for{' '}
            <span className="font-medium text-[var(--fg-default)]">{bundle.product.name}</span>.
          </p>
        </div>
        <div className="hidden shrink-0 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-canvas)] px-3 py-2 text-right md:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Currently locked
          </p>
          <p className="mt-0.5 font-mono text-[14px] font-semibold text-[var(--fg-default)]">
            DPP {version}
          </p>
        </div>
      </div>

      {/* 3D animated timeline */}
      <div
        className="version-atlas-stage mt-7 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-gradient-to-b from-[var(--color-fog)] to-white px-5 py-10"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="version-atlas-track">
          <span className="version-atlas-rail" aria-hidden />
          <span
            className="version-atlas-progress"
            aria-hidden
            style={{ width: `${(focusIndex / (ALL_DPP_VERSIONS.length - 1)) * 100}%` }}
          />
          {ALL_DPP_VERSIONS.map((v, i) => {
            const enabled = available.has(v.id)
            const isSelected = version === v.id
            const isHovered = hovered === v.id
            const isLocked = focusIndex >= i
            const counts = totalsByVersion[v.id] ?? { total: 0, mandatory: 0, addedHere: 0 }
            return (
              <button
                key={v.id}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && setVersion(v.id)}
                onMouseEnter={() => setHovered(v.id)}
                onFocus={() => setHovered(v.id)}
                onBlur={() => setHovered(null)}
                aria-pressed={isSelected}
                aria-label={`${v.label} · ${v.tagline}`}
                className={[
                  'version-atlas-tile',
                  isSelected ? 'is-selected' : '',
                  isHovered ? 'is-hovered' : '',
                  enabled ? '' : 'is-disabled',
                  isLocked ? 'is-locked' : '',
                ].join(' ')}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="version-atlas-tile-orbit" aria-hidden />
                <span className="version-atlas-tile-face">
                  <span className="version-atlas-tile-id">v{v.id === '2' || v.id === '3' || v.id === '4' ? `${v.id}.0` : v.id}</span>
                  <span className="version-atlas-tile-label">{v.label}</span>
                  <span className="version-atlas-tile-meta">
                    {counts.total > 0 ? `${counts.total} attrs` : '—'}
                  </span>
                  {counts.addedHere > 0 && i > 0 && (
                    <span className="version-atlas-tile-delta">+{counts.addedHere} new</span>
                  )}
                  <span className="version-atlas-tile-status">
                    {isSelected ? (
                      <span className="version-atlas-pill version-atlas-pill--accent">
                        <Check className="h-2.5 w-2.5" />
                        Selected
                      </span>
                    ) : enabled && v.status === 'available' ? (
                      <span className="version-atlas-pill version-atlas-pill--ready">Ready</span>
                    ) : (
                      <span className="version-atlas-pill version-atlas-pill--soon">
                        <Lock className="h-2.5 w-2.5" />
                        Soon
                      </span>
                    )}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {hovered ? 'previewing' : 'flow · cumulative attributes'}
        </p>
      </div>

      {/* Comparison panel */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <article className="rounded-[var(--radius-lg)] border-2 border-[var(--color-accent)] bg-white p-5 shadow-[0_2px_8px_rgba(15,76,129,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {hovered && hovered !== version ? 'Previewing' : 'Selected'}
            </p>
            <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
              {focusVersion.status === 'available' ? 'Locked & ready' : 'Coming soon'}
            </span>
          </div>
          <h3 className="mt-1 flex items-baseline gap-2 text-[24px] font-semibold leading-tight text-[var(--fg-default)]">
            {focusVersion.label}
            <span className="text-[13px] font-normal text-[var(--fg-muted)]">
              {focusDelta.headline}
            </span>
          </h3>

          <dl className="mt-4 grid grid-cols-3 divide-x divide-[var(--surface-border)] rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-canvas)]">
            <div className="px-3 py-2.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                Attributes
              </dt>
              <dd className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-[var(--fg-default)]">
                {focusCounts.total || '—'}
              </dd>
            </div>
            <div className="px-3 py-2.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                Mandatory
              </dt>
              <dd className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-[var(--fg-default)]">
                {focusCounts.mandatory || '—'}
              </dd>
            </div>
            <div className="px-3 py-2.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                New here
              </dt>
              <dd className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-[var(--color-accent)]">
                {focusCounts.addedHere ? `+${focusCounts.addedHere}` : '—'}
              </dd>
            </div>
          </dl>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
            What this version unlocks
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] text-[var(--fg-default)]">
            {focusDelta.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {focusVersion.id !== version && available.has(focusVersion.id) && (
            <button
              type="button"
              onClick={() => setVersion(focusVersion.id)}
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              Lock {focusVersion.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </article>

        <article className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-canvas)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            What other versions add on top
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            Cumulative roadmap · locking a lower version doesn&rsquo;t close these doors.
          </p>
          <ul className="mt-4 space-y-2.5">
            {ALL_DPP_VERSIONS.map((v, i) => {
              const counts = totalsByVersion[v.id] ?? { total: 0, mandatory: 0, addedHere: 0 }
              const delta = VERSION_DELTAS[v.id] ?? { headline: '', bullets: [] }
              const isFocus = v.id === focusId
              const isCurrent = v.id === version
              return (
                <li
                  key={v.id}
                  className={[
                    'rounded-[var(--radius-md)] border bg-white p-3 transition',
                    isFocus
                      ? 'border-[var(--color-accent)] shadow-[0_1px_4px_rgba(15,76,129,0.1)]'
                      : 'border-[var(--surface-border)]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'font-mono text-[10px] font-bold tabular-nums',
                          isFocus ? 'text-[var(--color-accent)]' : 'text-[var(--fg-subtle)]',
                        ].join(' ')}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[12px] font-semibold text-[var(--fg-default)]">
                        {v.label}
                      </span>
                      {isCurrent && (
                        <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          Locked
                        </span>
                      )}
                    </div>
                    {counts.addedHere > 0 && i > 0 && (
                      <span className="font-mono text-[10px] tabular-nums text-[var(--color-accent)]">
                        +{counts.addedHere}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                    {delta.headline}
                  </p>
                </li>
              )
            })}
          </ul>
        </article>
      </div>
    </section>
  )
}

const VERSION_ATLAS_CSS = `
.version-atlas-stage {
  perspective: 1400px;
  perspective-origin: 50% 30%;
}
.version-atlas-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  transform-style: preserve-3d;
}
.version-atlas-rail {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 64px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--surface-border) 12%, var(--surface-border) 88%, transparent 100%);
  pointer-events: none;
  transform: translateZ(-30px);
}
.version-atlas-progress {
  position: absolute;
  left: 6%;
  top: 63px;
  height: 4px;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--color-accent), #4f8fc7);
  box-shadow: 0 0 16px rgba(15, 76, 129, 0.35);
  pointer-events: none;
  transition: width 480ms cubic-bezier(0.16, 1, 0.3, 1);
  max-width: calc(100% - 12%);
}
.version-atlas-tile {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform-style: preserve-3d;
  transform: perspective(900px) rotateX(8deg) rotateY(-4deg) translateZ(0);
  transition: transform 360ms cubic-bezier(0.16, 1, 0.3, 1), filter 240ms ease;
  animation: version-atlas-rise 540ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  outline: none;
}
.version-atlas-tile:nth-child(odd of .version-atlas-tile) { transform: perspective(900px) rotateX(8deg) rotateY(4deg); }
.version-atlas-tile:hover:not(.is-disabled),
.version-atlas-tile.is-hovered:not(.is-disabled) {
  transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(28px) scale(1.04);
}
.version-atlas-tile.is-selected {
  transform: perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(36px) scale(1.06);
}
.version-atlas-tile.is-disabled {
  cursor: not-allowed;
  filter: grayscale(0.4) opacity(0.7);
}
.version-atlas-tile-orbit {
  position: absolute;
  inset: -8px;
  border-radius: 18px;
  background: radial-gradient(circle at 50% 0%, rgba(15, 76, 129, 0.22), transparent 70%);
  opacity: 0;
  transition: opacity 240ms ease;
  pointer-events: none;
}
.version-atlas-tile.is-selected .version-atlas-tile-orbit,
.version-atlas-tile.is-hovered .version-atlas-tile-orbit { opacity: 1; }

.version-atlas-tile-face {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 168px;
  padding: 14px 14px 12px;
  border-radius: 12px;
  background: linear-gradient(160deg, #ffffff 0%, #f7f8fb 100%);
  border: 1.5px solid var(--surface-border);
  box-shadow: 0 4px 14px -6px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 240ms ease, box-shadow 240ms ease;
  text-align: left;
}
.version-atlas-tile.is-locked .version-atlas-tile-face {
  background: linear-gradient(160deg, #ffffff 0%, var(--color-accent-soft) 100%);
  border-color: rgba(15, 76, 129, 0.32);
}
.version-atlas-tile.is-selected .version-atlas-tile-face {
  border-color: var(--color-accent);
  box-shadow: 0 12px 30px -10px rgba(15, 76, 129, 0.35), 0 2px 6px rgba(15, 76, 129, 0.12);
}
.version-atlas-tile-id {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--fg-subtle);
  text-transform: uppercase;
}
.version-atlas-tile-label {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--fg-default);
}
.version-atlas-tile-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
  tabular-nums: true;
}
.version-atlas-tile-delta {
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
}
.version-atlas-tile-status { margin-top: auto; }

.version-atlas-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.version-atlas-pill--accent { background: var(--color-accent); color: #fff; }
.version-atlas-pill--ready { background: #DCFCE7; color: #166534; }
.version-atlas-pill--soon { background: var(--color-fog); color: var(--fg-subtle); }

@keyframes version-atlas-rise {
  from { opacity: 0; transform: perspective(900px) rotateX(20deg) translateY(18px); }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .version-atlas-tile,
  .version-atlas-tile.is-selected,
  .version-atlas-tile:hover:not(.is-disabled),
  .version-atlas-tile.is-hovered:not(.is-disabled) {
    transform: none;
    animation: none;
    transition: none;
  }
  .version-atlas-progress { transition: none; }
}
`

// ── Step 4: Parameters ─────────────────────────────────────────────────────

function ParametersStep({
  bundle,
  version,
}: {
  bundle: ProductBundle
  version: string
}) {
  const manifest = bundle.manifest
  const steps = manifest?.stepsWithAttrs ?? []
  const totalAttrs = steps.reduce((acc, s) => acc + s.attributes.length, 0)
  const mandatoryCount = steps.reduce(
    (acc, s) => acc + s.attributes.filter((a) => a.necessity === 'mandatory').length,
    0,
  )

  if (!manifest) {
    return (
      <section>
        <p className="text-[13px] text-[var(--fg-muted)]">
          No locked manifest found for {bundle.product.name} at v{version}.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[var(--fg-default)]">
        Parameter roster ({totalAttrs} attributes locked at DPP {manifest.version})
      </h2>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        These are the data points this passport will collect. The roster was locked for{' '}
        {bundle.product.name} during onboarding · {mandatoryCount} mandatory, {totalAttrs - mandatoryCount}{' '}
        recommended/voluntary.
      </p>

      <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-canvas)]">
        <ul className="divide-y divide-[var(--surface-border)]">
          {steps.map((s) => (
            <ParameterStepRow key={s.stepId} step={s} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function ParameterStepRow({ step }: { step: ManifestStep }) {
  const [expanded, setExpanded] = useState(false)
  const t = tierStyle(step.tier)
  const Icon = stepIcon(step.slug)
  const mandatory = step.attributes.filter((a) => a.necessity === 'mandatory').length
  const optional = step.attributes.length - mandatory
  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-fog)]"
      >
        <span className={['flex h-8 w-8 items-center justify-center rounded-full', t.bg].join(' ')}>
          <Icon className="h-4 w-4 text-[var(--fg-default)]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[var(--fg-default)]">{step.name}</span>
          <span className="block text-[11px] text-[var(--fg-muted)]">
            {mandatory} mandatory · {optional} recommended/voluntary
          </span>
        </span>
        <ChevronRight
          className={[
            'h-4 w-4 shrink-0 text-[var(--fg-subtle)] transition-transform',
            expanded ? 'rotate-90' : '',
          ].join(' ')}
        />
      </button>

      {expanded && step.attributes.length > 0 && (
        <ul className="border-t border-[var(--surface-border)] bg-white px-4 py-3 text-[12px]">
          {step.attributes.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-1.5">
              <span
                className={[
                  'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  a.necessity === 'mandatory'
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : 'bg-[var(--surface-hover)] text-[var(--fg-subtle)]',
                ].join(' ')}
              >
                {a.necessity === 'mandatory' ? '!' : '·'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-[var(--fg-default)]">{a.label}</span>
                <span className="block break-all font-mono text-[10px] text-[var(--fg-subtle)]">
                  {a.attributePath}
                </span>
                {a.regulatoryAnchor && (
                  <span className="mt-0.5 inline-block rounded-[var(--radius-pill)] bg-[var(--surface-hover)] px-1.5 py-0.5 text-[9px] text-[var(--fg-muted)]">
                    {a.regulatoryAnchor}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// ── Step 5: Cast info ─────────────────────────────────────────────────────

function CastStep({
  bundle,
  version,
  castNumber,
  setCastNumber,
  itemSerial,
  setItemSerial,
}: {
  bundle: ProductBundle
  version: string
  castNumber: string
  setCastNumber: (v: string) => void
  itemSerial: string
  setItemSerial: (v: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[var(--fg-default)]">
        Identify this passport
      </h2>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        A passport is one cast of {bundle.product.name} (DPP {version}). The cast number anchors
        all data you enter from here on.
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface-canvas)] p-4 text-[12px] sm:grid-cols-3">
        <Summary label="Product" value={bundle.product.name} />
        <Summary label="Brand" value={bundle.product.brand} />
        <Summary label="Form" value={bundle.product.form.replace(/_/g, ' ')} />
        <Summary label="Alloy family" value={bundle.product.alloyFamily} />
        <Summary label="DPP version" value={`v${version}`} />
        <Summary label="Stages" value={`${bundle.detail?.chain.length ?? 0}`} />
      </dl>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cast number" required>
          <input
            type="text"
            value={castNumber}
            onChange={(e) => setCastNumber(e.target.value)}
            placeholder={`e.g. C-${today}-12345`}
            className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-white px-3 text-[13px] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </Field>
        <Field label="Item serial (optional)">
          <input
            type="text"
            value={itemSerial}
            onChange={(e) => setItemSerial(e.target.value)}
            placeholder="e.g. EB-001"
            className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-white px-3 text-[13px] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </Field>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--color-fog)] p-3 text-[12px] text-[var(--fg-muted)]">
        <CircleHelp className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
        <span>
          After clicking <strong>Create draft</strong>, you&rsquo;ll move to the data-entry step
          where each parameter can be filled by manual entry, IoT pull, library preset, or external
          assignment to a colleague or supplier.
        </span>
      </div>
    </section>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[13px] font-medium text-[var(--fg-default)]">{value}</dd>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
        {label}
        {required && <span className="text-[var(--color-accent)]">*</span>}
      </span>
      {children}
    </label>
  )
}

// suppress unused-import lint warnings on icons referenced by stepIcon helper.
const _retain = { CircleDashed, CircleDot, Library, UserPlus }
void _retain
