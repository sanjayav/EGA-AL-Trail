import { PortalShell } from '@/components/portal/PortalShell'
import { currentUser } from '@/lib/auth'

/**
 * Customer Portal layout.
 *
 * In production, /portal is gated by W3C VC presentation (customer_user /
 * customer_admin roles only). In dev we render the portal regardless of role
 * so the demo flow is reachable without flipping cookies.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  return <PortalShell user={user}>{children}</PortalShell>
}
