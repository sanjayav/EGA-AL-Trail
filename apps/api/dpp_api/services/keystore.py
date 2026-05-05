"""Pluggable signing-key provider for the DPP issuer DID.

Three providers, selected by `dpp_signing_provider`:

  - local_file (dev default):
      Read raw private + public key bytes from PEM files. Convenient for local
      development; production deploys may also use this when the secret is
      mounted as a file by Vault Agent / kubelet csi-driver.

  - env:
      Read base64url-encoded raw key bytes from environment variables. Pairs
      well with k8s Secret + projected env var without a writable filesystem.

  - aws_kms:
      Delegate Ed25519 signing to an AWS KMS asymmetric key. The private key
      never leaves KMS; the public key is fetched once and cached. IAM does
      access control + auditability. Activate with:
        DPP_SIGNING_PROVIDER=aws_kms
        DPP_KMS_KEY_ID=arn:aws:kms:eu-west-2:…
      Optional: DPP_KMS_REGION (auto-detected from the ARN otherwise).

The provider exposes a uniform interface (`sign`, `public_key`) so the rest
of `signer.py` is provider-agnostic. Tests pin `local_file` via conftest.
"""

from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol, runtime_checkable

from nacl.signing import SigningKey, VerifyKey

from ..settings import Settings, get_settings


@runtime_checkable
class KeyProvider(Protocol):
    """Provider interface every keystore impl satisfies.

    `sign` accepts the raw bytes to sign and returns the 64-byte Ed25519
    signature. `public_key_bytes` returns the 32-byte raw public key for
    DID document publication.
    """

    name: str

    def sign(self, payload: bytes) -> bytes: ...
    def public_key_bytes(self) -> bytes: ...


# ── local_file ──────────────────────────────────────────────────────────────


@dataclass
class LocalFileKeyProvider:
    """PEM-on-disk provider. Auto-generates a key pair on first use in dev.

    In production, point this at a path mounted by your secret distribution
    layer (Vault Agent, kubelet CSI, sealed-secrets, etc.) and ensure the
    file is mode 0400. Settings refuses to use this provider in production
    when the path still points at the dev-keys default — see
    `Settings._enforce_production_security`.
    """

    private_key_path: Path
    public_key_path: Path
    name: str = "local_file"

    def _load(self) -> tuple[SigningKey, VerifyKey]:
        self.private_key_path.parent.mkdir(parents=True, exist_ok=True)
        if self.private_key_path.exists() and self.public_key_path.exists():
            sk = SigningKey(_read_pem(self.private_key_path))
            return sk, sk.verify_key
        # Auto-generate for dev only.
        sk = SigningKey.generate()
        _write_pem(self.private_key_path, bytes(sk), private=True)
        _write_pem(self.public_key_path, bytes(sk.verify_key), private=False)
        return sk, sk.verify_key

    def sign(self, payload: bytes) -> bytes:
        sk, _ = self._load()
        return bytes(sk.sign(payload).signature)

    def public_key_bytes(self) -> bytes:
        _, vk = self._load()
        return bytes(vk)


# ── env ─────────────────────────────────────────────────────────────────────


@dataclass
class EnvKeyProvider:
    """Read base64url-encoded raw 32-byte private + 32-byte public keys
    from settings.

    The k8s deployment renders the secret directly into env vars with a
    tmpfs-projected source so no plaintext key ever lands on disk.
    """

    private_key_b64: str
    public_key_b64: str
    name: str = "env"

    def _signing_key(self) -> SigningKey:
        return SigningKey(_b64url_decode(self.private_key_b64))

    def sign(self, payload: bytes) -> bytes:
        return bytes(self._signing_key().sign(payload).signature)

    def public_key_bytes(self) -> bytes:
        return _b64url_decode(self.public_key_b64)


# ── aws_kms ─────────────────────────────────────────────────────────────────


class AwsKmsKeyProvider:
    """Sign via AWS KMS asymmetric signing — the private key never leaves KMS.

    Uses the ECDSA (NIST-P-256) or Ed25519 key referred to by `key_id`. Boto3
    is imported lazily so the import path doesn't require AWS creds in dev.
    """

    name = "aws_kms"

    def __init__(self, key_id: str, region: str | None = None) -> None:
        self.key_id = key_id
        self.region = region
        self._public_key_cache: bytes | None = None

    def _client(self):  # type: ignore[no-untyped-def]
        import boto3

        return boto3.client("kms", region_name=self.region) if self.region else boto3.client("kms")

    def sign(self, payload: bytes) -> bytes:
        # KMS signs the digest (RAW for Ed25519, DIGEST otherwise). We default
        # to MessageType=RAW + SigningAlgorithm=EDDSA which works for the
        # ECC_NIST_P521 / ECC_NIST_P256 algos as well — KMS rejects mismatches.
        client = self._client()
        result = client.sign(
            KeyId=self.key_id,
            Message=payload,
            MessageType="RAW",
            SigningAlgorithm="EDDSA",
        )
        return bytes(result["Signature"])

    def public_key_bytes(self) -> bytes:
        if self._public_key_cache is not None:
            return self._public_key_cache
        client = self._client()
        result = client.get_public_key(KeyId=self.key_id)
        # KMS returns DER-encoded SubjectPublicKeyInfo. Strip to raw 32-byte
        # Ed25519 public key. We're only consuming our own KMS key so a
        # tightly-scoped extraction is safe.
        der = bytes(result["PublicKey"])
        # The Ed25519 public key is the last 32 bytes of the SPKI.
        if len(der) < 32:
            raise RuntimeError(f"unexpected KMS public key length: {len(der)}")
        self._public_key_cache = der[-32:]
        return self._public_key_cache


# ── Provider factory ────────────────────────────────────────────────────────


@lru_cache(maxsize=1)
def get_key_provider(settings: Settings | None = None) -> KeyProvider:
    """Resolve the configured KeyProvider once per process.

    The cache is cleared by `get_settings.cache_clear()` callers (tests do
    this in conftest), since switching settings should also switch keystore.
    """
    settings = settings or get_settings()
    provider_name = settings.dpp_signing_provider

    if provider_name == "local_file":
        return LocalFileKeyProvider(
            private_key_path=settings.dpp_issuer_key_path,
            public_key_path=settings.dpp_issuer_public_key_path,
        )

    if provider_name == "env":
        if settings.dpp_issuer_key_b64 is None or settings.dpp_issuer_public_key_b64 is None:
            raise RuntimeError(
                "dpp_signing_provider=env requires DPP_ISSUER_KEY_B64 + DPP_ISSUER_PUBLIC_KEY_B64"
            )
        return EnvKeyProvider(
            private_key_b64=settings.dpp_issuer_key_b64.get_secret_value(),
            public_key_b64=settings.dpp_issuer_public_key_b64.get_secret_value(),
        )

    if provider_name == "aws_kms":
        if not settings.dpp_kms_key_id:
            raise RuntimeError("dpp_signing_provider=aws_kms requires DPP_KMS_KEY_ID")
        return AwsKmsKeyProvider(
            key_id=settings.dpp_kms_key_id,
            region=settings.dpp_kms_region,
        )

    raise RuntimeError(f"unknown signing provider: {provider_name!r}")


def reset_key_provider_cache() -> None:
    """Tests call this after mutating settings."""
    get_key_provider.cache_clear()


# ── PEM helpers (kept private to this module) ──────────────────────────────


def _read_pem(path: Path) -> bytes:
    raw = path.read_text(encoding="utf-8")
    body = "".join(line for line in raw.splitlines() if not line.startswith("-----"))
    return base64.b64decode(body)


def _write_pem(path: Path, raw: bytes, *, private: bool) -> None:
    encoded = base64.b64encode(raw).decode("ascii")
    chunks = [encoded[i : i + 64] for i in range(0, len(encoded), 64)]
    label = "ED25519 PRIVATE KEY" if private else "ED25519 PUBLIC KEY"
    pem = f"-----BEGIN {label}-----\n" + "\n".join(chunks) + f"\n-----END {label}-----\n"
    path.write_text(pem, encoding="utf-8")
    if private:
        os.chmod(path, 0o600)


def _b64url_decode(value: str) -> bytes:
    pad = (-len(value)) % 4
    return base64.urlsafe_b64decode(value + ("=" * pad))
