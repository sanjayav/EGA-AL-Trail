'use client'

import { motion, useScroll, useTransform } from 'motion/react'

import type { ViewerDpp } from '@/lib/dpp-client'

/** Fixed top navigation · reveals on scroll. §10.5.1 */
export function TopBar({ dpp }: { dpp: ViewerDpp }) {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 200], [0, 1])
  const ident = dpp.dpp.identification as { brand?: string; alloyEn?: string } | undefined
  const upiStruct = dpp.dpp.upi as { castNumber?: string } | undefined

  return (
    <motion.div
      style={{ opacity }}
      className="fixed inset-x-0 top-0 z-40 backdrop-blur-md"
    >
      <div className="border-b border-[var(--surface-divider)] bg-[var(--color-paper)]/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-ink)] text-[var(--color-paper)] font-display font-bold">
              E
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg-default)]">
              Emirates Global Aluminium
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] md:inline">
              {ident?.brand} · {ident?.alloyEn}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {upiStruct?.castNumber && (
              <span className="hidden font-mono text-[11px] text-[var(--fg-subtle)] md:inline tabular">
                {upiStruct.castNumber}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-green)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-green)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
              </span>
              Verified
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
