"""GS1 Digital Link resolver.

Pattern: https://id.<tenant-domain>/01/{gtin}/10/{batch}/21/{serial}

For local dev, anything matching `/01/{gtin}/10/{batch}` resolves to the
appropriate DPP for the default tenant (configured in env). The resolver does
not return HTML directly — that's the public viewer's job. Instead it issues a
302 to the viewer with the resolved DPP UPI, or returns JSON if the client
asks for JSON via Accept negotiation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session_dependency
from ..services.dpps import fetch_dpp_view, resolve_by_digital_link
from ..settings import get_settings

router = APIRouter(tags=["resolver"])


@router.get("/01/{gtin}/10/{batch}")
async def resolve(
    gtin: str,
    batch: str,
    accept: str = Header(default="text/html"),
    session: AsyncSession = Depends(get_session_dependency),
) -> object:
    settings = get_settings()
    upi = await resolve_by_digital_link(session, gtin=gtin, batch=batch)
    if upi is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP not found")

    if "application/json" in accept or "application/ld+json" in accept:
        view = await fetch_dpp_view(session, upi=upi, tier="public")
        return view

    target = f"{settings.dpp_resolver_base_url}/dpp/{upi}"
    return RedirectResponse(target, status_code=status.HTTP_302_FOUND)


@router.get("/01/{gtin}/10/{batch}/21/{serial}")
async def resolve_with_serial(
    gtin: str,
    batch: str,
    serial: str,
    accept: str = Header(default="text/html"),
    session: AsyncSession = Depends(get_session_dependency),
) -> object:
    return await resolve(gtin=gtin, batch=batch, accept=accept, session=session)
