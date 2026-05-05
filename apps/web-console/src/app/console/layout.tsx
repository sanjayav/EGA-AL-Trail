import { ConsoleShell } from '@/components/console/Shell'
import { currentUser } from '@/lib/auth'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  return <ConsoleShell user={user}>{children}</ConsoleShell>
}
