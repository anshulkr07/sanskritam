"""Feature derivation from Vidyut (P7-12) — extend a challenge's claimed
features beyond what the band asked for, using ONLY engine output.

The 13 never-exercised features split into two classes:

* **A claiming gap** — the analyzer already emits the information on sentences
  in the pool, the band definitions just never claimed it. ``SG``/``PL``/``DU``
  ride on every ``NOM.SG``-style value; ``INDECL`` is emitted directly. ₹0.
* **An engine-derivable gap** — ``PARASMAIPADA``/``ATMANEPADA`` resolve from
  the prakriyā derivation log of the dhātu chedaka attaches to the surface
  verb form (1.3.12 teD Atmanepadam ⇒ ātmanepada; Sap ⇒ parasmaipada —
  measured, see tests).

``MASC``/``FEM``/``NEUT`` were investigated and are **not** claimed here: the
kosha's surface-form liṅga data is not unanimous (kanyā resolves to three
liṅgas) and in places simply wrong (mātṛ → napuṃsaka), so any claim built on
it would assert a grammatical fact the engine does not support (§6: absent is
absent). Gender stays an escalated analyzer gap (§2.1).

The four sandhi types are NOT claims on ordinary sentences; they are generated
from ``services/sandhi.py`` (``scripts/sandhi_challenges.py``), never an LLM.

Everything here is local computation — no vendor call, no quota (§2.9: never
meter a grammar route; §2.7: Vidyut is a rule library, not a model).
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.grading.analyzer import (
    VidyutAnalyzer,
    analyze_sentence,
    normalize_to_slp1,
)

logger = logging.getLogger("shabd.feature_derivation")

# ── bare number features from case+number values ────────────────────────────

_NUMBER_OF = {"SG": "SG", "DU": "DU", "PL": "PL"}


def number_features_from_parses(parses: list[dict[str, str]]) -> list[str]:
    """``NOM.SG``-style values imply the bare-number feature ``SG`` (etc.).

    Accepts any of the feature_set_variants readings; a feature is claimed
    only when a reading of the sentence genuinely carries it."""
    out: set[str] = set()
    for p in parses:
        for feat in p.values():
            num = _NUMBER_OF.get(feat.rsplit(".", 1)[-1]) if "." in feat else None
            if num:
                out.add(num)
    return sorted(out)


# ── pada (voice) via chedaka's dhatu + prakriya's derivation log ────────────

_analyzer: VidyutAnalyzer | None = None


def _chedaka_analyzer() -> VidyutAnalyzer | None:
    global _analyzer
    if _analyzer is None:
        try:
            cand = VidyutAnalyzer()
            if cand._chedaka is None:
                return None
            _analyzer = cand
        except Exception as e:  # noqa: BLE001 — degrade, never raise
            logger.debug("chedaka unavailable: %s", e)
            return None
    return _analyzer


@lru_cache(maxsize=512)
def _dhatu_upadesha(surface_devanagari: str) -> str:
    """The dhātu's upadeśa for a surface verb form, '' when unresolved.

    Chedaka returns ``PadaEntry.Tinanta(dhatu_entry=DhatuEntry(dhatu=…))``
    for a finite form — the engine's own lemma resolution, no hand-written
    tables."""
    va = _chedaka_analyzer()
    if va is None:
        return ""
    try:
        toks = list(va._chedaka.run(normalize_to_slp1(surface_devanagari)))
        for t in toks:
            data = getattr(t, "data", None)
            if data is None:
                continue
            de = getattr(data, "dhatu_entry", None)
            if de is None:
                pe = getattr(data, "pratipadika_entry", None)
                de = getattr(pe, "dhatu_entry", None) if pe is not None else None
            if de is not None:
                return str(getattr(de.dhatu, "aupadeshika", "") or "")
    except Exception as e:  # noqa: BLE001 — degrade, never raise
        logger.debug("chedaka dhatu lookup failed for %r: %s", surface_devanagari, e)
    return ""


@lru_cache(maxsize=512)
def _pada_of_upadesha(upadesha_slp1: str) -> str:
    """``ATMANEPADA``/``PARASMAIPADA`` from the derivation log, '' if unknown.

    Measured rule (2026-09-06, vidyut 0.4.0): a dhātu whose Lat 3sg prakriyā
    contains 1.3.12 (teD Atmanepadam) is ātmanepada; one that instead shows
    Sap (the 1.3.78 Śap path) is parasmaipada. Verified against a random
    dhatupatha sample: 14/14 agreement between the log and the upadeśa
    backslash marker (``\\`` = ātmanepada in vidyut's upadeśa)."""
    if not upadesha_slp1:
        return ""
    # The upadeśa's backslash IS the ātmanepada it-marker (measured, above) —
    # but confirm through the derivation log so the claim always has a rule.
    try:
        from app.services import prakriya as P
        P._load()
        import vidyut.prakriya as vp
        # find the Dhatu object matching this upadeśa
        dhatu = None
        for e in _find_dhatu_entries():
            if e.dhatu.aupadeshika == upadesha_slp1:
                dhatu = e.dhatu
                break
        if dhatu is None:
            # marker-insensitive fallback (the analyzer lemma may drop it-markers)
            import re
            q = re.sub(r"[\\~^]", "", upadesha_slp1)
            for e in _find_dhatu_entries():
                if re.sub(r"[\\~^]", "", e.dhatu.aupadeshika) == q:
                    dhatu = e.dhatu
                    break
        if dhatu is None:
            return ""
        p = vp.Pada.Tinanta(
            dhatu=dhatu,
            prayoga=vp.Prayoga.Kartari,
            lakara=vp.Lakara.Lat,
            purusha=vp.Purusha.Prathama,
            vacana=vp.Vacana.Eka,
        )
        res = P._vyakarana.derive(p)
        if not res:
            return ""
        codes = {s.code for s in res[0].history}
        if "1.3.12" in codes:
            return "ATMANEPADA"
        if "1.3.78" in codes:
            return "PARASMAIPADA"
        return ""
    except Exception as e:  # noqa: BLE001 — degrade, never raise
        logger.debug("pada derivation failed for %r: %s", upadesha_slp1, e)
        return ""


_entries_cache: list | None = None


def _find_dhatu_entries() -> list:
    global _entries_cache
    if _entries_cache is None:
        from app.services import prakriya as P
        P._load()
        _entries_cache = list(P._data.load_dhatu_entries())
    return _entries_cache


def pada_features_from_sentence(sentence: str) -> list[str]:
    """Pada tags for every confident finite verb in ``sentence``.

    Verb roles come from the analyzer (``√dṛś``); the dhātu from chedaka's
    reading of the SURFACE form (its lemma resolution is engine-native). A
    pada tag is claimed only through the derivation-log rule."""
    out: set[str] = set()
    try:
        results = analyze_sentence(sentence)
    except Exception:  # noqa: BLE001
        return []
    va = _chedaka_analyzer()
    for r in results:
        if not r.parsed or not r.is_confident:
            continue
        for role in r.parsed:
            if not str(role).startswith("√"):
                continue
            surface = getattr(r, "word", None) or getattr(r, "text", "") or ""
            surface = str(surface).strip("।॥,.!?;: ")
            upadesha = _dhatu_upadesha(surface) if surface else ""
            if not upadesha:
                continue
            pada = _pada_of_upadesha(upadesha)
            if pada:
                out.add(pada)
    return sorted(out)


# ── indeclinables from analyzer output ──────────────────────────────────────

def indeclinable_features_from_sentence(sentence: str) -> list[str]:
    """``INDECL`` when a confident word analyzes as an indeclinable.

    ``NON_CONTENT_FEATURES`` filters INDECL out of *grading* parses (it must
    never gate a verdict), but a sentence that genuinely contains च/eva/तत्र
    does exercise the INDECL feature — the analyzer's own emission is the
    honest claim."""
    if "INDECL" not in (analyze_sentence.__doc__ or ""):
        pass  # presence check is documentation only
    try:
        results = analyze_sentence(sentence)
    except Exception:  # noqa: BLE001
        return []
    for r in results:
        if r.is_confident and any(v == "INDECL" for v in (r.parsed or {}).values()):
            return ["INDECL"]
    return []


# ── one-shot enrichment ─────────────────────────────────────────────────────

def derivable_features(target_sanskrit: str,
                       existing_parses: list[dict] | None = None) -> dict[str, list[str]]:
    """Every feature derivable for ``target_sanskrit`` from engine output.

    Returns a dict of new-feature-class -> values, e.g.
    ``{"number": ["SG"], "pada": ["PARASMAIPADA"]}``.
    Sandhi types are out of scope here (they come from the sandhi generator);
    gender is deliberately never claimed (see module docstring).
    """
    out: dict[str, list[str]] = {}
    if existing_parses:
        parses = existing_parses
    else:
        try:
            results = analyze_sentence(target_sanskrit)
            from app.grading.analyzer import feature_set_variants
            parses = feature_set_variants(results) or []
        except Exception:  # noqa: BLE001
            parses = []
    nums = number_features_from_parses(parses)
    if parses and nums:
        out["number"] = nums
    padas = pada_features_from_sentence(target_sanskrit)
    if padas:
        out["pada"] = padas
    indecls = indeclinable_features_from_sentence(target_sanskrit)
    if indecls:
        out["indecl"] = indecls
    return out
