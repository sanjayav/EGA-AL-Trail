"""HTTP-level smoke tests via the FastAPI app + httpx ASGI transport."""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from dpp_api.main import create_app


@pytest.mark.asyncio
async def test_healthz_returns_ok() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


@pytest.mark.asyncio
async def test_did_document_published() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/.well-known/did.json")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "did:web:dpp.test"
    assert body["verificationMethod"][0]["type"] == "Ed25519VerificationKey2020"
    assert body["verificationMethod"][0]["publicKeyMultibase"].startswith("z")


@pytest.mark.asyncio
async def test_presets_listed() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/presets/")
    assert res.status_code == 200
    body = res.json()
    ids = {p["id"] for p in body["items"]}
    assert "celestial-extrusion-billet-6063" in ids
    assert "celestial-r-sheet-ingot-5xxx" in ids
    assert "standard-sow-ingot-p1020" in ids


@pytest.mark.asyncio
async def test_invalid_cast_event_returns_400(mint_token) -> None:
    """Schema validation rejects garbage inputs without crashing.

    The endpoint is now authenticated, so we mint a dev-signed dpp_operator
    token first; the 400 we expect comes from schema validation downstream.
    """
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    token = mint_token(role="dpp_operator", tenant_id=1)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/cast-events/",
            json={"schemaVersion": "1.0.0", "trackingId": uuid4().hex, "tenantId": 1},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_authenticated_endpoint_rejects_missing_token() -> None:
    """Authenticated endpoints fail closed without a token."""
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/audit")
    assert res.status_code == 401
    body = res.json()
    assert body["detail"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_role_gate_rejects_wrong_role(mint_token) -> None:
    """A customer token cannot read the tenant audit log."""
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    token = mint_token(role="customer_user", tenant_id=1, organization="bmw")
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/audit",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 403
    body = res.json()
    assert body["detail"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_public_dpp_path_is_anonymous() -> None:
    """The public viewer path stays anonymous (no token, tier=public)."""
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 404 for an unknown DPP, but no 401 — confirms anonymous access.
        res = await client.get("/api/v1/dpps/01234567/X/0001?tier=public")
    assert res.status_code == 404
