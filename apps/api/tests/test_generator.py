"""Generator produces DPP bodies that validate against the canonical schema."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from dpp_api.services.generator import build_dpp_from_cast_event
from dpp_api.services.schema_validator import validate_against


@pytest.mark.parametrize(
    "preset_id,brand,form",
    [
        ("celestial-extrusion-billet-6063", "CelestiAL", "extrusion_billet"),
        ("celestial-r-sheet-ingot-5xxx", "CelestiAL-R", "sheet_ingot"),
        ("standard-sow-ingot-p1020", "Standard", "sow"),
    ],
)
def test_generator_produces_schema_valid_dpp(preset_id: str, brand: str, form: str) -> None:
    cast_event = {
        "schemaVersion": "1.0.0",
        "trackingId": uuid4().hex,
        "source": {"kind": "simulator", "actor": "tests", "presetId": preset_id},
        "occurredAt": datetime.now(UTC).isoformat(),
        "tenantId": 1,
        "cast": _cast_for(preset_id, brand, form),
    }
    body = build_dpp_from_cast_event(cast_event)
    validate_against("dpp/v1.0.0", body)
    assert body["identification"]["brand"] == brand
    assert body["identification"]["form"] == form
    assert body["carbon"]["valueKgCo2ePerTonne"] > 0
    assert body["meta"]["lifecycleState"] == "draft"


def _cast_for(preset_id: str, brand: str, form: str) -> dict[str, object]:
    base: dict[str, object] = {
        "castNumber": f"C-{uuid4().hex[:8]}",
        "alloyEn": "EN AW-6063",
        "alloyAa": "AA 6063",
        "brand": brand,
        "form": form,
        "weightKg": 1380,
        "casthouseUfi": "0814406063812",
        "smelterUfi": "0814406063800",
        "purityGrade": "P1020A",
    }
    if form == "extrusion_billet":
        base.update({"diameterMm": 228, "lengthMm": 7000, "alloyEn": "EN AW-6063"})
    elif form == "sheet_ingot":
        base.update(
            {
                "widthMm": 1900,
                "thicknessMm": 600,
                "lengthMm": 7600,
                "weightKg": 22500,
                "alloyEn": "EN AW-5754",
                "alloyAa": "AA 5754",
            }
        )
    elif form == "sow":
        base.update(
            {
                "lengthMm": 760,
                "widthMm": 220,
                "thicknessMm": 130,
                "weightKg": 680,
                "alloyEn": "EN AC-46000",
                "alloyAa": "AA 1020",
            }
        )
    return base
