import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, FileSignature, History, Layers } from 'lucide-react'

import { Stat } from '@dpp/ui'

import { listMyCredentials } from '@/lib/verifier-api'

export default async function VerifierLanding() {
  const data = await listMyCredentials()

  const active = data.items.filter((c) => c.state === 'active').length
  const superseded = data.items.filter((c) => c.state === 'superseded').length
  const revoked = data.items.filter((c) => c.state === 'revoked').length
  const brands = new Set(data.items.map((c) => c.brand)).size

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Verifier overview
        </p>
        <h1 className="font-display mt-2 text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Issue, renew, revoke.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          Every credential you issue here is signed into the platform's reference store, atomically
          rolls forward to active DPPs on demand, and is independently verifiable from the audit
          log.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Active credentials" value={active} />
        <Stat label="Superseded" value={superseded} context="historical record retained" />
        <Stat label="Revoked" value={revoked} />
        <Stat label="Brands covered" value={brands} />
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ZoneCard
          href="/verifier/issue"
          title="Issue credential"
          summary="Publish a new annual CFP. Supersedes the prior credential for the same brand and surfaces the affected DPPs."
          icon={FileSignature}
        />
        <ZoneCard
          href="/verifier/credentials"
          title="My credentials"
          summary={`${data.items.length} on file. Roll forward, revoke, or inspect signature continuity.`}
          icon={Layers}
        />
        <ZoneCard
          href="/verifier/audit"
          title="Audit trail"
          summary="Every issue / supersede / revoke / rollover, hash-chained, attributed to your DID."
          icon={History}
        />
      </section>
    </div>
  )
}

function ZoneCard({
  href,
  title,
  summary,
  icon: Icon,
}: {
  href: string
  title: string
  summary: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href as Route}
      className="group flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-6 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-[var(--color-accent)]" />
        <ArrowRight className="h-4 w-4 text-[var(--fg-subtle)] transition-transform group-hover:translate-x-1" />
      </div>
      <p className="font-display text-[20px] font-semibold leading-tight text-[var(--fg-default)]">
        {title}
      </p>
      <p className="text-[13px] text-[var(--fg-muted)]">{summary}</p>
    </Link>
  )
}
