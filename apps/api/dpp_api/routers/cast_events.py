"""Cast-event ingestion endpoint (Layer 1 → Layer 2).

POST /api/v1/cast-events accepts a canonical CastEvent payload. The endpoint:
  1. Validates the payload against schemas/cast-event/v1.0.0.json (via service).
  2. Persists the event with status=received (idempotent on tracking_id).
  3. Hands off to the generator service (in-process for v1.0; Temporal in v2).
  4. Returns 202 Accepted with the tracking_id and resolved DPP UPI.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import Principal
from ..auth.dependencies import require_dpp_operator, require_dpp_reviewer
from ..db import get_tenant_session
from ..services.cast_events import IngestionResult, ingest_cast_event
from ..services.pipeline import run_dpp_pipeline
from ..services.plausibility import PlausibilityRejection

router = APIRouter(prefix="/cast-events", tags=["cast-events"])


class CastEventResponse(BaseModel):
    tracking_id: str = Field(...)
    status: str
    upi: str | None = None
    digital_link_url: str | None = None
    cast_event_id: int | None = None
    dpp_id: int | None = None


@router.post(
    "/",
    response_model=CastEventResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_cast_event(
    payload: dict,
    response: Response,
    principal: Principal = Depends(require_dpp_operator),
    session: AsyncSession = Depends(get_tenant_session),
) -> CastEventResponse:
    """Accept a canonical cast event and trigger DPP issuance."""
    # Pin tenantId from the verified principal, never from caller input.
    payload["tenantId"] = principal.tenant_id
    try:
        result: IngestionResult = await ingest_cast_event(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # In v1.0 the pipeline runs inline. v2 will fan out to Temporal workers.
    try:
        pipeline_result = await run_dpp_pipeline(session, result.cast_event_id)
    except PlausibilityRejection as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "plausibility_rejection", "issues": exc.result.issues},
        ) from exc

    response.headers["Location"] = f"/api/v1/dpps/{pipeline_result.upi}"
    return CastEventResponse(
        tracking_id=result.tracking_id,
        status=pipeline_result.state,
        upi=pipeline_result.upi,
        digital_link_url=pipeline_result.digital_link_url,
        cast_event_id=result.cast_event_id,
        dpp_id=pipeline_result.dpp_id,
    )


@router.get("/{tracking_id}/status", response_model=CastEventResponse)
async def get_status(
    tracking_id: str,
    principal: Principal = Depends(require_dpp_reviewer),
    session: AsyncSession = Depends(get_tenant_session),
) -> CastEventResponse:
    from ..services.cast_events import get_status_by_tracking_id

    record = await get_status_by_tracking_id(session, tracking_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown tracking id")
    return CastEventResponse(**record)
