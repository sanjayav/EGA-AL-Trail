"""Platform-admin (Super Admin) read API.

Mounted at /api/v1/admin/*. Locked to the `platform_admin` role; the
`get_session_dependency` (unscoped — tenant_id=0) means platform admins see
every tenant's data via the RLS escape clause in the policies.

Sprint 8 adds writes (tenant provisioning, Stripe billing, feature flags).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal
from ..auth.dependencies import require_platform_admin
from ..db import get_session_dependency
from ..services.tenants import list_tenants, platform_overview, trust_list

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
async def overview(
    principal: Principal = Depends(require_platform_admin),
    session: AsyncSession = Depends(get_session_dependency),
) -> dict[str, object]:
    return await platform_overview(session)


@router.get("/tenants")
async def tenants(
    principal: Principal = Depends(require_platform_admin),
    session: AsyncSession = Depends(get_session_dependency),
) -> dict[str, object]:
    items = await list_tenants(session)
    return {"items": items}


@router.get("/trust-list")
async def trust(
    principal: Principal = Depends(require_platform_admin),
    session: AsyncSession = Depends(get_session_dependency),
) -> dict[str, object]:
    items = await trust_list(session)
    return {"items": items}
