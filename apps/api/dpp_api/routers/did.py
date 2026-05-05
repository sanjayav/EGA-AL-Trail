"""did:web document publication.

The platform's issuer DID is `did:web:<host>`. Per the did:web spec, that
resolves to `https://<host>/.well-known/did.json`. We serve it here so an
external verifier can fetch the public key and validate any envelope we've
signed.
"""

from __future__ import annotations

from fastapi import APIRouter

from ..services.signer import public_key_multibase
from ..settings import get_settings

router = APIRouter(tags=["meta"])


@router.get("/.well-known/did.json")
async def did_document() -> dict[str, object]:
    settings = get_settings()
    did = settings.dpp_issuer_did
    return {
        "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
        "id": did,
        "verificationMethod": [
            {
                "id": f"{did}#key-1",
                "type": "Ed25519VerificationKey2020",
                "controller": did,
                "publicKeyMultibase": public_key_multibase(),
            }
        ],
        "assertionMethod": [f"{did}#key-1"],
        "authentication": [f"{did}#key-1"],
    }
