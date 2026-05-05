/**
 * Tenant-side role taxonomy & permission matrix.
 *
 * Mirrors SDD §12.1.1 exactly · every role here corresponds to a row in the
 * canonical RBAC table. Adding a role here without amending the SDD will get
 * caught by the spec audit (CLAUDE.md "Things to ask before changing").
 *
 * Permissions are coarse-grained, scoped to one tenant. Cross-tenant scopes
 * (platform_admin, platform_support) are handled in `apps/web-console/src/
 * app/admin/*` and don't appear on the tenant team page.
 */

import type { Role } from './auth'

/** All tenant-scoped roles managed from `/console/team`. Excludes platform
 *  and counterparty roles (verifier, authority, customer_*) which surface
 *  elsewhere. */
export const TENANT_ROLES = [
  'tenant_admin',
  'it_administrator',
  'dpp_operator',
  'dpp_reviewer',
  'tenant_auditor',
] as const satisfies readonly Role[]

export type TenantRole = (typeof TENANT_ROLES)[number]

export interface RoleProfile {
  id: TenantRole
  label: string
  shortLabel: string
  /** Two-line description for cards. */
  description: string
  /** One-sentence summary used in table cells. */
  summary: string
  /** UI tone for badges. */
  tone: 'accent' | 'success' | 'warning' | 'info' | 'neutral'
  /** Emoji glyph used in compact contexts. */
  glyph: string
  /** Default landing surface after sign-in. Mirrors `auth.ts`/DEFAULT_LANDING. */
  defaultLanding: string
  /** Permissions granted. */
  permissions: Permission[]
}

export type Permission =
  | 'create_draft'
  | 'fill_attribute'
  | 'assign_external'
  | 'pull_iot'
  | 'pull_library'
  | 'review_disclosure'
  | 'publish_passport'
  | 'recall_passport'
  | 'view_audit'
  | 'verify_audit_chain'
  | 'manage_users'
  | 'manage_sso'
  | 'manage_iot'
  | 'manage_presets'
  | 'manage_eu_registry'
  | 'manage_keys'
  | 'view_passports'
  | 'export_passports'
  | 'manage_billing'

export const PERMISSION_LABELS: Record<Permission, { label: string; group: PermissionGroup; description: string }> = {
  create_draft:        { group: 'Authoring',   label: 'Create draft',        description: 'Open a new passport draft for a cast.' },
  fill_attribute:      { group: 'Authoring',   label: 'Fill attribute',      description: 'Submit values for a draft (manual / library).' },
  assign_external:     { group: 'Authoring',   label: 'Assign external',     description: 'Delegate an attribute to a supplier or colleague.' },
  pull_iot:            { group: 'Authoring',   label: 'Pull IoT',            description: 'Trigger a fresh pull from an IoT data source.' },
  pull_library:        { group: 'Authoring',   label: 'Pull library',        description: 'Apply a library preset to a draft stage.' },
  review_disclosure:   { group: 'Review',      label: 'Review disclosure',   description: 'Toggle audience visibility before publish.' },
  publish_passport:    { group: 'Review',      label: 'Publish passport',    description: 'Sign and anchor a draft to the public viewer.' },
  recall_passport:     { group: 'Review',      label: 'Recall passport',     description: 'Withdraw a published passport (chain-of-custody event).' },
  view_audit:          { group: 'Audit',       label: 'View audit log',      description: 'Read the hash-chained audit log for the tenant.' },
  verify_audit_chain:  { group: 'Audit',       label: 'Verify audit chain',  description: 'Run integrity checks on the audit hash chain.' },
  view_passports:      { group: 'Audit',       label: 'View passports',      description: 'Browse all passports in the tenant.' },
  export_passports:    { group: 'Audit',       label: 'Export passports',    description: 'Download JSON/VC bundles or compliance reports.' },
  manage_users:        { group: 'Admin',       label: 'Manage users',        description: 'Invite, edit, suspend tenant users.' },
  manage_sso:          { group: 'Admin',       label: 'Manage SSO',          description: 'Configure Entra / OIDC and session policies.' },
  manage_iot:          { group: 'Admin',       label: 'Manage IoT',          description: 'Add and rotate IoT data source credentials.' },
  manage_presets:      { group: 'Admin',       label: 'Manage presets',      description: 'Edit the library presets used during authoring.' },
  manage_eu_registry:  { group: 'Admin',       label: 'Manage EU Registry',  description: 'Push/withdraw passports from the EU registry.' },
  manage_keys:         { group: 'Admin',       label: 'Manage signing keys', description: 'Rotate the Ed25519 issuance keypair.' },
  manage_billing:      { group: 'Admin',       label: 'Manage billing',      description: 'View invoices and update payment method.' },
}

export type PermissionGroup = 'Authoring' | 'Review' | 'Audit' | 'Admin'

export const PERMISSION_GROUPS: PermissionGroup[] = ['Authoring', 'Review', 'Audit', 'Admin']

export const ROLE_PROFILES: Record<TenantRole, RoleProfile> = {
  tenant_admin: {
    id: 'tenant_admin',
    label: 'Tenant Admin',
    shortLabel: 'Admin',
    description: 'Runs the tenant. Full access to authoring, review, audit, and admin.',
    summary: 'Full tenant authority · every authoring, review, audit, and admin action.',
    tone: 'accent',
    glyph: '◆',
    defaultLanding: '/console/overview',
    permissions: [
      'create_draft', 'fill_attribute', 'assign_external', 'pull_iot', 'pull_library',
      'review_disclosure', 'publish_passport', 'recall_passport',
      'view_audit', 'verify_audit_chain', 'view_passports', 'export_passports',
      'manage_users', 'manage_sso', 'manage_iot', 'manage_presets', 'manage_eu_registry', 'manage_keys', 'manage_billing',
    ],
  },
  it_administrator: {
    id: 'it_administrator',
    label: 'IT Administrator',
    shortLabel: 'IT',
    description: 'Manages users, SSO, integrations, and EU Registry plumbing.',
    summary: 'User & infra management · SSO, IoT credentials, presets, registry, signing keys.',
    tone: 'info',
    glyph: '⚙',
    defaultLanding: '/console/settings',
    permissions: [
      'view_passports', 'view_audit', 'verify_audit_chain',
      'manage_users', 'manage_sso', 'manage_iot', 'manage_presets', 'manage_eu_registry', 'manage_keys',
    ],
  },
  dpp_operator: {
    id: 'dpp_operator',
    label: 'DPP Operator',
    shortLabel: 'Operator',
    description: 'Creates and fills passport drafts. Pulls library/IoT data; assigns externally.',
    summary: 'Authoring · draft creation, attribute fill, IoT/library pulls, external assignment.',
    tone: 'success',
    glyph: '✎',
    defaultLanding: '/console/pipeline',
    permissions: ['create_draft', 'fill_attribute', 'assign_external', 'pull_iot', 'pull_library', 'view_passports'],
  },
  dpp_reviewer: {
    id: 'dpp_reviewer',
    label: 'DPP Reviewer',
    shortLabel: 'Reviewer',
    description: 'Reviews disclosure matrix and publishes signed passports.',
    summary: 'Review & publish · disclosure toggles, sign + anchor, recall.',
    tone: 'warning',
    glyph: '✓',
    defaultLanding: '/console/dpps',
    permissions: ['review_disclosure', 'publish_passport', 'recall_passport', 'view_passports', 'view_audit'],
  },
  tenant_auditor: {
    id: 'tenant_auditor',
    label: 'Tenant Auditor',
    shortLabel: 'Auditor',
    description: 'Read-only access to passports, audit log, and integrity proofs.',
    summary: 'Read-only · passports, audit log, hash-chain verification, exports.',
    tone: 'neutral',
    glyph: '◔',
    defaultLanding: '/console/audit',
    permissions: ['view_audit', 'verify_audit_chain', 'view_passports', 'export_passports'],
  },
}

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PROFILES[role].permissions.includes(permission)
}

export function rolesWithPermission(permission: Permission): TenantRole[] {
  return TENANT_ROLES.filter((r) => hasPermission(r, permission))
}

/** True if `actor` can manage `target`'s role. tenant_admin can manage anyone
 *  except other tenant_admins; it_administrator can manage non-admins. */
export function canManage(actor: TenantRole, target: TenantRole): boolean {
  if (actor === 'tenant_admin') return target !== 'tenant_admin'
  if (actor === 'it_administrator') return target !== 'tenant_admin' && target !== 'it_administrator'
  return false
}

export function defaultLandingForRole(role: TenantRole): string {
  return ROLE_PROFILES[role].defaultLanding
}
