'use server'

import { revalidatePath } from 'next/cache'

import { currentUser } from '@/lib/auth'
import { TENANT_ROLES, canManage, hasPermission, type TenantRole } from '@/lib/rbac'

import { addPendingInvite, removePendingInvite } from './invite-store'

export async function inviteMemberAction(formData: FormData): Promise<
  { ok: true; email: string; role: TenantRole } | { ok: false; error: string }
> {
  const me = await currentUser()
  const myRole = (TENANT_ROLES as readonly string[]).includes(me.role)
    ? (me.role as TenantRole)
    : ('tenant_auditor' as TenantRole)

  if (!hasPermission(myRole, 'manage_users')) {
    return { ok: false, error: 'You do not have permission to invite members.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim() || null
  const role = String(formData.get('role') ?? '') as TenantRole

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (!(TENANT_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: 'Pick a valid role.' }
  }
  if (!canManage(myRole, role)) {
    return { ok: false, error: `Your role cannot grant ${role}.` }
  }

  addPendingInvite({ email, name, role, invitedBy: me.email })
  revalidatePath('/console/team')
  return { ok: true, email, role }
}

export async function revokeInviteAction(id: string): Promise<{ ok: boolean }> {
  const me = await currentUser()
  const myRole = (TENANT_ROLES as readonly string[]).includes(me.role)
    ? (me.role as TenantRole)
    : ('tenant_auditor' as TenantRole)
  if (!hasPermission(myRole, 'manage_users')) return { ok: false }

  const removed = removePendingInvite(id)
  if (removed) revalidatePath('/console/team')
  return { ok: removed }
}
