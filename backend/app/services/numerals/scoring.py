"""Number Builder prompt scoring: the 60/25/15 rubric (brief §4.7).

Components, each a mean of its assessed decisions in [0,1]:

  C — correct values (weight 60): one decision per nonzero integer group
      (its composed coefficient equals the key) plus one per fractional digit.
  S — scale, order and structure (weight 25): one decision per scale slot
      (the correct scale word in its group; the unit group carries no scale
      slot), one for the decimal marker, one for the sign when the prompt
      has a sign slot.
  L — valid spoken construction (weight 15): one decision per selected slot
      (surface approved for its context); all fail when the composed phrase
      does not parse back into a well-formed construction.

A component with no assessed decisions is dropped and the active weights
renormalise to 100. The final score rounds half-up once. Every decision is
returned as criterion-level evidence so no error is double-penalised: a
wrong scale word already fails that group's C decision and its S decision
independently — no additional "cascade" penalty is applied.

The scored decisions and weights are fixed when the server issues the prompt;
score_prompt receives the stored key, never client values.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from .lexicon import get_lexicon
from .render import PhraseError, slot_selections
from .structure import DecimalNumber, build_skeleton

WEIGHT_C = 60
WEIGHT_S = 25
WEIGHT_L = 15


@dataclass
class NumberKey:
    """The server-side answer key for one issued prompt."""

    canonical: str  # exact decimal string, e.g. "104847322.34"
    lang: str
    grouping: str
    include_sign: bool


def parse_key(canonical: str) -> DecimalNumber:
    from .structure import parse_decimal
    return parse_decimal(canonical)


@dataclass
class PromptScore:
    score: int  # 0-100
    c: float
    s: float
    l: float
    evidence: list[dict] = field(default_factory=list)
    parse_ok: bool = False
    parse_reason: str = ""


def score_prompt(key: NumberKey, selections: dict[str, str]) -> PromptScore:
    lex = get_lexicon(key.lang)
    value = parse_key(key.canonical)
    skeleton = build_skeleton(value, key.grouping, include_sign=key.include_sign)
    evidence: list[dict] = []

    paired = slot_selections(skeleton, selections, key.lang)

    # ── C: coefficient groups + fractional digits ────────────────────────────
    c_decisions: list[bool] = []
    group_selection: dict[str, int | None] = {}
    for slot, entry in paired:
        kind = slot["kind"]
        if kind in ("coef", "unit"):
            ok = entry is not None and entry.value == slot["value"]
            c_decisions.append(ok)
            gid = slot["id"].rsplit("-coef", 1)[0]
            group_selection[gid] = entry.value if entry is not None else None
            evidence.append({
                "criterion": "value", "target": slot["group"] or "units",
                "detail": f"coefficient {slot['value']}", "ok": ok,
            })
        elif kind == "digit":
            ok = entry is not None and entry.value == slot["value"]
            c_decisions.append(ok)
            evidence.append({
                "criterion": "value", "target": "fraction",
                "detail": f"digit {slot['digit_index'] + 1} = {slot['value']}", "ok": ok,
            })

    # ── S: scale assignments, marker, sign ───────────────────────────────────
    s_decisions: list[bool] = []
    for slot, entry in paired:
        kind = slot["kind"]
        if kind == "scale":
            ok = entry is not None and entry.semantic_id == f"{key.lang}:scale:{slot['group']}"
            s_decisions.append(ok)
            evidence.append({
                "criterion": "structure", "target": slot["group"],
                "detail": f"scale word for {slot['group']}", "ok": ok,
            })
        elif kind == "marker":
            ok = entry is not None and entry.semantic_id == f"{lang_marker(key.lang)}"
            s_decisions.append(ok)
            evidence.append({
                "criterion": "structure", "target": "decimal marker",
                "detail": "decimal marker word", "ok": ok,
            })
        elif kind == "sign":
            ok = entry is not None and entry.semantic_id == f"{key.lang}:sign:negative"
            s_decisions.append(ok)
            evidence.append({
                "criterion": "structure", "target": "sign",
                "detail": "negative marker", "ok": ok,
            })

    # ── L: contextual validity of the composed phrase ────────────────────────
    # One L decision per selected slot (surface approved for its context).
    # When the phrase does not parse back, the failure is attributed once as a
    # single grouped grammar criterion — a wrong scale word already costs C
    # and S, and must not also silently zero every L decision (no unexplained
    # double penalty for the same error).
    l_decisions: list[bool] = []
    parse_ok = False
    parse_reason = ""
    selected = [(slot, entry) for slot, entry in paired if entry is not None]
    if selected:
        phrase = _render_selections(key.lang, selected)
        tokens = lex.tokenize(phrase)
        parse_ok = False
        if tokens is None:
            parse_reason = "unrecognised words"
        else:
            from .render import _parse_tokens
            result = _parse_tokens(tokens, key.lang)
            parse_ok = result.value is not None
            parse_reason = result.reason
        if parse_ok:
            context_ok = True
            for slot, entry in selected:
                allowed = _SLOT_CONTEXTS_OK(slot["kind"], entry)
                l_decisions.append(allowed)
                if not allowed:
                    evidence.append({
                        "criterion": "grammar", "target": slot["group"] or slot["kind"],
                        "detail": f"{entry.semantic_id} not approved for this slot",
                        "ok": False,
                    })
        else:
            evidence.append({
                "criterion": "grammar", "target": "phrase",
                "detail": f"not a valid construction: {parse_reason}",
                "ok": False,
            })
            l_decisions.append(False)
    # (blank slots are already penalised by C; L only judges what was chosen)

    def mean(xs: list[bool]) -> float:
        return (sum(1 for x in xs if x) / len(xs)) if xs else 0.0

    c = mean(c_decisions)
    s = mean(s_decisions)
    l = mean(l_decisions)

    weights: list[tuple[float, float]] = []
    if c_decisions:
        weights.append((WEIGHT_C, c))
    if s_decisions:
        weights.append((WEIGHT_S, s))
    if l_decisions:
        weights.append((WEIGHT_L, l))
    if not weights:
        score = 0  # entirely blank answer
    else:
        total_w = sum(w for w, _ in weights)
        raw = sum(w * v for w, v in weights) / total_w * 100
        score = int((Decimal(raw) / Decimal(1)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    return PromptScore(score=score, c=c, s=s, l=l, evidence=evidence,
                       parse_ok=parse_ok, parse_reason=parse_reason)


def lang_marker(lang: str) -> str:
    return f"{lang}:marker:decimal"


_SLOT_CONTEXTS = {
    "sign": ("sign",),
    "coef": ("coef",),
    "unit": ("coef", "unit"),
    "scale": ("scale",),
    "marker": ("marker",),
    "digit": ("digit",),
}


def _SLOT_CONTEXTS_OK(slot_kind: str, entry) -> bool:
    """Contextual approval: the surface is an approved form for its slot.
    Dropdown selections always pass (issue-time validation enforces this);
    the check remains so free-text submissions are judged identically."""
    return any(c in entry.contexts for c in _SLOT_CONTEXTS[slot_kind])


def _render_selections(lang: str, paired: list[tuple[dict, "object"]]) -> str:
    parts: list[str] = []
    for slot, entry in paired:
        if entry is None:
            continue
        if lang == "en":
            parts.append(entry.surface("text"))
        else:
            parts.append(entry.surface("dev"))
    return " ".join(p for p in parts if p)


def round_score(prompt_scores: list[int]) -> int:
    """Five equally weighted prompts: 10 x mean, rounded once (half-up)."""
    if not prompt_scores:
        return 0
    mean = Decimal(sum(prompt_scores)) / Decimal(len(prompt_scores))
    return int((mean * 10).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
