import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { currentUser, DEFAULT_LANDING } from '@/lib/auth'

import { Landing } from './Landing'

export const dynamic = 'force-dynamic'

/** Root entry point.
 *  - Returning users (with `dpp_signed_in` cookie) → role-based landing.
 *  - Everyone else → animated landing page with the demo sign-in panel. */
export default async function Home() {
  const store = await cookies()
  if (store.get('dpp_signed_in')?.value === '1') {
    const user = await currentUser()
    redirect(DEFAULT_LANDING[user.role])
  }
  return <Landing />
}
