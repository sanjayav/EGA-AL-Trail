"""Attribute monitoring router — read-only operational view.

Surfaces the rollup that powers /console/monitoring. Read scope: tenant_auditor
or above (the same role family that can view the audit log) — this surface
exposes attribute *coverage* shape, not raw values, but it does include the
latest concrete value for the freshest DPP, which is sensitive enough to
warrant review-tier authentication.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal, require_tenant_auditor
from ..db import get_tenant_session
from ..services.monitoring import attribute_monitor_report

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/attributes")
async def attributes_endpoint(
    dpp_version: str = Query("1.0", description="Manifest version to inspect"),
    necessity: str | None = Query(
        "mandatory",
        description="Filter to attribute necessity. Pass empty string for all.",
    ),
    principal: Principal = Depends(require_tenant_auditor),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, Any]:
    report = await attribute_monitor_report(
        session,
        tenant_id=principal.tenant_id,
        dpp_version=dpp_version,
        necessity=necessity or None,
    )
    return {
        "generatedAt": report.generated_at.isoformat(),
        "totals": {
            "mandatory": report.totals.mandatory,
            "fresh": report.totals.fresh,
            "stale": report.totals.stale,
            "breach": report.totals.breach,
            "missing": report.totals.missing,
            "sourcesTotal": report.totals.sources_total,
            "sourcesHealthy": report.totals.sources_healthy,
        },
        "items": [
            {
                "attributeId": i.attribute_id,
                "attributePath": i.attribute_path,
                "label": i.label,
                "description": i.description,
                "regulatoryAnchor": i.regulatory_anchor,
                "dppVersion": i.dpp_version,
                "necessity": i.necessity,
                "stepId": i.step_id,
                "stepSlug": i.step_slug,
                "stepName": i.step_name,
                "stepTier": i.step_tier,
                "dppCount": i.dpp_count,
                "lastSeenAt": i.last_seen_at.isoformat() if i.last_seen_at else None,
                "lastValue": i.last_value,
                "lastUpi": i.last_upi,
                "status": i.status,
                "sources": [
                    {
                        "id": s.id,
                        "connectorKind": s.connector_kind,
                        "supplierName": s.supplier_name,
                        "permissionState": s.permission_state,
                        "lastSyncAt": s.last_sync_at.isoformat() if s.last_sync_at else None,
                        "lastSyncStatus": s.last_sync_status,
                    }
                    for s in i.sources
                ],
            }
            for i in report.items
        ],
    }
