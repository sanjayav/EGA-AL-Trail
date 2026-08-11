"""Runtime schema validation against packages/schema/schemas/.

We use jsonschema (Python) to validate inbound payloads at the API edge so the
contract is enforced before anything reaches the database.
"""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, RefResolver
from jsonschema.exceptions import ValidationError

_HERE = Path(__file__).resolve()


def _find_schema_dir() -> Path:
    """Locate packages/schema/schemas across deployment shapes.

    Priority: DPP_SCHEMA_DIR env override → monorepo root (pnpm-workspace.yaml
    marker) → `_schemas/` vendored next to the app package, which serverless
    bundles (Vercel) populate at build time because the bundle contains only
    the apps/api subtree.
    """
    import os

    override = os.environ.get("DPP_SCHEMA_DIR")
    if override:
        return Path(override)
    for p in _HERE.parents:
        if (p / "pnpm-workspace.yaml").exists():
            return p / "packages" / "schema" / "schemas"
    for p in _HERE.parents:
        vendored = p / "_schemas"
        if vendored.is_dir():
            return vendored
    raise RuntimeError(
        "cannot locate the JSON schema directory: no pnpm-workspace.yaml ancestor, "
        "no vendored _schemas/, and DPP_SCHEMA_DIR is unset"
    )


_SCHEMA_DIR = _find_schema_dir()


@cache
def _load_schema(name: str) -> dict[str, Any]:
    path = _SCHEMA_DIR / f"{name}.json"
    with path.open("r", encoding="utf-8") as fh:
        loaded: dict[str, Any] = json.load(fh)
        return loaded


@cache
def _validator(name: str) -> Draft202012Validator:
    schema = _load_schema(name)
    store = {
        _load_schema("dpp/v1.0.0")["$id"]: _load_schema("dpp/v1.0.0"),
        _load_schema("cast-event/v1.0.0")["$id"]: _load_schema("cast-event/v1.0.0"),
        _load_schema("envelope/v1.0.0")["$id"]: _load_schema("envelope/v1.0.0"),
    }
    resolver = RefResolver(base_uri=schema.get("$id", ""), referrer=schema, store=store)
    return Draft202012Validator(schema, resolver=resolver)


def validate_against(name: str, payload: Any) -> None:
    """Raise ValueError with a flattened error trail if `payload` is invalid."""
    validator = _validator(name)
    errors = sorted(validator.iter_errors(payload), key=lambda e: list(e.absolute_path))
    if not errors:
        return
    flat = [
        {
            "path": "/" + "/".join(str(p) for p in e.absolute_path),
            "message": e.message,
            "validator": e.validator,
        }
        for e in errors
    ]
    raise ValueError(f"{len(flat)} validation error(s): {flat}")


def is_valid(name: str, payload: Any) -> bool:
    try:
        validate_against(name, payload)
        return True
    except (ValueError, ValidationError):
        return False
