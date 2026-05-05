'use client'

import { motion, useInView } from 'motion/react'
import { Check } from 'lucide-react'
import { useRef } from 'react'
import { EASE_STANDARD } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

/** Compliance grid against dark ink background. §10.5.8 */
export function Compliance({ dpp }: { dpp: ViewerDpp }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  const compliance = dpp.dpp.compliance as {
    regulations: { name: string; reference?: string; status: string }[]
    certifications: { name: string; reference?: string; status: string }[]
  }
  const items = [...compliance.regulations, ...compliance.certifications]

  return (
    <section
      ref={ref}
      className="border-t border-[var(--color-line)] bg-[var(--color-ink)] px-6 py-32 text-[var(--color-paper)] md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-[var(--color-paper)]/60 font-mono text-[11px] uppercase tracking-[0.2em]">
          03 · Compliance
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.0, ease: EASE_STANDARD }}
          className="font-display mt-6 max-w-2xl text-[clamp(36px,5vw,64px)] font-light leading-[1.05] text-[var(--color-paper)]"
        >
          Every claim, <em>every standard.</em>
        </motion.h2>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((entry, i) => (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.05, ease: EASE_STANDARD }}
              whileHover={{ y: -4 }}
              className="group rounded-[var(--radius-md)] border border-[rgba(245,241,232,0.15)] bg-[rgba(245,241,232,0.02)] p-5 transition-colors hover:border-[var(--color-gold)]"
            >
              <Check className="h-4 w-4 text-[var(--color-gold)]" aria-hidden />
              <p className="text-[var(--color-paper)]/60 mt-3 font-mono text-[10px] uppercase tracking-[0.15em]">
                Compliant
              </p>
              <p className="font-display mt-1 text-[18px] leading-[1.2] text-[var(--color-paper)] transition-colors group-hover:text-[var(--color-gold)]">
                {entry.name}
              </p>
              {entry.reference && (
                <p className="tabular text-[var(--color-paper)]/50 mt-2 font-mono text-[11px]">
                  {entry.reference}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
