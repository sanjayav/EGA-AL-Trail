'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Trash2 } from 'lucide-react'

import { Badge, Button } from '@dpp/ui'

import type { WebhookRow } from '@/lib/customer-api'

interface Props {
  initialItems: WebhookRow[]
  supportedEvents: string[]
}

export function WebhookManager({ initialItems, supportedEvents }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<Set<string>>(new Set(['dpp.issued']))
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{ id: number; secret: string } | null>(null)

  function toggleEvent(e: string) {
    setEvents((cur) => {
      const next = new Set(cur)
      if (next.has(e)) next.delete(e)
      else next.add(e)
      return next
    })
  }

  function create() {
    setError(null)
    if (!name.trim() || !url.trim() || events.size === 0) {
      setError('Name, URL and at least one event are required.')
      return
    }
    start(async () => {
      const res = await fetch('/api/portal/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, url, events: [...events] }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        id?: number
        secret?: string
        detail?: string
      }
      if (!res.ok || !body.id || !body.secret) {
        setError(body.detail ?? `HTTP ${res.status}`)
        return
      }
      setRevealedSecret({ id: body.id, secret: body.secret })
      // Optimistic add · refresh from server next time the page loads.
      setItems((cur) => [
        {
          id: body.id!,
          name,
          url,
          events: [...events],
          state: 'active',
          lastDeliveryAt: null,
          failureCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...cur,
      ])
      setName('')
      setUrl('')
      setEvents(new Set(['dpp.issued']))
      router.refresh()
    })
  }

  function remove(id: number) {
    start(async () => {
      const res = await fetch(`/api/portal/webhooks/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) setItems((cur) => cur.filter((i) => i.id !== id))
    })
  }

  return (
    <>
      {revealedSecret && (
        <div className="border-[var(--color-amber)]/40 mb-6 rounded-[var(--radius-md)] border bg-[#FEF3C7] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#92400E]">
            Subscription created · save this secret now
          </p>
          <div className="mt-2 flex items-center gap-3">
            <code className="flex-1 break-all font-mono text-[12px] text-[#78350F]">
              {revealedSecret.secret}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(revealedSecret.secret)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[#78350F] px-3 py-1.5 text-[12px] text-[#FEF3C7] hover:opacity-90"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#78350F]">
            This is the only time the platform will show the plaintext secret. Store it in your
            secret manager before navigating away.
          </p>
        </div>
      )}

      <section className="mb-10 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Register a new endpoint
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BMW · production webhook"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-2 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>
          <Field label="Target URL">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.bmw.example/dpp"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-2 font-mono text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </Field>
        </div>
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
            Events
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {supportedEvents.map((e) => (
              <button
                key={e}
                onClick={() => toggleEvent(e)}
                className={`rounded-[var(--radius-pill)] px-3 py-1 font-mono text-[11px] transition-colors ${
                  events.has(e)
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--surface-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-red-50 p-2 text-[13px] text-red-900">
            {error}
          </p>
        )}
        <div className="mt-5">
          <Button onClick={create} disabled={pending} loading={pending}>
            {pending ? 'Creating…' : 'Create subscription'}
          </Button>
        </div>
      </section>

      <section>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          Active subscriptions
        </p>
        {items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-recessed)] p-8 text-center text-[14px] text-[var(--fg-subtle)]">
            No webhooks registered yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--fg-default)]">{item.name}</p>
                    <Badge tone={item.state === 'active' ? 'success' : 'neutral'}>
                      {item.state}
                    </Badge>
                  </div>
                  <p className="mt-1 break-all font-mono text-[12px] text-[var(--fg-muted)]">
                    {item.url}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.events.map((e) => (
                      <span
                        key={e}
                        className="rounded-[var(--radius-sm)] bg-[var(--surface-hover)] px-2 py-0.5 font-mono text-[10px] text-[var(--fg-muted)]"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-[var(--radius-sm)] p-2 text-[var(--fg-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-red)]"
                  aria-label={`delete ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  )
}
