import type { Route } from 'next'
import Link from 'next/link'
import { ClipboardList, FileSignature, History, KeyRound, Layers, LogOut } from 'lucide-react'

interface NavItem {
  href: Route
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { href: '/verifier', label: 'Overview', icon: KeyRound },
  { href: '/verifier/issue', label: 'Issue credential', icon: FileSignature },
  { href: '/verifier/credentials', label: 'My credentials', icon: Layers },
  { href: '/verifier/audit', label: 'Audit trail', icon: History },
  { href: '/verifier/audits', label: 'Audits & samples', icon: ClipboardList },
]

export function VerifierShell({
  verifier,
  children,
}: {
  verifier: { name: string; did: string; org: string }
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-[var(--surface-page)]">
      <aside className="flex flex-col border-r border-[var(--surface-border)] bg-[var(--surface-recessed)]">
        <div className="border-b border-[var(--surface-border)] px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Verifier &amp; Auditor
          </p>
          <p className="font-display mt-2 text-[18px] font-semibold leading-tight text-[var(--fg-default)]">
            {verifier.name}
          </p>
          <p className="break-all font-mono text-[11px] text-[var(--fg-muted)]">{verifier.did}</p>
        </div>
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg-default)]"
                >
                  <item.icon className="h-4 w-4 text-[var(--fg-subtle)] group-hover:text-[var(--color-accent)]" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-[var(--surface-border)] px-5 py-3 text-[11px] text-[var(--fg-subtle)]">
          <p className="font-mono uppercase tracking-[0.15em]">Authenticated via</p>
          <p className="mt-1 text-[var(--fg-muted)]">W3C Verifiable Credential · {verifier.org}</p>
          <form action="/api/auth/sign-out" method="post" className="mt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-page)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg-default)] hover:bg-[var(--surface-hover)]"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 overflow-x-auto">{children}</main>
    </div>
  )
}
