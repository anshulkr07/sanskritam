"""Tests for the authoring pipeline (Sarvam draft → Vidyut gate → Bulbul render).

Every LLM call is mocked — no network in pytest.  The real analyzer
(conftest sets ANALYZER=vidyut) runs against the canned drafts, which is the
point of the gate.  Async service functions are driven with ``asyncio.run``
(no pytest-asyncio plugin in this repo).
"""

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from app.config import settings
from app.db import SessionLocal
from app.evals.providers import LLMResponse
from app.grading.engine import grade_attempt
from app.models import DialogueEdge, DialogueNode, DialogueScenario
from app.services.authoring import (
    AuthoringConflictError,
    AuthoringNotFoundError,
    draft_turns,
    gate_drafts,
    render_scenario,
    run_authoring,
)

ADMIN = {"X-Admin-Token": "test-admin"}

BRIEF = {
    "title": "बाज़ार में (at the market)",
    "register": "laukika",
    "ratio_band": {"min": 0.3, "max": 0.5},
    "bridge_lang": "hi",
    "topic": "buying fruit at the market",
    "sample_features": ["ACC.SG", "PRES.1SG"],
}

# Canned drafts: 1 clean, 1 with an invented word, 1 dual-bearing (with_dual only).
CLEAN_DRAFT = {
    "devanagari": "नमस्ते! किं त्वं इच्छसि?",
    "iast": "namaste! kiṃ tvaṃ icchasi?",
    "gloss_en": "Hello! What do you want?",
    "expected_learner_sanskrit": "अहं फलं खादामि",
    "features": ["ACC", "PRES.1SG"],
}

MADEUP_DRAFT = {
    "devanagari": "किं भवान् करोति?",
    "iast": "kiṃ bhavān karoti?",
    "gloss_en": "What are you doing?",
    "expected_learner_sanskrit": "अहं भद्रकल्प खादामि",
    "features": ["ACC.SG", "PRES.1SG"],
}

DUAL_DRAFT = {
    "devanagari": "कौ आगच्छतः?",
    "iast": "kau āgacchataḥ?",
    "gloss_en": "Who (two) are coming?",
    "expected_learner_sanskrit": "रामौ फलं खादतः",
    "features": ["NOM.DU", "ACC", "PRES.3DU"],
}


def canned_drafts(with_dual: bool = False) -> list[dict]:
    drafts = [CLEAN_DRAFT, MADEUP_DRAFT]
    if with_dual:
        drafts.append(DUAL_DRAFT)
    return drafts


# ─── fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def db(client):
    """Session-scoped DB (the session client fixture has already init+seeded)."""
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture(scope="module")
def authoring_client(client):
    """A TestClient with the authoring router mounted (main.py registration
    is done by the orchestrator, so tests mount it explicitly)."""
    from fastapi.testclient import TestClient

    from app.main import create_app
    from app.routers.authoring import router

    app = create_app()
    app.include_router(router, tags=["Authoring"])
    with TestClient(app) as c:
        yield c


def _count_scenarios(db) -> int:
    return db.query(DialogueScenario).count()


def _run(coro):
    return asyncio.run(coro)


def _patch_drafts(monkeypatch, with_dual: bool = False, **kwargs):
    monkeypatch.setattr(
        "app.services.authoring.draft_turns",
        AsyncMock(return_value=canned_drafts(with_dual=with_dual), **kwargs),
    )


# ─── gate_drafts (mocked provider) ────────────────────────────────────────

class TestGateDrafts:
    def test_gate_marks_pass_and_fail_correctly(self, monkeypatch):
        gated = _run(gate_drafts(canned_drafts(with_dual=True)))

        assert len(gated) == 3
        clean = next(g for g in gated if g["gate"] == "pass"
                     and g["expected_learner_sanskrit"] == CLEAN_DRAFT["expected_learner_sanskrit"])
        assert clean["derived_parses"], "pass must carry non-empty derived parses"
        assert clean["accepted_parses"] == clean["derived_parses"]
        assert "phala" in clean["derived_parses"][0]
        assert clean["reason"] == ""

        madeup = next(g for g in gated
                      if g["expected_learner_sanskrit"] == MADEUP_DRAFT["expected_learner_sanskrit"])
        assert madeup["gate"] == "fail"
        assert "confident" in madeup["reason"]
        assert madeup["derived_parses"] == []

        dual = next(g for g in gated
                    if g["expected_learner_sanskrit"] == DUAL_DRAFT["expected_learner_sanskrit"])
        assert dual["gate"] == "pass", dual
        dual_values = {v for p in dual["derived_parses"] for v in p.values()}
        assert any(v.startswith("NOM.DU") for v in dual_values), dual_values
        assert any(v.startswith("PRES.3DU") for v in dual_values), dual_values

    def test_rejects_claimed_features_not_derived(self, monkeypatch):
        bogus = dict(CLEAN_DRAFT, features=["PRES.2SG"])  # not present in the sentence
        gated = _run(gate_drafts([bogus]))
        assert gated[0]["gate"] == "fail"
        assert "not derivable" in gated[0]["reason"]
        assert gated[0]["derived_parses"] == []

    def test_rejects_empty_expected(self, monkeypatch):
        empty = dict(CLEAN_DRAFT, expected_learner_sanskrit="  ")
        gated = _run(gate_drafts([empty]))
        assert gated[0]["gate"] == "fail"
        assert "empty" in gated[0]["reason"]


# ─── P6-3: closed-set prompt, label-vs-grammar classification, short-draft retry ──

class _FakeProvider:
    """Minimal provider stand-in whose ``complete`` returns responses in order."""

    def __init__(self, responses, captured=None):
        self.responses = list(responses)
        self.calls = 0
        self.label = "fake:test"
        self.configured = True
        self._captured = captured if captured is not None else []

    async def complete(self, system, user, **kwargs):
        self.calls += 1
        self._captured.append((system, user))
        return self.responses[min(self.calls - 1, len(self.responses) - 1)]


def _draft_obj(sanskrit: str, features: list[str]) -> dict:
    return {
        "devanagari": "किं करोषि?",
        "iast": "kiṃ karoṣi?",
        "gloss_en": "What are you doing?",
        "expected_learner_sanskrit": sanskrit,
        "features": features,
    }


class TestP63:
    def test_gate_reports_invented_label_not_grammar(self, monkeypatch):
        """A non-derivable claim absent from the closed set is a label error,
        not a grammar failure."""
        # भवति is PRES.3SG — claiming a made-up ACT.3SG label should be reported
        # as outside the allowed set, not as ungrammatical Sanskrit.
        draft = _draft_obj("सः गच्छति", ["PRES.3SG.ACT"])
        gated = _run(gate_drafts([draft], target_features=["PRES.1SG", "PRES.3SG"]))
        assert gated[0]["gate"] == "fail"
        assert "outside the allowed set" in gated[0]["reason"]
        assert "PRES.3SG.ACT" in gated[0]["reason"]

    def test_gate_off_band_but_derived_passes(self):
        """The closed set classifies failures, it never creates them: a feature
        that IS derivable passes even if absent from the band."""
        # कौ? singular counterexample of a derivable-feature claim: गच्छति
        # genuinely is PRES.3SG so it must pass regardless of the closed set.
        draft = _draft_obj("सः गच्छति", ["PRES.3SG", "PRES.3SG"])
        gated = _run(gate_drafts([draft], target_features=["NOM.SG"]))
        assert gated[0]["gate"] == "pass", gated[0].get("reason")

    def test_gate_real_grammar_error_unaffected(self):
        """A genuinely non-derivable claim still fails as a grammar error when
        it is inside the closed set."""
        draft = _draft_obj("सः गच्छति", ["PRES.2SG"])  # falsely claimed 2SG
        gated = _run(gate_drafts([draft], target_features=["PRES.1SG", "PRES.2SG"]))
        assert gated[0]["gate"] == "fail"
        assert "not derivable" in gated[0]["reason"]

    def test_prompt_contains_closed_set(self, monkeypatch):
        """The brief's target_features reach the drafting prompt as a closed set."""
        captured = []
        fake = _FakeProvider(
            [LLMResponse(text=json.dumps([CLEAN_DRAFT]))], captured=captured
        )
        monkeypatch.setattr("app.services.authoring.build_provider", lambda _ref: fake)

        brief = dict(BRIEF, target_features=["NOM.SG", "ACC.SG", "PRES.1SG"])
        drafts = _run(draft_turns(brief, n_turns=1, cache=False))
        assert len(drafts) == 1
        system, _user = captured[-1]
        assert "Allowed feature ids (CLOSED SET): NOM.SG, ACC.SG, PRES.1SG" in system

    def test_draft_retries_when_short(self, monkeypatch):
        """A draft returning fewer turns than requested is retried once."""
        short = json.dumps([CLEAN_DRAFT])
        full = json.dumps([CLEAN_DRAFT, MADEUP_DRAFT, dict(DUAL_DRAFT)])
        fake = _FakeProvider([LLMResponse(text=short), LLMResponse(text=full)])
        monkeypatch.setattr("app.services.authoring.build_provider", lambda _ref: fake)

        drafts = _run(draft_turns(dict(BRIEF), n_turns=3, cache=False))

        assert fake.calls == 2, "short draft should trigger one retry"
        assert len(drafts) == 3, "retry's fuller reply should be kept"

    def test_draft_no_retry_when_full(self, monkeypatch):
        """A draft meeting the requested count is not retried."""
        full = json.dumps([CLEAN_DRAFT, MADEUP_DRAFT, dict(DUAL_DRAFT)])
        fake = _FakeProvider([LLMResponse(text=full)])
        monkeypatch.setattr("app.services.authoring.build_provider", lambda _ref: fake)

        drafts = _run(draft_turns(dict(BRIEF), n_turns=3, cache=False))

        assert fake.calls == 1
        assert len(drafts) == 3

    def test_extract_unwraps_array_wrapper(self):
        """The model sometimes wraps the array: {\"turns\":[...]} — the extractor
        must unwrap it (a failure mode the live re-run surfaced, 2026-09-01)."""
        from app.services.authoring import _extract_json_array
        wrapped = json.dumps({"turns": [CLEAN_DRAFT, MADEUP_DRAFT]})
        out = _extract_json_array(wrapped)
        assert len(out) == 2
        assert out[0]["expected_learner_sanskrit"] == CLEAN_DRAFT["expected_learner_sanskrit"]

    def test_draft_retries_when_first_call_raises(self, monkeypatch):
        """A first call that raises on an unusable reply still gets a retry."""
        from app.evals.providers import LLMResponse
        bad = '{"devanagari":"x","iast":"x","gloss_en":"x","expected_learner_sanskrit":"","features":[]}'
        full = json.dumps([CLEAN_DRAFT, MADEUP_DRAFT, dict(DUAL_DRAFT)])
        fake = _FakeProvider([LLMResponse(text=bad), LLMResponse(text=full)])
        monkeypatch.setattr("app.services.authoring.build_provider", lambda _ref: fake)

        drafts = _run(draft_turns(dict(BRIEF), n_turns=3, cache=False))

        assert fake.calls == 2, "unusable first reply must trigger a retry"
        assert len(drafts) == 3


# ─── run_authoring ────────────────────────────────────────────────────────

class TestRunAuthoring:
    def test_dry_run_writes_nothing(self, db, monkeypatch):
        _patch_drafts(monkeypatch, with_dual=True)
        before = _count_scenarios(db)

        report = _run(run_authoring(
            dict(BRIEF, title="dry-run-only"),
            n_turns=3,
            with_dual=True,
            dry_run=True,
            db=db,
        ))

        assert report["dry_run"] is True
        assert report["scenario_id"] is None
        assert report["n_gated"] == 3
        assert report["n_failed"] == 1  # the made-up-word draft
        assert len(report["failures"]) == 1
        assert "confident" in report["failures"][0]["reason"]
        assert _count_scenarios(db) == before, "dry run must not write to the DB"

    def test_refuses_existing_title_without_replace(self, db, monkeypatch):
        _patch_drafts(monkeypatch, with_dual=False)
        first = _run(run_authoring(dict(BRIEF), n_turns=2, db=db))
        assert first["scenario_id"] is not None
        first_id = first["scenario_id"]

        with pytest.raises(AuthoringConflictError):
            _run(run_authoring(dict(BRIEF), n_turns=2, db=db))

        # Unchanged: same scenario still there, no duplicate.
        assert db.query(DialogueScenario).filter(DialogueScenario.id == first_id).count() == 1
        assert _count_scenarios(db) == 2  # seeded + authored

    def test_replace_recreates_scenario(self, db, monkeypatch):
        _patch_drafts(monkeypatch, with_dual=True)
        first = _run(run_authoring(
            dict(BRIEF, title="replace-me"), n_turns=3, with_dual=True, db=db
        ))
        old_id = first["scenario_id"]

        second = _run(run_authoring(
            dict(BRIEF, title="replace-me"), n_turns=3, with_dual=True,
            replace=True, db=db,
        ))

        assert second["scenario_id"] != old_id, "replace must delete + recreate"
        assert db.query(DialogueScenario).filter(DialogueScenario.id == old_id).count() == 0

    def test_creates_nodes_edges_and_repair_chain(self, db, monkeypatch):
        _patch_drafts(monkeypatch, with_dual=True)
        report = _run(run_authoring(
            dict(BRIEF, title="market-run"),
            n_turns=3,
            with_dual=True,
            db=db,
        ))

        assert report["n_failed"] == 1  # made-up-word draft
        assert report["n_nodes"] == 4   # 2 passed turns × (tutor + ask_again repair)
        assert report["n_edges"] == 5   # 1 sa-edge + 2 repair edges per passed turn
        sid = report["scenario_id"]

        scenario = db.query(DialogueScenario).filter(DialogueScenario.id == sid).one()
        assert scenario.entry_node_id is not None
        nodes = db.query(DialogueNode).filter(DialogueNode.scenario_id == sid).all()
        tutors = [n for n in nodes if n.kind == "tutor"]
        repairs = [n for n in nodes if n.kind == "repair"]
        assert len(tutors) == 2 and all(r.repair_type == "ask_again" for r in repairs)

        edges = db.query(DialogueEdge).filter(DialogueEdge.scenario_id == sid).all()

        # sa-edges: accepted_parses grade "correct" on their own expected text.
        sa_edges = [e for e in edges if e.lang == "sa"]
        assert len(sa_edges) == 1
        for e in sa_edges:
            assert e.accepted_parses
            verdict = grade_attempt(
                e.expected_text, e.accepted_parses, e.features or []
            )["verdict"]
            assert verdict == "correct", f"{e.expected_text}: {verdict}"

        # Repair chain: every tutor node has ≥1 outgoing edge.
        for t in tutors:
            out = [e for e in edges if e.from_node_id == t.id]
            assert out, f"tutor node {t.id} has no outgoing edge"

        # The dual turn made it through as a tutor node.
        du = db.query(DialogueNode).filter(
            DialogueNode.scenario_id == sid,
            DialogueNode.devanagari == DUAL_DRAFT["devanagari"],
        ).count()
        assert du == 1

    def test_no_passed_turns_creates_nothing(self, db, monkeypatch):
        monkeypatch.setattr(
            "app.services.authoring.draft_turns",
            AsyncMock(return_value=[MADEUP_DRAFT]),
        )
        report = _run(run_authoring(dict(BRIEF, title="all-fail"), n_turns=1, db=db))
        assert report["scenario_id"] is None
        assert report["n_failed"] == 1


# ─── render_scenario ──────────────────────────────────────────────────────

class TestRenderScenario:
    def test_sets_audio_urls(self, db, monkeypatch, tmp_path):
        _patch_drafts(monkeypatch, with_dual=True)
        run_report = _run(run_authoring(
            dict(BRIEF, title="render-me"), n_turns=3, with_dual=True, db=db
        ))
        sid = run_report["scenario_id"]

        out_dir = tmp_path / "sarvam"
        shard_id = "shard-a"

        # Force the availability gate open: no Sarvam key in the test env, but
        # the render call is mocked so the real client is never constructed.
        monkeypatch.setattr(
            "app.services.authoring.bulbul_available",
            lambda: (True, "ok"),
        )

        async def fake_render_item(client, item, out_dir, shard_id, **kw):
            (Path(out_dir) / shard_id).mkdir(parents=True, exist_ok=True)
            p = Path(out_dir) / shard_id / f"{item['id']}.wav"
            p.write_bytes(b"RIFFdummy")
            return {"id": item["id"], "text": item["text"], "lang": item["lang"],
                    "path": str(p), "seconds": 1.0, "ok": True, "error": None}

        monkeypatch.setattr(
            "app.services.authoring._render_item_bulbul",
            fake_render_item,
        )

        report = _run(render_scenario(
            sid, out_dir=str(out_dir), shard_id=shard_id, db=db
        ))

        assert report["status"] == "rendered"
        assert report["rendered"] == 4  # 4 nodes, all audio_url == ""
        assert report["failed"] == []
        assert Path(report["shard_manifest_path"]).is_file()

        nodes = db.query(DialogueNode).filter(DialogueNode.scenario_id == sid).all()
        for n in nodes:
            assert n.audio_url
            assert n.audio_url.startswith(f"{shard_id}/")
            assert Path(out_dir, n.audio_url).is_file(), n.audio_url

        manifest = json.loads(Path(report["shard_manifest_path"]).read_text(encoding="utf-8"))
        assert manifest["rendered"] == 4

    def test_renderer_unavailable_skips_gracefully(self, db, monkeypatch, tmp_path):
        _patch_drafts(monkeypatch, with_dual=False)
        run_report = _run(run_authoring(
            dict(BRIEF, title="skip-render"), n_turns=2, db=db
        ))
        sid = run_report["scenario_id"]

        # Exercise the REAL path: no API key → bulbul_available() False,
        # so the pass is skipped before any disk side effects.
        monkeypatch.setattr(settings, "sarvam_api_key", "")

        report = _run(render_scenario(sid, out_dir=str(tmp_path), db=db))

        assert report["status"] == "skipped"
        assert "unavailable" in report["reason"]
        # No disk side effects on a skip: no shard dir, no manifest.
        assert list(tmp_path.iterdir()) == [], f"skip wrote files: {list(tmp_path.iterdir())}"
        # audio_url untouched, no exception raised
        nodes = db.query(DialogueNode).filter(DialogueNode.scenario_id == sid).all()
        assert all(n.audio_url == "" for n in nodes)

    def test_missing_scenario_raises_not_found(self, db, monkeypatch, tmp_path):
        with pytest.raises(AuthoringNotFoundError):
            _run(render_scenario("does-not-exist", out_dir=str(tmp_path), db=db))


# ─── endpoints ────────────────────────────────────────────────────────────

class TestAuthoringEndpoints:
    def test_requires_admin_token(self, authoring_client):
        r = authoring_client.post("/authoring/draft", json={"brief": BRIEF, "n_turns": 2})
        assert r.status_code == 401

    def test_disabled_without_live_gate(self, authoring_client, monkeypatch):
        monkeypatch.delenv("SHABD_AUTHORING_LIVE", raising=False)
        r = authoring_client.post(
            "/authoring/draft", json={"brief": BRIEF, "n_turns": 2}, headers=ADMIN
        )
        assert r.status_code == 503
        assert "SHABD_AUTHORING_LIVE" in r.json()["detail"]

    def test_draft_endpoint_reports_without_db_writes(self, authoring_client, monkeypatch, db):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        _patch_drafts(monkeypatch, with_dual=True)
        before = _count_scenarios(db)

        r = authoring_client.post(
            "/authoring/draft",
            json={"brief": BRIEF, "n_turns": 3, "with_dual": True, "dry_run": True},
            headers=ADMIN,
        )

        assert r.status_code == 200, r.text
        body = r.json()
        assert body["dry_run"] is True
        assert body["n_gated"] == 3
        assert body["n_failed"] == 1
        assert body["scenario_id"] is None
        assert _count_scenarios(db) == before

    def test_scenario_endpoint_creates_and_lists(self, authoring_client, monkeypatch, db):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        _patch_drafts(monkeypatch, with_dual=True)

        r = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="मंडी (market)"), "n_turns": 3, "with_dual": True},
            headers=ADMIN,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["scenario_id"]
        assert body["n_nodes"] == 4
        assert body["n_edges"] == 5

        listing = authoring_client.get("/authoring/scenarios", headers=ADMIN)
        assert listing.status_code == 200
        scenarios = listing.json()
        authored = [s for s in scenarios if s["title"] == "मंडी (market)"]
        assert authored, "authored scenario must appear in the listing"
        assert authored[0]["n_nodes"] == 4
        assert authored[0]["n_edges"] == 5

    def test_scenario_conflict_409(self, authoring_client, monkeypatch):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        _patch_drafts(monkeypatch, with_dual=False)

        title = "conflict-scenario"
        first = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title=title), "n_turns": 2},
            headers=ADMIN,
        )
        assert first.status_code == 200

        second = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title=title), "n_turns": 2},
            headers=ADMIN,
        )
        assert second.status_code == 409

    def test_render_endpoint(self, authoring_client, monkeypatch, tmp_path):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        monkeypatch.chdir(tmp_path)
        _patch_drafts(monkeypatch, with_dual=False)

        created = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="render-ep"), "n_turns": 2},
            headers=ADMIN,
        ).json()

        def fake_render_item(client, item, out_dir, shard_id, **kw):
            (Path(out_dir) / shard_id).mkdir(parents=True, exist_ok=True)
            return {"id": item["id"], "text": item["text"], "lang": item["lang"],
                    "path": str(Path(out_dir) / shard_id / f"{item['id']}.wav"),
                    "seconds": 1.0, "ok": True, "error": None}

        monkeypatch.setattr(
            "app.services.authoring.bulbul_available",
            lambda: (True, "ok"),
        )
        monkeypatch.setattr(
            "app.services.authoring._render_item_bulbul",
            fake_render_item,
        )
        r = authoring_client.post(
            "/authoring/render",
            json={"scenario_id": created["scenario_id"]},
            headers=ADMIN,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] in ("rendered", "skipped")

    def test_render_endpoint_404(self, authoring_client, monkeypatch):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        r = authoring_client.post(
            "/authoring/render", json={"scenario_id": "nope"}, headers=ADMIN
        )
        assert r.status_code == 404


# ─── Review endpoints (P2-3) ─────────────────────────────────────────

class TestReview:

    REVIEW_ADMIN = {"X-Admin-Token": "test-admin", "Content-Type": "application/json"}

    def test_review_requires_admin(self, authoring_client):
        """GET /authoring/review returns 401 without admin token."""
        r = authoring_client.get("/authoring/review")
        assert r.status_code == 401

    def test_pending_scenario_invisible_to_learners(self, authoring_client, client, monkeypatch):
        """A pending scenario is invisible to /conversation/scenarios."""
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        monkeypatch.setattr("app.services.authoring.draft_turns", AsyncMock(return_value=[CLEAN_DRAFT]))

        # Author a scenario (created as "pending" by default)
        r = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="pending-review-scenario"), "n_turns": 2},
            headers=ADMIN,
        )
        assert r.status_code == 200, r.text

        # Login as learner and check scenarios list
        learner_headers = {"Authorization": "Bearer " + client.post(
            "/auth/dev-login", json={"display_name": "review-learner", "bridge_langs": ["en", "hi"]}
        ).json()["token"]}
        r = client.get("/conversation/scenarios", headers=learner_headers)
        assert r.status_code == 200
        titles = [s["title"] for s in r.json()["scenarios"]]
        assert "pending-review-scenario" not in titles, "pending scenario should be invisible"

    def test_approve_reveals_scenario(self, authoring_client, client, monkeypatch):
        """Approving a pending scenario reveals it to learners."""
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        monkeypatch.setattr("app.services.authoring.draft_turns", AsyncMock(return_value=[CLEAN_DRAFT]))

        r = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="approve-me-scenario"), "n_turns": 2},
            headers=ADMIN,
        )
        assert r.status_code == 200
        sid = r.json()["scenario_id"]

        # Approve
        r = authoring_client.post(f"/authoring/review/{sid}",
                                  json={"status": "approved"}, headers=ADMIN)
        assert r.status_code == 200
        assert r.json()["review_status"] == "approved"

        # Check visible to learner
        learner_headers = {"Authorization": "Bearer " + client.post(
            "/auth/dev-login", json={"display_name": "approve-learner", "bridge_langs": ["en", "hi"]}
        ).json()["token"]}
        r = client.get("/conversation/scenarios", headers=learner_headers)
        titles = [s["title"] for s in r.json()["scenarios"]]
        assert "approve-me-scenario" in titles, "approved scenario should be visible"

    def test_reject_keeps_hidden(self, authoring_client, client, monkeypatch):
        """Rejecting hides scenario from learners."""
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        monkeypatch.setattr("app.services.authoring.draft_turns", AsyncMock(return_value=[CLEAN_DRAFT]))

        r = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="reject-me-scenario"), "n_turns": 2},
            headers=ADMIN,
        )
        assert r.status_code == 200
        sid = r.json()["scenario_id"]

        # Reject
        r = authoring_client.post(f"/authoring/review/{sid}",
                                  json={"status": "rejected", "note": "bad content"}, headers=ADMIN)
        assert r.status_code == 200
        assert r.json()["review_status"] == "rejected"

        learner_headers = {"Authorization": "Bearer " + client.post(
            "/auth/dev-login", json={"display_name": "reject-learner", "bridge_langs": ["en", "hi"]}
        ).json()["token"]}
        r = client.get("/conversation/scenarios", headers=learner_headers)
        titles = [s["title"] for s in r.json()["scenarios"]]
        assert "reject-me-scenario" not in titles, "rejected scenario should be hidden"

    def test_review_list_ordered(self, authoring_client, monkeypatch):
        """Review list is ordered by created_at ascending."""
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        monkeypatch.setattr("app.services.authoring.draft_turns", AsyncMock(return_value=[CLEAN_DRAFT]))

        # Create two scenarios with different titles (both pending by default)
        r1 = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="review-list-a"), "n_turns": 2},
            headers=ADMIN,
        )
        assert r1.status_code == 200

        r2 = authoring_client.post(
            "/authoring/scenario",
            json={"brief": dict(BRIEF, title="review-list-b"), "n_turns": 2},
            headers=ADMIN,
        )
        assert r2.status_code == 200

        # List pending
        r = authoring_client.get("/authoring/review?status=pending", headers=ADMIN)
        assert r.status_code == 200
        items = r.json()
        pending_titles = [i["title"] for i in items if i["review_status"] == "pending"]
        assert "review-list-a" in pending_titles
        assert "review-list-b" in pending_titles


class TestPriorities:
    """P2-5: GET /authoring/priorities"""

    def test_priorities_requires_admin(self, client):
        r = client.get("/authoring/priorities")
        assert r.status_code == 401

    def test_priorities_returns_empty_list(self, authoring_client, monkeypatch):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        from app.auth import require_admin
        from app.routers.authoring import router
        r = authoring_client.get("/authoring/priorities", headers=ADMIN)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_priorities_shape(self, authoring_client, monkeypatch):
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        r = authoring_client.get("/authoring/priorities", headers=ADMIN)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if items:
            assert "node_id" in items[0]
            assert "suggested_action" in items[0]
            assert "escape_count" in items[0]
            assert items[0]["suggested_action"] in ("ok", "more_edges", "repair_node")

    def test_priorities_returns_empty_without_escapes(self, authoring_client, client, monkeypatch):
        """Priorities endpoint returns empty list when no escapes exist."""
        monkeypatch.setenv("SHABD_AUTHORING_LIVE", "1")
        r = authoring_client.get("/authoring/priorities", headers=ADMIN)
        assert r.status_code == 200
        assert r.json() == []