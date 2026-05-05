'use client'

import { useMemo, useState, useTransition } from 'react'
import { Download, FileArchive } from 'lucide-react'

import { Badge, Button } from '@dpp/ui'

import type { CustomerDppRow } from '@/lib/customer-api'

interface ExportTableProps {
  rows: CustomerDppRow[]
}

export function ExportTable({ rows }: ExportTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lastReceipt, setLastReceipt] = useState<{ id: string; bytes: number; items: number } | null>(
    null,
  )

  const brands = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => set.add(r.brand))
    return ['all', ...Array.from(set).sort()]
  }, [rows])

  const filtered = useMemo(
    () => (filterBrand === 'all' ? rows : rows.filter((r) => r.brand === filterBrand)),
    [rows, filterBrand],
  )

  const allSelectedInFilter = filtered.length > 0 && filtered.every((r) => selected.has(r.upi))

  function toggleAll() {
    setSelected((cur) => {
      const next = new Set(cur)
      if (allSelectedInFilter) filtered.forEach((r) => next.delete(r.upi))
      else filtered.forEach((r) => next.add(r.upi))
      return next
    })
  }

  function toggle(upi: string) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(upi)) next.delete(upi)
      else next.add(upi)
      return next
    })
  }

  async function exportSelected() {
    setError(null)
    setLastReceipt(null)
    const upis = Array.from(selected)
    if (upis.length === 0) {
      setError('Select at least one DPP to export.')
      return
    }
    start(async () => {
      try {
        const res = await fetch('/api/portal/export', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ upis }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string }
          throw new Error(body.detail ?? `HTTP ${res.status}`)
        }
        const blob = await res.blob()
        const receiptId = res.headers.get('X-Bundle-Receipt-Id') ?? 'bundle'
        const itemCount = Number(res.headers.get('X-Bundle-Item-Count') ?? upis.length)
        const sizeBytes = blob.size
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${receiptId}.zip`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
        setLastReceipt({ id: receiptId, bytes: sizeBytes, items: itemCount })
        setSelected(new Set())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'export failed')
      }
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {brands.map((b) => (
            <button
              key={b}
              onClick={() => setFilterBrand(b)}
              className={`rounded-[var(--radius-pill)] px-3 py-1 text-[12px] transition-colors ${
                filterBrand === b
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--surface-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]'
              }`}
            >
              {b === 'all' ? 'All brands' : b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-[var(--fg-subtle)]">
            {selected.size} selected · {filtered.length} shown
          </span>
          <Button
            onClick={exportSelected}
            disabled={selected.size === 0 || pending}
            loading={pending}
            leadingIcon={<FileArchive className="h-4 w-4" />}
          >
            {pending ? 'Building bundle…' : 'Export selected'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 text-[13px] text-red-900">
          {error}
        </div>
      )}
      {lastReceipt && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] p-3 text-[13px] text-[var(--fg-default)]">
          <Download className="h-4 w-4 text-[var(--color-green)]" />
          <span>
            Bundle <code className="font-mono text-[12px]">{lastReceipt.id}</code> ·{' '}
            {lastReceipt.items} {lastReceipt.items === 1 ? 'DPP' : 'DPPs'} ·{' '}
            {(lastReceipt.bytes / 1024).toFixed(1)} KB · signed by issuer DID
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-page)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--surface-recessed)] text-[11px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  aria-label="select all"
                  checked={allSelectedInFilter}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">UPI</th>
              <th className="px-4 py-3 text-left font-medium">Brand</th>
              <th className="px-4 py-3 text-left font-medium">Alloy</th>
              <th className="px-4 py-3 text-right font-medium">Mass (kg)</th>
              <th className="px-4 py-3 text-right font-medium">CFP (kg/t)</th>
              <th className="px-4 py-3 text-right font-medium">Recycled</th>
              <th className="px-4 py-3 text-left font-medium">Verifier</th>
              <th className="px-4 py-3 text-left font-medium">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-divider)]">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-[14px] text-[var(--fg-subtle)]"
                >
                  No DPPs match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.upi}
                className={`hover:bg-[var(--surface-hover)] ${
                  selected.has(r.upi) ? 'bg-[var(--color-accent-soft)]/40' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`select ${r.upi}`}
                    checked={selected.has(r.upi)}
                    onChange={() => toggle(r.upi)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[12px] truncate inline-block max-w-[260px]">
                    {r.upi}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--fg-default)]">{r.brand}</td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{r.alloy}</td>
                <td className="tabular px-4 py-3 text-right font-mono text-[12px]">
                  {Math.round(r.weightKg).toLocaleString()}
                </td>
                <td className="tabular px-4 py-3 text-right font-mono text-[12px]">
                  {Math.round(r.cfpKgCo2ePerTonne).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={r.recycledContentPct > 0 ? 'success' : 'neutral'}>
                    {r.recycledContentPct.toFixed(0)}%
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">
                  {r.verifierName ?? '—'}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-[var(--fg-muted)]">
                  {r.issuedAt?.slice(0, 10) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
