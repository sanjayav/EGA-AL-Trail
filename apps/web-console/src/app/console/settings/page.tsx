import { Badge } from '@dpp/ui'

import { currentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Tenant Settings · v1.0 ships read-only views of the platform config that's
 * currently applied. Editable panels (branding, webhooks UI, API keys) land in
 * Sprint 8 alongside the Super Admin tenants tab.
 *
 * Required role: tenant_admin or it_administrator (page-level · the settings
 * shell would normally route you out otherwise; we leave that to the layout
 * tier).
 */
export default async function SettingsPage() {
  const user = await currentUser()
  // The web side reads NEXT_PUBLIC_API_BASE_URL but the actual platform
  // identity (issuer DID, signing provider, JWT issuer) is configured on the
  // API. We surface what's safely visible client-side.
  const issuerDid = process.env.NEXT_PUBLIC_DPP_ISSUER_DID ?? 'did:web:dpp.ega.local'
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
  const env = (process.env.DPP_ENV ?? 'development') as 'development' | 'staging' | 'production'

  return (
    <div className="px-8 py-8">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight text-[var(--fg-default)]">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-[var(--fg-muted)]">
          Tenant configuration. Editable panels land in Sprint 8; today this is a read-only view of
          what's currently applied.
        </p>
      </header>

      <Section title="Tenant profile">
        <Field label="Slug" value={user.tenantSlug} mono />
        <Field label="Tenant ID" value={String(user.tenantId)} mono />
        <Field label="Active session" value={`${user.displayName} · ${user.role}`} />
      </Section>

      <Section title="Issuer identity">
        <Field label="Issuer DID" value={issuerDid} mono />
        <Field label="Signature suite" value="Ed25519Signature2020" />
        <Field
          label="Signing provider"
          value={
            <span className="flex items-center gap-2">
              <Badge tone="neutral">configured server-side</Badge>
              <span className="text-[12px] text-[var(--fg-muted)]">local_file · env · aws_kms</span>
            </span>
          }
        />
        <Field label="DID document" value={`${apiBase}/.well-known/did.json`} mono link />
      </Section>

      <Section title="Authentication">
        <Field
          label="JWT verification"
          value={
            env === 'production'
              ? 'JWKS-verified asymmetric (RS256/ES256)'
              : 'Dev HS256 fallback (boot validator forbids in production)'
          }
        />
        <Field label="Audience" value="dpp-api" mono />
        <Field
          label="Tenancy claim"
          value={
            <span>
              <code className="font-mono text-[12px]">tnt</code> · pinned by IdP, never accepted
              from headers
            </span>
          }
        />
      </Section>

      <Section title="Reference data">
        <Field label="Schema contract" value="DPP 1.0 manifest (106 attributes)" />
        <Field label="CFP source" value="reference_cfp table (managed by verifier surface)" />
        <Field label="Brand presets" value="packages/schema/presets · version-pinned" />
      </Section>

      <Section title="Pending Sprint 8">
        <ul className="space-y-1 text-[13px] text-[var(--fg-muted)]">
          <li>· Editable tenant profile (legal entity, GLN, branding)</li>
          <li>· API keys management with rotation + scoping</li>
          <li>· Identifier catalogues (GTIN, facility UFI, alloy)</li>
          <li>· Custom domain white-label for the public viewer</li>
          <li>· Stripe Billing portal embed</li>
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-5">
      <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {title}
      </h2>
      <dl className="grid grid-cols-[200px_1fr] gap-x-6 gap-y-3">{children}</dl>
    </section>
  )
}

function Field({
  label,
  value,
  mono,
  link,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  link?: boolean
}) {
  const isString = typeof value === 'string'
  return (
    <>
      <dt className="text-[12px] text-[var(--fg-muted)]">{label}</dt>
      <dd
        className={
          mono
            ? 'font-mono text-[12px] text-[var(--fg-default)]'
            : 'text-[13px] text-[var(--fg-default)]'
        }
      >
        {link && isString ? (
          <a href={value as string} target="_blank" rel="noreferrer" className="hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </>
  )
}
