'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { submitAssignment } from './client'

export function AssignmentForm({
  token,
  initial,
  assigneeName,
}: {
  token: string
  initial: unknown
  assigneeName: string
}) {
  const router = useRouter()
  const [text, setText] = useState(initial === null || initial === undefined ? '' : String(initial))
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setErr(null)
        startTransition(async () => {
          const r = await submitAssignment(token, coerce(text))
          if ('error' in r) setErr(r.error)
          else router.refresh()
        })
      }}
      className="rounded-2xl border border-[#E5DCC4] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A6F3D]">
        Submitting as
      </p>
      <p className="mt-1 text-[14px] font-medium text-[#1B1B1B]">{assigneeName}</p>

      <label className="mt-5 block">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A6F3D]">
          Your value
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Type the value · numbers, true/false, plain text, or JSON for objects."
          className="mt-2 block w-full resize-none rounded-xl border border-[#E5DCC4] bg-[#FAF6E9] p-3 text-[15px] text-[#1B1B1B] focus:border-[#8A6F3D] focus:outline-none"
        />
      </label>

      <p className="mt-3 text-[11px] leading-5 text-[#8A8A8A]">
        Numeric and boolean strings are coerced automatically. Wrap objects in{' '}
        <code className="font-mono">{'{}'}</code> for JSON.
      </p>

      {err && (
        <p className="mt-4 rounded-lg bg-[#FEE2E2] p-3 text-[12px] text-[#991B1B]">{err}</p>
      )}

      <button
        type="submit"
        disabled={pending || !text.trim()}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#1B1B1B] px-6 text-[13px] font-medium text-white transition hover:bg-[#3A3A3A] disabled:cursor-not-allowed disabled:opacity-30"
      >
        {pending ? 'Submitting…' : 'Submit value'}
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
