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
    monkeypatch.setenv("CHALLENGE_CACHE_DIR", str(tmp_path / "cache"))
    _mock(monkeypatch, [[GOOD, BAD]])

    report = svc.author_challenge_batch(
        ["NOM.SG", "ACC.SG", "PRES.3SG"], "laukika", 2,
        cache=False, dry_run=False, db=None,
    )

    assert report["n_gated"] == 2
    assert report["n_passed"] == 1
    assert report["n_inserted"] == 1
    assert report["n_failed"] == 1


def test_dry_run_inserts_nothing():
    report = svc.author_challenge_batch([], "laukika", 10, dry_run=True)
    assert report["gate"] == "dry-run"
    assert report["n_inserted"] == 0


def test_insert_pass_stores_feature_derived_parses(client):
    db = SessionLocal()
    try:
        gated = svc.gate_challenge(dict(GOOD))
        assert gated["gate"] == "pass"
        cid = svc.insert_pass(db, dict(GOOD, **gated))
        row = db.query(Challenge).filter(Challenge.id == cid).one()
        assert row.accepted_parses, "persisted accepted_parses must be non-empty"
        # verify the parses actually grade the target "correct"
        from app.grading.engine import grade_attempt
        verdict = grade_attempt(GOOD["target_sanskrit"], row.accepted_parses, row.features or [])
        assert verdict["verdict"] == "correct"
        assert row.register == "laukika"
    finally:
        db.close()