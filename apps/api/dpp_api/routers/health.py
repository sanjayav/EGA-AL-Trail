"""Health and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .. import __version__
from ..db import get_session_dependency

router = APIRouter(tags=["meta"])


@router.get("/healthz")
async def liveness() -> dict[str, str]:
    """Liveness probe — process is up. No dependencies checked."""
    return {"status": "ok", "version": __version__}


@router.get("/readyz")
async def readiness(session: AsyncSession = Depends(get_session_dependency)) -> dict[str, object]:
    """Readiness probe — the process is ready to serve traffic."""
    db_ok = False
    try:
        result = await session.execute(text("SELECT 1"))
        db_ok = result.scalar() == 1
    except Exception:
        db_ok = False
    return {
        "status": "ready" if db_ok else "degraded",
        "version": __version__,
        "checks": {"database": "ok" if db_ok else "fail"},
    }
