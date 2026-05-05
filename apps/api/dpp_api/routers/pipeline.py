"""Operator cockpit data — KPIs and recent events for /console/pipeline."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal
from ..auth.dependencies import require_dpp_reviewer
from ..db import get_tenant_session
from ..services.pipeline_metrics import (
    compute_metrics,
    issuance_timeseries,
    list_recent_events,
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.get("/metrics")
async def metrics_endpoint(
    principal: Principal = Depends(require_dpp_reviewer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    metrics = await compute_metrics(session)
    # asdict converts the dataclass → JSON-serialisable shape; rename keys
    # to camelCase to match the rest of the API.
    raw = asdict(metrics)
    return {
        "issued24h": raw["issued_24h"],
        "issuedToday": raw["issued_today"],
        "issuedPerMinute": raw["issued_per_minute"],
        "successRatePct": raw["success_rate_pct"],
        "avgCfp24h": raw["avg_cfp_24h"],
        "errorCount24h": raw["error_count_24h"],
        "p50LatencySeconds": raw["p50_latency_seconds"],
        "p95LatencySeconds": raw["p95_latency_seconds"],
        "queueDepth": raw["queue_depth"],
        "byBrand24h": raw["by_brand_24h"],
        "byStatus24h": raw["by_status_24h"],
        "sparkline15min": raw["sparkline_15min"],
    }


@router.get("/recent-events")
async def recent_events_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    principal: Principal = Depends(require_dpp_reviewer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    items = await list_recent_events(session, limit=limit)
    return {"items": items}


@router.get("/timeseries")
async def timeseries_endpoint(
    days: int = Query(default=30, ge=7, le=180),
    principal: Principal = Depends(require_dpp_reviewer),
    session: AsyncSession = Depends(get_tenant_session),
) -> dict[str, object]:
    items = await issuance_timeseries(session, days=days)
    return {"items": items, "days": days}
