"""Tenant-scoped audit log read API.

The audit log is the single source of truth for every mutation on the
platform. This router exposes the read side: filterable timeline, single-entry
fetch, and hash-chain verification (regulators rely on the chain to prove the
log hasn't been tampered with).

Tenant identity is pinned by the `X-Tenant-Id` header for v1.0; v1.5 swaps to
session-derived tenancy via the SSO cookie. We never trust caller-supplied
tenant ids in either model — auth layer pins them upstream.
"""

from __future__ import annotations

from datetime import UTC, datetime

from dateutil.parser import isoparse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal, require_tenant_auditor
from ..db import get_tenant_session
from ..services.audit_query import (
    AuditQuery,
    get_audit_entry,
    query_audit_log,
    verify_audit_chain,
)

router = APIRouter(prefix="/audit", tags=["audit"])


class ChainVerifyRequest(BaseModel):
    since_id: int | None = None
    until_id: int | None = None
    max_rows: int = 10_000


@router.get("")
async def list_audit_entries(
    action: str | None = Query(default=None),
    actor_kind: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    target_kind: str | None = Query(default=None),
    target_id: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    since: str | None = Query(default=None, description="ISO 8601 timestamp"),
    until: str | None = Query(default=None, description="ISO 8601 timestamp"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    principal: Principal = Depends(require_tenant_auditor),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    items, total = await query_audit_log(
        session,
        AuditQuery(
            tenant_id=principal.tenant_id,
            action=action,
            actor_kind=actor_kind,
            actor_id=actor_id,
            target_kind=target_kind,
            target_id=target_id,
            severity=severity,
            since=_parse_dt(since),
            until=_parse_dt(until),
            limit=limit,
            offset=offset,
        ),
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{entry_id}")
async def get_audit_entry_endpoint(
    entry_id: int,
    principal: Principal = Depends(require_tenant_auditor),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    row = await get_audit_entry(session, tenant_id=principal.tenant_id, entry_id=entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="entry not found")
    return row


@router.post("/verify-chain")
async def verify_chain_endpoint(
    payload: ChainVerifyRequest,
    principal: Principal = Depends(require_tenant_auditor),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    result = await verify_audit_chain(
        session,
        tenant_id=principal.tenant_id,
        since_id=payload.since_id,
        until_id=payload.until_id,
        max_rows=payload.max_rows,
    )
    return {
        "verified": result.verified,
        "rowsChecked": result.rows_checked,
        "firstBreak": (
            None
            if result.first_break is None
            else {
                "entryId": result.first_break.entry_id,
                "expectedHash": result.first_break.expected_hash,
                "storedHash": result.first_break.stored_hash,
                "reason": result.first_break.reason,
            }
        ),
        "breakCount": len(result.breaks),
    }


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = isoparse(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed
