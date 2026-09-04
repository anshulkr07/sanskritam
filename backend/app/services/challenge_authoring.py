"""Challenge authoring pipeline (P7-4): draft -> Vidyut gate -> persist.

Reuses the scenario-authoring patterns from ``services/authoring.py``:
the same LLM provider routing (Sarvam conversations for non-dual, Gemini via
OpenRouter for dual-bearing bands), the same on-disk cache, and the same
Vidyut-backed gate that builds ``accepted_parses`` by *analyzing the target*
(run-time derivation, never hand-authored -- free word order would silently
break otherwise).

Each challenge is drafted as one LLM call returning a JSON object
``{prompt_l1, target_sanskrit, target_iast, features}``. It is then gated:
``accepted_parses`` comes from the Vidyut reading (plus variants), and the
draft survives only when the analyzer is confident and every claimed feature
is derivable. Passes are inserted into ``challenges``; failures feed the
authoring backlog.

No network in tests: providers are mocked, cache dir is overridable.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.evals.providers import build_provider
from app.grading.analyzer import (
    analyze_sentence,
    feature_set_from_results,
    feature_set_variants,
    is_confident,
)
from app.models import Challenge

logger = logging.getLogger("shabd.challenge_authoring")

CONVERSATIONS_MODEL = "sarvam-105b-conversations"
DUAL_MODEL = "openrouter:google/gemini-2.5-flash"

_CACHE_DIR = os.environ.get(
    "CHALLENGE_CACHE_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".challenge-cache"),
)


def _brief_key(band_features, register, n) -> str:
    h = hashlib.sha256()
    h.update(json.dumps(sorted(band_features), ensure_ascii=False).encode("utf-8"))
    h.update(b"\0")
    h.update(register.encode("utf-8"))
    h.update(b"\0")
    h.update(str(n).encode("utf-8"))
    # Include a hash of the drafting prompt so a prompt change invalidates
    # otherwise-identical cached drafts (a prompt edit must not silently replay
    # old, differently-prompted output — the authoring-cache has the same rule).
    h.update(b"\0")
    h.update(hashlib.sha256(_SYSTEM_PROMPT.encode("utf-8")).hexdigest().encode("utf-8"))
    return h.hexdigest()[:16]


def _cache_path(band_features, register, n, provider) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", provider)
    return Path(_CACHE_DIR) / f"challenges-{safe}-{_brief_key(band_features, register, n)}.json"


def _cache_load(band_features, register, n, provider) -> Optional[list[dict]]:
    path = _cache_path(band_features, register, n, provider)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if isinstance(data, list) and data:
        logger.info("challenge cache hit: %s", path.name)
        return data
    return None


def _cache_store(band_features, register, n, provider, drafts) -> None:
    if not drafts:
        return
    try:
        path = _cache_path(band_features, register, n, provider)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(drafts, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError as e:
        logger.debug("challenge cache write failed: %s", e)


# --- drafting -------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are the challenge author for Shabd, a Sanskrit-as-a-second-language app. "
    "You write single-sentence practice challenges.\n\n"
    "Return ONLY a JSON object, no prose, no markdown fences, with exactly these keys:\n"
    '- "prompt_l1": str - an English prompt telling the learner what to say in Sanskrit\n'
    '- "target_sanskrit": str - the correct sentence in Devanagari, 3-7 words\n'
    '- "target_iast": str - IAST transliteration of the target sentence\n'
    '- "features": list[str] - feature ids actually present in target_sanskrit\n\n'
    "Allowed feature ids (CLOSED SET, never invent, alter, or abbreviate one): {allowed}\n"
    "Register: {register}. Write natural grammatical Sanskrit with correct sandhi. "
    "Aim to exercise SEVERAL of the allowed features in the sentence, and use "
    "familiar everyday words; make this specific sentence DIFFERENT from the ones "
    "you have already drafted today.\n\n"
    "CRITICAL - claim features HONESTLY: list in 'features' ONLY the feature ids "
    "that are genuinely and unambiguously present in the exact sentence you "
    "wrote. Do NOT claim a feature just because it is in the allowed set or "
    "because the genre 'always has' it. A sentence with a stated subject "
    "genuinely has its case and number; a copula usually has NOM; a transitive "
    "verb has ACC on the object and the verb's person/number. If you cannot "
    "honestly attribute a feature to the sentence, omit it rather than invent it."
)


def _extract_json_array(text: str) -> list[dict]:
    t = text.strip()
    t = re.sub(r"^```[a-zA-Z]*\s*", "", t)
    t = re.sub(r"\s*```$", "", t)
    try:
        data = json.loads(t)
    except ValueError:
        start, end = t.find("["), t.rfind("]")
        if start == -1 or end <= start:
            raise ValueError("challenge response contained no JSON array")
        try:
            data = json.loads(t[start : end + 1])
        except ValueError as e:
            raise ValueError(f"challenge response was not valid JSON: {e}") from e
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise ValueError("challenge response JSON was not an array")
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        target = str(item.get("target_sanskrit", "")).strip()
        if not target:
            continue
        out.append(
            {
                "prompt_l1": str(item.get("prompt_l1", "")).strip(),
                "target_sanskrit": target,
                "target_iast": str(item.get("target_iast", "")).strip(),
                "features": [str(f) for f in (item.get("features") or [])],
            }
        )
    if not out:
        raise ValueError("challenge draft produced no usable challenges")
    return out


async def draft_challenges(
    band_features,
    register,
    n,
    *,
    cache: bool = True,
) -> list[dict]:
    """Draft ``n`` single-sentence challenges, one LLM call each.

    One call per challenge (matching the ₹0.0055/call cost model — 500 targets
    is ~₹2.75) instead of asking for a whole array at once: Sarvam's
    conversational model reliably returns exactly one object even when asked
    for many, and a single-object call has no partial-fill failure mode. Each
    call asks for a *new* sentence, so the batch accumulates distinct targets.
    Dual-bearing bands route to Gemini via OpenRouter.

    Drafts are cached on disk keyed by band + register + count + prompt hash,
    so re-running is deterministic and a replay costs ₹0."""
    has_dual = any("DU" in f for f in band_features)
    provider_cfg = DUAL_MODEL if has_dual else f"sarvam:{CONVERSATIONS_MODEL}"

    if cache:
        hit = _cache_load(band_features, register, n, provider_cfg)
        if hit is not None:
            return hit

    provider = build_provider(provider_cfg)
    system = _SYSTEM_PROMPT.format(
        allowed=", ".join(band_features) or "(derive freely)",
        register=register,
    )
    user = (
        f"Write ONE single-sentence challenge for the {register} register. "
        f"Exercise: {', '.join(band_features)}. "
        f'Return ONE JSON object with keys prompt_l1, target_sanskrit, target_iast, features.'
    )

    async def _call_once() -> list[dict]:
        resp = await provider.complete(system, user, json_mode=True, max_tokens=512)
        if not resp.ok:
            raise ValueError(f"challenge draft failed: {resp.error or 'empty response'}")
        return _extract_json_array(resp.text)

    drafts: list[dict] = []
    target = max(1, int(n))
    # Bound the total effort: at most ~3 retries per wanted slot, then keep
    # whatever genuinely-drafted distinct sentences we have (a partial set is
    # far better than an infinite loop against a flaky provider).
    max_calls = target * 3 + 3
    calls = 0
    while len(drafts) < target and calls < max_calls:
        calls += 1
        try:
            candidate = await _call_once()
        except ValueError:
            candidate = []
        if not candidate:
            if len(drafts) == 0:
                break
            continue
        drafts.extend(candidate)
    if not drafts:
        raise ValueError("draft produced no usable challenges")
    if cache:
        _cache_store(band_features, register, n, provider_cfg, drafts)
    return drafts


# --- gating ----------------------------------------------------------------

def _feature_values(parses) -> set[str]:
    vals = set()
    for p in parses:
        vals.update(str(v) for v in p.values())
    return vals


def _missing_claimed(claimed, parses) -> list[str]:
    values = _feature_values(parses)
    missing = []
    for c in claimed or []:
        c = str(c).strip()
        if not c:
            continue
        if c in values or any(v.startswith(c + ".") for v in values):
            continue
        missing.append(c)
    return missing


def gate_challenge(draft: dict) -> dict:
    text = str(draft.get("target_sanskrit", "")).strip()
    if not text:
        return {**draft, "gate": "fail", "accepted_parses": [], "reason": "empty target"}
    try:
        results = analyze_sentence(text)
    except Exception as e:
        logger.warning("analyzer raised for %r: %s", text, e)
        results = []
    if not is_confident(results):
        return {**draft, "gate": "fail", "accepted_parses": [], "reason": "analyzer not confident"}
    parses = feature_set_variants(results) or [feature_set_from_results(results)]
    missing = _missing_claimed(draft.get("features"), parses)
    if missing:
        return {**draft, "gate": "fail", "accepted_parses": [], "reason": f"claimed features not derivable: {sorted(missing)}"}
    return {**draft, "gate": "pass", "accepted_parses": parses, "reason": ""}


def insert_pass(db: Session, draft: dict) -> str:
    challenge = Challenge(
        id=uuid.uuid4().hex[:16],
        prompt_l1=draft.get("prompt_l1", ""),
        prompt_lang="en",
        target_sanskrit=draft.get("target_sanskrit", ""),
        target_iast=draft.get("target_iast", ""),
        features=draft.get("features", []),
        accepted_parses=draft.get("accepted_parses", []),
        register=draft.get("register", "laukika"),
    )
    db.add(challenge)
    db.commit()
    return challenge.id


def author_challenge_batch(
    band_features,
    register,
    n,
    *,
    cache: bool = True,
    dry_run: bool = False,
    db: Optional[Session] = None,
) -> dict:
    """Draft, gate, and persist ``n`` challenges for one band + register.

    Used by ``scripts/challenge_batch.py``. When ``dry_run`` is True, only the
    target count is returned (no network, no DB writes). Otherwise drafts are
    gated via Vidyut and only passes are inserted. ``register`` is stamped onto
    each pass so persisted rows carry it.
    """
    if dry_run:
        return {"n_target": n, "n_gated": 0, "n_passed": 0, "n_inserted": 0,
                "n_failed": 0, "gate": "dry-run"}
    import asyncio
    drafts = asyncio.run(draft_challenges(band_features, register, n, cache=cache))
    gated = [gate_challenge(d) for d in drafts]
    passed = [g for g in gated if g["gate"] == "pass"]
    n_inserted = 0
    own_session = db is None
    engine = SessionLocal() if own_session else db
    try:
        for g in passed:
            g["register"] = register
            insert_pass(engine, g)
            n_inserted += 1
    finally:
        if own_session:
            engine.close()
    return {
        "n_target": n,
        "n_gated": len(gated),
        "n_passed": len(passed),
        "n_inserted": n_inserted,
        "n_failed": len(gated) - len(passed),
    }