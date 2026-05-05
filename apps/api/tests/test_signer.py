"""Signer round-trip — sign then verify, plus negative cases."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from dpp_api.services.signer import (
    body_sha256,
    canonicalise,
    sign_dpp_envelope,
    verify_envelope,
)


def _stub_dpp() -> dict[str, object]:
    """Minimal DPP shape sufficient for the signer (full schema validity isn't required here)."""
    now = datetime.now(UTC).isoformat()
    return {
        "upi": {
            "digitalLinkUrl": "http://localhost:3000/01/08174060638123/10/C-TEST/21/0001",
        },
        "producer": {"name": "Test Producer"},
        "meta": {"expiresAt": now},
    }


def test_canonicalise_is_deterministic() -> None:
    a = canonicalise({"b": 2, "a": 1, "nested": {"y": "y", "x": "x"}})
    b = canonicalise({"a": 1, "b": 2, "nested": {"x": "x", "y": "y"}})
    assert a == b


def test_body_sha256_changes_when_body_changes() -> None:
    a = body_sha256({"x": 1})
    b = body_sha256({"x": 2})
    assert a != b


def test_sign_then_verify_round_trip() -> None:
    envelope = sign_dpp_envelope(_stub_dpp())
    result = verify_envelope(envelope)
    assert result.valid is True
    assert result.error is None
    assert result.issuer == "did:web:dpp.test"


def test_tampered_body_fails_verification() -> None:
    envelope = sign_dpp_envelope(_stub_dpp())
    # Mutate a field inside credentialSubject; the canonicalised input changes.
    envelope["credentialSubject"]["dpp"]["producer"]["name"] = "Bad actor"
    result = verify_envelope(envelope)
    assert result.valid is False
    assert "bad signature" in (result.error or "")


def test_unsupported_proof_type_returns_failure() -> None:
    envelope = sign_dpp_envelope(_stub_dpp())
    envelope["proof"]["type"] = "RsaSignature2018"
    result = verify_envelope(envelope)
    assert result.valid is False
    assert "unsupported proof type" in (result.error or "")


def test_missing_proof_raises() -> None:
    envelope = sign_dpp_envelope(_stub_dpp())
    del envelope["proof"]
    with pytest.raises(ValueError, match="missing 'proof'"):
        verify_envelope(envelope)
