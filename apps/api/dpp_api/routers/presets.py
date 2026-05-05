"""Simulator presets — read-only catalogue of EGA-anchored seed values.

Backs the Operator Console's Sources → Simulator tab (SDD §5.1.5) and the
workshop-mode configurator. Presets ship with the platform; customisation
happens via the manual entry wizard (different endpoint).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..services.presets import PRESETS, get_preset

router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("/")
async def list_presets() -> dict[str, object]:
    """Return all presets in summary form."""
    return {
        "items": [
            {
                "id": p["id"],
                "label": p["label"],
                "summary": p["summary"],
                "brand": p["brand"],
                "form": p["form"],
                "alloyEn": p["alloyEn"],
                "carbon": {
                    "valueKgCo2ePerTonne": p["carbon"]["valueKgCo2ePerTonne"],
                    "industryAverageKgCo2ePerTonne": p["carbon"]["industryAverageKgCo2ePerTonne"],
                },
                "recycledContent": {"totalPercent": p["recycledContent"]["totalPercent"]},
            }
            for p in PRESETS.values()
        ]
    }


@router.get("/{preset_id}")
async def show_preset(preset_id: str) -> dict[str, object]:
    """Return the full preset payload."""
    preset = get_preset(preset_id)
    if preset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="preset not found")
    return preset
