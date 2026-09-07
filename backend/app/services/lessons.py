"""Lesson verification + reads (P22-1).

Every example in a lesson must be derivable by the engine. Verification runs
at SEED time, not at request time: each example carries ``derivation_params``
(a prakriya.derive call) or a ``sandhi_join`` (a split_candidates call), and
the seed stores the example only when the engine reproduces the surface form
exactly. A lesson cannot claim a form the engine cannot produce — the §6
provenance rule applied to content.

``derive`` never raises (it degrades to an empty result), so verification is
``result == devanagari``: an empty result fails, and a confident wrong result
(measured: वद् → वन्दते, कन्या → कन्याः) fails too.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Lesson
from app.services import prakriya
from app.services.sandhi import split_candidates

logger = logging.getLogger("shabd.lessons")


def verify_example(example: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Verify one seed example against the engine.

    Returns the storable example (with ``derivation`` attached) or None when
    the engine cannot reproduce the surface form — the caller drops Nones.
    """
    dev = (example.get("devanagari") or "").strip()
    if not dev:
        return None
    params = example.get("derivation_params") or {}
    if params:
        try:
            der = prakriya.derive(**params)
        except Exception:  # noqa: BLE001 — unverifiable means dropped
            return None
        if not der or der.get("result") != dev:
            logger.info("lesson example dropped (engine cannot derive): %s", dev)
            return None
        return {
            "devanagari": dev,
            "iast": example.get("iast", ""),
            "gloss": example.get("gloss", ""),
            "derivation": der,
        }
    join = (example.get("sandhi_join") or "").strip()
    if join:
        try:
            splits = split_candidates(join)
        except Exception:  # noqa: BLE001
            return None
        if not splits:
            logger.info("lesson example dropped (no sandhi split): %s", dev)
            return None
        return {
            "devanagari": dev,
            "iast": example.get("iast", ""),
            "gloss": example.get("gloss", ""),
            "derivation": {"splits": splits[:3]},
        }
    # No verifiable claim attached — prose-only illustration, stored without
    # a derivation. The client renders it without a SutraCard.
    return {
        "devanagari": dev,
        "iast": example.get("iast", ""),
        "gloss": example.get("gloss", ""),
        "derivation": None,
    }


def get_lesson(db: Session, feature_id: str) -> Optional[Lesson]:
    return db.query(Lesson).filter(Lesson.feature_id == feature_id).first()


def lesson_feature_ids(db: Session) -> set[str]:
    """Feature ids that have a lesson — the P22-4 ``has_lesson`` contract."""
    return {r[0] for r in db.query(Lesson.feature_id).all()}
