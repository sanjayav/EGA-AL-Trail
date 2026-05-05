import Link from 'next/link'
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  MoreHorizontal,
  ShieldOff,
  UserPlus,
  Users,
} from 'lucide-react'

import { currentUser } from '@/lib/auth'
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_PROFILES,
  TENANT_ROLES,
  canManage,
  hasPermission,
  type Permission,
  type PermissionGroup,
  type RoleProfile,
  type TenantRole,
} from '@/lib/rbac'

import { InviteMemberDialog } from './InviteMemberDialog'
import { listPendingInvites } from './invite-store'

export const revalidate = 30

interface Member {
  id: string
  name: string | null
  email: string
  role: TenantRole
  status: 'active' | 'pending' | 'suspended'
  invitedAt: string
  joinedAt: string | null
  lastActiveAt: string | null
  mfaEnabled: boolean
  invitedBy: string
}

const MEMBERS: Member[] = [
  {
    id: 'u-ega-admin',
    name: 'Fatima Al-Mansoori',
    email: 'sustainability.lead@ega.ae',
    role: 'tenant_admin',
    status: 'active',
    invitedAt: '2025-12-01',
    joinedAt: '2025-12-02',
    lastActiveAt: '2026-05-05T09:32:00Z',
    mfaEnabled: true,
    invitedBy: 'platform',
  },
  {
    id: 'u-ega-it',
    name: 'Mohammed Al-Zaabi',
    email: 'it@ega.ae',
    role: 'it_administrator',
    status: 'active',
    invitedAt: '2026-01-10',
    joinedAt: '2026-01-10',
    lastActiveAt: '2026-05-04T17:11:00Z',
    mfaEnabled: true,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'u-ega-ops',
    name: 'Ahmed Al-Hashimi',
    email: 'casthouse.ops@ega.ae',
    role: 'dpp_operator',
    status: 'active',
    invitedAt: '2026-01-15',
    joinedAt: '2026-01-15',
    lastActiveAt: '2026-05-05T07:45:00Z',
    mfaEnabled: true,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'u-ega-ops-2',
    name: 'Rashid Al-Suwaidi',
    email: 'smelter.ops@ega.ae',
    role: 'dpp_operator',
    status: 'active',
    invitedAt: '2026-02-01',
    joinedAt: '2026-02-02',
    lastActiveAt: '2026-05-04T22:18:00Z',
    mfaEnabled: false,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'u-ega-ops-3',
    name: 'Hamdan Al-Shamsi',
    email: 'refinery.lead@ega.ae',
    role: 'dpp_operator',
    status: 'active',
    invitedAt: '2026-02-15',
    joinedAt: '2026-02-16',
    lastActiveAt: '2026-05-03T13:09:00Z',
    mfaEnabled: true,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'u-ega-qa',
    name: 'Sara Al-Blooshi',
    email: 'qa@ega.ae',
    role: 'dpp_reviewer',
    status: 'active',
    invitedAt: '2026-01-20',
    joinedAt: '2026-01-21',
    lastActiveAt: '2026-05-05T08:50:00Z',
    mfaEnabled: true,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'u-ega-qa-2',
    name: 'Noura Al-Ketbi',
    email: 'carbon.analyst@ega.ae',
    role: 'dpp_reviewer',
    status: 'active',
    invitedAt: '2026-02-05',
    joinedAt: '2026-02-05',
    lastActiveAt: '2026-05-04T11:30:00Z',
    mfaEnabled: true,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'u-ega-audit',
    name: 'Khalid Al-Nuaimi',
    email: 'audit@ega.ae',
    role: 'tenant_auditor',
    status: 'active',
    invitedAt: '2026-01-20',
    joinedAt: '2026-01-22',
    lastActiveAt: '2026-05-02T16:00:00Z',
    mfaEnabled: true,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'u-ega-audit-2',
    name: 'Omar Al-Dhaheri',
    email: 'compliance.lead@ega.ae',
    role: 'tenant_auditor',
    status: 'active',
    invitedAt: '2026-02-10',
    joinedAt: '2026-02-11',
    lastActiveAt: '2026-05-04T09:42:00Z',
    mfaEnabled: false,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'inv-1',
    name: null,
    email: 'logistics@ega.ae',
    role: 'dpp_operator',
    status: 'pending',
    invitedAt: '2026-04-22',
    joinedAt: null,
    lastActiveAt: null,
    mfaEnabled: false,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'inv-2',
    name: null,
    email: 'lab.technician@ega.ae',
    role: 'dpp_operator',
    status: 'pending',
    invitedAt: '2026-04-25',
    joinedAt: null,
    lastActiveAt: null,
    mfaEnabled: false,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'inv-3',
    name: null,
    email: 'environmental@ega.ae',
    role: 'tenant_auditor',
    status: 'pending',
    invitedAt: '2026-04-28',
    joinedAt: null,
    lastActiveAt: null,
    mfaEnabled: false,
    invitedBy: 'sustainability.lead@ega.ae',
  },
  {
    id: 'inv-4',
    name: null,
    email: 'casting.supervisor@ega.ae',
    role: 'dpp_operator',
    status: 'pending',
    invitedAt: '2026-05-01',
    joinedAt: null,
    lastActiveAt: null,
    mfaEnabled: false,
    invitedBy: 'it@ega.ae',
  },
  {
    id: 'sus-1',
    name: 'Ali Al-Jazeeri',
    email: 'former.ops@ega.ae',
    role: 'dpp_operator',
    status: 'suspended',
    invitedAt: '2025-08-15',
    joinedAt: '2025-08-16',
    lastActiveAt: '2026-03-01T12:00:00Z',
    mfaEnabled: true,
    invitedBy: 'it@ega.ae',
  },
]

const RECENT_RBAC_EVENTS = [
  {
    at: '2026-05-04T17:11:00Z',
    actor: 'it@ega.ae',
    action: 'invited',
    target: 'lab.technician@ega.ae',
    detail: 'Role: DPP Operator',
  },
  {
    at: '2026-05-03T09:00:00Z',
    actor: 'sustainability.lead@ega.ae',
    action: 'role_changed',
    target: 'qa@ega.ae',
    detail: 'Operator → DPP Reviewer',
  },
  {
    at: '2026-04-29T14:30:00Z',
    actor: 'it@ega.ae',
    action: 'mfa_enforced',
    target: 'tenant',
    detail: 'MFA now required for all roles',
  },
  {
    at: '2026-04-22T08:30:00Z',
    actor: 'it@ega.ae',
    action: 'invited',
    target: 'logistics@ega.ae',
    detail: 'Role: DPP Operator',
  },
  {
    at: '2026-03-01T12:00:00Z',
    actor: 'sustainability.lead@ega.ae',
    action: 'suspended',
    target: 'former.ops@ega.ae',
    detail: 'Reason: left organisation',
  },
]

export default async function TeamPage() {
  const me = await currentUser()
  const myRole: TenantRole = (TENANT_ROLES as readonly string[]).includes(me.role)
    ? (me.role as TenantRole)
    : 'tenant_auditor'

  // Fold in any invitations created during this session via the server action.
  // The dev-only `invite-store` keeps them in memory; production swaps to the
  // tenant_users table.
  const liveInvites: Member[] = listPendingInvites().map((i) => ({
    id: i.id,
    name: i.name,
    email: i.email,
    role: i.role,
    status: 'pending' as const,
    invitedAt: i.invitedAt,
    joinedAt: null,
    lastActiveAt: null,
    mfaEnabled: false,
    invitedBy: i.invitedBy,
  }))
  const allMembers = [...liveInvites, ...MEMBERS]

  const active = allMembers.filter((m) => m.status === 'active')
  const pending = allMembers.filter((m) => m.status === 'pending')
  const suspended = allMembers.filter((m) => m.status === 'suspended')
  const mfaCovered = active.filter((m) => m.mfaEnabled).length

  const roleCounts: Record<TenantRole, number> = TENANT_ROLES.reduce(
    (acc, r) => ({ ...acc, [r]: 0 }),
    {} as Record<TenantRole, number>,
  )
  for (const m of active) roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1

  const canManageUsers = hasPermission(myRole, 'manage_users')

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--surface-canvas)]">
      <style>{TEAM_CSS}</style>

      <div className="mx-auto max-w-[1320px] px-7 py-7">
        {/* ── Header · avatar tile + title + invite CTA ──────────── */}
        <header className="team__header">
          <div className="team__header-block">
            <div className="team__header-avatar" aria-hidden>
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="team__title">Team</h1>
              <p className="team__subtitle">
                {me.tenantSlug.toUpperCase()} · member management & RBAC. Roles map 1:1 to SDD
                §12.1.1.
              </p>
            </div>
          </div>
          <div className="team__header-actions">
            <Link href="/console/audit" className="team__btn team__btn--ghost">
              Audit log
            </Link>
            {canManageUsers ? (
              <InviteMemberDialog
                grantableRoles={TENANT_ROLES.filter((r) => canManage(myRole, r))}
                myEmail={me.email}
              />
            ) : (
              <span
                className="team__btn team__btn--disabled"
                title="Requires Tenant Admin or IT Administrator"
              >
                <UserPlus className="h-3.5 w-3.5" /> Invite Member
              </span>
            )}
          </div>
        </header>

        {/* ── KPI strip · 4 cards with corner icons ───────────── */}
        <section className="team__kpi-grid">
          <KpiCard
            label="Total members"
            value={MEMBERS.length}
            sub="All roles"
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard
            label="Active"
            value={active.length}
            sub={`${mfaCovered}/${active.length} have MFA`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="ok"
          />
          <KpiCard
            label="Pending invites"
            value={pending.length}
            sub="Awaiting acceptance"
            icon={<Clock className="h-4 w-4" />}
            tone={pending.length > 0 ? 'amber' : undefined}
          />
          <KpiCard
            label="Suspended"
            value={suspended.length}
            sub="Access revoked"
            icon={<ShieldOff className="h-4 w-4" />}
            tone={suspended.length > 0 ? 'danger' : undefined}
          />
        </section>

        {/* ── Pending invitations ──────────────────────────────── */}
        {pending.length > 0 && (
          <section className="team__section">
            <h2 className="team__section-title">
              Pending Invitations
              <span className="team__count-badge team__count-badge--amber">{pending.length}</span>
            </h2>
            <ul className="team__rows">
              {pending.map((m) => (
                <li key={m.id} className="team__row team__row--pending">
                  <span className="team__row-icon team__row-icon--amber">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="team__row-primary">{m.email}</p>
                    <p className="team__row-secondary">
                      Invited {formatDate(m.invitedAt)} by {m.invitedBy}
                    </p>
                  </div>
                  <div className="team__row-meta">
                    <RoleBadge role={m.role} />
                    <span className="team__pill team__pill--amber">Pending</span>
                    {canManage(myRole, m.role) && <RowMenu kind="pending" />}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Active members ────────────────────────────────── */}
        <section className="team__section">
          <h2 className="team__section-title">
            Members
            <span className="team__count-badge">{active.length}</span>
          </h2>
          <div className="team__rows-card">
            <div className="team__rows-head">
              <span className="team__rows-head-name">Name</span>
              <span className="team__rows-head-meta">Role</span>
              <span className="team__rows-head-meta">Status</span>
              <span className="team__rows-head-meta">Joined</span>
              <span className="team__rows-head-meta" />
            </div>
            <ul className="team__rows team__rows--flat">
              {active.map((m) => {
                const editable = canManage(myRole, m.role) && m.id !== me.id
                return (
                  <li key={m.id} className="team__row team__row--member">
                    <div className="team__row-name">
                      <div className="team__avatar">{(m.name ?? m.email)[0]?.toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="team__row-primary">
                          {m.name ?? m.email}
                          {m.id === me.id && <span className="team__youtag">You</span>}
                        </p>
                        <p className="team__row-secondary">{m.email}</p>
                      </div>
                    </div>
                    <RoleBadge role={m.role} />
                    <span className="team__status">
                      <span className="team__status-dot" /> Active
                    </span>
                    <span className="team__row-meta-text">
                      {formatDate(m.joinedAt ?? m.invitedAt)}
                    </span>
                    {editable ? (
                      <RowMenu kind="member" />
                    ) : (
                      <span className="team__row-meta-text">—</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── Suspended ────────────────────────────────────────── */}
        {suspended.length > 0 && (
          <section className="team__section">
            <h2 className="team__section-title">
              Suspended
              <span className="team__count-badge team__count-badge--danger">
                {suspended.length}
              </span>
            </h2>
            <ul className="team__rows">
              {suspended.map((m) => (
                <li key={m.id} className="team__row team__row--member team__row--muted">
                  <div className="team__row-name">
                    <div className="team__avatar team__avatar--muted">
                      {(m.name ?? m.email)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="team__row-primary">{m.name ?? m.email}</p>
                      <p className="team__row-secondary">{m.email}</p>
                    </div>
                  </div>
                  <RoleBadge role={m.role} muted />
                  <span className="team__status team__status--muted">
                    <span className="team__status-dot team__status-dot--muted" /> Suspended
                  </span>
                  <span className="team__row-meta-text">
                    {m.lastActiveAt ? formatDate(m.lastActiveAt) : '—'}
                  </span>
                  {canManage(myRole, m.role) && <RowMenu kind="suspended" />}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Role overview (collapsed by default) ──────────── */}
        <details className="team__expander">
          <summary className="team__expander-summary">
            <span className="team__expander-title">Role overview</span>
            <span className="team__expander-sub">5 tenant roles · click to expand</span>
            <ChevronDown className="team__expander-chev h-4 w-4" />
          </summary>
          <div className="team__expander-body">
            <div className="team__role-grid">
              {TENANT_ROLES.map((r) => (
                <RoleCard
                  key={r}
                  profile={ROLE_PROFILES[r]}
                  count={roleCounts[r] ?? 0}
                  isMine={r === myRole}
                />
              ))}
            </div>
          </div>
        </details>

        {/* ── Permission matrix (collapsed by default) ─────── */}
        <details className="team__expander">
          <summary className="team__expander-summary">
            <span className="team__expander-title">Permission matrix</span>
            <span className="team__expander-sub">19 permissions × 5 roles · click to expand</span>
            <ChevronDown className="team__expander-chev h-4 w-4" />
          </summary>
          <div className="team__expander-body">
            <PermissionMatrix />
          </div>
        </details>

        {/* ── Recent RBAC events ────────────────────────────── */}
        <section className="team__section">
          <h2 className="team__section-title">
            Recent RBAC events
            <Link href="/console/audit" className="team__viewall">
              View full audit →
            </Link>
          </h2>
          <ol className="team__audit">
            {RECENT_RBAC_EVENTS.map((e, i) => (
              <li key={i} className="team__audit-row">
                <span className="team__audit-time">{formatRelative(e.at)}</span>
                <span className={`team__audit-action team__audit-action--${e.action}`}>
                  {actionLabel(e.action)}
                </span>
                <span className="team__audit-target">{e.target}</span>
                <span className="team__audit-detail">{e.detail}</span>
                <span className="team__audit-actor">by {e.actor}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  tone?: 'ok' | 'amber' | 'danger'
}) {
  return (
    <article className={`team__kpi${tone ? ` team__kpi--${tone}` : ''}`}>
      <div className="team__kpi-head">
        <p className="team__kpi-label">{label}</p>
        <span className={`team__kpi-icon${tone ? ` team__kpi-icon--${tone}` : ''}`}>{icon}</span>
      </div>
      <p className="team__kpi-value">{value}</p>
      <p className="team__kpi-sub">{sub}</p>
    </article>
  )
}

function RowMenu({ kind }: { kind: 'pending' | 'member' | 'suspended' }) {
  // Pure-CSS menu · `<details>` opens an absolutely-positioned menu list.
  // Keeps the page server-rendered with no client JS.
  return (
    <details className="team__menu">
      <summary className="team__menu-trigger" aria-label="Open member actions">
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <ul className="team__menu-list" role="menu">
        {kind === 'pending' && (
          <>
            <li>
              <button>Resend invitation</button>
            </li>
            <li>
              <button>Copy invite link</button>
            </li>
            <li>
              <button>Change role</button>
            </li>
            <li className="team__menu-divider" />
            <li>
              <button className="team__menu-danger">Revoke invite</button>
            </li>
          </>
        )}
        {kind === 'member' && (
          <>
            <li>
              <button>Edit profile</button>
            </li>
            <li>
              <button>Change role</button>
            </li>
            <li>
              <button>Reset MFA</button>
            </li>
            <li>
              <button>View activity</button>
            </li>
            <li className="team__menu-divider" />
            <li>
              <button className="team__menu-danger">Suspend access</button>
            </li>
          </>
        )}
        {kind === 'suspended' && (
          <>
            <li>
              <button>Reinstate</button>
            </li>
            <li>
              <button>View activity</button>
            </li>
            <li className="team__menu-divider" />
            <li>
              <button className="team__menu-danger">Delete record</button>
            </li>
          </>
        )}
      </ul>
    </details>
  )
}

function RoleCard({
  profile,
  count,
  isMine,
}: {
  profile: RoleProfile
  count: number
  isMine: boolean
}) {
  return (
    <details className="team__role">
      <summary className="team__role-summary">
        <span className={`team__role-glyph team__role-glyph--${profile.tone}`}>
          {profile.glyph}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="team__role-label">{profile.label}</span>
            {isMine && <span className="team__youtag">Your role</span>}
          </span>
          <span className="team__role-summary-text">{profile.summary}</span>
        </span>
        <span className="team__role-count">{count}</span>
        <ChevronDown className="team__role-chev h-3.5 w-3.5" />
      </summary>
      <div className="team__role-body">
        <p className="team__role-description">{profile.description}</p>
        <div className="team__role-meta">
          <span>
            Default landing: <code>{profile.defaultLanding}</code>
          </span>
          <span>Permissions: {profile.permissions.length}</span>
        </div>
        <div className="team__role-perms">
          {PERMISSION_GROUPS.map((g) => {
            const perms = profile.permissions.filter((p) => PERMISSION_LABELS[p].group === g)
            if (perms.length === 0) return null
            return (
              <div key={g}>
                <p className="team__role-perm-group-label">{g}</p>
                <ul>
                  {perms.map((p) => (
                    <li key={p}>
                      <CheckCircle2 className="h-3 w-3 text-[var(--color-green,#16a34a)]" />
                      <span>{PERMISSION_LABELS[p].label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </details>
  )
}

function PermissionMatrix() {
  const groups: PermissionGroup[] = PERMISSION_GROUPS
  return (
    <div className="team__matrix-wrap">
      <table className="team__matrix">
        <thead>
          <tr>
            <th className="team__matrix-th-label">Permission</th>
            {TENANT_ROLES.map((r) => (
              <th key={r} className="team__matrix-th">
                <span className={`team__role-glyph team__role-glyph--${ROLE_PROFILES[r].tone}`}>
                  {ROLE_PROFILES[r].glyph}
                </span>
                <span className="block">{ROLE_PROFILES[r].shortLabel}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const perms = (Object.keys(PERMISSION_LABELS) as Permission[]).filter(
              (p) => PERMISSION_LABELS[p].group === g,
            )
            return (
              <>
                <tr key={`group-${g}`}>
                  <td colSpan={1 + TENANT_ROLES.length} className="team__matrix-grouprow">
                    {g}
                  </td>
                </tr>
                {perms.map((p) => (
                  <tr key={p} className="team__matrix-row">
                    <td className="team__matrix-perm">
                      <span>{PERMISSION_LABELS[p].label}</span>
                      <span className="team__matrix-perm-detail">
                        {PERMISSION_LABELS[p].description}
                      </span>
                    </td>
                    {TENANT_ROLES.map((r) => (
                      <td
                        key={r}
                        className={`team__matrix-cell${
                          hasPermission(r, p) ? 'team__matrix-cell--on' : ''
                        }`}
                      >
                        {hasPermission(r, p) ? (
                          <CheckCircle2 className="mx-auto h-3.5 w-3.5" />
                        ) : (
                          '·'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RoleBadge({ role, muted }: { role: TenantRole; muted?: boolean }) {
  const p = ROLE_PROFILES[role]
  return (
    <span
      className={`team__rolebadge team__rolebadge--${p.tone}${muted ? 'team__rolebadge--muted' : ''}`}
    >
      <span className="team__rolebadge-glyph">{p.glyph}</span>
      {p.label}
    </span>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────

function actionLabel(a: string): string {
  if (a === 'role_changed') return 'Role changed'
  if (a === 'mfa_enforced') return 'MFA enforced'
  return a.replace(/^./, (c) => c.toUpperCase())
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const ms = Date.now() - d.getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 14) return `${day}d ago`
  return formatDate(iso)
}

// ── styles ───────────────────────────────────────────────────────────────

const TEAM_CSS = `
/* Header · subtle gradient band so the page reads as a destination,
 * not an empty form. */
.team__header {
  position: relative;
  display: flex; flex-wrap: wrap; align-items: center; gap: 16px;
  justify-content: space-between;
  padding: 28px 28px 30px;
  margin: 0 -28px 28px;
  background:
    radial-gradient(circle at 0% 0%, rgba(15,76,129,0.08), transparent 50%),
    radial-gradient(circle at 100% 0%, rgba(15,76,129,0.05), transparent 50%);
  border-bottom: 1px solid var(--surface-divider);
}
.team__header-block { display: flex; align-items: center; gap: 16px; min-width: 0; }
.team__header-avatar {
  display: grid; place-items: center;
  width: 52px; height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-accent), #4f8fc7);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 8px 24px -8px rgba(15,76,129,0.5);
}
.team__title {
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 30px);
  font-weight: 600; letter-spacing: -0.012em;
  color: var(--fg-default); line-height: 1.1;
}
.team__subtitle { margin-top: 3px; font-size: 13px; color: var(--fg-muted); }
.team__header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.team__btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px;
  border-radius: 8px;
  font-size: 12px; font-weight: 600;
  transition: background 150ms, opacity 150ms;
  white-space: nowrap;
}
.team__btn--primary {
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(15,76,129,0.4);
}
.team__btn--primary:hover { opacity: 0.92; }
.team__btn--ghost {
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  color: var(--fg-default);
}
.team__btn--ghost:hover { background: var(--surface-hover); }
.team__btn--disabled {
  color: var(--fg-subtle);
  border: 1px solid var(--surface-border);
  background: var(--surface-canvas);
  cursor: not-allowed;
}

/* KPI strip */
.team__kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.team__kpi {
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  padding: 18px 20px;
  position: relative;
  transition: border-color 150ms;
}
.team__kpi:hover { border-color: var(--surface-border); }
.team__kpi-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.team__kpi-label {
  font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--fg-subtle);
}
.team__kpi-icon {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 9px;
  background: var(--surface-hover);
  color: var(--fg-muted);
  flex-shrink: 0;
}
.team__kpi-icon--ok    { background: rgba(22,163,74,0.10); color: #16a34a; }
.team__kpi-icon--amber { background: rgba(245,158,11,0.14); color: #b45309; }
.team__kpi-icon--danger { background: rgba(239,68,68,0.10); color: #b91c1c; }
.team__kpi-value {
  margin-top: 14px;
  font-family: var(--font-display);
  font-size: 36px; font-weight: 600;
  letter-spacing: -0.015em; line-height: 1;
  color: var(--fg-default);
  font-variant-numeric: tabular-nums;
}
.team__kpi--ok    .team__kpi-value { color: #16a34a; }
.team__kpi--amber .team__kpi-value { color: #b45309; }
.team__kpi--danger .team__kpi-value { color: #b91c1c; }
.team__kpi-sub {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--fg-muted);
}

/* Inline invite form */
.team__invite {
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  padding: 16px 18px 18px;
  margin-bottom: 24px;
}
.team__invite-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.team__invite-icon {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  flex-shrink: 0;
}
.team__invite-title {
  font-size: 14px; font-weight: 600;
  color: var(--fg-default);
}
.team__invite-sub { margin-top: 2px; font-size: 12px; color: var(--fg-muted); }
.team__invite-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 760px) {
  .team__invite-form { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; align-items: end; gap: 12px; }
}
.team__invite-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.team__invite-label {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--fg-subtle);
}
.team__invite-input {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  font-size: 13px;
  color: var(--fg-default);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  width: 100%;
}
.team__invite-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(15,76,129,0.10);
}
.team__invite-select-wrap { position: relative; }
.team__invite-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 32px;
  cursor: pointer;
}
.team__invite-select-chev {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--fg-subtle);
}
.team__invite-submit { height: 38px; }

/* Sections + lists */
.team__section { margin-top: 28px; }
.team__section-title {
  display: flex; align-items: center; gap: 10px;
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--fg-subtle); font-weight: 600;
}
.team__count-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px;
  padding: 0 6px;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 700;
  background: var(--surface-hover);
  color: var(--fg-default);
}
.team__count-badge--amber { background: rgba(245,158,11,0.18); color: #b45309; }
.team__count-badge--danger { background: rgba(239,68,68,0.10); color: #b91c1c; }
.team__viewall {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-accent);
}
.team__viewall:hover { text-decoration: underline; }

.team__rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.team__rows-card {
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
}
.team__rows-head {
  display: grid;
  grid-template-columns: minmax(220px, 2.4fr) 160px 110px 110px 40px;
  gap: 14px;
  padding: 11px 18px;
  background: var(--surface-canvas);
  border-bottom: 1px solid var(--surface-border);
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--fg-subtle); font-weight: 600;
}
.team__rows-head-name, .team__rows-head-meta { white-space: nowrap; }
.team__rows--flat { gap: 0; }
.team__rows--flat .team__row { border-radius: 0; border: 0; border-top: 1px solid var(--surface-divider); }
.team__rows--flat .team__row:first-child { border-top: 0; }

.team__row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 18px;
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  transition: background 120ms;
}
.team__row:hover { background: var(--surface-canvas); }
.team__row--member {
  display: grid;
  grid-template-columns: minmax(220px, 2.4fr) 160px 110px 110px 40px;
  gap: 14px;
}
.team__row--pending { gap: 14px; }
.team__row--muted { opacity: 0.85; }

.team__row-name { display: flex; align-items: center; gap: 12px; min-width: 0; }
.team__avatar {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 9999px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}
.team__avatar--muted { background: var(--surface-hover); color: var(--fg-subtle); }
.team__row-icon {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--surface-hover);
  color: var(--fg-muted);
  flex-shrink: 0;
}
.team__row-icon--amber { background: rgba(245,158,11,0.14); color: #b45309; }
.team__row-primary {
  font-size: 13px; font-weight: 500;
  color: var(--fg-default);
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}
.team__row-secondary {
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
}
.team__row-meta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.team__row-meta-text {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
}

.team__youtag {
  display: inline-flex; align-items: center;
  padding: 1px 7px;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

/* Status pill */
.team__status {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--fg-default);
}
.team__status-dot {
  width: 7px; height: 7px;
  border-radius: 9999px;
  background: #16a34a;
  box-shadow: 0 0 6px rgba(22,163,74,0.6);
}
.team__status-dot--muted { background: var(--fg-subtle); box-shadow: none; }
.team__status--muted { color: var(--fg-muted); }

/* Pill (generic) */
.team__pill {
  display: inline-flex; align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.team__pill--amber { background: rgba(245,158,11,0.16); color: #92400e; }

/* Role badge */
.team__rolebadge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.02em;
}
.team__rolebadge-glyph {
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 700;
}
.team__rolebadge--accent { color: var(--color-accent); background: var(--color-accent-soft); }
.team__rolebadge--success { color: #166534; background: rgba(22,163,74,0.12); }
.team__rolebadge--warning { color: #92400e; background: rgba(245,158,11,0.14); }
.team__rolebadge--info { color: var(--color-accent); background: rgba(15,76,129,0.08); }
.team__rolebadge--neutral { color: var(--fg-muted); background: var(--surface-hover); }
.team__rolebadge--muted { opacity: 0.7; }

/* Three-dot menu */
.team__menu { position: relative; flex-shrink: 0; }
.team__menu-trigger {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  color: var(--fg-subtle);
  cursor: pointer;
  list-style: none;
  border: 1px solid transparent;
  background: transparent;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.team__menu-trigger::-webkit-details-marker { display: none; }
.team__menu-trigger:hover {
  background: var(--surface-hover);
  color: var(--fg-default);
  border-color: var(--surface-border);
}
.team__menu[open] .team__menu-trigger {
  background: var(--surface-hover);
  color: var(--fg-default);
  border-color: var(--surface-border);
}
.team__menu-list {
  position: absolute;
  right: 0; top: calc(100% + 6px);
  min-width: 180px;
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  box-shadow: 0 12px 32px -8px rgba(15,23,42,0.16),
              0 4px 8px -4px rgba(15,23,42,0.08);
  padding: 4px;
  z-index: 30;
  list-style: none;
  margin: 0;
}
.team__menu-list button {
  display: flex; align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  text-align: left;
  color: var(--fg-default);
  background: transparent;
  transition: background 120ms;
}
.team__menu-list button:hover { background: var(--surface-hover); }
.team__menu-list .team__menu-danger { color: #b91c1c; }
.team__menu-list .team__menu-danger:hover { background: #FEF2F2; }
.team__menu-divider {
  height: 1px;
  background: var(--surface-divider);
  margin: 4px 6px;
}

/* Expanders (role overview / matrix) */
.team__expander {
  margin-top: 28px;
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
}
.team__expander[open] {
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.team__expander-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.team__expander-summary::-webkit-details-marker { display: none; }
.team__expander-summary:hover { background: var(--surface-canvas); }
.team__expander-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-default);
}
.team__expander-sub {
  font-size: 12px;
  color: var(--fg-muted);
}
.team__expander-chev {
  margin-left: auto;
  color: var(--fg-subtle);
  transition: transform 180ms ease;
}
.team__expander[open] .team__expander-chev { transform: rotate(180deg); }
.team__expander-body {
  padding: 0 20px 20px;
  border-top: 1px solid var(--surface-divider);
  padding-top: 16px;
}

/* Role cards (inside expander) */
.team__role-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
@media (min-width: 900px) { .team__role-grid { grid-template-columns: 1fr 1fr; } }
.team__role { border: 1px solid var(--surface-border); background: var(--surface-page); border-radius: 10px; overflow: hidden; }
.team__role-summary { display: flex; align-items: center; gap: 14px; padding: 12px 14px; cursor: pointer; list-style: none; user-select: none; }
.team__role-summary::-webkit-details-marker { display: none; }
.team__role-summary:hover { background: var(--surface-canvas); }
.team__role-glyph {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 16px; font-weight: 700;
  flex-shrink: 0;
}
.team__role-glyph--accent { background: var(--color-accent-soft); color: var(--color-accent); }
.team__role-glyph--success { background: rgba(22,163,74,0.12); color: #166534; }
.team__role-glyph--warning { background: rgba(245,158,11,0.14); color: #92400e; }
.team__role-glyph--info { background: rgba(15,76,129,0.10); color: var(--color-accent); }
.team__role-glyph--neutral { background: var(--surface-hover); color: var(--fg-muted); }
.team__role-label { font-size: 14px; font-weight: 600; color: var(--fg-default); }
.team__role-summary-text { display: block; font-size: 12px; color: var(--fg-muted); margin-top: 2px; }
.team__role-count {
  font-family: var(--font-mono);
  font-size: 14px; font-weight: 700;
  color: var(--fg-default);
  font-variant-numeric: tabular-nums;
  min-width: 26px; text-align: right;
}
.team__role-chev { color: var(--fg-subtle); transition: transform 180ms ease; }
.team__role[open] .team__role-chev { transform: rotate(180deg); }
.team__role-body {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--surface-divider);
  background: var(--surface-canvas);
}
.team__role-description { font-size: 12.5px; color: var(--fg-default); line-height: 1.55; }
.team__role-meta {
  display: flex; gap: 18px; flex-wrap: wrap;
  margin-top: 8px;
  font-size: 11px; color: var(--fg-muted);
}
.team__role-meta code { font-family: var(--font-mono); font-size: 11px; color: var(--color-accent); padding: 1px 5px; background: var(--surface-hover); border-radius: 3px; }
.team__role-perms {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.team__role-perm-group-label {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--fg-subtle);
  margin-bottom: 4px;
}
.team__role-perms ul { list-style: none; padding: 0; margin: 0; }
.team__role-perms li {
  display: flex; align-items: center; gap: 6px;
  padding: 2px 0;
  font-size: 12px; color: var(--fg-default);
}

/* Matrix */
.team__matrix-wrap { overflow-x: auto; border: 1px solid var(--surface-border); border-radius: 12px; }
.team__matrix { width: 100%; border-collapse: collapse; min-width: 900px; }
.team__matrix th, .team__matrix td { border-right: 1px solid var(--surface-divider); }
.team__matrix th:last-child, .team__matrix td:last-child { border-right: 0; }
.team__matrix-th-label, .team__matrix-th { padding: 12px 14px; background: var(--surface-canvas); border-bottom: 1px solid var(--surface-border); }
.team__matrix-th-label { width: 38%; text-align: left; font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--fg-subtle); font-weight: 600; }
.team__matrix-th { text-align: center; font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--fg-default); letter-spacing: 0.05em; }
.team__matrix-th .team__role-glyph { margin: 0 auto 4px; }
.team__matrix-grouprow {
  background: var(--color-accent-soft);
  font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-accent);
  padding: 8px 14px;
}
.team__matrix-row { transition: background 120ms; }
.team__matrix-row:hover { background: var(--surface-canvas); }
.team__matrix-perm { padding: 12px 14px; border-bottom: 1px solid var(--surface-divider); }
.team__matrix-perm > span:first-child { display: block; font-size: 12.5px; font-weight: 500; color: var(--fg-default); }
.team__matrix-perm-detail { display: block; margin-top: 2px; font-size: 11px; color: var(--fg-muted); }
.team__matrix-cell { padding: 12px 4px; text-align: center; border-bottom: 1px solid var(--surface-divider); color: var(--fg-subtle); font-family: var(--font-mono); }
.team__matrix-cell--on { color: #16a34a; background: rgba(22,163,74,0.06); }

/* Recent events */
.team__audit { list-style: none; padding: 0; margin: 0; border: 1px solid var(--surface-border); border-radius: 12px; background: var(--surface-page); overflow: hidden; }
.team__audit-row {
  display: grid;
  grid-template-columns: 110px 130px 1fr 1.5fr 200px;
  gap: 14px;
  padding: 10px 16px;
  font-size: 12px;
  border-top: 1px solid var(--surface-divider);
}
.team__audit-row:first-child { border-top: 0; }
.team__audit-time { font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-subtle); white-space: nowrap; }
.team__audit-action {
  font-family: var(--font-mono);
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.04em;
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  align-self: center;
  width: fit-content;
}
.team__audit-action--invited { background: rgba(15,76,129,0.10); color: var(--color-accent); }
.team__audit-action--role_changed { background: rgba(245,158,11,0.14); color: #92400e; }
.team__audit-action--suspended { background: rgba(239,68,68,0.10); color: #991B1B; }
.team__audit-action--mfa_enforced { background: rgba(22,163,74,0.10); color: #166534; }
.team__audit-target { font-family: var(--font-mono); font-size: 11.5px; color: var(--fg-default); }
.team__audit-detail { color: var(--fg-muted); }
.team__audit-actor { font-size: 11px; color: var(--fg-subtle); text-align: right; }
@media (max-width: 900px) {
  .team__audit-row { grid-template-columns: 1fr; gap: 4px; padding: 12px 14px; }
  .team__audit-actor { text-align: left; }
  .team__row--member { grid-template-columns: 1fr; align-items: flex-start; gap: 8px; }
  .team__rows-head { display: none; }
}
`
