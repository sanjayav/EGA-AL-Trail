"""Customer Portal API surface.

All endpoints under /api/v1/customer/* apply the legitimate-interest field
projection automatically. The customer's `organization` claim (e.g. "bmw")
identifies which buyer they are; this drives row-scope filtering when v1.5
introduces shipment ↔ customer-org joins.

Auth: every endpoint requires a `customer_user` or `customer_admin` role
JWT, with `tnt` claim pinning the seller tenant and `org` claim pinning
the buyer organisation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal
from ..auth.dependencies import require_customer
from ..db import get_tenant_session
from ..services.audit import append_audit
from ..services.bundles import export_bundle
from ..services.customer_views import (
    carbon_aggregate,
    compliance_summary,
    fetch_for_customer,
    list_for_customer,
    recycled_content_aggregate,
)
from ..services.webhooks import (
    SUPPORTED_EVENTS,
    create_subscription,
    delete_subscription,
    list_subscriptions,
)

router = APIRouter(prefix="/customer", tags=["customer"])


def _org_or_403(principal: Principal) -> str:
    """Customer endpoints require an `org` claim — verifier tokens without
    a buyer organisation can't be scoped to a customer-specific view."""
    if not principal.organization:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "forbidden",
                "message": "customer token missing 'org' claim",
            },
        )
    return principal.organization


# ── DPP read endpoints ─────────────────────────────────────────────────────


@router.get("/dpps")
async def list_dpps_endpoint(
    brand: str | None = Query(default=None),
    period_from: str | None = Query(default=None),
    period_to: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    customer_org = _org_or_403(principal)
    items, total = await list_for_customer(
        session,
        customer_org=customer_org,
        brand=brand,
        period_from=period_from,
        period_to=period_to,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/dpps/{upi:path}")
async def get_dpp_endpoint(
    upi: str,
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    customer_org = _org_or_403(principal)
    view = await fetch_for_customer(session, upi=upi, customer_org=customer_org)
    if view is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP not found")
    return view


# ── Aggregates / dashboard data ────────────────────────────────────────────


@router.get("/compliance/summary")
async def compliance_summary_endpoint(
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    return await compliance_summary(session)


@router.get("/carbon/aggregate")
async def carbon_aggregate_endpoint(
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    return await carbon_aggregate(session)


@router.get("/recycled/aggregate")
async def recycled_aggregate_endpoint(
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    return await recycled_content_aggregate(session)


# ── Bundle exports ─────────────────────────────────────────────────────────


class ExportRequest(BaseModel):
    upis: list[str] = Field(min_length=1, max_length=2000)
    label: str | None = None


@router.post("/exports/bundle")
async def export_bundle_endpoint(
    payload: ExportRequest,
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> Response:
    """Generate and return a signed ZIP bundle of the requested DPPs.

    The bundle ships immediately rather than via async job for v1.0; v1.5
    will move to a queued workflow with email delivery for bundles > 50 MB.
    """
    customer_org = _org_or_403(principal)
    try:
        result = await export_bundle(
            session,
            upis=payload.upis,
            requested_by=customer_org,
            label=payload.label,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await append_audit(
        session,
        tenant_id=principal.tenant_id,
        actor_kind="user",
        actor_id=f"customer:{customer_org}",
        action="dpp.bundle_exported",
        target_kind="bundle",
        target_id=result.receipt_id,
        severity="notice",
        details={
            "itemCount": result.item_count,
            "sizeBytes": result.size_bytes,
            "sha256": result.sha256,
            "label": payload.label,
        },
    )

    return Response(
        content=result.archive,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{result.receipt_id}.zip"',
            "X-Bundle-Receipt-Id": result.receipt_id,
            "X-Bundle-Sha256": result.sha256,
            "X-Bundle-Item-Count": str(result.item_count),
        },
    )


# ── Webhook subscriptions ──────────────────────────────────────────────────


class WebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    url: str = Field(min_length=1, max_length=1024)
    events: list[str] = Field(min_length=1)


@router.get("/webhooks")
async def list_webhooks_endpoint(
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    customer_org = _org_or_403(principal)
    items = await list_subscriptions(
        session, tenant_id=principal.tenant_id, customer_org=customer_org
    )
    return {"items": items, "supportedEvents": list(SUPPORTED_EVENTS)}


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook_endpoint(
    payload: WebhookCreate,
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    customer_org = _org_or_403(principal)
    try:
        result = await create_subscription(
            session,
            tenant_id=principal.tenant_id,
            customer_org=customer_org,
            name=payload.name,
            url=payload.url,
            events=payload.events,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await append_audit(
        session,
        tenant_id=principal.tenant_id,
        actor_kind="user",
        actor_id=f"customer:{customer_org}",
        action="webhook.created",
        target_kind="webhook",
        target_id=str(result.id),
        details={"events": payload.events, "url": payload.url},
    )
    return {
        "id": result.id,
        "secret": result.secret_plaintext,
        "_warning": "Store this secret now — it is only returned once.",
    }


@router.delete("/webhooks/{subscription_id}")
async def delete_webhook_endpoint(
    subscription_id: int,
    principal: Principal = Depends(require_customer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    customer_org = _org_or_403(principal)
    deleted = await delete_subscription(
        session,
        tenant_id=principal.tenant_id,
        customer_org=customer_org,
        subscription_id=subscription_id,
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="webhook not found")
    await append_audit(
        session,
        tenant_id=principal.tenant_id,
        actor_kind="user",
        actor_id=f"customer:{customer_org}",
        action="webhook.deleted",
        target_kind="webhook",
        target_id=str(subscription_id),
        severity="notice",
    )
    return {"deleted": True}
