'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { submitAssignmentAction } from './actions'

export function AssignmentSubmitter({ accessToken }: { accessToken: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-[#166534]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Submitted. Thank you · the requester has been notified.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          try {
            await submitAssignmentAction(accessToken, coerce(text))
            setDone(true)
            setErr(null)
            router.refresh()
          } catch (caught) {
            setErr(caught instanceof Error ? caught.message : 'submit failed')
          }
        })
      }}
      className="space-y-2"
    >
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
          Enter value
        </span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type the value (numbers, true/false, JSON, or text)"
          className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-white px-3 text-[13px]"
        />
      </label>
      {err && <p className="text-[11px] text-[#991B1B]">{err}</p>}
      <button
        type="submit"
        disabled={pending || !text.trim()}
        className="flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 text-[12px] font-medium text-white disabled:opacity-30"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Submit value
      </button>
    </form>
  )
}

function coerce(text: string): unknown {
  const t = text.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t)
    } catch {
      return t
    }
  }
  return t
}
