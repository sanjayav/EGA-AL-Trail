import { notFound } from 'next/navigation'

import { fetchDisclosure, fetchDraft } from '@/lib/draft-api'
import { DraftWizard } from './DraftWizard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DraftWizardPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId: idStr } = await params
  const draftId = Number(idStr)
  if (!Number.isFinite(draftId)) notFound()

  const view = await fetchDraft(draftId)
  if (!view) notFound()

  const disclosure =
    view.draft.state === 'disclosure' || view.draft.state === 'published'
      ? await fetchDisclosure(draftId)
      : null

  return <DraftWizard initialView={view} initialDisclosure={disclosure} />
}
