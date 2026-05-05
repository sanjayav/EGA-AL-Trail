"""Hash-chained audit log writer.

Every mutation on the platform appends a row here. The hash chain is computed
as SHA-256(prev_hash || canonical(details)), giving tamper evidence over the
entire log. Periodic checkpoints (out of scope for v1.0) anchor a recent hash
to a permissioned DLT for external attestation.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import AuditLog


async def append_audit(
    session: AsyncSession,
    *,
    tenant_id: int,
    actor_kind: str,
    action: str,
    target_kind: str,
    target_id: str | None = None,
    actor_id: str | None = None,
    severity: str = "info",
    details: dict[str, Any] | None = None,
) -> AuditLog:
    prev = await session.scalar(
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id)
        .order_by(AuditLog.id.desc())
        .limit(1)
    )
    prev_hash = prev.current_hash if prev is not None else None

    # Compute occurred_at ONCE — the column and the hashed body must agree, or
    # `verify_audit_chain` cannot reproduce the hash. Microsecond drift between
    # two `datetime.now()` calls would silently break the chain otherwise.
    occurred_at = datetime.now(UTC)

    body: dict[str, Any] = {
        "tenant_id": tenant_id,
        "actor_kind": actor_kind,
        "actor_id": actor_id,
        "action": action,
        "target_kind": target_kind,
        "target_id": target_id,
        "severity": severity,
        "details": details or {},
        "occurred_at": occurred_at.isoformat(),
        "prev_hash": prev_hash,
    }
    serialised = json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    current_hash = hashlib.sha256(serialised).hexdigest()

    row = AuditLog(
        tenant_id=tenant_id,
        actor_kind=actor_kind,
        actor_id=actor_id,
        action=action,
        target_kind=target_kind,
        target_id=target_id,
        severity=severity,
        details=details or {},
        occurred_at=occurred_at,
        prev_hash=prev_hash,
        current_hash=current_hash,
    )
    session.add(row)
    await session.flush()
    return row
