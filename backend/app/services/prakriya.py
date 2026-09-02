"""
Pāṇinian derivation service — the differentiator.

Wraps ``vidyut.prakriya`` (a rule-based Rust library + data file, already a
dependency — this is linguistics, not inference, and so does NOT violate the
no-local-models invariant §2.7) to produce deterministic, offline, ₹0
derivations of Sanskrit word forms, complete with the numbered sūtra that made
each step.

This is LOCAL computation. No vendor call, no quota, no network. Any router
that consumes this must NOT add metering — see P9-2.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from app.grading.analyzer import slp1_to_iast  # transliteration helpers live here
import vidyut.lipi as _lipi

logger = logging.getLogger("shabd.prakriya")

# ─── Module-level state: load once ───

_HAS_PRAKRIYA = False
_vyakarana = None
_data = None
by_code: dict[str, list[str]] = {}

try:
    from vidyut.prakriya import (
        Data,
        Gana,
        Lakara,
        Linga,
        Pada,
        Prayoga,
        Purusha,
        Vacana,
        Vibhakti,
        Vyakarana,
    )
    _HAS_PRAKRIYA = True
except ImportError:  # pragma: no cover - vidyut is a hard dep; guard for safety
    Data = Gana = Lakara = Linga = Pada = Prayoga = Purusha = Vacana = Vibhakti = Vyakarana = None


def _data_dir() -> str:
    from app.config import settings
    override = os.environ.get("VIDYUT_DATA_DIR", "") or getattr(settings, "vidyut_data_dir", "")
    if override:
        return override
    # this file: backend/app/services/prakriya.py — three up = backend/
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "vidyut-data",
        "prakriya",
    )


def _s2d(text: str) -> str:
    """SLP1 → Devanagari using analyzer.py's single transliteration path."""
    return _lipi.transliterate(text, _lipi.Scheme.Slp1, _lipi.Scheme.Devanagari)


def _d2slp(text: str) -> str:
    """Devanagari → SLP1 using analyzer.py's single transliteration path."""
    return _lipi.transliterate(text, _lipi.Scheme.Devanagari, _lipi.Scheme.Slp1)


def _load() -> None:
    """Idempotent module init. Safe to call repeatedly."""
    global _vyakarana, _data, by_code
    if _vyakarana is not None:
        return
    _data = Data(_data_dir())
    _vyakarana = Vyakarana()
    # 5,152 entries, possible code collisions (documented in HANDOVER P9-1.2).
    # Index as code -> list of texts; a lookup returns ALL of them joined.
    for s in _data.load_sutras():
        by_code.setdefault(s.code, []).append(s.text)
    logger.info("prakriya loaded: %d sutra entries", len(by_code))


def _find_dhatu(devanagari: str):
    """Resolve a Devanagari dhātu (भू, गम्, कृ…) to a ``Dhatu`` via the Dhatupatha."""
    if not _HAS_PRAKRIYA:
        return None
    _load()
    query = _d2slp(devanagari)
    # exact aupadeshika match first
    for e in _data.load_dhatu_entries():
        if e.dhatu.aupadeshika == query:
            return e.dhatu
    # fallback: query is a prefix of some aupadeshika (e.g. user types the
    # bare root while the upadeśa carries an it-marker)
    for e in _data.load_dhatu_entries():
        if e.dhatu.aupadeshika.startswith(query):
            return e.dhatu
    return None


def _enum_member(enum_cls, name: str, default):
    """Resolve an enum member by name, defaulting when absent/invalid."""
    if not name or enum_cls is None:
        return default
    member = getattr(enum_cls, name, None)
    return member if member is not None else default


# ─── Paradigm grid (P11-5) ───

# 8 vibhakti × 3 vacana for nouns (subanta); the lakāra grid for verbs.
_VIBHAKTI_ORDER = ["Prathama", "Dvitiya", "Trtiya", "Caturthi",
                   "Panchami", "Sasthi", "Saptami", "Sambodhana"]
_VACANA_ORDER = ["Eka", "Dvi", "Bahu"]
_LAKARA_ORDER = ["Lat", "Lot", "Lan", "Lrt", "Lun", "Lit", "VidhiLin"]

# in-process cache: paradigms never change and are wasteful to recompute
_paradigm_cache: dict[tuple, dict] = {}


def paradigm(pratipadika: Optional[str] = None, linga: Optional[str] = None,
             dhatu: Optional[str] = None, lakara: Optional[str] = None) -> dict:
    """Return a full paradigm grid; each cell carries its own derivation.

    Noun (prātipadika + liṅga) → 8 vibhakti × 3 vacana. Verb (dhātu + lakāra)
    → up to 9 person×number cells. A cell that fails to derive is ``null`` and
    the rest of the table still renders (never fail a whole table on one cell).
    """
    if dhatu:
        return _tinanta_paradigm(dhatu, lakara)
    return _subanta_paradigm(pratipadika, linga)


def _subanta_paradigm(pratipadika: Optional[str], linga: Optional[str]) -> dict:
    empty = {"rows": [], "kind": "subanta"}
    if not pratipadika:
        return empty
    key = ("sub", pratipadika, linga or "Pum")
    if key in _paradigm_cache:
        return _paradigm_cache[key]
    rows = []
    for vibhakti in _VIBHAKTI_ORDER[:8]:
        row = []
        for vacana in _VACANA_ORDER:
            der = derive(pratipadika=pratipadika, linga=linga,
                         vibhakti=vibhakti, vacana=vacana)
            row.append({
                "vibhakti": vibhakti,
                "vacana": vacana,
                "form": der["result"] or None,
                "derivation": der if der["steps"] else None,
            })
        rows.append(row)
    out = {"rows": rows, "kind": "subanta"}
    _paradigm_cache[key] = out
    return out


def _tinanta_paradigm(dhatu: Optional[str], lakara: Optional[str]) -> dict:
    empty = {"rows": [], "kind": "tinanta"}
    if not dhatu:
        return empty
    key = ("tin", dhatu, lakara or "Lat")
    if key in _paradigm_cache:
        return _paradigm_cache[key]
    laka = lakara or "Lat"
    rows = []
    for purusha in ["Prathama", "Madhyama", "Uttama"]:
        row = []
        for vacana in _VACANA_ORDER:
            der = derive(dhatu=dhatu, lakara=laka,
                         purusha=purusha, vacana=vacana)
            row.append({
                "vibhakti": f"{purusha}.{vacana}",
                "vacana": vacana,
                "form": der["result"] or None,
                "derivation": der if der["steps"] else None,
            })
        rows.append(row)
    out = {"rows": rows, "kind": "tinanta"}
    _paradigm_cache[key] = out
    return out


def derive(dhatu: Optional[str] = None, lakara: Optional[str] = None,
           purusha: Optional[str] = None, vacana: Optional[str] = None,
           pratipadika: Optional[str] = None, linga: Optional[str] = None,
           vibhakti: Optional[str] = None) -> dict:
    """Derive a word form, returning its full prakriyā.

    As a convenience it accepts *either* a verb (dhātu + lakāra + puruṣa +
    vacana) *or* a noun (prātipadika + liṅga + vibhakti + vacana). An
    underivable or unknown input returns ``{result: "", step_count: 0, steps:
    []}`` — it never raises, so a grammar sidebar can never 500 a lesson
    (P9-1.4 / degrade-like-localtime).
    """
    empty = {"result": "", "step_count": 0, "steps": []}
    if not _HAS_PRAKRIYA:
        return empty
    try:
        _load()
        if dhatu:
            d = _find_dhatu(dhatu)
            if d is None:
                return empty
            pada = Pada.Tinanta(
                dhatu=d,
                prayoga=Prayoga.Kartari,
                lakara=_enum_member(Lakara, lakara, Lakara.Lat),
                purusha=_enum_member(Purusha, purusha, Purusha.Prathama),
                vacana=_enum_member(Vacana, vacana, Vacana.Eka),
            )
        elif pratipadika:
            from vidyut.prakriya import Pratipadika
            pr_pada = Pratipadika.basic(_d2slp(pratipadika))
            pada = Pada.Subanta(
                pratipadika=pr_pada,
                linga=_enum_member(Linga, linga, Linga.Pum),
                vibhakti=_enum_member(Vibhakti, vibhakti, Vibhakti.Prathama),
                vacana=_enum_member(Vacana, vacana, Vacana.Eka),
            )
        else:
            return empty

        results = _vyakarana.derive(pada)
        if not results:
            return empty
        prakriya = results[0]
        steps = []
        for step in prakriya.history:
            intermediate = " + ".join(step.result)
            sutra_texts = by_code.get(step.code, [])
            steps.append({
                "code": step.code,
                "sutra_text": sutra_texts[0] if sutra_texts else "",
                "sutra_devanagari": _s2d(sutra_texts[0]) if sutra_texts else "",
                "result": _s2d(intermediate),
            })
        return {
            "result": _s2d(prakriya.text),
            "step_count": len(steps),
            "steps": steps,
        }
    except Exception as e:  # noqa: BLE001 - degrade, never raise
        logger.warning("derive failed for dhatu=%r pratipadika=%r: %s", dhatu, pratipadika, e)
        return empty
