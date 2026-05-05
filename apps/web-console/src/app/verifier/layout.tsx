import { VerifierShell } from '@/components/verifier/VerifierShell'

/**
 * Verifier surface (DNV / Bureau Veritas / ASI / notified bodies).
 * In v1.0 the verifier identity comes from a hardcoded dev value; v1.5 swaps
 * to W3C VC presentation (the verifier's own DID-controlled wallet).
 */
const DEV_VERIFIER = {
  name: 'DNV AS · Abu Dhabi Branch',
  did: 'did:web:dnv.com:cfp',
  org: 'DNV',
}

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return <VerifierShell verifier={DEV_VERIFIER}>{children}</VerifierShell>
}
