"""Tests for batch authoring runner (P2-2).

All tests monkeypatch providers — zero network calls.
"""

import asyncio
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock

import pytest


def test_dry_run_makes_no_calls():
    """The script should print estimates and exit 0 without network."""
    os.environ["SARVAM_API_KEY"] = "mock-key"
    sys.argv = ["author_batch.py", "--dry-run", "--slug", "greeting-a"]
    try:
        from scripts.author_batch import main
        result = main()
        assert result is None, "Dry run should return None (no calls)"
    finally:
        sys.argv = sys.argv[:1]


def test_dry_run_without_key_succeeds():
    """Dry run works even without SARVAM_API_KEY."""
    orig = os.environ.pop("SARVAM_API_KEY", None)
    sys.argv = ["author_batch.py", "--dry-run", "--limit", "2"]
    try:
        from scripts.author_batch import main
        result = main()
        assert result is None
    finally:
        if orig:
            os.environ["SARVAM_API_KEY"] = orig
        sys.argv = sys.argv[:1]


def test_live_without_key_fails():
    """--live without SARVAM_API_KEY exits non-zero."""
    orig = os.environ.pop("SARVAM_API_KEY", None)
    from app.config import settings as app_settings
    old_key = app_settings.sarvam_api_key
    app_settings.sarvam_api_key = ""
    try:
        sys.argv = ["author_batch.py", "--live", "--limit", "1"]
        try:
            from scripts.author_batch import main
            main()
            pytest.fail("Should have exited")
        except SystemExit as e:
            assert e.code != 0
    finally:
        app_settings.sarvam_api_key = old_key
        if orig:
            os.environ["SARVAM_API_KEY"] = orig
        sys.argv = sys.argv[:1]


def test_estimate_contains_expected_fields():
    """Dry run prints estimates with the right structure."""
    from scripts.author_batch import _load_estimates
    briefs = [{"slug": "test", "n_turns": 8, "target_features": ["NOM.SG"]}]
    est = _load_estimates(briefs)
    assert "n_briefs" in est
    assert "est_total_rs" in est
    assert est["n_briefs"] == 1


def test_slug_filter_selects_one_brief():
    """--slug selects only matching brief."""
    from app.seeds.briefs import SCENARIO_BRIEFS
    slug_briefs = [b for b in SCENARIO_BRIEFS if b.get("slug") == "greeting-a"]
    assert len(slug_briefs) == 1
    assert slug_briefs[0]["slug"] == "greeting-a"


def test_results_file_written_on_run(tmp_path, monkeypatch):
    """Results file is written after running a brief (mock provider)."""
    monkeypatch.setattr("app.config.settings.sarvam_api_key", "mock-key")
    os.environ["SARVAM_API_KEY"] = "mock-key"
    monkeypatch.setattr("app.config.settings.db_path", str(tmp_path / "app.db"))

    # Mock run_authoring at the module it's imported from
    mock = AsyncMock()
    mock.return_value = {
        "scenario_id": "mock-scenario-123",
        "title": "Test",
        "n_nodes": 8,
        "n_edges": 16,
        "n_gated": 10,
        "n_failed": 2,
        "failures": [],
        "dry_run": False,
    }
    monkeypatch.setattr("app.services.authoring.run_authoring", mock)

    from scripts.author_batch import _run_batch
    briefs = [{"slug": "test-brief", "title": "Test", "n_turns": 4, "target_features": ["NOM.SG"]}]
    results = asyncio.run(_run_batch(briefs, render=False))
    assert len(results) == 1
    assert results[0]["slug"] == "test-brief"

    # Check result file was written
    result_files = list(tmp_path.rglob("test-brief.json"))
    # _run_batch writes to results/authoring/ relative to db_path
    result_files2 = list(Path(tmp_path).rglob("test-brief.json"))
    found = result_files + result_files2
    assert len(found) >= 1, f"No result file found in {tmp_path}"


def test_report_mode_no_results(tmp_path):
    """--report without results dir prints a message and exits 0."""
    from app.config import settings as app_settings
    old_path = app_settings.db_path
    app_settings.db_path = str(tmp_path / "app.db")
    try:
        sys.argv = ["author_batch.py", "--report"]
        import scripts.author_batch as mod
        result = mod.main()
        assert result is None
    finally:
        app_settings.db_path = old_path
        sys.argv = sys.argv[:1]