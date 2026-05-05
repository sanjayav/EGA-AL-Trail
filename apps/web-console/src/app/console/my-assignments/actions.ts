'use server'

import { submitAssignment } from '@/lib/draft-api'

export async function submitAssignmentAction(accessToken: string, value: unknown) {
  await submitAssignment(accessToken, value)
}
