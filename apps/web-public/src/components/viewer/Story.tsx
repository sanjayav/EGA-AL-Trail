'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { EASE_STANDARD, useCountUp } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

/** Story section · establishes the comparison with industry baseline. §10.5.3 */
export function Story({ dpp }: { dpp: ViewerDpp }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const carbon = dpp.dpp.carbon as {
    valueKgCo2ePerTonne: number
    industryAverageKgCo2ePerTonne?: number
  }
  const ident = dpp.dpp.identification as { brand?: string }

  const industryAvg = carbon.industryAverageKgCo2ePerTonne ?? 14600
  const bars = [
    { label: 'Industry average', value: industryAvg, tone: 'soft' as const },
    { label: 'EGA Standard', value: 10545, tone: 'soft' as const },
    { label: `EGA ${ident.brand}`, value: carbon.valueKgCo2ePerTonne, tone: 'gold' as const },
    { label: 'EGA CelestiAL-R', value: 3280, tone: 'green' as const },
  ]
  const max = Math.max(...bars.map((b) => b.value))

  return (
    <section
      ref={ref}
      className="border-t border-[var(--surface-divider)] bg-[var(--surface-page)] px-6 py-32 md:px-12"
    >
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            01 · The story behind the metal
          </p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.0, ease: EASE_STANDARD }}
            className="font-display mt-6 text-[clamp(36px,5vw,64px)] font-light leading-[1.05] text-[var(--fg-default)]"
          >
            Most aluminium is made with{' '}
            <em className="not-italic text-[var(--color-gold-deep)]">fossil fuels.</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE_STANDARD }}
            className="mt-6 max-w-lg text-[18px] leading-[1.6] text-[var(--fg-muted)]"
          >
            The global average carbon footprint of primary aluminium is{' '}
            {industryAvg.toLocaleString()} kilograms of CO₂ for every tonne produced. EGA's{' '}
            CelestiAL is the first aluminium produced using solar power at scale — verified,
            traceable, signed.
          </motion.p>
        </div>

        <div className="grid gap-6">
          {bars.map((b, i) => (
            <ComparisonBar key={b.label} {...b} max={max} inView={inView} delay={0.2 + i * 0.2} />
          ))}
          <p className="mt-2 font-mono text-[11px] text-[var(--fg-subtle)]">
            kg CO₂e per tonne · cradle-to-gate · ISO 14067
          </p>
        </div>
      </div>
    </section>
  )
}

function ComparisonBar({
  label,
  value,
  tone,
  max,
  inView,
  delay,
}: {
  label: string
  value: number
  tone: 'soft' | 'gold' | 'green'
  max: number
  inView: boolean
  delay: number
}) {
  const display = useCountUp(value, 1.6, inView)
  const widthPct = (value / max) * 100
  const colour =
    tone === 'gold'
      ? 'var(--color-gold-deep)'
      : tone === 'green'
        ? 'var(--color-green)'
        : 'var(--color-ink-soft)'

  return (
    <div>
      <div className="flex items-baseline justify-between text-[14px]">
        <span
          className={
            tone === 'gold' ? 'font-semibold text-[var(--fg-default)]' : 'text-[var(--fg-muted)]'
          }
        >
          {label}
        </span>
        <span className="tabular font-mono text-[14px] text-[var(--fg-default)]">
          {display.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-paper-muted)]">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${widthPct}%` } : {}}
          transition={{ duration: 1.6, delay, ease: EASE_STANDARD }}
          style={{ background: colour, height: '100%' }}
        />
      </div>
    </div>
  )
}
