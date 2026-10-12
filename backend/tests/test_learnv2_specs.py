"""LearnV2 spec manifests — the file-based coordination logs stay valid.

No app code is imported: these are the handover's JSONL contracts.
- Every line of sources/requests/integration-status JSONL is complete JSON
  (tolerating nothing — a partial final line fails loudly, never consumed).
- Ready requests carry passed verification; example templates never leak in.
- Every live lesson (specs/learn-v2/sources.jsonl, status verified) matches
  the documented live set; drafts stay out.
"""

from __future__ import annotations

import json
from pathlib import Path

SPECS = Path(__file__).resolve().parents[2] / "specs" / "learn-v2"

LIVE_LESSONS = {
    "verbs-number",
    "sandhi-boundary",
    "sandhi-like-vowels",
    "sandhi-a-combinations",
    "sandhi-glides",
    "sandhi-e-o",
    "sandhi-protected",
}


def _lines(name: str) -> list[dict]:
    rows = []
    for i, line in enumerate((SPECS / name).read_text(encoding="utf-8").splitlines()):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            raise AssertionError(f"{name}:{i + 1} is not complete JSON")
    return rows


def test_sources_valid_and_live_covered():
    rows = _lines("sources.jsonl")
    assert rows, "sources.jsonl must not be empty"
    for r in rows:
        assert r.get("lesson_id"), r
        assert r.get("licence"), r
        assert r.get("source_url"), r
        assert r.get("status") in ("verified", "draft"), r
        assert r.get("origin") in (
            "adapted_external", "existing_project",
            "engine_generated", "original_explanation",
        ), r
        assert "example_only" not in json.dumps(r), r
    verified = {r["lesson_id"] for r in rows if r["status"] == "verified"}
    assert LIVE_LESSONS <= verified, LIVE_LESSONS - verified


def test_requests_ready_means_verified():
    rows = _lines("requests.jsonl")
    assert rows, "requests.jsonl must not be empty"
    for r in rows:
        assert r.get("asset_id") and r.get("request_revision"), r
        assert r.get("status") in ("draft", "ready", "cancelled"), r
        if r["status"] == "ready":
            assert (r.get("verification") or {}).get("status") == "passed", r
        assert "example_only" not in json.dumps(r), r


def test_integration_states_valid():
    rows = _lines("integration-status.jsonl")
    assert rows, "integration-status.jsonl must not be empty"
    for r in rows:
        assert r.get("state") in ("accepted", "rejected", "integrated"), r
        assert r.get("asset_id") and r.get("date"), r
