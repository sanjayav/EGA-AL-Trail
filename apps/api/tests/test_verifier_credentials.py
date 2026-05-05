"""Verifier credential issuance + revocation."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from dpp_api.db.models import ReferenceCfp
from dpp_api.services.verifier_credentials import (
    issue_cfp_credential,
    list_credentials,
    revoke_credential,
)
from sqlalchemy.ext.asyncio import AsyncSession


def _period() -> tuple[datetime, datetime]:
    return (
        datetime(2026, 1, 1, tzinfo=UTC),
        datetime(2026, 12, 31, tzinfo=UTC),
    )


@pytest.mark.asyncio
async def test_issue_creates_active_credential(db_session: AsyncSession) -> None:
    pf, pt = _period()
    result = await issue_cfp_credential(
        db_session,
        tenant_id=1,
        brand="CelestiAL",
        period_from=pf,
        period_to=pt,
        value_kg_co2e_per_tonne=4150,
        verifier_did="did:web:dnv.com:cfp",
        verifier_name="DNV — test",
        statement_ref="DNV-2026-TEST-CelestiAL",
    )
    assert result.credential_id > 0
    row = await db_session.get(ReferenceCfp, result.credential_id)
    assert row is not None
    assert row.state == "active"
    assert row.value_kg_co2e_per_tonne == 4150


@pytest.mark.asyncio
async def test_second_issue_supersedes_first(db_session: AsyncSession) -> None:
    pf, pt = _period()
    first = await issue_cfp_credential(
        db_session,
        tenant_id=1,
        brand="CelestiAL",
        period_from=pf,
        period_to=pt,
        value_kg_co2e_per_tonne=4273,
        verifier_did="did:web:dnv.com:cfp",
        verifier_name="DNV",
        statement_ref="DNV-2025-CelestiAL",
    )
    second = await issue_cfp_credential(
        db_session,
        tenant_id=1,
        brand="CelestiAL",
        period_from=pf,
        period_to=pt,
        value_kg_co2e_per_tonne=4100,
        verifier_did="did:web:dnv.com:cfp",
        verifier_name="DNV",
        statement_ref="DNV-2026-CelestiAL",
    )
    assert first.credential_id in second.superseded_ids

    first_row = await db_session.get(ReferenceCfp, first.credential_id)
    assert first_row is not None
    assert first_row.state == "superseded"


@pytest.mark.asyncio
async def test_invalid_period_rejected(db_session: AsyncSession) -> None:
    pf, pt = _period()
    with pytest.raises(ValueError, match="period"):
        await issue_cfp_credential(
            db_session,
            tenant_id=1,
            brand="CelestiAL",
            period_from=pt,
            period_to=pf,
            value_kg_co2e_per_tonne=4000,
            verifier_did="did:web:dnv.com:cfp",
            verifier_name="DNV",
            statement_ref="DNV-2026-bad",
        )


@pytest.mark.asyncio
async def test_other_verifier_cannot_revoke(db_session: AsyncSession) -> None:
    pf, pt = _period()
    res = await issue_cfp_credential(
        db_session,
        tenant_id=1,
        brand="CelestiAL",
        period_from=pf,
        period_to=pt,
        value_kg_co2e_per_tonne=4000,
        verifier_did="did:web:dnv.com:cfp",
        verifier_name="DNV",
        statement_ref="DNV-2026-x",
    )
    with pytest.raises(PermissionError):
        await revoke_credential(
            db_session,
            tenant_id=1,
            credential_id=res.credential_id,
            verifier_did="did:web:bureauveritas.com:reco",
        )


@pytest.mark.asyncio
async def test_list_filters_by_state(db_session: AsyncSession) -> None:
    pf, pt = _period()
    await issue_cfp_credential(
        db_session,
        tenant_id=1,
        brand="Standard",
        period_from=pf,
        period_to=pt,
        value_kg_co2e_per_tonne=10545,
        verifier_did="did:web:dnv.com:cfp",
        verifier_name="DNV",
        statement_ref="DNV-2026-Standard",
    )
    active = await list_credentials(db_session, tenant_id=1, state="active")
    assert all(c["state"] == "active" for c in active)
    assert any(c["brand"] == "Standard" for c in active)
