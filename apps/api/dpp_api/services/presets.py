"""In-process registry of simulator presets.

In v1.0 these are loaded from packages/schema/presets at boot. In v1.5+ they
live in the reference-data store so tenants can override per-product.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# Resolve the presets directory across deployment shapes — monorepo checkout
# or a serverless bundle that vendors them under _presets/ (see the matching
# logic in services/schema_validator.py).
_HERE = Path(__file__).resolve()


def _find_presets_dir() -> Path:
    import os

    override = os.environ.get("DPP_PRESETS_DIR")
    if override:
        return Path(override)
    for p in _HERE.parents:
        if (p / "pnpm-workspace.yaml").exists():
            return p / "packages" / "schema" / "presets"
    for p in _HERE.parents:
        vendored = p / "_presets"
        if vendored.is_dir():
            return vendored
    raise RuntimeError(
        "cannot locate the presets directory: no pnpm-workspace.yaml ancestor, "
        "no vendored _presets/, and DPP_PRESETS_DIR is unset"
    )


_PRESETS_DIR = _find_presets_dir()


@lru_cache(maxsize=1)
def _load() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for path in sorted(_PRESETS_DIR.glob("*.json")):
        with path.open("r", encoding="utf-8") as fh:
            preset = json.load(fh)
            out[preset["id"]] = preset
    return out


PRESETS = _load()


def get_preset(preset_id: str) -> dict[str, Any] | None:
    return PRESETS.get(preset_id)
