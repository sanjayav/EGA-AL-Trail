"""DPP generator (Layer 2 → Layer 3).

Maps a canonical CastEvent to a fully-populated DPP record by merging:
  - the inbound cast payload (operator/casthouse/MES data)
  - reference data: simulator preset (when source=simulator), CFP store, ASI registry

For v1.0, when a simulator preset is referenced via source.presetId, that preset
becomes the dominant source of truth. Real MES integrations in v2 will read
from the reference-data store instead.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from ..settings import get_settings
from .presets import get_preset
from .reference_data import CfpReference
from .schema_validator import validate_against


def build_dpp_from_cast_event(
    cast_event: dict[str, Any],
    *,
    cfp_override: CfpReference | None = None,
    compliance_override: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    """Construct a canonical DPP record from a validated cast event.

    `cfp_override` and `compliance_override` come from the reference-data store
    when available; the preset is the fallback for fresh installs and tests.
    """
    settings = get_settings()
    cast = cast_event["cast"]
    source = cast_event["source"]
    preset = get_preset(source["presetId"]) if source.get("presetId") else None

    now = datetime.now(UTC)
    expires_at = now + timedelta(days=365 * 10)  # ESPR Art 10(3) — 10 year retention

    gtin = _gtin_for(cast["brand"], cast["form"])
    cast_number = cast["castNumber"]
    item_serial = cast.get("itemSerial") or "0001"
    digital_link = (
        f"{settings.dpp_resolver_base_url}/01/{gtin}/10/{cast_number}/21/{item_serial}"
    )

    if cfp_override is not None:
        carbon = _carbon_from_reference(cfp_override)
    elif preset is not None:
        carbon = preset["carbon"]
    else:
        carbon = _default_carbon(cast["brand"])

    recycled = preset["recycledContent"] if preset else _default_recycled()

    dpp: dict[str, Any] = {
        "schemaVersion": "1.0.0",
        "dppVersion": "1.0",
        "upi": {
            "castNumber": cast_number,
            "gtin": gtin,
            "itemSerial": item_serial,
            "digitalLinkUrl": digital_link,
            "taricCode": "7601.10",
            "hsCode": "7601",
            "esprProductCategory": "Aluminium intermediate product",
        },
        "identification": {
            "alloyEn": cast["alloyEn"],
            "alloyAa": cast.get("alloyAa", _aa_for(cast["alloyEn"])),
            "designationNumber": _designation_for(cast["alloyEn"]),
            "temper": cast.get("temper", "F"),
            "productionRoute": _route_for(cast["brand"]),
            "brand": cast["brand"],
            "form": cast["form"],
            "applicableStandards": ["EN 573-3", "EN 1559-3"],
        },
        "producer": {
            "uoi": "0814406063810",
            "name": "Emirates Global Aluminium PJSC",
            "trademark": "EGA",
            "registeredAddress": "P.O. Box 111023, Abu Dhabi, UAE",
            "regulatoryContact": {"team": "EGA Regulatory Affairs"},
        },
        "origin": {
            "country": "AE",
            "meltAndPourCountry": "AE",
            "manufacturingDate": now.date().isoformat(),
            "facilities": [
                {
                    "ufi": cast["casthouseUfi"],
                    "name": "Al Taweelah Casthouse",
                    "role": "casthouse",
                    "country": "AE",
                },
                {
                    "ufi": cast.get("smelterUfi", "0814406063800"),
                    "name": "Al Taweelah Smelter",
                    "role": "smelter",
                    "country": "AE",
                },
            ],
        },
        "product": {
            "name": preset["label"] if preset else f"{cast['brand']} {cast['form']}",
            "purposeStatement": preset["summary"]
            if preset
            else "Premium aluminium intermediate product.",
            "intendedMarket": ["automotive", "construction", "packaging"],
        },
        "physical": {
            "netWeightKg": cast["weightKg"],
            **{k: cast[k] for k in ("diameterMm", "lengthMm", "widthMm", "thicknessMm") if k in cast},
        },
        "chemistry": {"purityGrade": cast.get("purityGrade", "P1020A")},
        "carbon": {
            "valueKgCo2ePerTonne": carbon["valueKgCo2ePerTonne"],
            "declaredUnit": "1000 kg of aluminium ingot (factory gate)",
            "systemBoundary": "cradle_to_gate",
            "methodology": "ISO 14067:2018 + IAI Carbon Footprint Methodology v2.0 + PCR 2022:08 v1.0",
            "reportingPeriod": carbon["reportingPeriod"],
            "verifier": {
                "did": carbon["verifierDid"],
                "name": carbon["verifierName"],
            },
            "verificationStatementRef": carbon["verificationStatementRef"],
            "assuranceLevel": carbon["assuranceLevel"],
            "industryAverageKgCo2ePerTonne": carbon.get("industryAverageKgCo2ePerTonne", 14600),
        },
        "recycledContent": {
            "totalPercent": recycled["totalPercent"],
            "chainOfCustodyModel": recycled["chainOfCustodyModel"],
            "verifier": {
                "did": recycled["verifierDid"],
                "name": recycled["verifierName"],
            },
            "asiCertificateRef": recycled["asiCertificateRef"],
        },
        "compliance": compliance_override or _compliance_block(),
        "circularity": {
            "recyclabilityIndicator": "100% — aluminium is infinitely recyclable",
            "materialRecoveryPotential": "100% — closed-loop within EGA casthouse for run-around",
            "endOfLifeUrl": f"{settings.dpp_resolver_base_url}/eol-guidance",
            "reuseInformation": "Scrap aluminium re-melted internally.",
            "recyclingInformation": "100% process scrap recycled internally.",
            "disposalInformation": "Aluminium waste should never be landfilled — recycle.",
            "treatmentFacilityInfo": "Internal casthouses & external recycling operations.",
        },
        "espr": {
            "durability": "Aluminium is durable; specific products designed for permanent use.",
            "reliability": "Per applicable product standards.",
            "reusability": "Aluminium scrap reused/recycled internally (100%).",
            "energyEfficiency": "Solar-powered for CelestiAL; ISO 50001 certified."
            if cast["brand"].startswith("CelestiAL")
            else "ISO 50001 certified.",
            "resourceEfficiency": "High scrap utilisation and recycling loops.",
        },
        "sustainability": {
            "sustainablePurchasing": "Responsible sourcing programme (OECD-aligned).",
            "handling": "ESG policies; emergency response systems.",
        },
        "soc": {"summaryStatement": "no_svhc_above_threshold"},
        "useAndLife": {
            "safetyInformation": "ISO 45001-certified OH&S system.",
        },
        "documentation": {
            "documents": [
                {
                    "title": carbon["verificationStatementRef"],
                    "url": f"https://www.dnv.com/statements/{carbon['verificationStatementRef']}.pdf",
                    "type": "verification_statement",
                }
            ]
        },
        "meta": {
            "createdAt": now.isoformat(),
            "lastUpdated": now.isoformat(),
            "expiresAt": expires_at.isoformat(),
            "lifecycleState": "draft",
            "languages": ["en", "ar", "de"],
            "issuerDid": settings.dpp_issuer_did,
            "accessRights": {
                "model": "three_tier_vc_gated",
                "publicFields": [
                    "upi",
                    "identification",
                    "producer",
                    "origin",
                    "product",
                    "physical",
                    "carbon",
                    "recycledContent",
                    "compliance",
                    "circularity",
                    "espr",
                    "sustainability",
                    "meta",
                ],
            },
            "tenantId": int(cast_event["tenantId"]),
        },
    }

    # Drop empty optional blocks before validation; the schema requires keys but
    # not nested values, and we want a clean canonical form.
    validate_against("dpp/v1.0.0", dpp)
    return dpp


def _gtin_for(brand: str, form: str) -> str:
    """Stable mock GTIN by (brand, form). Real GTINs come from GS1 UAE allocation."""
    brand_part = {"CelestiAL": "01", "CelestiAL-R": "02", "Standard": "03"}.get(brand, "09")
    form_part = {"extrusion_billet": "10", "sheet_ingot": "20", "sow": "30"}.get(form, "99")
    base = f"0814406{brand_part}{form_part}"
    base13 = base.ljust(13, "0")[:13]
    return base13 + _gtin_check_digit(base13)


def _gtin_check_digit(base13: str) -> str:
    digits = [int(c) for c in base13]
    weighted = sum(d * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(digits)))
    return str((10 - (weighted % 10)) % 10)


def _aa_for(en: str) -> str:
    if "EN AW-" in en:
        return f"AA {en.split('-')[1]}"
    return "AA 1020"


def _designation_for(en: str) -> str:
    return {
        "EN AW-6063": "EN AW-6063 (AlMg0.7Si)",
        "EN AW-5754": "EN AW-5754 (AlMg3)",
        "EN AC-46000": "EN AC-46000 (AlSi9Cu3(Fe))",
    }.get(en, en)


def _route_for(brand: str) -> str:
    return {
        "CelestiAL": "primary_solar",
        "CelestiAL-R": "secondary",
        "Standard": "primary_grid",
    }.get(brand, "primary_grid")


def _carbon_from_reference(ref: CfpReference) -> dict[str, Any]:
    return {
        "valueKgCo2ePerTonne": ref.value_kg_co2e_per_tonne,
        "industryAverageKgCo2ePerTonne": ref.industry_average,
        "verifierDid": ref.verifier_did,
        "verifierName": ref.verifier_name,
        "verificationStatementRef": ref.statement_ref,
        "assuranceLevel": ref.assurance_level,
        "reportingPeriod": {"from": ref.period_from, "to": ref.period_to},
    }


def _default_carbon(brand: str) -> dict[str, Any]:
    return {
        "valueKgCo2ePerTonne": 4273 if brand == "CelestiAL" else 10545,
        "verifierDid": "did:web:dnv.com:cfp",
        "verifierName": "DNV AS – Abu Dhabi Branch",
        "verificationStatementRef": "DNV-PROVISIONAL",
        "assuranceLevel": "limited",
        "reportingPeriod": {"from": "2023-01-01", "to": "2023-12-31"},
        "industryAverageKgCo2ePerTonne": 14600,
    }


def _default_recycled() -> dict[str, Any]:
    return {
        "totalPercent": 0,
        "chainOfCustodyModel": "mass_balance",
        "verifierDid": "did:web:aluminium-stewardship.org:coc",
        "verifierName": "ASI accredited firm",
        "asiCertificateRef": "ASI CoC #428",
    }


def _compliance_block() -> dict[str, Any]:
    return {
        "regulations": [
            {"name": "REACH", "reference": "EC 1907/2006", "status": "compliant"},
            {"name": "RoHS 2", "reference": "2011/65/EU", "status": "compliant"},
            {"name": "TSCA", "reference": "US TSCA", "status": "compliant"},
            {"name": "Conflict Minerals", "reference": "Reg (EU) 2017/821", "status": "compliant"},
            {"name": "PFAS", "reference": "REACH PFAS restriction", "status": "compliant"},
        ],
        "certifications": [
            {
                "name": "ASI Performance",
                "reference": "ASI Performance V3.1",
                "status": "compliant",
                "certificateRef": "ASI Performance #27",
                "issuer": "ASI",
            },
            {
                "name": "ASI Chain of Custody",
                "reference": "ASI CoC V2.1",
                "status": "compliant",
                "certificateRef": "ASI CoC #428",
                "issuer": "ASI",
            },
            {"name": "ISO 9001", "reference": "ISO 9001:2015", "status": "compliant"},
            {"name": "ISO 14001", "reference": "ISO 14001:2015", "status": "compliant"},
            {"name": "ISO 45001", "reference": "ISO 45001:2018", "status": "compliant"},
        ],
    }


def new_tracking_id() -> str:
    return uuid4().hex
