/**
 * In-memory pending-invite store for the demo team page. Survives server-action
 * → revalidation → re-render on the same dev process. Real implementation will
 * write to `tenant_users` once the user-management endpoints land.
 */

import type { TenantRole } from '@/lib/rbac'

export interface PendingInvite {
  id: string
  email: string
  name: string | null
  role: TenantRole
  invitedAt: string
  invitedBy: string
}

const PENDING: PendingInvite[] = []

export function listPendingInvites(): PendingInvite[] {
  // Sort newest-first so freshly-sent invites appear at the top of the list.
  return [...PENDING].sort((a, b) => b.invitedAt.localeCompare(a.invitedAt))
}

export function addPendingInvite(input: Omit<PendingInvite, 'id' | 'invitedAt'>): PendingInvite {
  const invite: PendingInvite = {
    ...input,
    id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    invitedAt: new Date().toISOString(),
  }
  PENDING.unshift(invite)
  return invite
}

export function removePendingInvite(id: string): boolean {
  const idx = PENDING.findIndex((i) => i.id === id)
  if (idx === -1) return false
  PENDING.splice(idx, 1)
  return true
}
