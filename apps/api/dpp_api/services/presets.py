"""In-process registry of simulator presets.

In v1.0 these are loaded from packages/schema/presets at boot. In v1.5+ they
live in the reference-data store so tenants can override per-product.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# Resolve the monorepo root by walking up from this file.
_HERE = Path(__file__).resolve()
_ROOT = next(p for p in _HERE.parents if (p / "pnpm-workspace.yaml").exists())
_PRESETS_DIR = _ROOT / "packages" / "schema" / "presets"


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
