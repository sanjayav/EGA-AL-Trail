'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { EASE_STANDARD } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

/**
 * Material genealogy · upstream provenance + downstream products.
 *
 * Today the relationships come from the DPP body's `provenance` and `origin`
 * sections. v1.5 introduces passport-of-passports linking (a billet's DPP
 * cites its smelter cast's DPP via UPI) and we render this as an interactive
 * tree.
 */
export function Genealogy({ dpp }: { dpp: ViewerDpp }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  const provenance = (dpp.dpp.provenance as Record<string, unknown>) ?? {}
  const origin = (dpp.dpp.origin as Record<string, unknown>) ?? {}
  const ident = dpp.dpp.identification as { brand?: string; form?: string; castNumber?: string }
  const physical = dpp.dpp.physical as { weightKg?: number }

  const upstream: GenealogyNode[] = [
    {
      title: 'Bauxite source',
      sub: (origin.bauxiteSource as string) ?? 'Multi-source · Guinea / Australia',
      meta: 'Mining → red-mud accounted',
    },
    {
      title: 'Alumina refinery',
      sub: (origin.aluminaRefinery as string) ?? 'Al Taweelah, UAE',
      meta: 'Bayer process · captive',
    },
    {
      title: 'Smelter',
      sub: (origin.smelterUfi as string) ?? 'UFI 0814406063800 · Al Taweelah',
      meta: 'Hall–Héroult · UAE solar PPA',
    },
    {
      title: 'Casthouse',
      sub: (origin.casthouseUfi as string) ?? 'UFI 0814406063812 · Al Taweelah',
      meta: 'Cast house DC casting line',
    },
  ]

  const thisProduct: GenealogyNode = {
    title: `This passport`,
    sub: `${ident.brand ?? '—'} · ${(ident.form ?? '—').replace(/_/g, ' ')}`,
    meta: `Cast ${ident.castNumber ?? '—'}${
      physical.weightKg ? ` · ${physical.weightKg.toLocaleString()} kg` : ''
    }`,
  }

  const downstream: GenealogyNode[] = [
    {
      title: 'Customer fabrication',
      sub: 'Forging / extrusion / rolling',
      meta: 'New DPP minted with this UPI as parent',
    },
    {
      title: 'Component assembly',
      sub: 'Tier-1 supplier (BMW, Tesla, Audi)',
      meta: 'Bill of materials cites this DPP',
    },
    {
      title: 'End product',
      sub: 'Vehicle / battery housing / window frame',
      meta: 'Battery Passport (where applicable) inherits CFP',
    },
  ]

  return (
    <section
      ref={ref}
      className="border-t border-[var(--surface-divider)] bg-[var(--color-paper)] px-6 py-32 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          04 · Where this metal comes from, and where it goes
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.0, ease: EASE_STANDARD }}
          className="font-display mt-6 max-w-2xl text-[clamp(36px,5vw,64px)] font-light leading-[1.05] text-[var(--fg-default)]"
        >
          Every gram, traced bauxite to <em className="not-italic">finished part.</em>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE_STANDARD }}
          className="mt-6 max-w-2xl text-[15px] leading-[1.65] text-[var(--fg-muted)]"
        >
          The four upstream stages each emit their own DPP-linked attestations. The downstream chain
          · every component built from this billet · is also passport-aware: a Battery Passport, a
          vehicle DPP, an architectural-glazing DPP all inherit and extend this one.
        </motion.p>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.6fr_1fr] lg:items-stretch">
          <Column title="Upstream" tone="ink" nodes={upstream} inView={inView} />
          <CenterColumn node={thisProduct} inView={inView} />
          <Column title="Downstream" tone="gold" nodes={downstream} inView={inView} reverse />
        </div>

        <div className="mt-16 max-w-2xl rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Customs · CN code reference
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--fg-muted)]">
            For EU CBAM declaration, this passport's form maps to{' '}
            <strong className="font-mono text-[var(--fg-default)]">
              {cnCodeFor((ident.form ?? '') as string)}
            </strong>{' '}
            — Annex I, Regulation (EU) 2023/956. Direct + indirect embedded emissions are
            auto-aggregated in your customer portal.
          </p>
        </div>
      </div>
    </section>
  )
}

interface GenealogyNode {
  title: string
  sub: string
  meta: string
}

function Column({
  title,
  tone,
  nodes,
  inView,
  reverse,
}: {
  title: string
  tone: 'ink' | 'gold'
  nodes: GenealogyNode[]
  inView: boolean
  reverse?: boolean
}) {
  const accent = tone === 'gold' ? 'var(--color-gold-deep, #927221)' : 'var(--fg-default)'
  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        {title}
      </p>
      <ol className={`space-y-3 ${reverse ? '' : ''}`}>
        {nodes.map((n, i) => (
          <motion.li
            key={n.title}
            initial={{ opacity: 0, x: reverse ? 16 : -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.12, ease: EASE_STANDARD }}
            className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--color-paper-soft)] px-5 py-4"
          >
            <p
              className="font-display text-[16px] font-semibold leading-tight"
              style={{ color: accent }}
            >
              {n.title}
            </p>
            <p className="mt-1 font-mono text-[12px] text-[var(--fg-muted)]">{n.sub}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-default)]">{n.meta}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function CenterColumn({ node, inView }: { node: GenealogyNode; inView: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.25, ease: EASE_STANDARD }}
        className="relative w-full rounded-[var(--radius-md)] border-2 border-[var(--color-gold,#b58c2a)] bg-[var(--color-paper)] px-6 py-6 text-center shadow-md"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-gold-deep,#927221)]">
          {node.title}
        </p>
        <p className="font-display mt-3 text-[20px] font-semibold leading-tight text-[var(--fg-default)]">
          {node.sub}
        </p>
        <p className="mt-3 font-mono text-[11px] text-[var(--fg-muted)]">{node.meta}</p>
        <span className="absolute -left-3 top-1/2 hidden h-px w-3 -translate-y-1/2 bg-[var(--surface-border)] lg:block" />
        <span className="absolute -right-3 top-1/2 hidden h-px w-3 -translate-y-1/2 bg-[var(--surface-border)] lg:block" />
      </motion.div>
    </div>
  )
}

function cnCodeFor(form: string): string {
  const map: Record<string, string> = {
    primary_ingot: '7601 1000',
    sow_ingot: '7601 2000',
    extrusion_billet: '7601 2040',
    rolling_slab: '7601 2080',
    sheet_ingot: '7606 1100',
    foundry_alloy: '7601 2080',
    wire_rod: '7604 2100',
  }
  return map[form] ?? '7601 / 7604–7616 (Chapter 76)'
}
