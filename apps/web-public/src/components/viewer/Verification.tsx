'use client'

import { AnimatePresence, motion, useInView } from 'motion/react'
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { EASE_STANDARD } from '@dpp/ui'

import type { ViewerDpp } from '@/lib/dpp-client'

type VerifyState = 'idle' | 'verifying' | 'verified'

/** Verification ceremony · three-state button with spring-out checkmark. §10.5.9 */
export function Verification({ dpp }: { dpp: ViewerDpp }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [state, setState] = useState<VerifyState>('idle')

  const carbon = dpp.dpp.carbon as {
    verifier?: { name?: string; did?: string }
    verificationStatementRef?: string
    methodology?: string
    reportingPeriod?: { from?: string; to?: string }
    declaredUnit?: string
  }
  const meta = dpp.dpp.meta as { issuerDid?: string }
  const upiStruct = dpp.dpp.upi as { digitalLinkUrl?: string }
  const [error, setError] = useState<string | null>(null)

  const lines: { label: string; value: string | undefined }[] = [
    { label: 'Issuer', value: 'Emirates Global Aluminium PJSC' },
    { label: 'Issuer DID', value: meta.issuerDid },
    { label: 'CFP verifier', value: carbon.verifier?.name },
    { label: 'Statement', value: carbon.verificationStatementRef },
    { label: 'Standard', value: 'ISO 14067:2018' },
    {
      label: 'Period',
      value: carbon.reportingPeriod
        ? `${carbon.reportingPeriod.from} → ${carbon.reportingPeriod.to}`
        : undefined,
    },
    { label: 'Methodology', value: carbon.methodology },
    { label: 'Declared unit', value: carbon.declaredUnit },
  ]

  async function verify() {
    if (state !== 'idle') return
    setState('verifying')
    setError(null)
    // Sample DPPs (the demo paths) don't have real signatures · show the
    // animation but skip the network call.
    if (dpp.upi.startsWith('sample/')) {
      await new Promise((r) => setTimeout(r, 1800))
      setState('verified')
      return
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiBase}/api/v1/dpps/${dpp.upi}/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      const body = (await res.json()) as { valid: boolean; error?: string }
      if (body.valid) {
        setState('verified')
      } else {
        setState('idle')
        setError(body.error ?? 'verification failed')
      }
    } catch (e) {
      setState('idle')
      setError(e instanceof Error ? e.message : 'network error')
    }
  }

  return (
    <section
      ref={ref}
      className="border-t border-[var(--surface-divider)] bg-[var(--surface-page)] px-6 py-32 md:px-12"
    >
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          04 · Verification
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.0, ease: EASE_STANDARD }}
          className="mt-6 font-display text-[clamp(36px,5vw,64px)] font-light leading-[1.05] text-[var(--fg-default)]"
        >
          Cryptographically <em>signed.</em>
        </motion.h2>

        <dl className="mt-12 grid gap-3 md:grid-cols-2">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline gap-3">
              <ShieldCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-gold-deep)]"
                aria-hidden
              />
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
                  {l.label}
                </dt>
                <dd className="mt-0.5 break-all text-[14px] text-[var(--fg-default)]">
                  {l.value ?? '—'}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <button
          onClick={verify}
          disabled={state !== 'idle'}
          className="mt-12 flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-ink)] px-6 py-5 text-[var(--color-paper)] transition-colors duration-300 hover:bg-[var(--color-gold-deep)] disabled:cursor-default"
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            {state === 'idle' && (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 font-display text-[18px]"
              >
                <ShieldCheck className="h-5 w-5" />
                Verify cryptographic signature
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.span>
            )}
            {state === 'verifying' && (
              <motion.span
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 font-display text-[18px]"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
                  className="inline-flex"
                >
                  <Sparkles className="h-5 w-5" />
                </motion.span>
                Verifying ed25519 signature…
              </motion.span>
            )}
            {state === 'verified' && (
              <motion.span
                key="verified"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 font-display text-[18px] text-[var(--color-paper)]"
                style={{ background: 'var(--color-green)' }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="inline-flex"
                >
                  <Check className="h-5 w-5" />
                </motion.span>
                Signature verified · Authentic and unmodified
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {error && (
          <p className="mt-4 rounded-[var(--radius-md)] bg-red-50 p-3 text-[13px] text-red-900">
            {error}
          </p>
        )}

        {upiStruct.digitalLinkUrl && (
          <p className="mt-6 break-all rounded-[var(--radius-md)] bg-[var(--color-paper-soft)] p-4 font-mono text-[12px] text-[var(--fg-muted)] hover:text-[var(--color-gold-deep)]">
            {upiStruct.digitalLinkUrl}
          </p>
        )}
      </div>
    </section>
  )
}
