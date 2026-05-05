"""Row-level security — proves cross-tenant queries are silent at the DB.

CLAUDE.md hard rule #3: every tenant-scoped table FORCEs RLS, and tests must
prove isolation. The migrations declare policies that compare each row's
`tenant_id` against the `app.current_tenant_id` GUC. This test:

  1. Seeds rows in two tenants.
  2. Binds the session to tenant 1 via `set_config`.
  3. Verifies queries return ONLY tenant 1's rows.
  4. Switches binding to tenant 2 and re-verifies.
  5. Confirms an unscoped session (no GUC) sees both — that's the platform-
     tier escape hatch and is required for super-admin operations.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from dpp_api.db.models import AuditLog
from dpp_api.services.audit import append_audit
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession


async def _bind_tenant(session: AsyncSession, tenant_id: int | None) -> None:
    """Set or clear the `app.current_tenant_id` session GUC."""
    if tenant_id is None:
        await session.execute(text("SELECT set_config('app.current_tenant_id', '', true)"))
    else:
        await session.execute(
            text("SELECT set_config('app.current_tenant_id', :tid, true)"),
            {"tid": str(tenant_id)},
        )


@pytest.mark.asyncio
async def test_rls_blocks_cross_tenant_reads(db_session: AsyncSession) -> None:
    # Add tenant 2.
    await db_session.execute(
        text(
            "INSERT INTO tenants (id, slug, legal_name, status, tier, branding, created_at)"
            " VALUES (2, 'other', 'Other Co', 'active', 'production', '{}', now())"
            " ON CONFLICT (id) DO NOTHING"
        )
    )
    await db_session.flush()

    # Seed one audit row per tenant. We must temporarily swap the GUC so the
    # INSERT is allowed by the policy.
    await _bind_tenant(db_session, 1)
    await append_audit(
        db_session,
        tenant_id=1,
        actor_kind="system",
        action="dpp.issued",
        target_kind="dpp",
        target_id=f"t1-{uuid4().hex[:8]}",
    )
    await _bind_tenant(db_session, 2)
    await append_audit(
        db_session,
        tenant_id=2,
        actor_kind="system",
        action="dpp.issued",
        target_kind="dpp",
        target_id=f"t2-{uuid4().hex[:8]}",
    )
    await db_session.flush()

    # ── Bound to tenant 1: only tenant-1 rows visible ──────────────────────
    await _bind_tenant(db_session, 1)
    rows = (await db_session.scalars(select(AuditLog))).all()
    assert all(r.tenant_id == 1 for r in rows), [r.tenant_id for r in rows]
    assert any(r.target_id and r.target_id.startswith("t1-") for r in rows)
    assert not any(r.target_id and r.target_id.startswith("t2-") for r in rows)

    # ── Bound to tenant 2: only tenant-2 rows visible ──────────────────────
    await _bind_tenant(db_session, 2)
    rows = (await db_session.scalars(select(AuditLog))).all()
    assert all(r.tenant_id == 2 for r in rows), [r.tenant_id for r in rows]
    assert any(r.target_id and r.target_id.startswith("t2-") for r in rows)
    assert not any(r.target_id and r.target_id.startswith("t1-") for r in rows)

    # ── Unscoped (platform-tier): both visible ─────────────────────────────
    await _bind_tenant(db_session, None)
    rows = (await db_session.scalars(select(AuditLog))).all()
    tenant_ids = {r.tenant_id for r in rows}
    assert {1, 2}.issubset(tenant_ids), tenant_ids


@pytest.mark.asyncio
async def test_rls_blocks_cross_tenant_writes(db_session: AsyncSession) -> None:
    """Writing a row whose tenant_id mismatches the GUC must fail.

    With FORCE ROW LEVEL SECURITY, even an INSERT is checked against the
    USING clause; Postgres surfaces this as `new row violates row-level
    security policy`.
    """
    await db_session.execute(
        text(
            "INSERT INTO tenants (id, slug, legal_name, status, tier, branding, created_at)"
            " VALUES (2, 'other', 'Other Co', 'active', 'production', '{}', now())"
            " ON CONFLICT (id) DO NOTHING"
        )
    )
    await db_session.flush()

    await _bind_tenant(db_session, 1)
    with pytest.raises(Exception) as excinfo:
        await append_audit(
            db_session,
            tenant_id=2,  # mismatched
            actor_kind="system",
            action="dpp.issued",
            target_kind="dpp",
            target_id="forged",
        )
        await db_session.flush()
    msg = str(excinfo.value).lower()
    assert "row-level security" in msg or "row level security" in msg or "policy" in msg
