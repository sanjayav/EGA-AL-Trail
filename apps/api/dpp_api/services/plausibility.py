"""Plausibility checks (SDD §8.5 Definition of Done item 25).

Catches the obviously-wrong cast events before they become signed DPPs.
Two failure modes: hard rejection (raise) or soft warning (return).

Bounds are conservative — derived from EGA's published 2024 LCA and IAI v2.0
sector statistics. They tighten as v1.5 introduces site-specific data.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PlausibilityResult:
    ok: bool
    severity: str = "ok"  # ok | warn | reject
    issues: list[str] = field(default_factory=list)


# DoD §8.5: every DPP must list ≥5 regulations and ≥5 certifications.
MIN_COMPLIANCE_ENTRIES = 5
MAX_PERCENT = 100

# Conservative cradle-to-gate CFP bounds per IAI v2.0 + EGA verified data (kg CO₂e/t).
# Lower bound: hourly-matched solar (theoretical minimum for primary). Upper bound:
# coal-grid primary average (China baseline ~20 t/t).
_CFP_BANDS: dict[str, tuple[float, float]] = {
    "CelestiAL": (3000.0, 6000.0),
    "CelestiAL-R": (2200.0, 4500.0),
    "Standard": (8500.0, 13000.0),
    "High-Purity": (8500.0, 14000.0),
    "Foundry Alloy": (3000.0, 13000.0),
}

# Weight bounds per cast form (kg). These are absolute extremes; production
# casts cluster near the centre. Anything outside the band is almost certainly
# a unit mistake.
_WEIGHT_BANDS: dict[str, tuple[float, float]] = {
    "extrusion_billet": (50.0, 5000.0),  # 152mm × 0.5m to 406mm × 7.5m
    "sheet_ingot": (5000.0, 35000.0),
    "foundry_ingot": (5.0, 50.0),
    "t_bar": (200.0, 2000.0),
    "sow": (300.0, 1200.0),
    "standard_ingot": (15.0, 30.0),
    "properzi": (50.0, 5000.0),
    "hdc_small": (5.0, 100.0),
    "b_ingot": (5.0, 50.0),
}


def check_cast_event(cast_event: dict[str, Any]) -> PlausibilityResult:
    """Validate a canonical cast event before generator runs."""
    issues: list[str] = []
    cast = cast_event.get("cast", {})
    severity = "ok"

    weight = cast.get("weightKg")
    form = cast.get("form")
    if weight is not None and form in _WEIGHT_BANDS:
        lo, hi = _WEIGHT_BANDS[form]
        if not (lo <= weight <= hi):
            issues.append(
                f"weight {weight}kg outside expected band [{lo}, {hi}]kg for form '{form}'"
            )
            severity = "reject"

    # Dimensions sanity — a billet must declare diameter, sheet ingots width+thickness.
    if form == "extrusion_billet" and not cast.get("diameterMm"):
        issues.append("extrusion_billet must declare diameterMm")
        severity = "reject"
    if form == "sheet_ingot":
        for key in ("widthMm", "thicknessMm"):
            if not cast.get(key):
                issues.append(f"sheet_ingot must declare {key}")
                severity = "reject"

    return PlausibilityResult(ok=severity != "reject", severity=severity, issues=issues)


def check_dpp_body(body: dict[str, Any]) -> PlausibilityResult:
    """Validate a fully-generated DPP body before signing."""
    issues: list[str] = []
    severity = "ok"

    brand = body.get("identification", {}).get("brand")
    cfp = body.get("carbon", {}).get("valueKgCo2ePerTonne")
    if brand and cfp is not None and brand in _CFP_BANDS:
        lo, hi = _CFP_BANDS[brand]
        if not (lo <= cfp <= hi):
            issues.append(
                f"CFP {cfp} kg CO₂e/t outside expected band [{lo}, {hi}] for brand '{brand}'"
            )
            severity = "reject"

    # Compliance must contain the DoD-mandated minimums.
    compliance = body.get("compliance", {})
    regs = compliance.get("regulations", [])
    certs = compliance.get("certifications", [])
    if len(regs) < MIN_COMPLIANCE_ENTRIES:
        issues.append(
            f"compliance.regulations has {len(regs)} entries; "
            f"minimum {MIN_COMPLIANCE_ENTRIES} required"
        )
        severity = "reject"
    if len(certs) < MIN_COMPLIANCE_ENTRIES:
        issues.append(
            f"compliance.certifications has {len(certs)} entries; "
            f"minimum {MIN_COMPLIANCE_ENTRIES} required"
        )
        severity = "reject"

    # Carbon must reference a verifier with a non-empty DID.
    verifier = body.get("carbon", {}).get("verifier", {})
    if not verifier.get("did"):
        issues.append("carbon.verifier.did is empty — every DPP requires a CFP verifier")
        severity = "reject"

    # Recycled-content total must be 0–100.
    reco = body.get("recycledContent", {}).get("totalPercent")
    if reco is not None and not (0 <= reco <= MAX_PERCENT):
        issues.append(f"recycledContent.totalPercent {reco} outside 0–{MAX_PERCENT}")
        severity = "reject"

    return PlausibilityResult(ok=severity != "reject", severity=severity, issues=issues)


class PlausibilityRejection(ValueError):  # noqa: N818
    """Raised when a cast event or DPP body fails hard-reject plausibility checks."""

    def __init__(self, result: PlausibilityResult) -> None:
        super().__init__(f"Plausibility rejection: {'; '.join(result.issues)}")
        self.result = result
