import type { ViewerDpp } from '@/lib/dpp-client'

interface Doc {
  id: string
  label: string
  issuer: string
  kind: 'pdf' | 'csv' | 'json'
  sizeKb: number
  url: string
  sha256: string
  tag: string
}

const TAG_PALETTE: Record<string, { bg: string; fg: string }> = {
  'ISO 14067': { bg: 'rgba(91, 134, 90, 0.12)', fg: '#3f6c3e' },
  ASI: { bg: 'rgba(184, 145, 64, 0.16)', fg: '#7c5717' },
  ISO: { bg: 'rgba(91, 134, 90, 0.12)', fg: '#3f6c3e' },
  REACH: { bg: 'rgba(120, 84, 184, 0.14)', fg: '#5b3b8c' },
  RoHS: { bg: 'rgba(120, 84, 184, 0.14)', fg: '#5b3b8c' },
  CBAM: { bg: 'rgba(180, 60, 60, 0.12)', fg: '#8b3232' },
  LCA: { bg: 'rgba(40, 88, 138, 0.12)', fg: '#1f4974' },
  Quality: { bg: 'rgba(40, 88, 138, 0.12)', fg: '#1f4974' },
  Operational: { bg: 'rgba(40, 88, 138, 0.12)', fg: '#1f4974' },
  MSDS: { bg: 'rgba(195, 99, 33, 0.14)', fg: '#7c4516' },
}

function tagStyle(tag: string) {
  return TAG_PALETTE[tag] ?? { bg: 'rgba(10,10,10,0.06)', fg: 'var(--fg-muted)' }
}

/** Documentation vault · listing + per-document audience-filtered access.
 * Server-rendered; works without JS. */
export function Documentation({ dpp }: { dpp: ViewerDpp }) {
  const docs = (dpp.dpp.documents ?? []) as Doc[]
  if (!Array.isArray(docs) || docs.length === 0) return null

  return (
    <section className="bg-[var(--surface-recessed)] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Documentation
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-[clamp(34px,5vw,56px)] font-light leading-[1.05] tracking-[-0.015em] text-[var(--fg-default)]">
          Every document a regulator could ask for, in one place.
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-[1.7] text-[var(--fg-muted)]">
          Each artefact is hash-pinned and signed. Click to download a PDF/CSV; verifiers can pull
          the bundled W3C VC envelope from the export menu above.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
          {docs.map((d) => {
            const tag = tagStyle(d.tag)
            return (
              <a
                key={d.id}
                href={d.url}
                className="group flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--surface-divider)] bg-[var(--color-paper)] p-5 transition hover:border-[var(--color-ink)]/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-ink)] text-[var(--color-paper)]">
                  <DocIcon kind={d.kind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[var(--fg-default)]">{d.label}</p>
                    <span
                      className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
                      style={{ background: tag.bg, color: tag.fg }}
                    >
                      {d.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                    Issued by {d.issuer} · {d.kind.toUpperCase()} · {(d.sizeKb / 1024).toFixed(2)} MB
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-[var(--fg-subtle)]">
                    SHA-256 {d.sha256}
                  </p>
                </div>
                <span className="mt-1 shrink-0 text-[11px] font-medium text-[var(--fg-muted)] transition group-hover:text-[var(--fg-default)]">
                  Open ↗
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DocIcon({ kind }: { kind: 'pdf' | 'csv' | 'json' }) {
  return (
    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.05em]">
      {kind}
    </span>
  )
}
