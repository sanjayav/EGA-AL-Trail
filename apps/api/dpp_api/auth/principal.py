"""Principal — the authenticated identity for a single request."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Role = Literal[
    "platform_admin",
    "platform_support",
    "tenant_admin",
    "dpp_operator",
    "dpp_reviewer",
    "tenant_auditor",
    "it_administrator",
    "customer_user",
    "customer_admin",
    "verifier",
    "authority",
]

# Coarse-grained scopes used in role-independent checks (e.g. webhook signing).
Scope = Literal[
    "audit:read",
    "dpps:read",
    "dpps:write",
    "credentials:issue",
    "credentials:revoke",
    "credentials:rollover",
    "verifier-registry:read",
    "tenant:admin",
    "platform:admin",
    "authority:read",
]

# Default role → allowed scopes mapping. RBAC layer can override per-tenant.
ROLE_SCOPES: dict[Role, frozenset[Scope]] = {
    "platform_admin": frozenset(
        {
            "platform:admin",
            "tenant:admin",
            "audit:read",
            "dpps:read",
            "dpps:write",
            "verifier-registry:read",
        }
    ),
    "platform_support": frozenset({"audit:read", "dpps:read", "verifier-registry:read"}),
    "tenant_admin": frozenset(
        {
            "tenant:admin",
            "audit:read",
            "dpps:read",
            "dpps:write",
            "verifier-registry:read",
        }
    ),
    "dpp_operator": frozenset({"dpps:read", "dpps:write"}),
    "dpp_reviewer": frozenset({"dpps:read"}),
    "tenant_auditor": frozenset({"audit:read", "dpps:read", "verifier-registry:read"}),
    "it_administrator": frozenset({"tenant:admin", "audit:read"}),
    "customer_user": frozenset({"dpps:read"}),
    "customer_admin": frozenset({"dpps:read"}),
    "verifier": frozenset(
        {
            "credentials:issue",
            "credentials:revoke",
            "credentials:rollover",
            "audit:read",
        }
    ),
    "authority": frozenset({"authority:read", "audit:read", "dpps:read"}),
}


@dataclass(frozen=True)
class Principal:
    """The authenticated identity for one request.

    All identifiers come from verified token claims — never from caller-
    supplied headers. The `tenant_id` is the row-scope used for RLS binding;
    platform-tier roles run with `tenant_id=0` and may pivot via headers
    (which routers must validate).
    """

    subject: str
    tenant_id: int
    role: Role
    scopes: frozenset[Scope] = field(default_factory=frozenset)
    did: str | None = None
    email: str | None = None
    organization: str | None = None
    issuer: str | None = None
    raw_claims: dict[str, object] = field(default_factory=dict)

    def has_scope(self, scope: Scope) -> bool:
        return scope in self.scopes

    def is_platform(self) -> bool:
        return self.role in ("platform_admin", "platform_support")
