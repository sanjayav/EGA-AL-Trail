'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { EDITORIAL_TOKENS, EASE_STANDARD, useCountUp } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

const STAGES = [
  { key: 'bauxiteMining', label: 'Bauxite mining', color: EDITORIAL_TOKENS.carbon.bauxiteMining },
  {
    key: 'bauxiteTransport',
    label: 'Bauxite transport',
    color: EDITORIAL_TOKENS.carbon.bauxiteTransport,
  },
  {
    key: 'aluminaProduction',
    label: 'Alumina production',
    color: EDITORIAL_TOKENS.carbon.aluminaProduction,
  },
  {
    key: 'aluminaTransport',
    label: 'Alumina transport',
    color: EDITORIAL_TOKENS.carbon.aluminaTransport,
  },
  {
    key: 'anodeProduction',
    label: 'Anode production',
    color: EDITORIAL_TOKENS.carbon.anodeProduction,
  },
  { key: 'electricity', label: 'Electricity', color: EDITORIAL_TOKENS.carbon.electricity },
  { key: 'electrolysis', label: 'Electrolysis', color: EDITORIAL_TOKENS.carbon.electrolysis },
  { key: 'casting', label: 'Casting', color: EDITORIAL_TOKENS.carbon.casting },
] as const

/** Carbon decomposition · stacked bar + per-stage cards. §10.5.5 */
export function Carbon({ dpp }: { dpp: ViewerDpp }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const carbon = dpp.dpp.carbon as {
    valueKgCo2ePerTonne: number
    decomposition?: Record<string, number>
  }
  const decomposition = carbon.decomposition
  if (!decomposition) return null
  const total =
    STAGES.reduce((s, st) => s + (decomposition[st.key] ?? 0), 0) || carbon.valueKgCo2ePerTonne

  return (
    <section
      ref={ref}
      className="border-t border-[var(--surface-divider)] bg-[var(--color-paper-soft)] px-6 py-32 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          02 · Where the emissions come from
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.0, ease: EASE_STANDARD }}
          className="font-display mt-6 max-w-2xl text-[clamp(36px,5vw,64px)] font-light leading-[1.05] text-[var(--fg-default)]"
        >
          Eight life-cycle stages, traceable to <em>each tonne shipped.</em>
        </motion.h2>

        <div className="mt-16 flex h-[88px] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink)]">
          {STAGES.map((stage, i) => {
            const value = decomposition[stage.key] ?? 0
            const pct = (value / total) * 100
            return (
              <motion.div
                key={stage.key}
                initial={{ flexBasis: '0%' }}
                animate={inView ? { flexBasis: `${pct}%` } : {}}
                transition={{ duration: 1.4, delay: 0.3 + i * 0.08, ease: EASE_STANDARD }}
                style={{ background: stage.color }}
                className="hover:outline hover:outline-2 hover:outline-[var(--color-ink)]"
                role="img"
                aria-label={`${stage.label}: ${value} kilograms CO2 equivalent per tonne (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STAGES.map((stage, i) => (
            <CarbonCell
              key={stage.key}
              label={stage.label}
              color={stage.color}
              value={decomposition[stage.key] ?? 0}
              percent={((decomposition[stage.key] ?? 0) / total) * 100}
              inView={inView}
              delay={0.6 + i * 0.06}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function CarbonCell({
  label,
  color,
  value,
  percent,
  inView,
  delay,
}: {
  label: string
  color: string
  value: number
  percent: number
  inView: boolean
  delay: number
}) {
  const display = useCountUp(value, 1.4, inView)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: EASE_STANDARD }}
      whileHover={{ y: -4 }}
      className="rounded-[var(--radius-md)] bg-[var(--color-paper)] p-4 transition-shadow hover:shadow-md"
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
        style={{ background: color }}
        aria-hidden
      />
      <p className="tabular font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {percent.toFixed(1)}%
      </p>
      <p className="font-display mt-1 text-[16px] leading-[1.2] text-[var(--fg-default)]">
        {label}
      </p>
      <p className="tabular mt-2 font-mono text-[14px] text-[var(--fg-muted)]">
        {display.toLocaleString()} kg CO₂e/t
      </p>
    </motion.div>
  )
}
