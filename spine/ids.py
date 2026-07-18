"""Deterministic entity slug ids (R9): {type}:{slug(name)}.

Deterministic so `link` and the seed loader are idempotent on re-run: the same
name always maps to the same id, whether it arrives from a seed file or as an
enrichment relationship target.
"""
from __future__ import annotations

import re
import unicodedata

# Vietnamese đ/Đ has no ASCII decomposition; map it explicitly before stripping.
_D_STROKE = str.maketrans({"đ": "d", "Đ": "D"})


def slugify(name: str) -> str:
    n = name.translate(_D_STROKE)
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode()
    n = re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")
    return n or "entity"


def entity_id(type_: str, name: str) -> str:
    return f"{type_}:{slugify(name)}"
