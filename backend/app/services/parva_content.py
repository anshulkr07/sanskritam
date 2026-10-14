"""Parva page drafts: schema, automatic checks, import.

Standalone script the owner runs (handover 8.4 choice: standalone, not
content_jobs). `backend/scripts/parva_drafts.py` builds Vertex batch requests;
`backend/scripts/parva_import.py` loads seed files into `parva_pages`.

Automatic checks before a draft becomes `auto_ok`: valid schema; limits; no
em or spaced en dash; every `text` item's ref is in the request's passages
and its quote (if any) appears in the passage; every `custom` item has a
source_url; en and hi versions have the same item count per section; no
forbidden phrases (section 11). Failures are written with reasons.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

SEEDS_DIR = Path(__file__).resolve().parents[2] / "app" / "seeds" / "parva"

SUMMARY_LIMIT = 120
STEP_LIMIT = 160
WHY_MIN = 4
WHY_MAX = 8
STEPS_MAX = 12
LIST_MAX = 10

BASIS = ("text", "calc", "custom")

FORBIDDEN_EN = [
    "ancestors will be angry", "deity will punish", "god will punish",
    "something bad will happen", "bad will happen", "you will be punished",
    "you must", "you have to fast", "cures ", "guaranteed result",
]
FORBIDDEN_HI = [
    "पूर्वज नाराज", "देवी नाराज", "देवता दंड", "बुरा होगा",
    "सज़ा मिलेगी", "तुम्हें करना ही होगा",
]

# Phrases that must never appear as the app's own claim (11.7 results etc).
FORBIDDEN_OWN = ["will give you wealth", "will fulfil all wishes", "100% result"]


#: Tithi spelling normalisation: seed files historically used `dvitiya`
#: while the engine uses `dwitiya`. Join content by stable identifiers,
#: never by array index or raw spelling.
TITHI_ALIASES = {
    "dvitiya": "dwitiya",
    "dwitiya": "dwitiya",
    "dwadashi": "dwadashi",
    "dvadashi": "dwadashi",
}


def normalize_tithi_key(raw: str) -> str:
    """Normalise a tithi key to engine spelling (lowercase, alias-resolved)."""
    key = (raw or "").strip().lower()
    return TITHI_ALIASES.get(key, key)


def normalize_form_key(raw: str) -> str:
    """Normalise a Devi/form key to lowercase stripped form."""
    return (raw or "").strip().lower()


def has_dash(text: str) -> bool:
    t = text or ""
    return "—" in t or " – " in t or t.strip().startswith("–") or t.strip().startswith("—")


def _is_item(v: Any) -> bool:
    return isinstance(v, dict) and isinstance(v.get("text"), str) and v.get("basis") in BASIS


TEXT_KINDS = ("mantra", "stotra", "aarti", "dhyana")


def _text_item_error(t: Any) -> str | None:
    """Shared rule for body.texts and series_days[].texts items."""
    if not isinstance(t, dict) or t.get("kind") not in TEXT_KINDS:
        return f"texts item needs kind {'|'.join(TEXT_KINDS)}"
    # Rich devotional text needs verifiable provenance: original
    # script, transliteration, meaning, and an exact source. Passing
    # the schema check alone never means the quotation is complete.
    if not isinstance(t.get("title"), str) or not t.get("title", "").strip():
        return "texts item needs title"
    if t.get("devanagari") is not None and not isinstance(t.get("devanagari"), str):
        return "texts devanagari must be a string"
    src = t.get("source") or t.get("ref") or t.get("source_url")
    if t.get("devanagari") and not src:
        return "texts with devanagari needs source/ref/source_url"
    return None


def validate_page(body: dict) -> list[str]:
    """Schema and limit errors; [] means valid."""
    errs: list[str] = []
    if not isinstance(body, dict):
        return ["body must be an object"]
    summary = body.get("summary", "")
    if not isinstance(summary, str) or not summary.strip():
        errs.append("summary missing")
    elif len(summary) > SUMMARY_LIMIT:
        errs.append(f"summary over {SUMMARY_LIMIT} chars")
    for key in ("why", "dont"):
        items = body.get(key, [])
        if not isinstance(items, list):
            errs.append(f"{key} must be a list")
            continue
        for it in items:
            if not _is_item(it):
                errs.append(f"{key} item needs text+basis")
                break
            if len(it["text"]) > STEP_LIMIT:
                errs.append(f"{key} step over {STEP_LIMIT} chars")
                break
    why = body.get("why", [])
    if isinstance(why, list) and not (WHY_MIN <= len(why) <= WHY_MAX):
        errs.append(f"why needs {WHY_MIN} to {WHY_MAX} steps")
    do = body.get("do", {})
    if not isinstance(do, dict):
        errs.append("do must be an object")
    else:
        for key in ("gather", "steps", "budget"):
            items = do.get(key, [])
            if not isinstance(items, list):
                errs.append(f"do.{key} must be a list")
                continue
            if key == "steps" and len(items) > STEPS_MAX:
                errs.append(f"do.steps over {STEPS_MAX}")
            if len(items) > LIST_MAX:
                errs.append(f"do.{key} over {LIST_MAX}")
            for it in items:
                if not _is_item(it):
                    errs.append(f"do.{key} item needs text+basis")
                    break
    vrat = body.get("vrat", {})
    if not isinstance(vrat, dict):
        errs.append("vrat must be an object")
    else:
        for key in ("types", "eat", "avoid", "break", "who_should_eat"):
            items = vrat.get(key, [])
            if not isinstance(items, list):
                errs.append(f"vrat.{key} must be a list")
                continue
            if len(items) > LIST_MAX:
                errs.append(f"vrat.{key} over {LIST_MAX}")
        if isinstance(vrat.get("who_should_eat"), list) and not vrat["who_should_eat"]:
            errs.append("vrat.who_should_eat missing (every vrat page lists it)")
    texts = body.get("texts", [])
    if not isinstance(texts, list):
        errs.append("texts must be a list")
    else:
        for t in texts:
            err = _text_item_error(t)
            if err:
                errs.append(err)
                break
    regions = body.get("regions", [])
    if not isinstance(regions, list):
        errs.append("regions must be a list")
    else:
        for r in regions:
            if not isinstance(r, dict):
                errs.append("regions item must be an object")
                break
            items = r.get("items", [])
            if not isinstance(items, list):
                errs.append("regions.items must be a list")
                break
            for it in items:
                if not _is_item(it):
                    errs.append("regions item needs text+basis")
                    break
    series = body.get("series_days", [])
    if not isinstance(series, list):
        errs.append("series_days must be a list")
    else:
        seen_forms: set[str] = set()
        for s in series:
            if not isinstance(s, dict):
                errs.append("series_days item must be an object")
                break
            tk = normalize_tithi_key(str(s.get("tithi_key", "")))
            fk = normalize_form_key(str(s.get("form_key", "")))
            if not tk or not fk:
                errs.append("series_days item needs tithi_key+form_key")
                break
            if not isinstance(s.get("summary", ""), str) or not s.get("summary", "").strip():
                errs.append(f"series_days {fk}: summary missing")
                break
            steps = s.get("steps", [])
            if not isinstance(steps, list) or not steps:
                errs.append(f"series_days {fk}: steps missing")
                break
            for it in steps:
                if not _is_item(it):
                    errs.append(f"series_days {fk}: step needs text+basis")
                    break
                if len(it["text"]) > STEP_LIMIT:
                    errs.append(f"series_days {fk}: step over {STEP_LIMIT} chars")
                    break
            # Optional per-day texts: same provenance rules as body.texts,
            # so a day can carry its own dhyana/mantra without a full page.
            s_texts = s.get("texts", [])
            if not isinstance(s_texts, list):
                errs.append(f"series_days {fk}: texts must be a list")
                break
            for t in s_texts:
                err = _text_item_error(t)
                if err:
                    errs.append(f"series_days {fk}: {err}")
                    break
            seen_forms.add(fk)
    return errs


def _all_texts(body: dict) -> list[tuple[str, dict]]:
    """(section, item) for every basis-carrying item."""
    out: list[tuple[str, dict]] = []
    for it in body.get("why", []) or []:
        out.append(("why", it))
    do = body.get("do", {}) or {}
    for it in do.get("gather", []) or []:
        out.append(("do.gather", it))
    for it in do.get("steps", []) or []:
        out.append(("do.steps", it))
    for it in do.get("budget", []) or []:
        out.append(("do.budget", it))
    vrat = body.get("vrat", {}) or {}
    for key in ("types", "eat", "avoid", "break", "who_should_eat"):
        for it in vrat.get(key, []) or []:
            out.append((f"vrat.{key}", it))
    for it in body.get("dont", []) or []:
        out.append(("dont", it))
    for r in body.get("regions", []) or []:
        for it in (r.get("items", []) or []):
            out.append(("regions", it))
    for s in body.get("series_days", []) or []:
        for it in (s.get("steps", []) or []):
            out.append(("series_days", it))
    return out


def check_draft(body: dict, passages: dict[str, str] | None = None) -> list[str]:
    """Automatic checks; [] means auto_ok. Passages maps ref -> passage text."""
    errs = validate_page(body)
    passages = passages or {}
    for section, it in _all_texts(body):
        text = it.get("text", "")
        if has_dash(text):
            errs.append(f"{section}: no em or spaced en dash")
            break
    for section, it in _all_texts(body):
        basis = it.get("basis")
        if basis == "text":
            if not it.get("text_name") or not it.get("ref"):
                errs.append(f"{section}: text item needs text_name+ref")
                break
            ref = str(it.get("ref", ""))
            if passages and ref not in passages:
                errs.append(f"{section}: ref {ref} not in passages")
                break
            quote = str(it.get("quote", "") or "")
            if quote and passages.get(ref) and quote not in passages[ref]:
                errs.append(f"{section}: quote not in passage {ref}")
                break
        if basis == "custom" and not it.get("source_url"):
            errs.append(f"{section}: custom item needs source_url")
            break
        if basis == "calc" and (it.get("text_name") or it.get("ref") or it.get("source_url")):
            pass
    blob = json.dumps(body, ensure_ascii=False).lower()
    for ph in FORBIDDEN_EN + FORBIDDEN_OWN:
        if ph.lower() in blob:
            errs.append(f"forbidden phrase: {ph}")
            break
    for ph in FORBIDDEN_HI:
        if ph in json.dumps(body, ensure_ascii=False):
            errs.append(f"forbidden phrase: {ph}")
            break
    # Health rule: never tell anyone to stop medicine (checked as phrase).
    if "stop your medicine" in blob or "stop medicine" in blob:
        errs.append("forbidden: medicine instruction")
    return sorted(set(errs))


def section_counts(body: dict) -> dict[str, int]:
    do = body.get("do", {}) or {}
    vrat = body.get("vrat", {}) or {}
    series = body.get("series_days", []) or []
    return {
        "why": len(body.get("why", []) or []),
        "gather": len(do.get("gather", []) or []),
        "steps": len(do.get("steps", []) or []),
        "eat": len(vrat.get("eat", []) or []),
        "avoid": len(vrat.get("avoid", []) or []),
        "break": len(vrat.get("break", []) or []),
        "who_should_eat": len(vrat.get("who_should_eat", []) or []),
        "dont": len(body.get("dont", []) or []),
        "texts": len(body.get("texts", []) or []),
        "regions": len(body.get("regions", []) or []),
        "series_days": len(series),
        "series_texts": sum(len(s.get("texts", []) or []) for s in series),
    }


def check_pair(en_body: dict, hi_body: dict) -> list[str]:
    """en and hi versions have the same item count per section."""
    ce, ch = section_counts(en_body), section_counts(hi_body)
    errs = []
    for k in ce:
        if ce[k] != ch.get(k, -1):
            errs.append(f"en/hi count differs in {k}: {ce[k]} vs {ch.get(k)}")
    return errs


PAGE_JSON_SCHEMA = {
    "summary": "one line, max 120 chars",
    "why": [{"step": "one sentence", "basis": "text|calc|custom"}],
    "do": {"gather": [], "steps": []},
    "vrat": {"eat": [], "avoid": [], "break": [], "who_should_eat": []},
    "dont": [],
    "texts": [{"kind": "mantra|stotra|aarti|dhyana"}],
    "regions": [{"region": "bengal", "items": []}],
    "series_days": [{"tithi_key": "...", "form_key": "...", "summary": "...", "steps": [],
                     "texts": [{"kind": "mantra|stotra|aarti|dhyana"}]}],
}
