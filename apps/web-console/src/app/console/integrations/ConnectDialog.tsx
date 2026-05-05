'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Plug, ShieldCheck, X } from 'lucide-react'

import type { Integration } from './data'

interface Props {
  integration: Integration
  /** Optional trigger replacement; defaults to a "Configure" link button. */
  triggerLabel?: string
}

export function ConnectDialog({ integration, triggerLabel = 'Configure' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s)
      setCopied(true)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button type="button" onClick={open} className="int-trigger">
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="int-dlg"
        onClick={(e) => {
          if (e.target === dialogRef.current) close()
        }}
      >
        <div className="int-dlg__panel">
          <header className="int-dlg__head">
            <span className="int-dlg__head-icon">
              <Plug className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="int-dlg__category">{integration.category}</p>
              <h2 className="int-dlg__title">{integration.name}</h2>
              <p className="int-dlg__sub">{integration.description}</p>
            </div>
            <button type="button" onClick={close} className="int-dlg__close" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </header>

          <section className="int-dlg__body">
            <div className="int-dlg__split">
              <div>
                <p className="int-dlg__h">Connection profile</p>
                {integration.fields.map((f) => (
                  <label key={f.key} className="int-dlg__field">
                    <span className="int-dlg__label">{f.label}</span>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      defaultValue={f.value ?? ''}
                      placeholder={f.placeholder}
                      className="int-dlg__input"
                    />
                  </label>
                ))}

                <div className="int-dlg__webhook">
                  <p className="int-dlg__label">Inbound webhook URL</p>
                  <div className="int-dlg__copyrow">
                    <code>{integration.webhookUrl}</code>
                    <button
                      type="button"
                      onClick={() => copy(integration.webhookUrl)}
                      className="int-dlg__copybtn"
                      aria-label="Copy URL"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="int-dlg__side">
                <p className="int-dlg__h">Capabilities</p>
                <ul className="int-dlg__caps">
                  {integration.capabilities.map((c) => (
                    <li key={c}>
                      <ShieldCheck className="h-3 w-3 text-[var(--color-green,#16a34a)]" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>

                <p className="int-dlg__h int-dlg__h--space">Standards</p>
                <div className="int-dlg__chips">
                  {integration.standards.map((s) => (
                    <span key={s} className="int-dlg__chip">
                      {s}
                    </span>
                  ))}
                </div>

                {integration.docsUrl && (
                  <a
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="int-dlg__doclink"
                  >
                    Connector documentation
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </aside>
            </div>
          </section>

          <footer className="int-dlg__foot">
            <span className="int-dlg__foothint">
              <ShieldCheck className="inline h-3 w-3 align-text-top" /> Credentials are encrypted at
              rest with the tenant KMS key.
            </span>
            <div className="flex gap-8px gap-2">
              <button type="button" onClick={close} className="int-dlg__btn int-dlg__btn--ghost">
                Cancel
              </button>
              <button type="button" onClick={close} className="int-dlg__btn int-dlg__btn--primary">
                {integration.status === 'connected' ? 'Save changes' : 'Test & connect'}
              </button>
            </div>
          </footer>
        </div>
      </dialog>

      <style>{INT_DLG_CSS}</style>
    </>
  )
}

const INT_DLG_CSS = `
.int-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  font-size: 12px; font-weight: 600;
  color: var(--fg-default);
  transition: background 150ms, border-color 150ms;
}
.int-trigger:hover { background: var(--surface-hover); border-color: var(--color-graphite); }

.int-dlg { border: 0; padding: 0; background: transparent; max-width: min(720px, 92vw); width: 100%; border-radius: 18px; }
.int-dlg::backdrop { background: rgba(15, 23, 42, 0.42); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.int-dlg[open] { animation: int-dlg-in 220ms cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes int-dlg-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.int-dlg__panel {
  background: var(--surface-page);
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  box-shadow: 0 32px 80px -16px rgba(15,23,42,0.30), 0 8px 24px -8px rgba(15,23,42,0.12);
  overflow: hidden;
}
.int-dlg__head {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid var(--surface-divider);
  background: linear-gradient(180deg, rgba(15,76,129,0.05), transparent 70%);
}
.int-dlg__head-icon {
  display: grid; place-items: center;
  width: 38px; height: 38px;
  border-radius: 11px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
.int-dlg__category {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-accent); font-weight: 700;
}
.int-dlg__title {
  margin-top: 2px;
  font-family: var(--font-display);
  font-size: 19px; font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--fg-default);
}
.int-dlg__sub { margin-top: 4px; font-size: 12.5px; color: var(--fg-muted); line-height: 1.5; }
.int-dlg__close {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  color: var(--fg-subtle);
}
.int-dlg__close:hover { background: var(--surface-hover); color: var(--fg-default); }

.int-dlg__body { padding: 18px 24px 6px; }
.int-dlg__split { display: grid; grid-template-columns: 1fr; gap: 22px; }
@media (min-width: 720px) { .int-dlg__split { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 28px; } }

.int-dlg__h {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--fg-subtle); font-weight: 700;
  margin-bottom: 10px;
}
.int-dlg__h--space { margin-top: 18px; }

.int-dlg__field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.int-dlg__label {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--fg-subtle); font-weight: 600;
}
.int-dlg__input {
  height: 38px; padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  font-size: 13px; color: var(--fg-default);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  font-family: var(--font-mono);
}
.int-dlg__input:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(15,76,129,0.10); }

.int-dlg__webhook { margin-top: 14px; }
.int-dlg__copyrow {
  display: flex; align-items: stretch; gap: 0;
  border-radius: 9px;
  border: 1px solid var(--surface-border);
  background: var(--surface-canvas);
  overflow: hidden;
}
.int-dlg__copyrow code {
  flex: 1;
  padding: 9px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-default);
  white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.int-dlg__copybtn {
  display: grid; place-items: center;
  width: 38px;
  border-left: 1px solid var(--surface-border);
  background: var(--surface-page);
  color: var(--fg-muted);
  transition: background 150ms;
}
.int-dlg__copybtn:hover { background: var(--surface-hover); color: var(--fg-default); }

.int-dlg__side {
  background: var(--surface-canvas);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 16px 18px;
}
.int-dlg__caps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.int-dlg__caps li { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-default); }

.int-dlg__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.int-dlg__chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: 0.06em;
  color: var(--fg-muted);
  font-weight: 600;
}
.int-dlg__doclink {
  margin-top: 14px;
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.1em;
  color: var(--color-accent);
}
.int-dlg__doclink:hover { text-decoration: underline; }

.int-dlg__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 24px 18px;
  border-top: 1px solid var(--surface-divider);
}
.int-dlg__foothint { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-muted); }
.int-dlg__btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 600;
  transition: opacity 150ms, background 150ms;
}
.int-dlg__btn--primary {
  background: var(--color-accent); color: #fff;
  box-shadow: 0 6px 16px -4px rgba(15,76,129,0.45);
}
.int-dlg__btn--primary:hover { opacity: 0.92; }
.int-dlg__btn--ghost { border: 1px solid var(--surface-border); background: var(--surface-page); color: var(--fg-default); }
.int-dlg__btn--ghost:hover { background: var(--surface-hover); }
`
