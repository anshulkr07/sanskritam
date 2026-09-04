"""Tests for the challenge authoring service (P7-4).

Every LLM call is mocked, and the cache dir is pointed at a temp dir so no
test writes outside it. The real Vidyut analyzer runs on the canned targets —
that is the point of the gate. ``accepted_parses`` must always be derived from
analyzing the target, never hand-written.
"""

import json

import pytest

from app.db import SessionLocal
from app.evals.providers import LLMResponse
from app.models import Challenge
from app.services import challenge_authoring as svc

# Canned drafts: one that Vidyut can read confidently, one with a nonsense word.
GOOD = {
    "prompt_l1": "The boy goes to the forest.",
    "target_sanskrit": "बालः वनं गच्छति",
    "target_iast": "bālaḥ vanaṃ gacchati",
    "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
}
BAD = {
    "prompt_l1": "The boy eats a mountain.",
    "target_sanskrit": "बालः भद्रकल्प खादति",
    "target_iast": "bālaḥ bhadrakalpa khādati",
    "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
}


class _FakeProvider:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0
        self.label = "fake:test"

    async def complete(self, system, user, **kwargs):
        self.calls += 1
        return self.responses[min(self.calls - 1, len(self.responses) - 1)]


@pytest.fixture(autouse=True)
def _tmp_cache(tmp_path, monkeypatch):
    # Cache dir is read at import; point it at a temp dir BEFORE importing so
    # no test writes a cache file into the repo. Reimport after setting env.
    monkeypatch.setenv("CHALLENGE_CACHE_DIR", str(tmp_path / "cache"))
    import importlib
    importlib.reload(svc)


def _mock(monkeypatch, payloads):
    fake = _FakeProvider(
        [LLMResponse(text=json.dumps(p)) for p in payloads]
    )
    monkeypatch.setattr("app.services.challenge_authoring.build_provider", lambda _ref: fake)
    return fake


def test_extract_json_array_normalizes():
    arr = svc._extract_json_array(json.dumps([GOOD, BAD]))
    assert len(arr) == 2
    assert arr[0]["target_sanskrit"] == GOOD["target_sanskrit"]


def test_extract_json_array_skips_empty_targets():
    bad_empty = dict(GOOD, target_sanskrit="   ")
    arr = svc._extract_json_array(json.dumps([bad_empty, GOOD]))
    assert len(arr) == 1
    assert arr[0]["target_sanskrit"] == GOOD["target_sanskrit"]


def test_gate_pass_derives_accepted_parses():
    gated = svc.gate_challenge(dict(GOOD))
    assert gated["gate"] == "pass", gated.get("reason")
    assert gated["accepted_parses"], "accepted_parses must be derived, not empty"


def test_gate_rejects_unconfident_target():
    gated = svc.gate_challenge(dict(BAD))
    assert gated["gate"] == "fail"
    assert gated["accepted_parses"] == []


def test_gate_rejects_nonderived_claim():
    bogus = dict(GOOD, features=["PRES.2SG"])
    gated = svc.gate_challenge(bogus)
    assert gated["gate"] == "fail"
    assert "not derivable" in gated["reason"]


def test_draft_and_batch_insert_only_passes(client, monkeypatch, tmp_path):
    # client fixture runs init_db() so the `challenges` table exists.
    # Use a unique target so a shared session DB never sees this sentence before.
    good = dict(GOOD, target_sanskrit="अश्वः ग्रामं गच्छति", target_iast="aśvaḥ grāmaṃ gacchati")
    monkeypatch.setenv("CHALLENGE_CACHE_DIR", str(tmp_path / "cache"))
    _mock(monkeypatch, [[good, BAD]])

    report = svc.author_challenge_batch(
        ["NOM.SG", "ACC.SG", "PRES.3SG"], "laukika", 2,
        cache=False, dry_run=False, db=None,
    )

    assert report["n_gated"] == 2
    assert report["n_passed"] == 1
    assert report["n_inserted"] == 1
    assert report["n_distinct_new"] == 1
    assert report["n_failed"] == 1


def test_dry_run_inserts_nothing():
    report = svc.author_challenge_batch([], "laukika", 10, dry_run=True)
    assert report["gate"] == "dry-run"
    assert report["n_inserted"] == 0


def test_insert_pass_stores_feature_derived_parses(client):
    db = SessionLocal()
    try:
        good = dict(GOOD, target_sanskrit="बालः पुस्तकं पठति", target_iast="bālaḥ pustakaṃ paṭhati")
        gated = svc.gate_challenge(good)
        assert gated["gate"] == "pass"
        cid, inserted = svc.insert_pass(db, {**good, "accepted_parses": gated["accepted_parses"]})
        assert inserted is True
        row = db.query(Challenge).filter(Challenge.id == cid).one()
        assert row.accepted_parses, "persisted accepted_parses must be non-empty"
        # verify the parses actually grade the target "correct"
        from app.grading.engine import grade_attempt
        verdict = grade_attempt(good["target_sanskrit"], row.accepted_parses, row.features or [])
        assert verdict["verdict"] == "correct"
        assert row.register == "laukika"
        assert row.review_status == "pending", "generated challenges start pending (P7-11)"
    finally:
        db.close()


def test_insert_pass_skips_duplicate_target_register(client):
    """P7-10: a second insert of the same (target_sanskrit, register) is a
    skip (returns the existing id, inserted=False), not an error — a seed and
    a generated draft may legitimately collide."""
    db = SessionLocal()
    try:
        good = dict(GOOD, target_sanskrit="सीता फलं खादति", target_iast="sītā phalaṃ khādati")
        gated = svc.gate_challenge(good)
        assert gated["gate"] == "pass"
        cid, first = svc.insert_pass(db, {**good, "accepted_parses": gated["accepted_parses"]})
        assert first is True
        # Same target + register, different prompt/id claim → conflict-skip.
        gated2 = dict(good, prompt_l1="different prompt")
        cid2, second = svc.insert_pass(db, gated2)
        assert second is False
        assert cid2 == cid, "a duplicate skip must report the existing row's id"
        n_rows = db.query(Challenge).filter(
            Challenge.target_sanskrit == good["target_sanskrit"],
            Challenge.register == "laukika",
        ).count()
        assert n_rows == 1, "conflict-skip must not create a duplicate row"
    finally:
        db.close()


def test_author_batch_reports_distinct_new_and_skipped_dup(client, monkeypatch, tmp_path):
    """P7-10/§2.14: the batch report separates NEW distinct inserted from
    duplicates skipped, and an exhausted band reports 0 distinct loudly."""
    monkeypatch.setenv("CHALLENGE_CACHE_DIR", str(tmp_path / "cache"))
    # Unique target so this test is independent of other shared-DB tests.
    good = dict(GOOD, target_sanskrit="बालः नगरं गच्छति", target_iast="bālaḥ nagaraṃ gacchati")
    _mock(monkeypatch, [[good, BAD]])

    # First run: 1 pass inserted as a NEW distinct row.
    r1 = svc.author_challenge_batch(
        ["NOM.SG", "ACC.SG", "PRES.3SG"], "laukika", 2,
        cache=False, dry_run=False, db=None,
    )
    assert r1["n_passed"] == 1
    assert r1["n_distinct_new"] == 1
    assert r1["n_skipped_dup"] == 0

    # Second run over the same band: the cached draft is a duplicate → skipped.
    r2 = svc.author_challenge_batch(
        ["NOM.SG", "ACC.SG", "PRES.3SG"], "laukika", 2,
        cache=False, dry_run=False, db=None,
    )
    assert r2["n_passed"] == 1
    assert r2["n_distinct_new"] == 0, "re-running an exhausted band adds 0 distinct rows"
    assert r2["n_skipped_dup"] == 1


def test_cache_key_varies_by_item_index():
    """P7-10: the cache key carries the per-item index, so two slots in the same
    group resolve to different cache files rather than one cached draft."""
    k0 = svc._brief_key(["NOM.SG"], "laukika", 5, 0)
    k1 = svc._brief_key(["NOM.SG"], "laukika", 5, 1)
    assert k0 != k1, "per-item index must change the cache key"
    assert svc._cache_path(["NOM.SG"], "laukika", 5, "sarvam:x", 0) != \
           svc._cache_path(["NOM.SG"], "laukika", 5, "sarvam:x", 1)