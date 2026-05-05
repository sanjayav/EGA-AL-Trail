import { listWebhooks } from '@/lib/customer-api'
import { WebhookManager } from '@/components/portal/WebhookManager'

export default async function WebhooksPage() {
  const data = await listWebhooks()

  return (
    <div className="px-10 py-10">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Real-time webhook subscriptions
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-[var(--fg-default)]">
          Push, not poll.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--fg-muted)]">
          Register an endpoint and we'll deliver every passport event in
          real-time. Each delivery is HMAC-SHA256-signed using a per-subscription
          secret you generate here. Replay-protected via timestamp; failed
          deliveries enter the DLQ after 5 retries with exponential backoff.
        </p>
      </header>

      <WebhookManager
        initialItems={data.items}
        supportedEvents={data.supportedEvents}
      />

      <section className="mt-12 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Verifying a delivery
        </p>
        <p className="mt-2 max-w-2xl text-[13px] text-[var(--fg-muted)]">
          Each request carries an <code className="font-mono">X-DPP-Signature</code>{' '}
          header in the format <code className="font-mono">t=&lt;unix&gt;,v1=&lt;hex-sha256-hmac&gt;</code>.
          Compute <code className="font-mono">HMAC-SHA256(secret, &lt;timestamp&gt;.&lt;raw-body&gt;)</code>{' '}
          and compare in constant time. Reject deliveries older than 5 minutes.
        </p>
      </section>
    </div>
  )
}
