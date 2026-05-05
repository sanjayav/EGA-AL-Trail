"""Webhook subscription CRUD + outbound HMAC signing skeleton.

v1.0 ships the persistence + signing primitives. Outbound delivery (with
retry, DLQ, exponential back-off, circuit breaker) ships in v1.5 as a
Temporal workflow. The signing format is locked here so customers can build
their verifier today.

Signature header format:
    X-DPP-Signature: t=<unix>,v1=<hex-sha256-hmac>
where the HMAC is computed over `<unix>.<request-body>` per the standard
Stripe-style replay-resistant scheme.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import WebhookSubscription

SUPPORTED_EVENTS = (
    "dpp.issued",
    "dpp.revised",
    "dpp.withdrawn",
    "dpp.expired",
    "credential.updated",
    "credential.expired",
    "shipment.completed",
)


@dataclass(frozen=True)
class SubscriptionCreated:
    id: int
    secret_plaintext: str  # only returned once, on creation


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


async def create_subscription(
    session: AsyncSession,
    *,
    tenant_id: int,
    customer_org: str,
    name: str,
    url: str,
    events: list[str],
) -> SubscriptionCreated:
    invalid = [e for e in events if e not in SUPPORTED_EVENTS]
    if invalid:
        raise ValueError(f"unsupported event(s): {invalid}")
    if not url.startswith(("https://", "http://")):
        raise ValueError("url must be http(s)://")

    secret = secrets.token_urlsafe(32)
    sub = WebhookSubscription(
        tenant_id=tenant_id,
        customer_org=customer_org,
        name=name,
        url=url,
        events=events,
        hmac_secret_hash=_hash_secret(secret),
    )
    session.add(sub)
    await session.flush()
    return SubscriptionCreated(id=sub.id, secret_plaintext=secret)


async def list_subscriptions(
    session: AsyncSession, *, tenant_id: int, customer_org: str
) -> list[dict[str, Any]]:
    rows = (
        await session.scalars(
            select(WebhookSubscription).where(
                WebhookSubscription.tenant_id == tenant_id,
                WebhookSubscription.customer_org == customer_org,
                WebhookSubscription.state != "deleted",
            )
        )
    ).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "url": r.url,
            "events": r.events,
            "state": r.state,
            "lastDeliveryAt": r.last_delivery_at.isoformat() if r.last_delivery_at else None,
            "failureCount": r.failure_count,
            "createdAt": r.created_at.isoformat(),
        }
        for r in rows
    ]


async def delete_subscription(
    session: AsyncSession, *, tenant_id: int, customer_org: str, subscription_id: int
) -> bool:
    sub = await session.scalar(
        select(WebhookSubscription).where(
            WebhookSubscription.id == subscription_id,
            WebhookSubscription.tenant_id == tenant_id,
            WebhookSubscription.customer_org == customer_org,
        )
    )
    if sub is None or sub.state == "deleted":
        return False
    sub.state = "deleted"
    return True


def sign_payload(secret: str, *, body: bytes, timestamp: int) -> str:
    """Produce the X-DPP-Signature header value for a delivery."""
    signing_input = f"{timestamp}.".encode("ascii") + body
    mac = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={mac}"


def verify_signature(secret: str, *, body: bytes, header: str, max_age_sec: int = 300) -> bool:
    """Used by tests + by customer-side reference verifier code."""
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    if "t" not in parts or "v1" not in parts:
        return False
    try:
        ts = int(parts["t"])
    except ValueError:
        return False
    expected = sign_payload(secret, body=body, timestamp=ts).split("v1=", 1)[1]
    return hmac.compare_digest(expected, parts["v1"])
