"""Authentication & authorization layer.

The platform's trust boundary. Every router endpoint that touches tenant data
goes through `require_principal` (or one of the role-restricted variants).

In production:
  - Bearer JWT verified against an OIDC IdP's JWKS (RS256/ES256).
  - Claims pinned: `tnt` (tenant_id), `role`, `did` (verifier-tier),
    `sub` (user id), `aud` (this API's audience).
  - The `Principal` derived from those claims is the only source of truth
    for identity inside the request — no caller-supplied headers are trusted.

In development / CI:
  - Tokens may also be HS256-signed by `dpp_jwt_dev_secret`, but only when
    `dpp_env != "production"`. The settings layer hard-rejects this combo.
"""

from .principal import Principal, Role, Scope
from .dependencies import (
    require_principal,
    require_role,
    require_verifier,
    require_tenant_admin,
    require_tenant_auditor,
    require_authority,
)

__all__ = [
    "Principal",
    "Role",
    "Scope",
    "require_principal",
    "require_role",
    "require_verifier",
    "require_tenant_admin",
    "require_tenant_auditor",
    "require_authority",
]
