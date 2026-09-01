"""Scoring. Deterministic and free — no LLM judge anywhere.

The generate scorer runs model output through `app.grading.analyzer`, the same
code path that grades real learners. That is the point of this harness: a model
whose Sanskrit the analyzer will not confidently parse cannot be shipped behind
the Vidyut gate no matter how good its English looks, and the gate is what turns
"is it accurate?" into a number you can put a rupee cost on.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from app.grading.analyzer import (
    analyze_sentence,
    devanagari_to_iast,
    feature_set_from_results,
    feature_set_variants,
    is_confident,
)

from app.evals.tasks import EvalCase


# ─── Result ───

@dataclass
class CaseScore:
    case_id: str
    task: str
    metrics: dict[str, float] = field(default_factory=dict)
    detail: dict[str, Any] = field(default_factory=dict)
    parse_error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "task": self.task,
            "metrics": self.metrics,
            "detail": self.detail,
            "parse_error": self.parse_error,
        }


# ─── JSON extraction ───

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


def extract_json(text: str) -> Optional[dict]:
    """Pull a JSON object out of a model reply.

    Models that ignore json_mode still usually emit a fenced or bare object, and
    a harness that scored those as total failures would measure formatting
    compliance rather than Sanskrit ability. Three attempts, then give up.
    """
    if not text:
        return None
    for candidate in (text, *(m.group(1) for m in _FENCE.finditer(text))):
        try:
            obj = json.loads(candidate.strip())
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, ValueError):
            pass
    m = _OBJECT.search(text)
    if m:
        try:
            obj = json.loads(m.group(0))
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, ValueError):
            pass
    return None


def _get_ci(obj: dict, name: str):
    """Fetch a key regardless of case, spacing or underscores.

    Models answer with "Correct", "Expected Feature", "expected_feature" and
    friends interchangeably. Matching only the exact documented spelling scored
    Sarvam's "Correct": true as a false accusation of a learner — a scorer bug
    that looked exactly like a model defect.
    """
    def norm(k: str) -> str:
        return "".join(ch for ch in k.lower() if ch.isalnum())
    target = norm(name)
    for key, value in obj.items():
        if isinstance(key, str) and norm(key) == target:
            return value
    return None


def _norm_word(w: str) -> str:
    """Compare words across scripts: models answer in Devanagari or IAST freely."""
    w = (w or "").strip().strip("।॥,.!?\"' ")
    if not w:
        return ""
    return devanagari_to_iast(w).strip().strip("।॥,.!?\"' ").lower()


def _norm_feature(f: str) -> str:
    """'acc.sg' / 'ACC SG' / 'Accusative Singular' -> 'ACC.SG' where recoverable."""
    f = (f or "").strip().upper().replace(" ", ".").replace("-", ".").replace("_", ".")
    f = re.sub(r"\.+", ".", f).strip(".")
    long_forms = {
        "NOMINATIVE": "NOM", "ACCUSATIVE": "ACC", "INSTRUMENTAL": "INSTR",
        "DATIVE": "DAT", "ABLATIVE": "ABL", "GENITIVE": "GEN",
        "LOCATIVE": "LOC", "VOCATIVE": "VOC",
        "SINGULAR": "SG", "DUAL": "DU", "PLURAL": "PL",
        "PRESENT": "PRES", "IMPERFECT": "IMPF", "FUTURE": "FUT",
        "IMPERATIVE": "IMP", "OPTATIVE": "OPT",
    }
    return ".".join(long_forms.get(p, p) for p in f.split(".") if p)


# ─── generate ───

def score_generate(case: EvalCase, text: str) -> CaseScore:
    score = CaseScore(case_id=case.id, task="generate")
    obj = extract_json(text)
    sanskrit = (obj or {}).get("sanskrit") or ""
    if not sanskrit and not obj:
        # Unfenced bare output is still usable — take the reply as the sentence.
        sanskrit = text.strip().splitlines()[0] if text.strip() else ""
    sanskrit = str(sanskrit).strip()

    if not sanskrit:
        score.parse_error = "no sanskrit in reply"
        score.metrics = {"gate_pass": 0.0, "feature_match": 0.0, "exact_match": 0.0}
        return score

    results = analyze_sentence(sanskrit)
    gate = is_confident(results)
    variants = feature_set_variants(results)

    # Score against the BEST reading, not the analyzer's primary one. Many correct
    # forms are genuinely ambiguous — neuter a-stems are syncretic in NOM/ACC, so
    # `phalam` is both, and the analyzer reports one as primary and one as an
    # alternative. Reading only the primary would mark correct Sanskrit wrong, the
    # same false-accusation failure the grading engine abstains to avoid.
    required = set(case.gold.get("features") or [])
    best_produced: dict[str, str] = feature_set_from_results(results)
    feature_match = 0.0
    if required:
        for variant in variants or [best_produced]:
            hit = len(required & set(variant.values())) / len(required)
            if hit > feature_match:
                feature_match, best_produced = hit, variant

    accepted = case.gold.get("accepted_parses") or []
    accepted_keys = {frozenset(p.items()) for p in accepted}
    exact = any(frozenset(v.items()) in accepted_keys for v in variants)

    score.metrics = {
        "gate_pass": 1.0 if gate else 0.0,
        "feature_match": feature_match,
        "feature_match_full": 1.0 if feature_match >= 1.0 else 0.0,
        "exact_match": 1.0 if exact else 0.0,
    }
    score.detail = {
        "sanskrit": sanskrit,
        "produced_features": best_produced,
        "required": sorted(required),
        "reference": case.gold.get("reference_devanagari", ""),
        "unparsed_words": [r.word for r in results if not r.is_confident],
    }
    return score


# ─── diagnose ───

def score_diagnose(case: EvalCase, text: str) -> CaseScore:
    score = CaseScore(case_id=case.id, task="diagnose")
    obj = extract_json(text)
    if obj is None:
        score.parse_error = "unparseable reply"
        score.metrics = {"verdict_correct": 0.0}
        return score

    pred_word_raw = str(_get_ci(obj, "word") or "")
    pred_feature_raw = str(_get_ci(obj, "expected_feature") or "")
    explanation = str(_get_ci(obj, "explanation") or "")

    raw = _get_ci(obj, "correct")
    schema_violation = 0.0
    if raw is None:
        # The verdict field is missing under any spelling — e.g. Sarvam emitting
        # a literal `"{"` as the key name. Track that separately: a model can be
        # right about the Sanskrit and still emit JSON an app cannot read, and
        # conflating the two would misreport a formatting defect (fixable with a
        # repair/retry layer) as a tutor falsely accusing a learner.
        schema_violation = 1.0
        # Fall back to the schema's own invariant: word and feature are empty
        # exactly when the model is asserting the sentence is correct.
        said_correct = not (pred_word_raw.strip() or pred_feature_raw.strip())
    elif isinstance(raw, str):
        said_correct = raw.strip().lower() in ("true", "yes", "correct")
    else:
        said_correct = bool(raw)

    gold_correct = bool(case.gold.get("correct"))

    if gold_correct:
        # Control case. The only thing that matters is that a correct sentence is
        # not flagged. False accusation is the worst failure mode for a tutor —
        # the grading engine abstains rather than risk it (engine.py docstring),
        # so a model that cannot clear this bar cannot be trusted to grade.
        score.metrics = {
            "verdict_correct": 1.0 if said_correct else 0.0,
            "false_accusation": 0.0 if said_correct else 1.0,
            "schema_violation": schema_violation,
        }
        score.detail = {
            "kind": "control",
            "said_correct": said_correct,
            # Kept so a false accusation can be read back without re-deriving it
            # from the raw JSONL — the reason this run needed manual triage.
            "pred_word": pred_word_raw,
            "pred_feature": pred_feature_raw,
            "explanation": explanation[:200],
        }
        return score

    detected = not said_correct
    gold_feature = _norm_feature(case.gold.get("expected_feature", ""))
    pred_feature = _norm_feature(pred_feature_raw)
    gold_word = _norm_word(case.gold.get("word_iast", ""))
    pred_word = _norm_word(pred_word_raw)

    feature_ok = bool(gold_feature) and pred_feature == gold_feature
    word_ok = bool(gold_word) and pred_word == gold_word

    score.metrics = {
        "verdict_correct": 1.0 if detected else 0.0,
        "error_detected": 1.0 if detected else 0.0,
        "word_correct": 1.0 if (detected and word_ok) else 0.0,
        "feature_correct": 1.0 if (detected and feature_ok) else 0.0,
        # The product metric: caught it, pointed at the right word, and named the
        # right fix. Anything less is not a usable correction to show a learner.
        "full_diagnosis": 1.0 if (detected and word_ok and feature_ok) else 0.0,
        "schema_violation": schema_violation,
    }
    score.detail = {
        "kind": "error",
        "gold_word": gold_word, "pred_word": pred_word,
        "gold_feature": gold_feature, "pred_feature": pred_feature,
        "explanation": explanation[:200],
    }
    return score


# ─── translate ───

_STOPWORDS = {
    "a", "an", "the", "is", "are", "am", "was", "were", "be", "to", "of", "in",
    "on", "at", "for", "and", "with", "by", "from", "it", "its", "he", "she",
    "they", "his", "her", "their", "that", "this", "there",
}


def _content_words(s: str) -> set[str]:
    words = re.findall(r"[a-z]+", (s or "").lower())
    return {w for w in words if w not in _STOPWORDS}


def score_translate(case: EvalCase, text: str) -> CaseScore:
    """Content-word F1 against the seed's own English prompt.

    Crude by design: it is a free, deterministic, model-neutral sanity baseline,
    not a translation-quality metric. Use it to spot a model that is badly wrong,
    not to separate two good ones — for that, the generate and diagnose scores
    are the ones that reflect the product.
    """
    score = CaseScore(case_id=case.id, task="translate")
    obj = extract_json(text)
    english = (obj or {}).get("english") or (text if obj is None else "")
    english = str(english).strip()

    gold = _content_words(case.gold.get("english", ""))
    pred = _content_words(english)
    if not gold or not pred:
        score.metrics = {"content_f1": 0.0}
        score.detail = {"english": english[:200]}
        return score

    overlap = len(gold & pred)
    precision = overlap / len(pred)
    recall = overlap / len(gold)
    f1 = 0.0 if not overlap else 2 * precision * recall / (precision + recall)

    score.metrics = {"content_f1": f1, "content_recall": recall}
    score.detail = {"english": english[:200], "gold": case.gold.get("english", "")}
    return score


SCORERS = {
    "generate": score_generate,
    "diagnose": score_diagnose,
    "translate": score_translate,
}


def score_case(case: EvalCase, text: str) -> CaseScore:
    return SCORERS[case.task](case, text)
