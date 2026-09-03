"""Authoring pipeline: Sarvam drafts → Vidyut gate → human spot-check → Bulbul render.

Pipeline (architecture §12): the authoring model drafts dialogue turns, the
Vidyut-backed analyzer gates each drafted learner sentence (only confident,
feature-consistent turns pass), a human spot-checks, and the Bulbul renderer
pre-renders audio shards. The pipeline is the product; the first scenario is
the proof.

Model routing (§4.3): `sarvam-105b-conversations` for drafting (cheap,
100% Vidyut gate), **Gemini** for any dual-bearing content — Sarvam
false-accuses ~50% of duals. Never `sarvam-105b` (the reasoning variant):
it dead-ends.

Determinism: LLM drafts are cached on disk (`.authoring-cache/`, keyed by a
brief hash, same shape as the eval-runner cache). Re-running a brief is
idempotent: the scenario of that title is deleted + recreated ONLY when
``replace=True``; otherwise the run refuses.

The render pass is API-only (architecture.md §1 — no local models anywhere):
``render_scenario`` talks to Sarvam's Bulbul TTS directly, so importing this
module never pulls torch/transformers.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import io
import json
import logging
import os
import re
import time
import uuid
import wave
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.evals.providers import build_provider, LLMResponse
from app.grading.analyzer import (
    analyze_sentence,
    feature_set_from_results,
    feature_set_variants,
    is_confident,
)
from app.config import settings
from app.models import DialogueEdge, DialogueNode, DialogueScenario
from app.services.sarvam import SarvamClient

logger = logging.getLogger("shabd.authoring")

# ─── constants ────────────────────────────────────────────────────────────

CONVERSATIONS_MODEL = "sarvam-105b-conversations"
"""The drafting model (§4.3). Never the reasoning variant `sarvam-105b`."""

# Gemini, reached through OpenRouter (owner decision 2026-09-01 — one key we
# already hold instead of a second vendor account). Pinned to 2.5-flash: that
# is the model the §4.3 evals actually measured for dual-number accuracy.
# OpenRouter also serves 3.x flash; upgrading is a one-line change and wants
# a re-run of the dual eval, not an assumption.
DUAL_MODEL = "openrouter:google/gemini-2.5-flash"
"""Router for dual-bearing content: Sarvam false-accuses ~50% of duals."""

_DEFAULT_RATIO_BAND = {"min": 0.2, "max": 0.5}

_CACHE_DIR = os.environ.get(
    "AUTHORING_CACHE_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".authoring-cache"),
)


# ─── errors ───────────────────────────────────────────────────────────────

class AuthoringError(Exception):
    """Base class for authoring pipeline failures."""


class AuthoringConflictError(AuthoringError):
    """A scenario with the same title already exists and replace=False."""


class AuthoringNotFoundError(AuthoringError):
    """The requested scenario does not exist."""


class AuthoringProviderError(AuthoringError):
    """The LLM provider failed to produce usable drafts."""


# ─── live gate (real runs only; tests mock providers and never hit this) ──

def authoring_live() -> bool:
    """True only when SHABD_AUTHORING_LIVE=1 is set (default off).

    The router refuses to run the pipeline unless this is set, so an
    unconfigured dev box can never burn Sarvam credits by accident.
    """
    return os.environ.get("SHABD_AUTHORING_LIVE", "") == "1"


# ─── disk cache (mirrors app/evals/runner.py's file-per-key pattern) ──────

def _brief_key(brief: dict, n_turns: int, with_dual: bool) -> str:
    h = hashlib.sha256()
    h.update(json.dumps(brief, sort_keys=True, ensure_ascii=False).encode("utf-8"))
    h.update(b"\0")
    h.update(str(n_turns).encode("utf-8"))
    h.update(b"\0")
    h.update(b"dual" if with_dual else b"plain")
    return h.hexdigest()[:16]


def _cache_path(brief: dict, n_turns: int, with_dual: bool) -> Path:
    model = DUAL_MODEL if with_dual else CONVERSATIONS_MODEL
    safe_model = re.sub(r"[^A-Za-z0-9._-]", "_", model)
    return Path(_CACHE_DIR) / f"drafts-{safe_model}-{_brief_key(brief, n_turns, with_dual)}.json"


def _cache_load(brief: dict, n_turns: int, with_dual: bool) -> Optional[list[dict]]:
    path = _cache_path(brief, n_turns, with_dual)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, list) or not data:
        return None
    logger.info("authoring cache hit: %s", path.name)
    return data


def _cache_store(brief: dict, n_turns: int, with_dual: bool, drafts: list[dict]) -> None:
    # Never cache an empty/failed draft list — a partial response must not
    # become a permanent "no drafts" on every subsequent run.
    if not drafts:
        return
    try:
        path = _cache_path(brief, n_turns, with_dual)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(drafts, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError as e:
        logger.debug("authoring cache write failed: %s", e)


# ─── drafting ─────────────────────────────────────────────────────────────

_DRAFT_SYSTEM_PROMPT = """You are the authoring model for Shabd, a Sanskrit-as-a-second-language app. You write short, everyday (laukika) dialogue turns for adult beginner learners.

Return ONLY a JSON array of exactly {n} turn objects. No prose, no markdown fences. Each object has exactly these keys:
- "devanagari": str — the TUTOR's turn, in Devanagari script
- "iast": str — IAST transliteration of the tutor turn
- "gloss_en": str — English gloss of the tutor turn
- "expected_learner_sanskrit": str — the LEARNER's expected reply in correct, natural Sanskrit, in Devanagari script
- "features": list[str] — feature ids that actually occur in expected_learner_sanskrit. Use ONLY the allowed ids listed below; never invent or alter one.

Allowed feature ids (CLOSED SET): {target_features}
Never introduce a feature id that is not in this closed set — even if it looks like a valid Sanskrit label. Every id in "features" must be present in the closed set AND morphologically present in expected_learner_sanskrit.

Rules:
- Register: {register}. Topic: {topic}. Sentence length: short (3-7 words).
- Learner's Sanskrit ratio band: {ratio_min}-{ratio_max}. Bridge language: {bridge_lang} (the tutor may code-switch to it when needed).
- {dual_rule}Every drafted sentence must be grammatical, with correct sandhi. Spell Sanskrit words accurately.
- The tutor first sets up the exchange; the learner's expected reply is the exercise target.
- "features" must be genuinely derivable from expected_learner_sanskrit — no invented feature claims."""

_DUAL_RULE = (
    "Dual-number forms are REQUIRED: include NOM.DU/ACC.DU nominal forms (e.g. rāmau, phale) "
    "and PRES.3DU verb forms (e.g. khādataḥ) in expected_learner_sanskrit across the turns.\n"
)
_NO_DUAL_RULE = "Do NOT use dual-number forms — singular/plural only.\n"


def _extract_json_array(text: str) -> list[dict]:
    """Pry a JSON array of turns out of a model response.

    The model is asked for an array but intermittently returns a single bare
    turn object — measured at 3 of 5 briefs against sarvam-105b-conversations
    on 2026-09-01. The previous bracket-scan then found the *inner* "features"
    array, normalized zero dicts out of its strings, and returned ``[]``. That
    read downstream as "this brief produced nothing" with no error to act on,
    so a malformed draft was indistinguishable from an empty one.

    Two rules follow: parse the whole body first (``json_mode=True`` means it
    should be valid JSON), and never return an empty list from a non-empty
    parse — raise, so the caller can retry or report.
    """
    t = text.strip()
    t = re.sub(r"^```[a-zA-Z]*\s*", "", t)
    t = re.sub(r"\s*```$", "", t)

    try:
        data = json.loads(t)
    except ValueError:
        # Prose or trailing junk around the JSON — fall back to a bracket scan.
        start, end = t.find("["), t.rfind("]")
        if start == -1 or end <= start:
            raise AuthoringProviderError("draft response contained no JSON array")
        try:
            data = json.loads(t[start : end + 1])
        except ValueError as e:
            raise AuthoringProviderError(f"draft response was not valid JSON: {e}") from e

    if isinstance(data, dict):
        # A bare single turn object also carries a list-valued "features" key,
        # so "single list-valued key => wrapper" is too greedy: unwrapping a
        # real single turn's features array is exactly the failure this fallback
        # exists to avoid. Only treat the dict as a wrapper when it is NOT
        # itself a usable turn (no top-level expected_learner_sanskrit).
        if str(data.get("expected_learner_sanskrit", "")).strip():
            data = [data]
        else:
            list_vals = [v for v in data.values() if isinstance(v, list)]
            if len(list_vals) == 1 and list_vals[0]:
                data = list_vals[0]
            else:
                data = [data]
    if not isinstance(data, list):
        raise AuthoringProviderError("draft response JSON was not an array")
    normalized: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "devanagari": str(item.get("devanagari", "")).strip(),
                "iast": str(item.get("iast", "")).strip(),
                "gloss_en": str(item.get("gloss_en", "")).strip(),
                "expected_learner_sanskrit": str(
                    item.get("expected_learner_sanskrit", "")
                ).strip(),
                "features": [str(f) for f in (item.get("features") or [])],
            }
        )
    usable = [d for d in normalized if d["expected_learner_sanskrit"]]
    if data and not usable:
        raise AuthoringProviderError(
            f"draft response parsed to {len(data)} item(s), none of them usable turns"
        )
    return usable


async def draft_turns(
    scenario_brief: dict,
    n_turns: int,
    with_dual: bool = False,
    *,
    cache: bool = True,
) -> list[dict]:
    """Draft ``n_turns`` dialogue turns via the Sarvam conversations model.

    ``scenario_brief`` = {title, register, ratio_band, bridge_lang, topic,
    sample_features}.  ``with_dual=True`` routes to Gemini (Sarvam
    false-accuses ~50% of dual-bearing sentences; §4.3) and demands
    dual-number forms.

    Returns a list of ``{devanagari, iast, gloss_en, expected_learner_sanskrit,
    features}`` dicts.  Drafts are cached on disk keyed by brief hash
    (``.authoring-cache/``), so re-running a brief is deterministic.
    """
    if cache:
        hit = _cache_load(scenario_brief, n_turns, with_dual)
        if hit is not None:
            return hit

    if with_dual:
        provider = build_provider(DUAL_MODEL)
    else:
        provider = build_provider(f"sarvam:{CONVERSATIONS_MODEL}")

    band = _normalize_ratio_band(scenario_brief.get("ratio_band"))
    # P6-3: every brief carries target_features (the band's closed set) but the
    # prompt was never given them — so the model guessed at the feature
    # vocabulary from two examples and invented labels (PRES.1SG.ACT, ADJ.SG,
    # COP.PRES.1SG…). Feed the closed set in explicitly. Fall back to the test
    # brief's sample_features so the unit brief stays self-contained.
    target_features = (
        scenario_brief.get("target_features")
        or scenario_brief.get("sample_features")
        or []
    )
    system = _DRAFT_SYSTEM_PROMPT.format(
        n=max(1, int(n_turns)),
        target_features=", ".join(str(f) for f in target_features) or "(none — derive freely)",
        register=scenario_brief.get("register", "laukika"),
        topic=scenario_brief.get("topic", "everyday conversation"),
        ratio_min=band["min"],
        ratio_max=band["max"],
        bridge_lang=scenario_brief.get("bridge_lang", "hi"),
        dual_rule=_DUAL_RULE if with_dual else _NO_DUAL_RULE,
    )
    user = (
        "Draft a short laukika dialogue for a beginner. "
        f"Title: {scenario_brief.get('title', 'untitled')}. "
        f"Sample features to exercise: {scenario_brief.get('sample_features', target_features)}.\n"
        f'Return {max(1, int(n_turns))} turns as a JSON array.'
    )

    async def _call_once() -> list[dict]:
        resp: LLMResponse = await provider.complete(
            system, user, json_mode=True, max_tokens=2048
        )
        if not resp.ok:
            raise AuthoringProviderError(
                f"draft failed on {provider.label}: {resp.error or 'empty response'}"
            )
        return _extract_json_array(resp.text)

    # P6-3: the model intermittently returns 1 turn instead of the requested n
    # (~60%, measured 2026-09-01 — that sample came from the *same* conversation
    # model over a 5-brief run), and on the live re-run also wrapped the array in
    # {"turns":[...]} or emitted an unusable single object. Make up to two
    # attempts and keep the fullest usable result. A second draft call (₹0.0055)
    # is cheap against wasting a whole brief; the partial reply is rarely better
    # than a fresh attempt. Only if both attempts yield nothing do we surface an
    # error, so a too-short result is still usable rather than silently dropped.
    target = max(1, int(n_turns))
    drafts: list[dict] = []
    attempts = 0
    while attempts < 2 and len(drafts) < target:
        attempts += 1
        try:
            candidate = await _call_once()
        except AuthoringProviderError:
            # A malformed/unusable reply (e.g. an empty learner sentence) is as
            # much a "not enough turns" signal as a short one — retry.
            if attempts >= 2:
                break
            continue
        if len(candidate) > len(drafts):
            drafts = candidate
    if not drafts:
        raise AuthoringProviderError(
            f"draft produced no usable turns after {attempts} attempt(s)"
        )
    if cache:
        _cache_store(scenario_brief, n_turns, with_dual, drafts)
    return drafts


# ─── gating ───────────────────────────────────────────────────────────────

def _normalize_ratio_band(band: Any) -> dict:
    if isinstance(band, dict):
        return {
            "min": float(band.get("min", _DEFAULT_RATIO_BAND["min"])),
            "max": float(band.get("max", _DEFAULT_RATIO_BAND["max"])),
        }
    if isinstance(band, (list, tuple)) and len(band) >= 2:
        return {"min": float(band[0]), "max": float(band[1])}
    return dict(_DEFAULT_RATIO_BAND)


def _feature_values(parses: list[dict]) -> set[str]:
    vals: set[str] = set()
    for p in parses:
        vals.update(str(v) for v in p.values())
    return vals


def _missing_claimed_features(claimed: list[str], parses: list[dict]) -> list[str]:
    """Claimed features not derivable from any accepted reading (prefix-aware).

    A claim like "ACC" is satisfied by a derived value "ACC.SG" (feature
    taxonomy prefixes); a full id like "PRES.3DU" must match exactly.
    """
    values = _feature_values(parses)
    missing: list[str] = []
    for c in claimed or []:
        c = str(c).strip()
        if not c:
            continue
        if c in values or any(v.startswith(c + ".") for v in values):
            continue
        missing.append(c)
    return missing


async def gate_drafts(
    drafts: list[dict],
    target_features: Optional[list[str]] = None,
) -> list[dict]:
    """Gate every draft through the Vidyut-backed analyzer.

    For each turn: analyze ``expected_learner_sanskrit``; it must be fully
    confident; build accepted parses from the derived readings; cross-check
    that the draft's claimed features are a subset of the derived values.

    ``target_features`` is the brief's closed feature set (P6-3). When given,
    a *non-derivable* claimed feature that is also absent from the closed set
    is reported as a **label error** (``claimed features outside the allowed
    set``) rather than as a grammar failure (``claimed features not
    derivable``). The distinction matters: the first means the model mis-named
    a feature (``PRES.1SG.ACT``, ``ADJ.SG``…), the second means the Sanskrit
    itself is wrong. The two demand different responses and were previously
    conflated. A claimed feature is never rejected for being off-band on its
    own — if the sentence derives it, it passes the gate; the closed set only
    classifies failures, it does not create them.

    Returns ``[{**draft, gate: "pass"|"fail", accepted_parses, derived_parses,
    reason}]`` — ``derived_parses`` is non-empty exactly on pass.
    """
    closed = {str(f).strip() for f in (target_features or []) if str(f).strip()}
    gated: list[dict] = []
    for draft in drafts:
        text = str(draft.get("expected_learner_sanskrit", "")).strip()
        if not text:
            gated.append({**draft, "gate": "fail", "accepted_parses": [],
                          "derived_parses": [], "reason": "empty expected_learner_sanskrit"})
            continue

        try:
            results = analyze_sentence(text)
        except Exception as e:  # analyzer must never take the pipeline down
            logger.warning("analyzer raised for %r: %s", text, e)
            results = []

        if not is_confident(results):
            errors = [r.error for r in results if r.error]
            reason = "analyzer not confident on expected_learner_sanskrit"
            if errors:
                reason += f": {errors[0]}"
            gated.append({**draft, "gate": "fail", "accepted_parses": [],
                          "derived_parses": [], "reason": reason})
            continue

        derived_parses = feature_set_variants(results) or [feature_set_from_results(results)]
        missing = _missing_claimed_features(draft.get("features"), derived_parses)
        if missing:
            # Classify: a claimed feature that is not derivable AND not in the
            # brief's closed set is a label error (the model invented a feature
            # id); one that IS in the closed set but still failed to derive is a
            # genuine grammar failure in the Sanskrit itself. (P6-3)
            if closed:
                outside = sorted(m for m in missing if m not in closed)
                if outside:
                    gated.append({
                        **draft, "gate": "fail", "accepted_parses": [], "derived_parses": [],
                        "reason": f"claimed features outside the allowed set: {outside}",
                    })
                    continue
            gated.append({
                **draft, "gate": "fail", "accepted_parses": [], "derived_parses": [],
                "reason": f"claimed features not derivable: {sorted(missing)}",
            })
            continue

        gated.append({
            **draft, "gate": "pass",
            "accepted_parses": derived_parses,
            "derived_parses": derived_parses,
            "reason": "",
        })
    return gated


# ─── orchestration ────────────────────────────────────────────────────────

_ASK_AGAIN_TEXT = {
    "hi": ("कृपया पुनः प्रयास कीजिए।", "Please try again."),
    "en": ("Please try again.", "Please try again."),
}


def _build_scenario(db: Session, brief: dict, gated: list[dict]) -> DialogueScenario:
    """Persist a dialogue graph: one tutor node + one ask-again repair per pass.

    Wiring ("wired in a chain"): each passed turn i makes tutor node T_i and
    repair node R_i.  A sa-edge T_i → T_{i+1} carries the turn's expected
    learner Sanskrit + accepted parses (the happy path); every tutor node has
    a repair edge T_i → R_i and every repair loops R_i → T_i, so every tutor
    node has ≥1 outgoing edge and the graph fully terminates.
    """
    passed = [g for g in gated if g["gate"] == "pass"]
    band = _normalize_ratio_band(brief.get("ratio_band"))
    bridge_lang = brief.get("bridge_lang", "hi")
    bridge_lang = bridge_lang if bridge_lang in ("hi", "en") else "hi"
    ask_again_dev, ask_again_gloss = _ASK_AGAIN_TEXT.get(bridge_lang, _ASK_AGAIN_TEXT["hi"])

    scenario = DialogueScenario(
        id=uuid.uuid4().hex[:16],
        title=str(brief.get("title", "untitled")),
        description=(
            f"Auto-authored: {brief.get('topic', '')} ({brief.get('register', 'laukika')}); "
            f"{bridge_lang} bridge; {len(passed)} gated turns"
        ),
        register=str(brief.get("register", "laukika")),
        min_ratio=band["min"],
        max_ratio=band["max"],
        est_minutes=max(2, len(passed)),
    )
    db.add(scenario)
    db.flush()

    tutors: list[DialogueNode] = []
    repairs: list[DialogueNode] = []
    for i, turn in enumerate(passed):
        node = DialogueNode(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            kind="tutor",
            repair_type=None,
            lang="sa",
            devanagari=turn["devanagari"],
            iast=turn.get("iast", ""),
            gloss=turn.get("gloss_en", ""),
            ratio_band_min=band["min"],
            ratio_band_max=band["max"],
            sort=i * 10,
        )
        db.add(node)
        db.flush()
        tutors.append(node)

        repair = DialogueNode(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            kind="repair",
            repair_type="ask_again",
            lang=bridge_lang,
            devanagari=ask_again_dev,
            gloss=ask_again_gloss,
            ratio_band_min=band["min"],
            ratio_band_max=band["max"],
            sort=i * 10 + 5,
        )
        db.add(repair)
        db.flush()
        repairs.append(repair)

    for i, turn in enumerate(passed):
        # Happy path: expected learner reply → next tutor turn.
        if i < len(tutors) - 1:
            db.add(DialogueEdge(
                id=uuid.uuid4().hex[:16],
                scenario_id=scenario.id,
                from_node_id=tutors[i].id,
                to_node_id=tutors[i + 1].id,
                lang="sa",
                expected_text=turn["expected_learner_sanskrit"],
                accepted_parses=turn.get("accepted_parses", []),
                expected_phrases=[turn["expected_learner_sanskrit"]],
                features=turn.get("features", []),
                rank=i * 2,
            ))
        # Repair chain: any non-matching reply → ask_again, then loop back.
        db.add(DialogueEdge(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            from_node_id=tutors[i].id,
            to_node_id=repairs[i].id,
            lang="bridge",
            expected_text="",
            expected_phrases=[],
            features=[],
            rank=i * 2 + 1,
        ))
        db.add(DialogueEdge(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            from_node_id=repairs[i].id,
            to_node_id=tutors[i].id,
            lang="bridge",
            expected_text="",
            expected_phrases=[],
            features=[],
            rank=0,
        ))

    scenario.entry_node_id = tutors[0].id if tutors else None
    db.commit()
    db.refresh(scenario)
    return scenario


def _delete_scenario(db: Session, scenario: DialogueScenario) -> None:
    """Delete a scenario plus its edges and nodes (bulk deletes, FK-safe)."""
    db.query(DialogueEdge).filter(DialogueEdge.scenario_id == scenario.id).delete()
    db.query(DialogueNode).filter(DialogueNode.scenario_id == scenario.id).delete()
    db.delete(scenario)
    db.flush()


async def run_authoring(
    brief: dict,
    n_turns: int,
    with_dual: bool = False,
    dry_run: bool = False,
    *,
    replace: bool = False,
    db: Optional[Session] = None,
) -> dict:
    """Orchestrate draft → gate → (dry_run stops) → persist the dialogue graph.

    Returns ``{scenario_id, title, n_nodes, n_edges, n_gated, n_failed,
    failures, dry_run}``.  Only gate-passed turns become nodes; failed turns
    land in ``failures`` with reasons.  A scenario whose title already exists
    is refused unless ``replace=True`` (then it is deleted + recreated —
    deterministic and idempotent).

    ``db`` is the router's request session when provided; otherwise a private
    session is opened and closed.  ``dry_run=True`` never touches the DB.
    """
    own_session = db is None
    session = db or SessionLocal()
    try:
        drafts = await draft_turns(brief, n_turns, with_dual=with_dual)
        gated = await gate_drafts(
            drafts,
            target_features=brief.get("target_features"),
        )

        failures = [
            {"index": i, "devanagari": g.get("devanagari", ""),
             "expected_learner_sanskrit": g.get("expected_learner_sanskrit", ""),
             "reason": g.get("reason", "")}
            for i, g in enumerate(gated) if g["gate"] == "fail"
        ]
        report: dict[str, Any] = {
            "scenario_id": None,
            "title": brief.get("title", "untitled"),
            "n_nodes": 0,
            "n_edges": 0,
            "n_gated": len(gated),
            "n_failed": len(failures),
            "failures": failures,
            "dry_run": dry_run,
        }
        if dry_run:
            return report

        passed = [g for g in gated if g["gate"] == "pass"]
        if not passed:
            report["reason"] = "no gate-passed turns; scenario not created"
            return report

        title = str(brief.get("title", ""))
        existing = (
            session.query(DialogueScenario)
            .filter(DialogueScenario.title == title)
            .first()
            if title else None
        )
        if existing is not None:
            if not replace:
                raise AuthoringConflictError(
                    f"scenario with title {title!r} already exists "
                    "(pass replace=True to overwrite)"
                )
            logger.info("replacing existing scenario %s (%s)", existing.id, title)
            _delete_scenario(session, existing)

        scenario = _build_scenario(session, brief, gated)
        n_nodes = session.query(DialogueNode).filter(
            DialogueNode.scenario_id == scenario.id
        ).count()
        n_edges = session.query(DialogueEdge).filter(
            DialogueEdge.scenario_id == scenario.id
        ).count()
        report.update(scenario_id=scenario.id, n_nodes=n_nodes, n_edges=n_edges)
        return report
    finally:
        if own_session:
            session.close()


# ─── render pass ──────────────────────────────────────────────────────────

_LANG_MAP = {"sa": "sa", "hi": "hi", "en": "en"}
_SA_LANG_CODE = "hi-IN"
"""Bulbul has no ``sa-IN`` outside beta — Sanskrit nodes render ``hi-IN`` until
the account's beta is enabled (architecture.md §4.1; memory: 2026-08-29)."""
_BULBUL_MODEL = "bulbul:v3"
_BULBUL_SPEAKER = "aditya"
_BULBUL_SAMPLE_RATE = 24000
"""Requested rate only — Bulbul v3 ignores it and returns 22050 Hz mono."""


def _bulbul_lang_code(lang: str) -> str:
    if lang == "en":
        return "en-IN"
    if lang == "sa":
        return _SA_LANG_CODE
    return "hi-IN"


def _wav_duration(wav_bytes: bytes, fallback_rate: int = _BULBUL_SAMPLE_RATE) -> float:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            if w.getframerate() > 0:
                return w.getnframes() / w.getframerate()
    except Exception:
        pass
    return len(wav_bytes) / max(1, fallback_rate * 2)


def bulbul_available() -> tuple[bool, str]:
    """True when a Sarvam key is configured (API-only §1 — no local models)."""
    if not settings.sarvam_api_key:
        return False, "SARVAM_API_KEY not configured"
    return True, ""


async def _render_item_bulbul(
    client: SarvamClient,
    item: dict,
    out_dir: Path,
    shard_id: str,
) -> dict:
    """Render one ``{id,text,lang}`` via Bulbul → result dict.

    Never raises: failures are recorded in the result dict so one bad item
    cannot kill the shard.
    """
    item_id = str(item.get("id", "?"))
    text = str(item.get("text", ""))
    lang = str(item.get("lang", "sa"))
    try:
        audio_b64 = await client.text_to_speech(
            text=text,
            language_code=_bulbul_lang_code(lang),
            speaker=_BULBUL_SPEAKER,
            model=_BULBUL_MODEL,
            sample_rate=_BULBUL_SAMPLE_RATE,
        )
        raw = base64.b64decode(audio_b64)
        shard_dir = Path(out_dir) / shard_id
        shard_dir.mkdir(parents=True, exist_ok=True)
        path = shard_dir / f"{item_id}.wav"
        path.write_bytes(raw)
        return {
            "id": item_id, "text": text, "lang": lang,
            "path": str(path), "seconds": round(_wav_duration(raw), 3),
            "ok": True, "error": None,
        }
    except Exception as exc:  # per-item isolation — never kill the shard
        return {
            "id": item_id, "text": text, "lang": lang, "path": None,
            "seconds": None, "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
        }


async def render_scenario(
    scenario_id: str,
    out_dir: str = "results/sarvam",
    shard_id: Optional[str] = None,
    *,
    db: Optional[Session] = None,
) -> dict:
    """Pre-render every unrendered node of a scenario via Sarvam Bulbul.

    Render items: ``{id: node_id, text: devanagari (or gloss for hi/en nodes),
    lang: sa|hi|en}``.  On success each node's ``audio_url`` is set to the
    shard-relative file path (CDN-swappable).  If the renderer is unavailable
    (no API key) the pass is reported as ``skipped`` — this function never
    raises for renderer problems.

    Returns ``{status: "rendered"|"skipped", rendered, failed,
    shard_manifest_path}``.
    """
    own_session = db is None
    session = db or SessionLocal()
    try:
        scenario = session.get(DialogueScenario, scenario_id)
        if scenario is None:
            raise AuthoringNotFoundError(f"scenario {scenario_id!r} not found")

        shard = shard_id or scenario_id

        # Graceful skip BEFORE any disk side effects.
        renderer_ok, renderer_reason = bulbul_available()
        if not renderer_ok:
            return {
                "status": "skipped",
                "reason": f"Bulbul renderer unavailable: {renderer_reason}",
                "rendered": 0,
                "failed": [],
                "shard_manifest_path": "",
            }

        out = Path(out_dir)
        shard_dir = out / shard
        shard_dir.mkdir(parents=True, exist_ok=True)

        nodes = (
            session.query(DialogueNode)
            .filter(
                DialogueNode.scenario_id == scenario_id,
                # NULL-safe: audio_url's default is Python-side (no
                # server_default), so rows inserted outside the ORM carry NULL
                # and would be silently invisible to an == "" filter alone.
                or_(DialogueNode.audio_url == "", DialogueNode.audio_url.is_(None)),
            )
            .all()
        )
        items = [
            {
                "id": node.id,
                "text": node.devanagari if node.lang == "sa" else (node.gloss or node.devanagari),
                "lang": _LANG_MAP.get(node.lang, "sa"),
            }
            for node in nodes
        ]

        manifest_path = shard_dir / "manifest.json"
        if not items:
            return {
                "status": "rendered",
                "rendered": 0,
                "failed": [],
                "shard_manifest_path": "",
            }

        client = SarvamClient(api_key=settings.sarvam_api_key)
        results: list[dict] = []
        try:
            for item in items:
                results.append(await _render_item_bulbul(client, item, out, shard))
        except Exception as e:  # never raise — graceful skip per spec
            logger.warning("_render_item_bulbul failed: %s", type(e).__name__, exc_info=True)
            try:
                await client.close()
            except Exception:
                pass
            return {
                "status": "skipped",
                "reason": f"Bulbul render failed: {type(e).__name__}: {e}",
                "rendered": 0,
                "failed": [],
                "shard_manifest_path": "",
            }
        try:
            await client.close()
        except Exception:
            pass

        by_id = {n.id: n for n in nodes}
        rendered = 0
        failed: list[dict] = []
        manifest_items: list[dict] = []
        for r in results:
            node_id = str(r.get("id", ""))
            if r.get("ok") and r.get("path"):
                node = by_id.get(node_id)
                rel = os.path.relpath(str(r["path"]), str(out)).replace("\\", "/")
                if node is not None:
                    node.audio_url = rel
                    rendered += 1
                manifest_items.append(
                    {"id": node_id, "path": rel, "seconds": r.get("seconds")}
                )
            else:
                failed.append({"id": node_id, "error": r.get("error", "render failed")})

        if manifest_items:
            manifest_path.write_text(
                json.dumps(
                    {
                        "scenario_id": scenario_id,
                        "shard_id": shard,
                        "rendered": rendered,
                        "failed": failed,
                        "items": manifest_items,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
        else:
            manifest_path.write_text(
                json.dumps(
                    {"scenario_id": scenario_id, "shard_id": shard,
                     "rendered": 0, "failed": failed, "items": []},
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

        session.commit()
        return {
            "status": "rendered",
            "rendered": rendered,
            "failed": failed,
            "shard_manifest_path": str(manifest_path),
        }
    finally:
        if own_session:
            session.close()