"""
Phonetic distance on the varṇamālā grid (P11-4).

The 5×5 sparśa matrix is a physical map of the mouth: rows are place of
articulation (throat→lips), columns are voicing/aspiration (and the nasal
completes each row). Two sounds are "near" when they share a place and differ
only in voicing (क→ग), far when the place differs (क→प).

We use ONLY the ``place`` / ``voicing`` values the varnamala API already
returns (HANDOVER P11-4: do not invent articulation data). Local, ₹0, no quota.
"""

from __future__ import annotations

import logging

from app.seeds.varnamala import VARNAMALA_DATA

logger = logging.getLogger("shabd.varna_distance")

# Ordered columns of the sparśa grid: 4 stops + nasal.
_ORDER = ["voiceless", "voiceless_aspirated", "voiced", "voiced_aspirated"]
_PLACE_ORDER = ["kanthya", "talavya", "murdhanya", "dantya", "oshthya"]

# dev -> (place, column_index, is_nasal)
_GRID: dict[str, tuple[str, int, bool]] = {}


def _build():
    if _GRID:
        return
    for c in VARNAMALA_DATA["consonants"]:
        _GRID[c["devanagari"]] = (c["place"], _ORDER.index(c["voicing"]), False)
    for n in VARNAMALA_DATA["nasals"]:
        _GRID[n["devanagari"]] = (n["place"], 4, True)


def _feats(place: str, col: int) -> dict:
    """Decompose a grid cell into the features that actually distinguish it."""
    voicing = "voiced" if col in (2, 3) else "voiceless"
    aspiration = "aspirated" if col in (1, 3) else "unaspirated"
    return {"place": place, "voicing": voicing, "aspiration": aspiration}


def distance_on_grid(a: str, b: str) -> dict:
    """Return the phonetic distance and the axis that differs.

    ``{a, b, distance, axis}``. The distance counts the *features* that
    differ, so क→ग is distance 1 (same place, one voicing step) while क→प is
    distance 1 too in feature terms but is rendered far because crossing a
    place boundary is the big jump — we return the place-step count there.
    Axis is one of ``place | voicing | aspiration | nasality`` (None for
    identical characters). A character outside the sparśa grid returns
    ``distance`` ``-1`` and axis ``None`` rather than raising.
    """
    _build()
    if a == b:
        return {"a": a, "b": b, "distance": 0, "axis": None}
    ga, gb = _GRID.get(a), _GRID.get(b)
    if ga is None or gb is None:
        return {"a": a, "b": b, "distance": -1, "axis": None}

    place_a, col_a, nasal_a = ga
    place_b, col_b, nasal_b = gb

    if place_a != place_b:
        # Crossing a place boundary is the big jump (क→प is far).
        place_dist = abs(_PLACE_ORDER.index(place_a) - _PLACE_ORDER.index(place_b))
        return {"a": a, "b": b, "distance": place_dist, "axis": "place"}

    # Same place. Nasality is its own axis.
    if nasal_a != nasal_b:
        return {"a": a, "b": b, "distance": 1, "axis": "nasality"}

    fa, fb = _feats(place_a, col_a), _feats(place_b, col_b)
    if fa["voicing"] != fb["voicing"] and fa["aspiration"] == fb["aspiration"]:
        return {"a": a, "b": b, "distance": 1, "axis": "voicing"}
    if fa["aspiration"] != fb["aspiration"] and fa["voicing"] == fb["voicing"]:
        return {"a": a, "b": b, "distance": 1, "axis": "aspiration"}
    # Both voicing AND aspiration changed (क → घ): two feature steps.
    changed = sum(1 for k in ("voicing", "aspiration") if fa[k] != fb[k])
    return {"a": a, "b": b, "distance": changed, "axis": "voicing"}
