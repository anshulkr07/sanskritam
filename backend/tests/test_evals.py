"""Tests for the LLM eval harness. No network: every provider here is a fake.

The important assertions are the ones that pin the scorer's behaviour on known
inputs — the gold sentence must score 1.0 and a corrupted one must not — because
a scorer that silently drifts makes every leaderboard it produces meaningless.
"""

import asyncio
import json

import pytest

from app.evals.providers import (
    PRICING_INR_PER_1M,
    LLMResponse,
    Provider,
    ProviderSpec,
    build_provider,
)
from app.evals.runner import run_suite
from app.evals.scorers import extract_json, score_case
from app.evals.tasks import build_cases, build_corruption
from app.grading.analyzer import analyze_sentence
from app.seeds.challenges import SEED_CHALLENGES


# ─── Fakes ───

class ScriptedProvider(Provider):
    """Returns a canned reply per case id (or a default), never touching HTTP."""

    def __init__(self, replies: dict, default: str = "{}", name: str = "fake"):
        spec = ProviderSpec(base_url="http://invalid", env_key="FAKE_KEY",
                            default_model="fake-1")
        super().__init__(name, spec, api_key="test-key")
        self._replies = replies
        self._default = default
        self.calls = 0

    async def complete(self, system, user, *, temperature=0.0, max_tokens=512,
                       json_mode=False):
        self.calls += 1
        for needle, reply in self._replies.items():
            if needle in user:
                text = reply
                break
        else:
            text = self._default
        return LLMResponse(text=text, prompt_tokens=100, completion_tokens=20,
                           latency_ms=12.0, model=self.model, provider=self.name)


# ─── Corruption generation ───

def test_corruptions_are_derivable_for_most_seeds():
    derived = [c for c in (build_corruption(ch) for ch in SEED_CHALLENGES) if c]
    assert len(derived) >= 25, f"only {len(derived)} corruptions from {len(SEED_CHALLENGES)} seeds"


def test_corruption_is_wrong_in_exactly_one_known_way():
    for ch in SEED_CHALLENGES:
        c = build_corruption(ch)
        if c is None:
            continue
        # The corrupted word must parse, and must NOT carry the gold feature.
        results = analyze_sentence(c["word"])
        assert len(results) == 1 and results[0].is_confident, c
        readings = [results[0].parsed] + list(results[0].alternatives)
        feats = {f for r in readings for f in r.values()}
        assert c["gold_feature"] not in feats, c
        assert c["wrong_feature"] in feats, c
        # Exactly one word differs from the original.
        orig = ch["target_iast"].replace(".", "").split()
        new = c["text"].split()
        assert len(orig) == len(new)
        assert sum(a != b for a, b in zip(orig, new)) == 1, c


def test_corruption_is_deterministic_across_calls():
    ch = next(c for c in SEED_CHALLENGES if build_corruption(c))
    assert build_corruption(ch) == build_corruption(ch)


def test_corruptions_cover_more_than_one_error_type():
    kinds = {
        f"{c['gold_feature']}->{c['wrong_feature']}"
        for c in (build_corruption(ch) for ch in SEED_CHALLENGES) if c
    }
    # A single dominant error type would let a model score well by guessing.
    assert len(kinds) >= 5, kinds


# ─── Case building ───

def test_build_cases_for_every_task():
    cases = build_cases(["generate", "diagnose", "translate"])
    tasks = {c.task for c in cases}
    assert tasks == {"generate", "diagnose", "translate"}
    assert all(c.system and c.user for c in cases)


def test_diagnose_has_both_controls_and_errors():
    cases = build_cases(["diagnose"])
    kinds = [c.meta["kind"] for c in cases]
    assert kinds.count("control") >= 30
    assert kinds.count("error") >= 25


def test_unknown_task_rejected():
    with pytest.raises(ValueError, match="Unknown task"):
        build_cases(["nonsense"])


# ─── JSON extraction ───

@pytest.mark.parametrize("raw", [
    '{"sanskrit": "रामः फलम् खादति"}',
    '```json\n{"sanskrit": "रामः फलम् खादति"}\n```',
    'Sure! Here you go:\n{"sanskrit": "रामः फलम् खादति"}\nHope that helps.',
])
def test_extract_json_survives_common_wrappers(raw):
    assert extract_json(raw)["sanskrit"] == "रामः फलम् खादति"


def test_extract_json_returns_none_on_prose():
    assert extract_json("I cannot answer that.") is None


# ─── generate scoring ───

def test_gold_sentence_scores_perfectly():
    ch = SEED_CHALLENGES[0]
    case = build_cases(["generate"], challenges=[ch])[0]
    reply = json.dumps({"sanskrit": ch["target_sanskrit"]}, ensure_ascii=False)
    sc = score_case(case, reply)
    assert sc.metrics["gate_pass"] == 1.0
    assert sc.metrics["feature_match_full"] == 1.0
    assert sc.metrics["exact_match"] == 1.0


def test_gibberish_fails_the_gate():
    case = build_cases(["generate"], challenges=[SEED_CHALLENGES[0]])[0]
    sc = score_case(case, json.dumps({"sanskrit": "zzz qqq wwww"}))
    assert sc.metrics["gate_pass"] == 0.0
    assert sc.metrics["exact_match"] == 0.0


def test_empty_reply_is_scored_not_crashed():
    case = build_cases(["generate"], challenges=[SEED_CHALLENGES[0]])[0]
    sc = score_case(case, "")
    assert sc.metrics["gate_pass"] == 0.0
    assert sc.parse_error


# ─── diagnose scoring ───

def test_control_case_not_flagged_scores_clean():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "control")
    sc = score_case(case, json.dumps({"correct": True, "word": "", "expected_feature": ""}))
    assert sc.metrics["verdict_correct"] == 1.0
    assert sc.metrics["false_accusation"] == 0.0


def test_control_case_flagged_counts_as_false_accusation():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "control")
    sc = score_case(case, json.dumps({"correct": False, "word": "x", "expected_feature": "ACC.SG"}))
    assert sc.metrics["false_accusation"] == 1.0


def test_perfect_diagnosis_scores_full():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "error")
    sc = score_case(case, json.dumps({
        "correct": False,
        "word": case.gold["word_iast"],
        "expected_feature": case.gold["expected_feature"],
        "explanation": "wrong case",
    }, ensure_ascii=False))
    assert sc.metrics["full_diagnosis"] == 1.0


def test_diagnosis_in_devanagari_still_matches():
    """Models answer in either script; the scorer must not punish that."""
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "error")
    sc = score_case(case, json.dumps({
        "correct": False,
        "word": case.gold["word_devanagari"],
        "expected_feature": case.gold["expected_feature"],
    }, ensure_ascii=False))
    assert sc.metrics["word_correct"] == 1.0
    assert sc.metrics["full_diagnosis"] == 1.0


def test_missed_error_scores_zero():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "error")
    sc = score_case(case, json.dumps({"correct": True}))
    assert sc.metrics["error_detected"] == 0.0
    assert sc.metrics["full_diagnosis"] == 0.0


def test_right_error_wrong_fix_gets_partial_credit_only():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "error")
    sc = score_case(case, json.dumps({
        "correct": False,
        "word": case.gold["word_iast"],
        "expected_feature": "VOC.PL",  # detected, but names the wrong fix
    }, ensure_ascii=False))
    assert sc.metrics["error_detected"] == 1.0
    assert sc.metrics["word_correct"] == 1.0
    assert sc.metrics["feature_correct"] == 0.0
    assert sc.metrics["full_diagnosis"] == 0.0


def test_long_form_feature_names_are_normalized():
    case = next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "error")
    expected = case.gold["expected_feature"]           # e.g. "NOM.SG"
    spelled = {"NOM": "nominative", "ACC": "accusative", "INSTR": "instrumental",
               "DAT": "dative", "ABL": "ablative", "GEN": "genitive",
               "LOC": "locative", "VOC": "vocative"}
    number = {"SG": "singular", "DU": "dual", "PL": "plural"}
    case_part, _, num_part = expected.partition(".")
    verbose = f"{spelled.get(case_part, case_part)} {number.get(num_part, num_part)}"
    sc = score_case(case, json.dumps({
        "correct": False, "word": case.gold["word_iast"], "expected_feature": verbose,
    }, ensure_ascii=False))
    assert sc.metrics["feature_correct"] == 1.0


# ─── translate scoring ───

def test_exact_translation_scores_one():
    ch = SEED_CHALLENGES[0]
    case = build_cases(["translate"], challenges=[ch])[0]
    sc = score_case(case, json.dumps({"english": ch["prompt_l1"]}))
    assert sc.metrics["content_f1"] == pytest.approx(1.0)


def test_unrelated_translation_scores_zero():
    case = build_cases(["translate"], challenges=[SEED_CHALLENGES[0]])[0]
    sc = score_case(case, json.dumps({"english": "quantum mechanics is difficult"}))
    assert sc.metrics["content_f1"] == 0.0


# ─── providers ───

def test_build_provider_parses_model_override():
    p = build_provider("sarvam:sarvam-30b")
    assert p.name == "sarvam" and p.model == "sarvam-30b"


def test_build_provider_defaults_model():
    assert build_provider("sarvam").model == "sarvam-105b"


def test_build_provider_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown provider"):
        build_provider("nope")


def test_sarvam_sends_both_auth_headers():
    """Sarvam documents api-subscription-key and accepts Bearer; send both."""
    p = build_provider("sarvam", api_key="sk_test")
    h = p._headers()
    assert h["api-subscription-key"] == "sk_test"
    assert h["Authorization"] == "Bearer sk_test"


def test_anthropic_uses_x_api_key():
    h = build_provider("anthropic", api_key="sk-ant").  _headers()
    assert h["x-api-key"] == "sk-ant"
    assert "Authorization" not in h


def test_unconfigured_provider_reports_error_not_crash():
    p = build_provider("gemini", api_key="")
    p._api_key = ""
    resp = asyncio.run(p.complete("sys", "user"))
    assert not resp.ok and "GEMINI_API_KEY" in resp.error


def test_cost_uses_pricing_table():
    p = build_provider("sarvam:sarvam-105b", api_key="k")
    pin, pout = PRICING_INR_PER_1M["sarvam-105b"]
    assert p.cost_inr(1_000_000, 0) == pytest.approx(pin)
    assert p.cost_inr(0, 1_000_000) == pytest.approx(pout)


def test_unknown_model_still_costs_something():
    """A silent zero would make an unpriced model look free and win the table."""
    p = build_provider("sarvam:some-unreleased-model", api_key="k")
    assert p.cost_inr(1_000_000, 1_000_000) > 0


# ─── runner ───

def test_run_suite_scores_a_perfect_provider():
    ch = SEED_CHALLENGES[0]
    cases = build_cases(["generate"], challenges=[ch])
    provider = ScriptedProvider(
        {ch["prompt_l1"]: json.dumps({"sanskrit": ch["target_sanskrit"]},
                                     ensure_ascii=False)}
    )
    summaries, records = asyncio.run(
        run_suite([provider], cases, cache_dir=None, concurrency=2)
    )
    assert len(records) == 1
    s = summaries[0]
    assert s.per_task["generate"]["gate_pass"] == 1.0
    assert s.per_task["generate"]["exact_match"] == 1.0
    assert s.n_errors == 0
    assert s.cost_inr > 0


def test_run_suite_handles_a_useless_provider():
    cases = build_cases(["generate"], limit=3)
    provider = ScriptedProvider({}, default='{"sanskrit": "zzz qqq"}')
    summaries, records = asyncio.run(
        run_suite([provider], cases, cache_dir=None, concurrency=2)
    )
    assert summaries[0].per_task["generate"]["gate_pass"] == 0.0
    assert len(records) == 3


def test_cost_per_accepted_penalises_gate_failures():
    """Two models, same token spend, different gate pass rates: the one that
    fails more must show a higher cost per usable sentence."""
    challenges = SEED_CHALLENGES[:4]
    cases = build_cases(["generate"], challenges=challenges)

    good = ScriptedProvider({
        ch["prompt_l1"]: json.dumps({"sanskrit": ch["target_sanskrit"]},
                                    ensure_ascii=False)
        for ch in challenges
    }, name="good")
    half = ScriptedProvider({
        ch["prompt_l1"]: json.dumps(
            {"sanskrit": ch["target_sanskrit"] if i % 2 == 0 else "zzz qqq"},
            ensure_ascii=False)
        for i, ch in enumerate(challenges)
    }, name="half")

    summaries, _ = asyncio.run(run_suite([good, half], cases, cache_dir=None))
    by_name = {s.provider: s for s in summaries}
    assert by_name["good"].cost_per_accepted_inr < by_name["half"].cost_per_accepted_inr


def test_summarize_counts_api_failures_separately():
    cases = build_cases(["generate"], limit=2)

    class Broken(ScriptedProvider):
        async def complete(self, *a, **kw):
            return LLMResponse(provider=self.name, model=self.model,
                               error="HTTP 500: boom")

    summaries, records = asyncio.run(
        run_suite([Broken({})], cases, cache_dir=None, retries=0)
    )
    assert summaries[0].n_errors == 2
    assert all(r.score is None for r in records)


def test_response_cache_avoids_a_second_call(tmp_path):
    ch = SEED_CHALLENGES[0]
    cases = build_cases(["generate"], challenges=[ch])
    reply = json.dumps({"sanskrit": ch["target_sanskrit"]}, ensure_ascii=False)

    p1 = ScriptedProvider({ch["prompt_l1"]: reply})
    asyncio.run(run_suite([p1], cases, cache_dir=str(tmp_path)))
    assert p1.calls == 1

    p2 = ScriptedProvider({ch["prompt_l1"]: reply})
    summaries, _ = asyncio.run(run_suite([p2], cases, cache_dir=str(tmp_path)))
    assert p2.calls == 0, "second run should have been served from cache"
    assert summaries[0].per_task["generate"]["gate_pass"] == 1.0


def test_failures_are_not_cached(tmp_path):
    """A transient 500 must not freeze a model at zero on every future run."""
    cases = build_cases(["generate"], challenges=[SEED_CHALLENGES[0]])

    class Broken(ScriptedProvider):
        async def complete(self, *a, **kw):
            self.calls += 1
            return LLMResponse(provider=self.name, model=self.model,
                               error="HTTP 500: boom")

    b = Broken({})
    asyncio.run(run_suite([b], cases, cache_dir=str(tmp_path), retries=0))
    b2 = Broken({})
    asyncio.run(run_suite([b2], cases, cache_dir=str(tmp_path), retries=0))
    assert b2.calls == 1, "failed responses must not be served from cache"


def test_ambiguous_but_correct_forms_are_not_penalised():
    """Neuter a-stems are syncretic: `phalam` is both NOM.SG and ACC.SG, and the
    analyzer reports one reading as primary and the other as an alternative.
    Scoring only the primary reading marked correct Sanskrit as wrong — the same
    false-accusation failure the grading engine abstains to avoid. Regression."""
    ch = next(c for c in SEED_CHALLENGES
              if "ACC.SG" in (c.get("features") or []) and "फलम्" in c["target_sanskrit"])
    case = build_cases(["generate"], challenges=[ch])[0]
    sc = score_case(case, json.dumps({"sanskrit": ch["target_sanskrit"]},
                                     ensure_ascii=False))
    assert sc.metrics["feature_match_full"] == 1.0
    assert sc.metrics["exact_match"] == 1.0


# ─── cache keys and pricing for aggregator model ids ───

def test_cache_key_has_no_path_separator():
    """OpenRouter ids contain a slash (google/gemini-2.5-flash). Unsanitised, the
    cache path became a nested directory that did not exist, the write failed as a
    swallowed OSError, and every rerun silently re-spent money. Regression."""
    from app.evals.runner import _cache_key
    p = build_provider("openrouter", api_key="k")
    key = _cache_key(p, build_cases(["generate"], limit=1)[0])
    assert "/" not in key and "\\" not in key


def test_slashed_model_ids_actually_cache(tmp_path):
    ch = SEED_CHALLENGES[0]
    cases = build_cases(["generate"], challenges=[ch])
    reply = json.dumps({"sanskrit": ch["target_sanskrit"]}, ensure_ascii=False)

    class Slashed(ScriptedProvider):
        def __init__(self):
            super().__init__({ch["prompt_l1"]: reply}, name="openrouter")
            self.model = "google/gemini-2.5-flash"

    first = Slashed()
    asyncio.run(run_suite([first], cases, cache_dir=str(tmp_path)))
    assert first.calls == 1
    second = Slashed()
    asyncio.run(run_suite([second], cases, cache_dir=str(tmp_path)))
    assert second.calls == 0, "slashed model id must still hit the cache"


def test_price_resolves_aggregator_prefixed_ids():
    from app.evals.providers import price_for
    assert price_for("google/gemini-2.5-flash") == PRICING_INR_PER_1M["gemini-2.5-flash"]
    assert price_for("openai/gpt-4o-mini:free") == PRICING_INR_PER_1M["gpt-4o-mini"]


def test_fully_cached_run_reports_no_live_latency(tmp_path):
    """A cached provider showed p50 = 0 ms, which reads as 'instant' rather than
    'not measured'. The report must distinguish the two."""
    from app.evals.report import render_leaderboard
    ch = SEED_CHALLENGES[0]
    cases = build_cases(["generate"], challenges=[ch])
    reply = json.dumps({"sanskrit": ch["target_sanskrit"]}, ensure_ascii=False)

    asyncio.run(run_suite([ScriptedProvider({ch["prompt_l1"]: reply})], cases,
                          cache_dir=str(tmp_path)))
    summaries, _ = asyncio.run(
        run_suite([ScriptedProvider({ch["prompt_l1"]: reply})], cases,
                  cache_dir=str(tmp_path))
    )
    assert summaries[0].n_live == 0
    assert "cache" in render_leaderboard(summaries)


# ─── truncation accounting ───

def test_truncated_calls_lower_yield_without_flattering_quality():
    """A model whose calls truncate was scored only on the ones it finished —
    survivorship bias that flatters exactly the models failing most. Quality
    columns still average over completed replies, but `yield_rate` exposes the
    denominator. Regression."""
    challenges = SEED_CHALLENGES[:4]
    cases = build_cases(["generate"], challenges=challenges)

    class HalfTruncating(ScriptedProvider):
        """Perfect Sanskrit when it answers; truncates on every other call."""
        async def complete(self, system, user, **kw):
            self.calls += 1
            if self.calls % 2 == 0:
                return LLMResponse(provider=self.name, model=self.model,
                                   prompt_tokens=150, completion_tokens=4096,
                                   error="Empty response (truncated by max_tokens limit)")
            ch = next(c for c in challenges if c["prompt_l1"] in user)
            return LLMResponse(
                text=json.dumps({"sanskrit": ch["target_sanskrit"]}, ensure_ascii=False),
                prompt_tokens=150, completion_tokens=60,
                model=self.model, provider=self.name)

    summaries, _ = asyncio.run(
        run_suite([HalfTruncating({})], cases, cache_dir=None,
                  concurrency=1, retries=0)
    )
    gen = summaries[0].per_task["generate"]
    assert gen["gate_pass"] == 1.0, "completed replies were all valid"
    assert gen["yield_rate"] == 0.5, "but only half the calls returned anything"
    assert gen["_n_total"] == 4


def test_truncated_calls_still_cost_money():
    """A truncated reply burned a full max_tokens of generation and was billed
    for it. Recording it as free understated real spend by roughly half."""
    cases = build_cases(["generate"], limit=2)

    class Truncating(ScriptedProvider):
        async def complete(self, system, user, **kw):
            self.calls += 1
            return LLMResponse(provider=self.name, model=self.model,
                               prompt_tokens=150, completion_tokens=4096,
                               error="Empty response (truncated by max_tokens limit)")

    summaries, records = asyncio.run(
        run_suite([Truncating({})], cases, cache_dir=None, retries=0)
    )
    assert summaries[0].n_errors == 2
    assert summaries[0].cost_inr > 0, "failed calls must still be charged"
    assert all(r.cost_inr > 0 for r in records)


def test_task_with_total_failure_still_appears():
    """If every call for a task failed, the task must not vanish from the table."""
    cases = build_cases(["generate"], limit=2)

    class Dead(ScriptedProvider):
        async def complete(self, *a, **kw):
            return LLMResponse(provider=self.name, model=self.model,
                               error="HTTP 500: boom")

    summaries, _ = asyncio.run(run_suite([Dead({})], cases, cache_dir=None, retries=0))
    assert "generate" in summaries[0].per_task
    assert summaries[0].per_task["generate"]["yield_rate"] == 0.0


# ─── reply-format tolerance in diagnose ───

def _control_case():
    return next(c for c in build_cases(["diagnose"]) if c.meta["kind"] == "control")


def test_capitalised_json_keys_are_not_a_false_accusation():
    """Sarvam answered {"Correct": true, "Expected Feature": ""}. Matching only
    the documented lowercase spelling scored that as accusing a correct learner —
    a scorer bug that was indistinguishable from a model defect. Regression."""
    sc = score_case(_control_case(), json.dumps({
        "Correct": True, "Word": "", "Expected Feature": "",
        "Explanation": "The sentence is correct.",
    }))
    assert sc.metrics["false_accusation"] == 0.0
    assert sc.metrics["verdict_correct"] == 1.0


def test_missing_verdict_key_infers_intent_and_flags_schema_violation():
    """Sarvam emitted a literal `"{"` as the key name. Intent is unambiguous —
    no word, no feature, explanation says correct — so score the Sanskrit on
    intent but record the formatting defect separately."""
    sc = score_case(_control_case(), json.dumps({
        "{": True, "word": "", "expected_feature": "",
        "explanation": "The sentence is correct.",
    }))
    assert sc.metrics["schema_violation"] == 1.0
    assert sc.metrics["false_accusation"] == 0.0


def test_missing_verdict_key_with_a_named_word_still_reads_as_an_accusation():
    """The inference must not let every malformed reply count as 'said correct'."""
    sc = score_case(_control_case(), json.dumps({
        "{": False, "word": "ग्रामम्", "expected_feature": "LOC.SG",
    }, ensure_ascii=False))
    assert sc.metrics["schema_violation"] == 1.0
    assert sc.metrics["false_accusation"] == 1.0


def test_well_formed_reply_records_no_schema_violation():
    sc = score_case(_control_case(), json.dumps({"correct": True, "word": ""}))
    assert sc.metrics["schema_violation"] == 0.0


def test_control_detail_keeps_the_models_reasoning():
    """A false accusation has to be readable from the score alone, without
    re-deriving it from the raw JSONL."""
    sc = score_case(_control_case(), json.dumps({
        "correct": False, "word": "ग्रामम्", "expected_feature": "LOC.SG",
        "explanation": "The destination requires the locative.",
    }, ensure_ascii=False))
    assert sc.detail["pred_word"] == "ग्रामम्"
    assert "locative" in sc.detail["explanation"]
