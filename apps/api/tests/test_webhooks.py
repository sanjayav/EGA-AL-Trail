"""Webhook subscription CRUD + HMAC signing round trip."""

from __future__ import annotations

import time

import pytest
from dpp_api.services.webhooks import (
    create_subscription,
    delete_subscription,
    list_subscriptions,
    sign_payload,
    verify_signature,
)
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_create_and_list_and_delete(db_session: AsyncSession) -> None:
    created = await create_subscription(
        db_session,
        tenant_id=1,
        customer_org="bmw",
        name="BMW production",
        url="https://hooks.bmw.example/dpp",
        events=["dpp.issued", "dpp.revised"],
    )
    assert created.id > 0
    assert created.secret_plaintext

    items = await list_subscriptions(db_session, tenant_id=1, customer_org="bmw")
    assert any(i["id"] == created.id and i["state"] == "active" for i in items)

    ok = await delete_subscription(
        db_session, tenant_id=1, customer_org="bmw", subscription_id=created.id
    )
    assert ok is True
    items_after = await list_subscriptions(db_session, tenant_id=1, customer_org="bmw")
    assert all(i["id"] != created.id for i in items_after)


@pytest.mark.asyncio
async def test_invalid_url_rejected(db_session: AsyncSession) -> None:
    with pytest.raises(ValueError, match="http"):
        await create_subscription(
            db_session,
            tenant_id=1,
            customer_org="bmw",
            name="bad",
            url="ftp://nope",
            events=["dpp.issued"],
        )


@pytest.mark.asyncio
async def test_unsupported_event_rejected(db_session: AsyncSession) -> None:
    with pytest.raises(ValueError, match="unsupported"):
        await create_subscription(
            db_session,
            tenant_id=1,
            customer_org="bmw",
            name="bad",
            url="https://hooks.example",
            events=["dpp.exploded"],
        )


def test_hmac_round_trip() -> None:
    secret = "test-secret-32-bytes-long-okay-yes"
    body = b'{"event":"dpp.issued","upi":"x"}'
    ts = int(time.time())
    header = sign_payload(secret, body=body, timestamp=ts)
    assert verify_signature(secret, body=body, header=header) is True


def test_hmac_rejects_wrong_secret() -> None:
    secret = "right"
    body = b'{"event":"dpp.issued"}'
    ts = int(time.time())
    header = sign_payload(secret, body=body, timestamp=ts)
    assert verify_signature("wrong", body=body, header=header) is False


def test_hmac_rejects_tampered_body() -> None:
    secret = "right"
    body = b'{"event":"dpp.issued"}'
    ts = int(time.time())
    header = sign_payload(secret, body=body, timestamp=ts)
    assert verify_signature(secret, body=b'{"event":"dpp.tampered"}', header=header) is False
