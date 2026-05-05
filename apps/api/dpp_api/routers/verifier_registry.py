"""Tenant-side read of the verifier registry.

Distinct from `routers.verifier`, which is the verifier-tier write surface.
This is what the tenant operator sees on /console/verifiers — a card per
external verifier whose credentials touch this tenant's DPPs.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal, require_tenant_auditor
from ..db import get_tenant_session
from ..services.verifier_registry import list_verifier_registry

router = APIRouter(prefix="/verifier-registry", tags=["verifier-registry"])


@router.get("")
async def list_verifier_registry_endpoint(
    principal: Principal = Depends(require_tenant_auditor),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    items = await list_verifier_registry(session, tenant_id=principal.tenant_id)
    return {"items": items, "tenantId": principal.tenant_id}
