"""JWT verification — JWKS-backed in production, HS256 dev secret elsewhere.

This module deliberately exposes one public function: `verify_token(token)`.
Configuration comes from `Settings`. Failures raise `AuthError` with a fixed
HTTP-friendly message; routers translate that to 401.

Production guarantees (enforced by Settings validators, see settings.py):
  - When `dpp_env == "production"`, `dpp_jwt_jwks_url` MUST be set and
    `dpp_jwt_dev_secret` MUST be empty. If either is misconfigured, the API
    refuses to boot. This is the only knob that prevents a dev secret from
    leaking into prod.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from ..settings import Settings, get_settings
from .principal import ROLE_SCOPES, Principal, Role


class AuthError(Exception):
    """Raised when a token is invalid, expired, or missing required claims."""


_jwks_client: PyJWKClient | None = None
_jwks_client_url: str | None = None
_jwks_last_refresh: float = 0.0
_JWKS_TTL_SECONDS = 600


def _get_jwks_client(url: str) -> PyJWKClient:
    """Cached JWKS client. PyJWKClient does its own per-key caching;
    we wrap that with a 10-minute reload window so key rotation is picked up
    without a process restart."""
    global _jwks_client, _jwks_client_url, _jwks_last_refresh
    now = time.monotonic()
    if (
        _jwks_client is None
        or _jwks_client_url != url
        or (now - _jwks_last_refresh) > _JWKS_TTL_SECONDS
    ):
        _jwks_client = PyJWKClient(url, cache_jwk_set=True, lifespan=_JWKS_TTL_SECONDS)
        _jwks_client_url = url
        _jwks_last_refresh = now
    return _jwks_client


@dataclass(frozen=True)
class _VerifiedToken:
    claims: dict[str, Any]


def _verify_with_jwks(token: str, settings: Settings) -> _VerifiedToken:
    if not settings.dpp_jwt_jwks_url:
        raise AuthError("JWKS URL is not configured")
    client = _get_jwks_client(settings.dpp_jwt_jwks_url)
    try:
        signing_key = client.get_signing_key_from_jwt(token).key
    except Exception as exc:  # noqa: BLE001 — wrap any JWKS error as auth fail
        raise AuthError(f"unable to resolve signing key: {exc}") from exc

    try:
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=list(settings.dpp_jwt_algorithms),
            audience=settings.dpp_jwt_audience,
            issuer=settings.dpp_jwt_issuer,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"invalid token: {exc}") from exc
    return _VerifiedToken(claims=claims)


def _verify_with_dev_secret(token: str, settings: Settings) -> _VerifiedToken:
    if settings.is_production:
        raise AuthError("dev secret is disabled in production")
    secret = settings.dpp_jwt_dev_secret
    if not secret:
        raise AuthError("no JWT verifier configured")
    try:
        claims = jwt.decode(
            token,
            secret.get_secret_value(),
            algorithms=["HS256"],
            audience=settings.dpp_jwt_audience,
            issuer=settings.dpp_jwt_issuer,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(f"invalid token: {exc}") from exc
    return _VerifiedToken(claims=claims)


def verify_token(token: str, *, settings: Settings | None = None) -> Principal:
    """Verify `token` and return the resulting `Principal`.

    Verification path is determined by configuration:
      1. If JWKS URL is set → JWKS / asymmetric (RS256/ES256).
      2. Else if dev secret is set AND env != production → HS256.
      3. Else → AuthError("no JWT verifier configured").

    Both paths require the standard set of claims (sub, iss, aud, exp, iat)
    PLUS the platform's claims (`tnt`, `role`).
    """
    settings = settings or get_settings()
    last_error: AuthError | None = None

    if settings.dpp_jwt_jwks_url:
        try:
            verified = _verify_with_jwks(token, settings)
            return _principal_from_claims(verified.claims, settings)
        except AuthError as exc:
            last_error = exc

    if settings.dpp_jwt_dev_secret and not settings.is_production:
        try:
            verified = _verify_with_dev_secret(token, settings)
            return _principal_from_claims(verified.claims, settings)
        except AuthError as exc:
            last_error = exc

    raise last_error or AuthError("no JWT verifier configured")


def _principal_from_claims(claims: dict[str, Any], settings: Settings) -> Principal:
    sub = str(claims.get("sub", ""))
    if not sub:
        raise AuthError("token missing 'sub'")

    role_raw = claims.get("role")
    if not isinstance(role_raw, str):
        raise AuthError("token missing 'role' claim")
    role: Role = role_raw  # type: ignore[assignment]
    if role not in ROLE_SCOPES:
        raise AuthError(f"unknown role: {role}")

    tnt = claims.get("tnt", claims.get("tenant_id"))
    if tnt is None:
        # Platform-tier roles may run unscoped (tenant_id=0) when claim absent.
        if role in ("platform_admin", "platform_support"):
            tenant_id = 0
        else:
            raise AuthError("token missing 'tnt' claim")
    else:
        try:
            tenant_id = int(tnt)
        except (TypeError, ValueError) as exc:
            raise AuthError("'tnt' must be an integer") from exc

    scopes_claim = claims.get("scopes")
    if isinstance(scopes_claim, list):
        scopes = frozenset(s for s in scopes_claim if isinstance(s, str))
    else:
        scopes = ROLE_SCOPES[role]

    did = claims.get("did")
    if did is not None and not isinstance(did, str):
        raise AuthError("'did' must be a string")
    email = claims.get("email")
    if email is not None and not isinstance(email, str):
        raise AuthError("'email' must be a string")
    organization = claims.get("org")
    if organization is not None and not isinstance(organization, str):
        raise AuthError("'org' must be a string")

    issuer = claims.get("iss")
    if not isinstance(issuer, str):
        raise AuthError("'iss' must be a string")

    return Principal(
        subject=sub,
        tenant_id=tenant_id,
        role=role,
        scopes=scopes,  # type: ignore[arg-type]
        did=did,
        email=email,
        organization=organization,
        issuer=issuer,
        raw_claims=claims,
    )


__all__ = ["AuthError", "verify_token"]


async def fetch_jwks(url: str) -> dict[str, Any]:
    """Convenience used by health checks. Not on the hot path."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.json()
