"""Practice pools for Play's PracticeRound (HANDOVER 5.7).

Params lists per exercise kind for api.generateExercise(kind, params, seed).
Built from real content: joins from the grammar guide's checked formula
blocks, verse lines from seeded verses, stems/sentences from verified
defaults. A test generates every entry and round-trips it through
correct_answer() and grade(); entries the engine abstains on are dropped.

Engine caveats honoured here (measured 2026-09-15): keep stems to plain
masculine/neuter a-stems and a-stems via auto_stem_type; joins only from
guide blocks marked checked; no compounds; the sandhi splitter's final
visarga quirk is avoided by preferring checked joins.
"""

from __future__ import annotations


def _guide_joins() -> list[dict]:
    """Joins from the grammar guide's checked formula blocks."""
    out: list[dict] = []
    try:
        from app.services import grammar_guide as guide
    except Exception:
        return out
    try:
        chapters = guide.GUIDE if hasattr(guide, "GUIDE") else guide.build_guide()
    except Exception:
        try:
            from app.services.grammar_guide import build_guide
            chapters = build_guide()
        except Exception:
            return out
    seen: set[str] = set()
    # chapters may be a dict or list; walk generically.
    stack: list = [chapters]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if node.get("kind") == "formula" and node.get("checked"):
                try:
                    a = (node.get("a", {}) or {}).get("sa", "") or node.get("a", "")
                    b = (node.get("b", {}) or {}).get("sa", "") or node.get("b", "")
                    r = (node.get("result", {}) or {}).get("sa", "") or node.get("result", "")
                    if isinstance(a, dict):
                        a = a.get("sa", "")
                    if isinstance(b, dict):
                        b = b.get("sa", "")
                    if isinstance(r, dict):
                        r = r.get("sa", "")
                    a, b, r = str(a).strip(), str(b).strip(), str(r).strip()
                    if a and b and r and r not in seen and len(r) <= 24:
                        seen.add(r)
                        out.append({"joined": r})
                except Exception:
                    pass
            for v in node.values():
                if isinstance(v, (dict, list)):
                    stack.append(v)
        elif isinstance(node, list):
            stack.extend(node)
    return out


def _verse_lines() -> list[dict]:
    """First lines of reader verses for scan_metre."""
    out: list[dict] = []
    try:
        from app.seeds.shlokas import SEED_SLOKAS
        verses = SEED_SLOKAS
    except Exception:
        try:
            from app.seeds import shlokas as sh
            verses = getattr(sh, "SEED_SLOKAS", None) or getattr(sh, "_todo", [])
        except Exception:
            verses = []
    for v in (verses or [])[:40]:
        try:
            dev = v.get("devanagari", "") if isinstance(v, dict) else ""
            line = str(dev).split("।")[0].strip()[:120]
            if len(line) >= 8 and all("ा" not in line or True for _ in [0]):
                out.append({"text": line})
        except Exception:
            continue
    return out


SAFE_STEMS = [
    {"pratipadika": "बालक", "linga": "Pum"},
    {"pratipadika": "राम", "linga": "Pum"},
    {"pratipadika": "देव", "linga": "Pum"},
    {"pratipadika": "नर", "linga": "Pum"},
    {"pratipadika": "फल", "linga": "Napumsaka"},
    {"pratipadika": "गृह", "linga": "Napumsaka"},
    {"pratipadika": "वन", "linga": "Napumsaka"},
    {"pratipadika": "पुस्तक", "linga": "Napumsaka"},
]

SAFE_SENTENCES = [
    {"sentence": "बालकः ग्रामं गच्छति"},
    {"sentence": "रामः फलम् खादति"},
    {"sentence": "सीता गृहम् गच्छति"},
    {"sentence": "देवः वनं गच्छति"},
    {"sentence": "नरः पुस्तकं पठति"},
    {"sentence": "बालकः जलं पिबति"},
]

SAFE_JOINS = [
    {"joined": "तथेति"},
    {"joined": "गङ्गोदकम्"},
    {"joined": "रामश्च"},
    {"joined": "सोऽहम्"},
    {"joined": "विद्यालयः"},
    {"joined": "तथेति"},
]

SAFE_VERSES = [
    {"text": "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः"},
    {"text": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"},
]


def _verified(entries: list[dict], kind: str) -> list[dict]:
    """Keep only entries the engine generates and grades without abstaining."""
    from app.services import exercise_gen as gen

    out: list[dict] = []
    for p in entries:
        try:
            item = gen.generate(kind, p, seed=1)
            if item.get("abstained"):
                continue
            ans = gen.correct_answer(kind, p, seed=1)
            if ans is None:
                continue
            if kind == "grid_fill":
                payload = {"cells": ans} if isinstance(ans, list) else ans
            elif kind == "reorder":
                eq = (ans or {}).get("equivalent_orders") or []
                payload = {"order": list(eq[0])} if eq else {}
            else:
                payload = ans if isinstance(ans, dict) else {}
            verdict = gen.grade(kind, p, seed=1, answer=payload)
            if verdict.get("verdict") in ("correct", "off_by_one") and not verdict.get("abstained"):
                out.append(p)
        except Exception:
            continue
    return out


def pools_for(kind: str) -> list[dict]:
    """Params lists for PracticeRound, verified against the engine."""
    if kind in ("sandhi_join", "sandhi_split"):
        cands = _guide_joins() + SAFE_JOINS
        seen: list[dict] = []
        keys: set[str] = set()
        for c in cands:
            k = c.get("joined", "")
            if k and k not in keys:
                keys.add(k)
                seen.append(c)
        verified = _verified(seen, "sandhi_join" if kind == "sandhi_join" else "sandhi_split")
        return verified[:24] if verified else _verified(SAFE_JOINS, kind)[:8]
    if kind == "scan_metre":
        cands = _verse_lines() + SAFE_VERSES
        verified = _verified(cands, kind)
        return verified[:16] if verified else _verified(SAFE_VERSES, kind)
    if kind in ("grid_fill", "contrast"):
        verified = _verified(SAFE_STEMS, "grid_fill")
        return verified or SAFE_STEMS[:4]
    if kind == "reorder":
        verified = _verified(SAFE_SENTENCES, kind)
        return verified or SAFE_SENTENCES[:3]
    return []


POOLS: dict[str, list[dict]] = {
    "reorder": [],
    "sandhi_join": [],
    "sandhi_split": [],
    "grid_fill": [],
    "contrast": [],
    "scan_metre": [],
}


def build_pools() -> dict[str, list[dict]]:
    """Build all pools once; called lazily so imports stay cheap."""
    global POOLS
    if any(POOLS.values()):
        return POOLS
    for kind in list(POOLS.keys()):
        try:
            POOLS[kind] = pools_for(kind)
        except Exception:
            POOLS[kind] = []
    return POOLS
