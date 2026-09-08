"""P23-2 · The exercise generator — the centre of the lesson rebuild.

An exercise is NOT a row. It is identified by (kind, params, seed) and
regenerated on demand::

    generate(kind, params, seed) -> dict   # renderable; the answer is NOT in it
    grade(kind, params, seed, answer) -> Verdict

``grade`` regenerates the same item from the same seed and compares. No
exercise table, no stored answer, no review queue. The seed is the item's
identity — which is also what makes a step reproducible for spaced review
(P23-5) and what makes the whole thing testable.

Every kind below is backed by an engine call that already exists and is
already tested (prakriya / sandhi / chandas / word_order). These are vidyut
calls — no vendor, no metering. HANDOVER is explicit: never add metering to
a grammar route.

Invariants (do not negotiate these):

- Determinism. ``random.Random(seed)``, never the module-level ``random``.
  Same seed, same item, on every process and every machine.
- Abstention. When the engine returns nothing, the verdict is ``unsure`` and
  ``abstained: True`` — never ``incorrect``. This is the codebase's oldest
  principle (adaptive.py; UI_HANDOVER: "An unsure that reads as a mistake is
  the most damaging bug in this document"). A learner is never marked wrong
  because our engine was uncertain.
- Verdict vocabulary is the existing one: correct | off_by_one | incorrect |
  unsure. No fifth verdict.
- Never generate for samasa or karaka yet. The analyzer cannot derive them
  (P22-2) and a generator that emits an ungradable item is worse than a gap.
"""

from __future__ import annotations

import logging
import random
from typing import Any

logger = logging.getLogger("shabd.exercise_gen")

SUPPORTED_KINDS = (
    "grid_fill",
    "derive_next",
    "sandhi_split",
    "sandhi_join",
    "scan_metre",
    "reorder",
    "contrast",
)

# P22-2 taxonomy-only features: the analyzer cannot derive these (the analyzer
# is FROZEN — §2.1), so no generator may claim them.
TAXONOMY_ONLY_PREFIXES = ("SAMASA-", "KARAKA-")

VERDICTS = ("correct", "off_by_one", "incorrect", "unsure")


def _refuses_taxonomy(params: dict[str, Any]) -> str | None:
    """Return the offending feature id when params claim samasa/karaka."""
    for key in ("feature", "features", "feature_id"):
        val = params.get(key)
        vals = val if isinstance(val, list) else ([val] if val else [])
        for v in vals:
            if isinstance(v, str) and v.startswith(TAXONOMY_ONLY_PREFIXES):
                return v
    return None


def _rng(seed: int) -> random.Random:
    return random.Random(seed)


# Curated, engine-verified defaults so a step can name a kind without naming
# every param. Each default was checked against the live engine (2026-09-08):
# paradigms derive, sandhi splits rank a both-valid candidate first, the Gita
# line scans, the sentence has equivalent orders.
DEFAULT_SENTENCES = [
    "बालकः ग्रामं गच्छति",
    "रामः फलम् खादति",
    "सीता गृहम् गच्छति",
]

DEFAULT_JOINS = [
    "तथेति",      # तथा + इति (both-valid first)
    "गङ्गोदकम्",  # गङ्ग + उदकम्
    "रामश्च",     # रामस् + च
    "सोऽहम्",     # सस् + अहम्
]

DEFAULT_VERSES = [
    "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः",
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
]

DEFAULT_STEMS = [
    {"pratipadika": "बालक", "linga": "Pum"},
    {"pratipadika": "राम", "linga": "Pum"},
    {"pratipadika": "फल", "linga": "Napumsaka"},
    {"pratipadika": "गृह", "linga": "Napumsaka"},
]

DEFAULT_DHATUS = [
    {"dhatu": "पठ्", "lakara": "Lat"},
    {"dhatu": "लिख्", "lakara": "Lat"},
    {"dhatu": "स्मृ", "lakara": "Lat"},
]


def _unsure(reason: str = "") -> dict[str, Any]:
    return {"verdict": "unsure", "abstained": True, "reason": reason}


def _check_kind(kind: str) -> None:
    if kind not in SUPPORTED_KINDS:
        raise ValueError(f"unknown exercise kind: {kind!r}")


# ─── grid_fill ─────────────────────────────────────────────────────────────

def _grid_fill_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    """8x3 paradigm with N blanked derivable cells. Returns the item (with the
    answer kept server-side) or None when the engine yields nothing."""
    from app.services import prakriya

    rng = _rng(seed)
    stem = params.get("pratipadika") or DEFAULT_STEMS[seed % len(DEFAULT_STEMS)]["pratipadika"]
    linga = params.get("linga") or "Pum"
    n_blank = int(params.get("blanks", 2))
    table = prakriya.paradigm(pratipadika=stem, linga=linga)
    rows = table.get("rows") or []
    cells = []
    for r in rows:
        for c in r:
            if c.get("form"):
                cells.append(c)
    if not cells:
        return None
    rng.shuffle(cells)
    blanks = cells[: max(1, min(n_blank, len(cells)))]
    # Multiple-choice distractors per blank, drawn from the same table —
    # the renderable item carries options, never the answer (grade()
    # rebuilds it from the same seed). A phone has no Devanagari keyboard;
    # tapping the right cell must be possible without typing.
    pool = [c["form"] for c in cells]
    blank_rows = []
    for b in blanks:
        distract = [f for f in pool if f != b["form"]]
        rng.shuffle(distract)
        choices = [b["form"]] + distract[:3]
        rng.shuffle(choices)
        blank_rows.append({
            "vibhakti": b["vibhakti"],
            "vacana": b["vacana"],
            "choices": choices,
        })
    return {
        "pratipadika": stem,
        "linga": linga,
        "kind_table": table.get("kind", "subanta"),
        # The renderable grid: every cell present, blanks flagged — the FORM
        # of a blank is withheld (the answer is not in the payload).
        "cells": [
            {
                "vibhakti": c["vibhakti"],
                "vacana": c["vacana"],
                "form": None if c in blanks else c["form"],
                "blank": c in blanks,
            }
            for r in rows for c in r
        ],
        "blanks": blank_rows,
        "answer": [
            {"vibhakti": c["vibhakti"], "vacana": c["vacana"], "form": c["form"]}
            for c in blanks
        ],
    }


def _grade_grid_fill(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine produced no paradigm")
    expected = {(c["vibhakti"], c["vacana"]): c["form"] for c in item["answer"]}
    given_list = answer.get("cells") or answer.get("answers") or []
    if not isinstance(given_list, list) or not given_list:
        return _unsure("empty answer is not evidence")
    given = {(c.get("vibhakti"), c.get("vacana")): (c.get("form") or "").strip()
             for c in given_list if isinstance(c, dict)}
    if set(given.keys()) != set(expected.keys()):
        return _unsure("answer does not cover the blanked cells")
    wrong = sum(1 for k, v in expected.items() if given.get(k) != v)
    if wrong == 0:
        return {"verdict": "correct", "abstained": False}
    if wrong == 1 and len(expected) > 1:
        return {"verdict": "off_by_one", "abstained": False,
                "miss": [f"{k[0]}.{k[1]}" for k, v in expected.items() if given.get(k) != v]}
    return {"verdict": "incorrect", "abstained": False}


# ─── derive_next ───────────────────────────────────────────────────────────

def _derive_params(params: dict[str, Any], seed: int) -> dict[str, Any]:
    if params.get("dhatu") or params.get("pratipadika"):
        return {k: params[k] for k in
                ("dhatu", "lakara", "purusha", "vacana",
                 "pratipadika", "linga", "vibhakti") if params.get(k)}
    if seed % 2 == 0:
        d = DEFAULT_DHATUS[seed % len(DEFAULT_DHATUS)]
        return {"dhatu": d["dhatu"], "lakara": d["lakara"],
                "purusha": "Prathama", "vacana": "Eka"}
    s = DEFAULT_STEMS[seed % len(DEFAULT_STEMS)]
    return {"pratipadika": s["pratipadika"], "linga": s["linga"],
            "vibhakti": "Prathama", "vacana": "Eka"}


def _derive_next_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services import prakriya

    rng = _rng(seed ^ 0x9E37)
    der = prakriya.derive(**_derive_params(params, seed))
    steps = der.get("steps") or []
    if not steps or not der.get("result"):
        return None
    # Hide one step that actually has a sutra code; offer the true code plus
    # two distractors drawn deterministically from the sutra index.
    candidates = [i for i, s in enumerate(steps) if s.get("code")]
    if not candidates:
        return None
    hidden = rng.choice(candidates)
    codes = list(prakriya.by_code.keys())
    rng.shuffle(codes)
    options = [steps[hidden]["code"]]
    for c in codes:
        if c != options[0] and len(options) < 3:
            options.append(c)
    rng.shuffle(options)
    return {
        "derivation_params": _derive_params(params, seed),
        "result": der["result"],
        "hidden_index": hidden,
        "visible_steps": [
            {**s, "code": (None if i == hidden else s.get("code")),
             "sutra_text": ("" if i == hidden else s.get("sutra_text", ""))}
            for i, s in enumerate(steps)
        ],
        "options": options,
        "answer": {"code": steps[hidden]["code"]},
    }


def _grade_derive_next(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine produced no derivation")
    want = (item["answer"] or {}).get("code")
    got = (answer.get("code") or "").strip()
    if not got:
        return _unsure("empty answer is not evidence")
    if got == want:
        return {"verdict": "correct", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


# ─── sandhi ────────────────────────────────────────────────────────────────

def _sandhi_split_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services.sandhi import split_candidates

    rng = _rng(seed ^ 0x51F7)
    joined = (params.get("joined") or "").strip()
    if not joined:
        joined = DEFAULT_JOINS[seed % len(DEFAULT_JOINS)]
    cands = split_candidates(joined)
    if not cands:
        return None
    both = [c for c in cands if c.get("first_valid") and c.get("second_valid")]
    top = both[0] if both else cands[0]
    # Distractors: other phonetic splits of the same join. Options are the
    # multiple-choice list (shuffled deterministically) — never the answer.
    distractors = [c for c in cands
                   if (c["first"], c["second"]) != (top["first"], top["second"])][:2]
    options = [{"first": top["first"], "second": top["second"]}] + [
        {"first": c["first"], "second": c["second"]} for c in distractors]
    rng.shuffle(options)
    return {
        "joined": joined,
        "distractors": distractors,
        "options": options,
        "answer": {"first": top["first"], "second": top["second"]},
    }


def _grade_sandhi_split(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine split nothing")
    want = item["answer"] or {}
    first = (answer.get("first") or "").strip()
    second = (answer.get("second") or "").strip()
    if not first or not second:
        return _unsure("empty answer is not evidence")
    if first == want.get("first") and second == want.get("second"):
        return {"verdict": "correct", "abstained": False}
    # Same words, swapped order: close, not right.
    if first == want.get("second") and second == want.get("first"):
        return {"verdict": "off_by_one", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


def _sandhi_join_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services.sandhi import split_candidates

    # Join is graded through the split: the (first, second) pair is one whose
    # join the splitter recovers. Params may carry an explicit pair; otherwise
    # recover one deterministically from the curated joins.
    first = (params.get("first") or "").strip()
    second = (params.get("second") or "").strip()
    if first and second:
        return {"first": first, "second": second,
                "answer": {"joined_options": [first, second]}}
    rng = _rng(seed ^ 0x1234)
    joined = DEFAULT_JOINS[rng.randrange(len(DEFAULT_JOINS))]
    cands = split_candidates(joined)
    if not cands:
        return None
    both = [c for c in cands if c.get("first_valid") and c.get("second_valid")]
    top = both[0] if both else cands[0]
    # Multiple-choice joins: the true join, the raw concatenation (what you
    # get when no rule fires), and the reversed halves — deduped, shuffled.
    # Seeing the raw concat beside the true join IS the lesson: sandhi does
    # something. Graded exact (see _grade_sandhi_join): with options on the
    # table, "splits back to the pair" is too lenient a marker.
    options = [joined, top["first"] + top["second"],
               top["second"] + top["first"]]
    seen_opts: list[str] = []
    for o in options:
        if o not in seen_opts:
            seen_opts.append(o)
    rng.shuffle(seen_opts)
    return {"first": top["first"], "second": top["second"],
            "options": seen_opts,
            "answer": {"joined": joined}}


def _grade_sandhi_join(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    from app.services.sandhi import split_candidates

    if item is None:
        return _unsure("engine produced no join")
    got = (answer.get("joined") or "").strip()
    if not got:
        return _unsure("empty answer is not evidence")
    want = (item["answer"] or {}).get("joined")
    if want:
        # Options on the table: exact match on the curated join. (The
        # split-back check below stays for free-text answers, where the
        # engine that poses the question is still the engine that marks it.)
        if got == want:
            return {"verdict": "correct", "abstained": False}
        if "options" in item:
            return {"verdict": "incorrect", "abstained": False}
        # Accept any join the splitter maps back onto the same pair: the
        # engine that poses the question is the engine that marks it.
        try:
            cands = split_candidates(got)
        except Exception:  # noqa: BLE001 — engine miss abstains
            return _unsure("engine uncertain")
        for c in cands:
            if (c["first"], c["second"]) == (item["first"], item["second"]):
                return {"verdict": "correct", "abstained": False}
        return {"verdict": "incorrect", "abstained": False}
    # Explicit-pair item: verify the learner's join splits back to the pair.
    try:
        cands = split_candidates(got)
    except Exception:  # noqa: BLE001
        return _unsure("engine uncertain")
    if not cands:
        return _unsure("engine split nothing")
    for c in cands:
        if (c["first"], c["second"]) == (item["first"], item["second"]):
            return {"verdict": "correct", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


# ─── scan_metre ────────────────────────────────────────────────────────────

def _scan_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services import chandas

    text = (params.get("text") or "").strip()
    if not text:
        text = DEFAULT_VERSES[seed % len(DEFAULT_VERSES)]
    scanned = chandas.scan(text)
    lines = scanned.get("lines") or []
    if not lines or not any(l.get("syllables") for l in lines):
        return None
    weights = [[s["weight"] for s in line["syllables"]] for line in lines]
    return {
        "text": text,
        "syllables": [[s["syllable_devanagari"] for s in line["syllables"]]
                      for line in lines],
        "answer": {"weights": weights},
    }


def _grade_scan(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine scanned nothing")
    want = (item["answer"] or {}).get("weights")
    got = answer.get("weights")
    if not isinstance(got, list) or not got:
        return _unsure("empty answer is not evidence")
    if got == want:
        return {"verdict": "correct", "abstained": False}
    # One weight off across the whole verse: near.
    try:
        flat_w = [w for line in want for w in line]
        flat_g = [w for line in (got if got and isinstance(got[0], list) else [got])
                  for w in line]
    except Exception:  # noqa: BLE001 — malformed answer abstains, never accuses
        return _unsure("unreadable answer")
    if len(flat_w) == len(flat_g) and sum(1 for a, b in zip(flat_w, flat_g) if a != b) == 1:
        return {"verdict": "off_by_one", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


# ─── reorder ───────────────────────────────────────────────────────────────

def _reorder_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services.word_order import equivalent_orders

    rng = _rng(seed ^ 0x8081)
    sentence = (params.get("sentence") or "").strip()
    if not sentence:
        sentence = DEFAULT_SENTENCES[seed % len(DEFAULT_SENTENCES)]
    eq = equivalent_orders(sentence)
    if eq.get("refused") or not eq.get("equivalent_orders"):
        return None
    words = list(eq["words"])
    shuffled = list(words)
    rng.shuffle(shuffled)
    if shuffled == words and len(words) > 1:
        shuffled[0], shuffled[-1] = shuffled[-1], shuffled[0]
    return {
        "sentence": sentence,
        "words": words,
        "shuffled": shuffled,
        "wrong_endings": eq.get("wrong_endings") or [],
        "answer": {"equivalent_orders": eq["equivalent_orders"]},
    }


def _grade_reorder(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine found no equivalent order")
    order = answer.get("order")
    if not isinstance(order, list) or not order:
        return _unsure("empty answer is not evidence")
    for eq in (item["answer"] or {}).get("equivalent_orders", []):
        if list(order) == list(eq):
            return {"verdict": "correct", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


# ─── contrast ──────────────────────────────────────────────────────────────

def _contrast_item(params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    from app.services import prakriya

    rng = _rng(seed ^ 0xC07A)
    stem = params.get("pratipadika") or DEFAULT_STEMS[seed % len(DEFAULT_STEMS)]["pratipadika"]
    linga = params.get("linga") or "Pum"
    table = prakriya.paradigm(pratipadika=stem, linga=linga)
    rows = table.get("rows") or []
    # Minimal pair: two cells in the SAME row (same vibhakti family across the
    # table is too easy; same row = same case, different number — the classic
    # बालके vs बालकेन confusion is same stem, neighbouring cells).
    flat = [c for r in rows for c in r if c.get("form")]
    if len(flat) < 2:
        return None
    a = rng.choice(flat)
    # Prefer a neighbour that shares the vibhakti or vacana (one feature off).
    neighbours = [c for c in flat
                  if c is not a and (c["vibhakti"] == a["vibhakti"]
                                     or c["vacana"] == a["vacana"])]
    b = rng.choice(neighbours) if neighbours else rng.choice([c for c in flat if c is not a])
    ask = rng.choice(["a", "b"])
    target = a if ask == "a" else b
    return {
        "pratipadika": stem,
        "linga": linga,
        "a": {"form": a["form"], "vibhakti": a["vibhakti"], "vacana": a["vacana"]},
        "b": {"form": b["form"], "vibhakti": b["vibhakti"], "vacana": b["vacana"]},
        "prompt": f"Which form is {target['vibhakti']}.{target['vacana']}?",
        "answer": {"pick": ask},
    }


def _grade_contrast(item: dict[str, Any] | None, answer: dict[str, Any]) -> dict[str, Any]:
    if item is None:
        return _unsure("engine produced no pair")
    want = (item["answer"] or {}).get("pick")
    got = (answer.get("pick") or "").strip().lower()
    if got not in ("a", "b"):
        return _unsure("empty answer is not evidence")
    if got == want:
        return {"verdict": "correct", "abstained": False}
    return {"verdict": "incorrect", "abstained": False}


_BUILDERS = {
    "grid_fill": (_grid_fill_item, _grade_grid_fill),
    "derive_next": (_derive_next_item, _grade_derive_next),
    "sandhi_split": (_sandhi_split_item, _grade_sandhi_split),
    "sandhi_join": (_sandhi_join_item, _grade_sandhi_join),
    "scan_metre": (_scan_item, _grade_scan),
    "reorder": (_reorder_item, _grade_reorder),
    "contrast": (_contrast_item, _grade_contrast),
}


def _build(kind: str, params: dict[str, Any], seed: int) -> dict[str, Any] | None:
    build, _ = _BUILDERS[kind]
    return build(params, seed)


def generate(kind: str, params: dict[str, Any] | None, seed: int) -> dict:
    """Build the renderable item for (kind, params, seed).

    The answer is NOT in the returned dict — ``grade`` rebuilds it from the
    same seed. Raises ValueError for unknown kinds and for samasa/karaka
    claims (P23-2: never generate what the analyzer cannot grade).
    """
    _check_kind(kind)
    params = dict(params or {})
    bad = _refuses_taxonomy(params)
    if bad:
        raise ValueError(f"no generator claims {bad} (samasa/karaka need the analyzer)")
    item = _build(kind, params, int(seed))
    if item is None:
        # Engine yielded nothing: the caller serves an abstention-shaped
        # payload rather than a broken exercise.
        return {"kind": kind, "params": params, "seed": int(seed),
                "abstained": True, "prompt": None}
    renderable = {k: v for k, v in item.items() if k != "answer"}
    renderable.update({"kind": kind, "params": params, "seed": int(seed),
                       "abstained": False})
    return renderable


def grade(kind: str, params: dict[str, Any] | None, seed: int,
          answer: dict[str, Any] | None) -> dict:
    """Regenerate the item from (kind, params, seed) and grade ``answer``.

    Never raises on engine failure: an engine miss is ``unsure`` with
    ``abstained: True`` — never ``incorrect`` (§2.2).
    """
    _check_kind(kind)
    params = dict(params or {})
    bad = _refuses_taxonomy(params)
    if bad:
        raise ValueError(f"no generator claims {bad} (samasa/karaka need the analyzer)")
    try:
        item = _build(kind, params, int(seed))
    except Exception as e:  # noqa: BLE001 — engine failure abstains
        logger.warning("exercise grade build failed %s: %s", kind, e)
        return _unsure("engine uncertain")
    _, grade_fn = _BUILDERS[kind]
    try:
        verdict = grade_fn(item, dict(answer or {}))
    except Exception as e:  # noqa: BLE001 — a grader must never 500 a lesson
        logger.warning("exercise grade failed %s: %s", kind, e)
        return _unsure("engine uncertain")
    if verdict.get("verdict") not in VERDICTS:
        return _unsure("bad verdict")
    return verdict


def correct_answer(kind: str, params: dict[str, Any] | None, seed: int) -> dict | None:
    """The item's own answer (for tests and the round-trip check only — never
    serve this to the client)."""
    _check_kind(kind)
    item = _build(kind, dict(params or {}), int(seed))
    if item is None:
        return None
    return item.get("answer")
