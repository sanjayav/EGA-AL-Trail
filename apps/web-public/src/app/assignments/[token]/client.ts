const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export interface AssignmentPayload {
  assignment: {
    id: number
    assigneeEmail: string
    assigneeName: string | null
    assigneeOrg: string | null
    note: string | null
    status: 'pending' | 'accepted' | 'submitted' | 'revoked'
    assignedBy: string
    assignedAt: string | null
    submittedAt: string | null
  }
  manifestAttr: {
    id: number | null
    attributePath: string | null
    label: string | null
    necessity: 'mandatory' | 'recommended' | 'voluntary' | null
    regulatoryAnchor: string | null
    version: string | null
    description: string | null
  }
  draft: {
    id: number | null
    castNumber: string | null
    title: string | null
    state: string | null
    productName: string | null
    productBrand: string | null
  }
  currentValue: unknown
}

export async function fetchAssignment(token: string): Promise<AssignmentPayload | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/draft-passports/assignments/by-token/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    return (await res.json()) as AssignmentPayload
  } catch {
    return null
  }
}

export async function submitAssignment(token: string, value: unknown): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/draft-passports/assignments/${encodeURIComponent(token)}/submit`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value }),
      },
    )
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { detail?: string }
      return { error: e.detail ?? `submit failed (${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'network error' }
  }
}
