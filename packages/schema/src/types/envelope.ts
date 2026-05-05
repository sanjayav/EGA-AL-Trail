/**
 * W3C Verifiable Credential 2.0 envelope. Wraps a canonical DPP record.
 * Signed with the issuer DID's Ed25519 key per the Ed25519Signature2020 suite.
 */

import type { Did, Iso8601DateTime } from './dpp'
import type { Dpp } from './dpp'

export interface Ed25519Proof {
  type: 'Ed25519Signature2020'
  created: Iso8601DateTime
  /** DID URL identifying the public key, e.g. did:web:dpp.ega.ae#key-1 */
  verificationMethod: string
  proofPurpose: 'assertionMethod'
  /** Multibase-encoded Ed25519 signature (base58btc, prefix 'z…') */
  proofValue: string
}

export interface CredentialIssuer {
  id: Did
  name?: string
}

export interface DppCredentialSubject {
  id: string
  dpp: Dpp
}

export interface DppEnvelope {
  '@context': string[]
  id?: string
  type: ['VerifiableCredential', 'DigitalProductPassport', ...string[]]
  issuer: Did | CredentialIssuer
  validFrom: Iso8601DateTime
  validUntil?: Iso8601DateTime
  credentialSubject: DppCredentialSubject
  credentialStatus?: Record<string, unknown>
  proof: Ed25519Proof
}
