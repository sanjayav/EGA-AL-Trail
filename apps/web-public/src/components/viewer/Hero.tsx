'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useCountUp, EASE_STANDARD } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

/** Hero · eight discrete entrance moments over ~3s. §10.5.2 */
export function Hero({ dpp }: { dpp: ViewerDpp }) {
  const ident = dpp.dpp.identification as { brand?: string; alloyEn?: string }
  const carbon = dpp.dpp.carbon as {
    valueKgCo2ePerTonne: number
    industryAverageKgCo2ePerTonne?: number
  }
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const translateY = useTransform(scrollYProgress, [0, 0.6], [0, 100])

  // Trigger the count-up immediately on mount.
  const cfp = useCountUp(carbon.valueKgCo2ePerTonne, 2.0, true)
  const industryAvg = carbon.industryAverageKgCo2ePerTonne ?? 14600
  const reductionPct = Math.round((1 - carbon.valueKgCo2ePerTonne / industryAvg) * 100)

  return (
    <motion.section
      ref={sectionRef}
      style={{ opacity, y: translateY }}
      className="relative isolate min-h-screen overflow-hidden bg-[var(--surface-page)] px-6 pb-32 pt-32 md:px-12"
    >
      <SunGlow />

      <div className="relative mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE_STANDARD }}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]"
          >
            Digital Product Passport · v1.0
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE_STANDARD }}
            className="font-display mt-4 text-[clamp(56px,10vw,128px)] font-light leading-[0.85] tracking-[-0.02em] text-[var(--fg-default)]"
          >
            {ident.brand}
            <span className="align-super text-[0.4em] font-light text-[var(--color-gold)]">®</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE_STANDARD }}
            className="font-display mt-6 max-w-xl text-[clamp(20px,2.6vw,32px)] font-light italic leading-[1.2] text-[var(--fg-muted)]"
          >
            {(dpp.dpp as Record<string, { subhead?: string } | undefined>).story?.subhead ??
              "The world's first aluminium born of desert sun."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2, ease: EASE_STANDARD }}
            className="mt-16"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Cradle-to-gate carbon footprint
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 1.4, ease: EASE_STANDARD }}
                className="tabular font-display text-[clamp(72px,18vw,180px)] font-medium leading-none text-[var(--fg-default)]"
                aria-label={`${carbon.valueKgCo2ePerTonne} kilograms of CO2 equivalent per tonne`}
              >
                {cfp.toLocaleString()}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 2.2, ease: EASE_STANDARD }}
                className="font-mono text-[15px] text-[var(--fg-muted)]"
              >
                kg CO₂e/t
              </motion.span>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 2.6, ease: EASE_STANDARD }}
              className="font-display mt-4 max-w-md text-[18px] italic text-[var(--fg-muted)]"
            >
              {reductionPct}% below the industry average of {industryAvg.toLocaleString()} kg/t.
            </motion.p>
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 1.8, ease: EASE_STANDARD }}
          className="self-end font-mono text-[12px] text-[var(--fg-subtle)]"
        >
          <dl className="tabular grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt>Alloy</dt>
            <dd className="text-[var(--fg-default)]">{ident.alloyEn}</dd>
            <dt>Verified</dt>
            <dd className="text-[var(--fg-default)]">DNV · ISO 14067:2018</dd>
            <dt>Standard</dt>
            <dd className="text-[var(--fg-default)]">ASI Performance #27</dd>
          </dl>
        </motion.aside>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 3.0 },
          y: { duration: 2.0, ease: 'easeInOut', repeat: Infinity },
        }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Scroll
        </p>
        <span className="mt-1 inline-block text-[var(--color-gold-deep)]">↓</span>
      </motion.div>
    </motion.section>
  )
}

function SunGlow() {
  return (
    <motion.svg
      initial={{ opacity: 0, rotate: -30 }}
      animate={{ opacity: 0.85, rotate: 0 }}
      transition={{ duration: 2.4, ease: EASE_STANDARD }}
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-32 top-1/4 h-[80vh] max-h-[800px] w-[80vh] max-w-[800px]"
      aria-hidden
    >
      <defs>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F2E2C4" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#D4A574" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4A574" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill="url(#sun)" />
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 36
        const x1 = 100 + Math.cos(angle) * 50
        const y1 = 100 + Math.sin(angle) * 50
        const x2 = 100 + Math.cos(angle) * 90
        const y2 = 100 + Math.sin(angle) * 90
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#D4A574"
            strokeWidth="0.4"
            strokeOpacity="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.4 + i * 0.02, ease: EASE_STANDARD }}
          />
        )
      })}
    </motion.svg>
  )
}
