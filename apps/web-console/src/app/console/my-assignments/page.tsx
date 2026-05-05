import Link from 'next/link'
import { ClipboardList, FileText, Lock } from 'lucide-react'

import { Badge } from '@dpp/ui'
import { currentUser } from '@/lib/auth'
import { fetchAssignmentInbox } from '@/lib/draft-api'
import { AssignmentSubmitter } from './AssignmentSubmitter'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MyAssignmentsPage() {
  const user = await currentUser()
  const assignments = await fetchAssignmentInbox(user.email)

  const pending = assignments.filter((a) => a.status === 'pending' || a.status === 'accepted')
  const completed = assignments.filter((a) => a.status === 'submitted')
  const revoked = assignments.filter((a) => a.status === 'revoked')

  return (
    <div className="mx-auto w-full max-w-[1100px] px-7 py-8">
      <header className="mb-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--color-accent)]">
          External Assignments
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[var(--fg-default)]">
          My Assignments
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[var(--fg-muted)]">
          Attributes that other tenants have asked you to supply for their digital product
          passports. You can only see and submit values for the items below · every other tenant
          surface is locked.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--surface-hover)] px-2.5 py-1 text-[11px] text-[var(--fg-muted)]">
          <Lock className="h-3 w-3" />
          Filtered by {user.email}
        </p>
      </header>

      <Section title="Awaiting your input" count={pending.length}>
        {pending.length === 0 ? (
          <Empty label="Nothing pending. Great · go enjoy your day." />
        ) : (
          <ul className="space-y-2">
            {pending.map((a) => (
              <li key={a.id}>
                <AssignmentCard assignment={a} canSubmit />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {completed.length > 0 && (
        <Section title="Submitted" count={completed.length}>
          <ul className="space-y-2">
            {completed.map((a) => (
              <li key={a.id}>
                <AssignmentCard assignment={a} canSubmit={false} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {revoked.length > 0 && (
        <Section title="Revoked" count={revoked.length}>
          <ul className="space-y-2">
            {revoked.map((a) => (
              <li key={a.id}>
                <AssignmentCard assignment={a} canSubmit={false} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-[var(--fg-subtle)]" />
        <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">{title}</h2>
        <span className="rounded-[var(--radius-pill)] bg-[var(--surface-hover)] px-2 py-0.5 font-mono text-[10px] text-[var(--fg-subtle)]">
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--surface-border)] bg-[var(--color-fog)] p-6 text-center text-[12px] text-[var(--fg-muted)]">
      {label}
    </div>
  )
}

function AssignmentCard({
  assignment,
  canSubmit,
}: {
  assignment: import('@/lib/draft-api').InboxAssignment
  canSubmit: boolean
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--fg-subtle)]" />
            <p className="text-[13px] font-semibold text-[var(--fg-default)]">
              {assignment.manifestAttr.label}
            </p>
            {assignment.manifestAttr.necessity === 'mandatory' && (
              <span className="rounded-[var(--radius-pill)] bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#92400E]">
                Required
              </span>
            )}
          </div>
          <p className="mt-1 break-all font-mono text-[11px] text-[var(--fg-subtle)]">
            {assignment.manifestAttr.attributePath}
          </p>
          <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
            For <strong>{assignment.draft.productName}</strong> · cast{' '}
            <strong>{assignment.draft.castNumber}</strong> · DPP {assignment.manifestAttr.version}
          </p>
          {assignment.note && (
            <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-fog)] p-2 text-[11px] text-[var(--fg-muted)]">
              <strong>Note from requester:</strong> {assignment.note}
            </p>
          )}
          {assignment.manifestAttr.regulatoryAnchor && (
            <p className="mt-2 inline-block rounded-[var(--radius-pill)] bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--fg-muted)]">
              {assignment.manifestAttr.regulatoryAnchor}
            </p>
          )}
        </div>
        <Badge tone={badgeTone(assignment.status)}>{assignment.status}</Badge>
      </div>

      {canSubmit && assignment.accessToken && (
        <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
          <AssignmentSubmitter accessToken={assignment.accessToken} />
        </div>
      )}
    </div>
  )
}

function badgeTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'critical' {
  switch (status) {
    case 'submitted':
      return 'success'
    case 'pending':
      return 'warning'
    case 'accepted':
      return 'info'
    case 'revoked':
      return 'critical'
    default:
      return 'neutral'
  }
}
