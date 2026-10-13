"""Compose selections into a phrase, and parse a phrase back to a number.

The expression grammar (one grouping at a time):

    phrase  := [sign] group* trailing-coef [marker digit*]
    group   := coef [hundred coef] outer-scale      (outer scales descend)
    hundred := the "hundred" scale, which multiplies the group accumulator
    trailing-coef := the unit group's 0-99 coefficient (no scale word)

English "eight hundred forty-seven thousand" therefore parses as
coef(8) hundred coef(47) thousand -> 847 x 1000. Numerical value and
linguistic validity are separate checks: parse success answers validity,
the value answers correctness.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from .lexicon import Entry, get_lexicon
from .structure import DecimalNumber, build_skeleton

_SLOT_CONTEXTS = {
    "sign": ("sign",),
    "coef": ("coef",),
    "unit": ("coef", "unit"),
    "scale": ("scale",),
    "marker": ("marker",),
    "digit": ("digit",),
}

_SCALE_MAGNITUDE = {
    ("sa", "crore"): 10_000_000, ("sa", "lakh"): 100_000,
    ("sa", "thousand"): 1000, ("sa", "hundred"): 100,
    ("en", "crore"): 10_000_000, ("en", "lakh"): 100_000,
    ("en", "thousand"): 1000, ("en", "hundred"): 100,
    ("en", "million"): 1_000_000,
}


class PhraseError(ValueError):
    """A selection set or phrase is not a valid construction."""


def slot_selections(skeleton: list[dict], selections: dict[str, str],
                    lang: str) -> list[tuple[dict, Entry | None]]:
    """Pair each skeleton slot with its selected Entry (None when blank)."""
    lex = get_lexicon(lang)
    out: list[tuple[dict, Entry | None]] = []
    for slot in skeleton:
        entry: Entry | None = None
        sid = selections.get(slot["id"])
        if sid:
            entry = lex.by_id.get(sid)
            if entry is None:
                raise PhraseError(f"unknown semantic id {sid!r}")
            if not any(c in entry.contexts for c in _SLOT_CONTEXTS[slot["kind"]]):
                raise PhraseError(f"{sid!r} not approved for slot kind {slot['kind']!r}")
        out.append((slot, entry))
    return out


def render_phrase(lang: str, selections: dict[str, str], skeleton: list[dict],
                  script: str = "dev", *, prefer_variants: bool = False) -> str:
    """The learner's assembled reading, in the requested script.

    prefer_variants renders accepted variant surfaces (same semantic values)
    where an entry carries them — used for the "correct alternative" shown
    after submission, which must read differently from the primary form.
    """
    lex = get_lexicon(lang)
    parts: list[str] = []
    for slot, entry in slot_selections(skeleton, selections, lang):
        if entry is None:
            continue
        if lang == "en":
            if prefer_variants and entry.variants:
                parts.append(entry.variants[0]["text"])
            else:
                parts.append(entry.surface("text"))
        else:
            if prefer_variants and entry.variants:
                parts.append(entry.variants[0].get(script) or entry.variants[0].get("dev", ""))
            else:
                parts.append(entry.surface(script) or entry.surface("dev"))
    text = " ".join(p for p in parts if p)
    if lang == "en":
        text = text[:1].upper() + text[1:] if text else text
    return text


@dataclass
class ParseResult:
    value: DecimalNumber | None
    reason: str  # "" on success, else why the phrase is not valid


def parse_phrase(phrase: str, lang: str) -> ParseResult:
    """Parse a reading back to an exact value; validity check for L."""
    lex = get_lexicon(lang)
    tokens = lex.tokenize(phrase)
    if tokens is None:
        return ParseResult(None, "unrecognised words")
    return _parse_tokens(tokens, lang)


def _parse_tokens(tokens: list[Entry], lang: str) -> ParseResult:
    idx = 0
    negative = False
    if tokens and tokens[0].semantic_id.endswith("sign:negative"):
        negative = True
        idx = 1
    total = 0
    accumulator = 0
    outer_scales: list[int] = []
    group_hundreds_used = False
    post_hundred_coef = False
    last_was_coef = False
    frac_digits: list[int] = []
    seen_marker = False
    if idx >= len(tokens):
        return ParseResult(None, "empty")
    while idx < len(tokens):
        t = tokens[idx]
        ctx = t.contexts
        if seen_marker:
            if "digit" not in ctx or t.value > 9:
                return ParseResult(None, "only digit words follow the decimal marker")
            frac_digits.append(t.value)
            idx += 1
            continue
        if "marker" in ctx:
            seen_marker = True
            idx += 1
            continue
        if "sign" in ctx:
            return ParseResult(None, "sign only allowed at the start")
        if "coef" in ctx or "unit" in ctx:
            if frac_digits or seen_marker:
                return ParseResult(None, "digits follow the marker")
            # A coefficient must open a group or follow the inner hundred:
            # "one four million" is not a construction.
            if last_was_coef:
                return ParseResult(None, "two coefficients in a row")
            if post_hundred_coef:
                return ParseResult(None, "only one remainder after hundred")
            accumulator += t.value
            last_was_coef = True
            if group_hundreds_used:
                post_hundred_coef = True
            idx += 1
            continue
        if "scale" in ctx:
            kind = t.semantic_id.split(":scale:")[1]
            magnitude = _SCALE_MAGNITUDE.get((lang, kind))
            if magnitude is None:
                return ParseResult(None, f"unknown scale {kind!r}")
            if kind == "hundred":
                if group_hundreds_used or accumulator == 0 or accumulator > 9:
                    return ParseResult(None, "hundred needs a 1-9 coefficient in its group")
                accumulator *= 100
                group_hundreds_used = True
                last_was_coef = False
                idx += 1
                continue
            if accumulator == 0:
                return ParseResult(None, "scale needs a coefficient")
            if outer_scales and magnitude >= outer_scales[-1]:
                return ParseResult(None, "scales must strictly descend")
            outer_scales.append(magnitude)
            total += accumulator * magnitude
            accumulator = 0
            group_hundreds_used = False
            post_hundred_coef = False
            last_was_coef = False
            idx += 1
            continue
        return ParseResult(None, f"unexpected token {t.semantic_id!r}")
    if seen_marker and not frac_digits:
        return ParseResult(None, "decimal marker without digits")
    if accumulator:
        total += accumulator  # trailing unit group (or a bare coefficient)
    if len(frac_digits) > 3:
        return ParseResult(None, "more than three fractional digits")
    if total > 999_999_999:
        return ParseResult(None, "integer part beyond 999,999,999")
    if total == 0 and not frac_digits and not tokens:
        return ParseResult(None, "empty")
    int_s = str(total)
    frac_s = "".join(str(d) for d in frac_digits)
    return ParseResult(DecimalNumber(negative=negative, int_part=int_s, frac_part=frac_s), "")


# ── Client-facing prompt payload ─────────────────────────────────────────────

def _distractor_values(value: int, lo: int, hi: int, rng: random.Random, want: int) -> list[int]:
    """Plausible near-miss coefficients of the same shape as `value`."""
    pool: list[int] = []
    for cand in (value + 1, value - 1, value + 10, value - 10, value + 2, value - 2):
        if lo <= cand <= hi and cand != value and cand not in pool:
            pool.append(cand)
    if value >= 10 and lo <= 10 <= hi - 1:  # digit-swap shape, e.g. 48 -> 84
        swapped = int(str(value)[::-1])
        if swapped != value and lo <= swapped <= hi and swapped not in pool:
            pool.append(swapped)
    while len(pool) < want:
        cand = rng.randint(lo, hi)
        if cand != value and cand not in pool:
            pool.append(cand)
    rng.shuffle(pool)
    return pool[:want]


def phrase_slots_payload(value: DecimalNumber, grouping: str, lang: str,
                         *, include_sign: bool, seed: int,
                         neutral_labels: bool = False,
                         options_per_menu: int = 5) -> dict:
    """The client view of a Number Builder prompt: skeleton slots with 4-8
    plausible options each, shuffled, with nothing marked correct."""
    lex = get_lexicon(lang)
    rng = random.Random(seed)
    skeleton = build_skeleton(value, grouping, include_sign=include_sign)
    outer_kinds = [k for k in ("crore", "lakh", "million", "thousand") ]
    slot_payloads: list[dict] = []
    for slot in skeleton:
        options: list[dict] = []
        correct: Entry | None = None
        kind = slot["kind"]
        if kind == "sign":
            correct = lex.by_id[f"{lang}:sign:negative"]
            others = [e for e in lex.entries_for_context("sign") if e is not correct]
        elif kind in ("coef", "unit"):
            lo, hi = (1, 9) if slot.get("coef_kind") == "hundreds" else (0, 99)
            v = slot["value"]
            correct = lex.by_value[( "coef", v)][0] if ("coef", v) in lex.by_value else None
            if correct is None:
                for e in lex.entries_for_context("coef"):
                    if e.value == v:
                        correct = e
                        break
            if hi == 99:
                distract_vals = _distractor_values(v, max(0, lo), hi, rng, options_per_menu - 1)
            else:
                distract_vals = [d for d in range(lo, hi + 1) if d != v]
                rng.shuffle(distract_vals)
                distract_vals = distract_vals[: options_per_menu - 1]
            others = []
            for dv in distract_vals:
                entry = None
                for e in lex.entries_for_context("coef"):
                    if e.value == dv:
                        entry = e
                        break
                if entry is not None:
                    others.append(entry)
        elif kind == "scale":
            group = slot["group"]
            correct = lex.by_id.get(f"{lang}:scale:{group}")
            others = [lex.by_id[f"{lang}:scale:{k}"] for k in outer_kinds
                      if f"{lang}:scale:{k}" in lex.by_id and k != group]
            hundred = lex.by_id.get(f"{lang}:scale:hundred")
            if hundred is not None and group != "hundred":
                others.append(hundred)
            rng.shuffle(others)
            others = others[: options_per_menu - 1]
        elif kind == "marker":
            correct = lex.by_id.get(f"{lang}:marker:decimal")
            others = [lex.by_id[f"{lang}:scale:{k}"] for k in ("thousand", "hundred", "crore", "lakh")
                      if f"{lang}:scale:{k}" in lex.by_id][: options_per_menu - 1]
        elif kind == "digit":
            v = slot["value"]
            correct = None
            for e in lex.entries_for_context("digit"):
                if e.value == v:
                    correct = e
                    break
            digit_pool = [d for d in range(10) if d != v]
            rng.shuffle(digit_pool)
            digit_pool = digit_pool[: options_per_menu - 1]
            others = []
            for dv in digit_pool:
                for e in lex.entries_for_context("digit"):
                    if e.value == dv:
                        others.append(e)
                        break
        else:  # pragma: no cover
            continue
        rng.shuffle(others)
        merged = ([correct] if correct is not None else []) + others
        rng.shuffle(merged)
        if correct is not None and correct not in merged:  # defensive
            merged.append(correct)
        option_views = []
        for e in merged:
            if lang == "en":
                option_views.append({"semantic_id": e.semantic_id, "text": e.surface("text")})
            else:
                option_views.append({
                    "semantic_id": e.semantic_id,
                    "dev": e.surface("dev"),
                    "roman": e.surface("roman") or e.surface("dev"),
                })
        slot_payloads.append({
            "id": slot["id"],
            "kind": kind,
            "group": slot["group"],
            "coef_kind": slot.get("coef_kind"),
            "digit_index": slot.get("digit_index"),
            "label": _slot_label(slot, neutral_labels),
            "options": option_views,
        })
    return {
        "lang": lang,
        "grouping": grouping,
        "slots": slot_payloads,
    }


def _slot_label(slot: dict, neutral: bool) -> str:
    kind = slot["kind"]
    if neutral:
        group = slot.get("group")
        if kind == "marker":
            return "Marker"
        if kind == "sign":
            return "Sign"
        if kind == "digit":
            return f"Digit {slot['digit_index'] + 1}"
        return f"Slot {slot['id']}"
    names = {
        "sign": "Sign", "marker": "Decimal marker", "digit": "Digit",
        "unit": "Units", "scale": "Scale",
    }
    if kind == "coef":
        base = {"crore": "Crores", "lakh": "Lakhs", "million": "Millions",
                "thousand": "Thousands", "hundred": "Hundreds"}.get(slot.get("group") or "", "Group")
        sub = {"hundreds": " (hundreds)", "tens": ""}.get(slot.get("coef_kind") or "simple", "")
        return f"{base}{sub} count"
    return names.get(kind, kind)


# ── Convenience: full readings for audio / explanation -----------------------

def correct_reading(value: DecimalNumber, grouping: str, lang: str) -> str:
    """The reviewed full reading of the value (the answer shown after submit)."""
    skeleton = build_skeleton(value, grouping, include_sign=value.negative)
    selections: dict[str, str] = {}
    lex = get_lexicon(lang)
    for slot in skeleton:
        kind = slot["kind"]
        if kind == "sign":
            selections[slot["id"]] = f"{lang}:sign:negative"
        elif kind in ("coef", "unit"):
            v = slot["value"]
            for e in lex.entries_for_context("coef"):
                if e.value == v:
                    selections[slot["id"]] = e.semantic_id
                    break
        elif kind == "scale":
            selections[slot["id"]] = f"{lang}:scale:{slot['group']}"
        elif kind == "marker":
            selections[slot["id"]] = f"{lang}:marker:decimal"
        elif kind == "digit":
            v = slot["value"]
            for e in lex.entries_for_context("digit"):
                if e.value == v:
                    selections[slot["id"]] = e.semantic_id
                    break
    return render_phrase(lang, selections, skeleton)


def alternative_reading(value: DecimalNumber, grouping: str, lang: str) -> str:
    """An accepted alternative (variant surfaces), when one exists."""
    lex = get_lexicon(lang)
    skeleton = build_skeleton(value, grouping, include_sign=value.negative)
    selections: dict[str, str] = {}
    for slot in skeleton:
        kind = slot["kind"]
        if kind == "sign":
            selections[slot["id"]] = f"{lang}:sign:negative"
        elif kind in ("coef", "unit"):
            v = slot["value"]
            for e in lex.entries_for_context("coef"):
                if e.value == v:
                    selections[slot["id"]] = e.semantic_id
                    break
        elif kind == "scale":
            selections[slot["id"]] = f"{lang}:scale:{slot['group']}"
        elif kind == "marker":
            selections[slot["id"]] = f"{lang}:marker:decimal"
        elif kind == "digit":
            v = slot["value"]
            for e in lex.entries_for_context("digit"):
                if e.value == v:
                    selections[slot["id"]] = e.semantic_id
                    break
    return render_phrase(lang, selections, skeleton, prefer_variants=True)
