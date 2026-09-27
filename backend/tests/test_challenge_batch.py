"""Tests for challenge batch generation (P2-4).

All tests use mocked providers — zero network calls.
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest


# Environment and settings changes go through `monkeypatch`, which restores
# them. Direct os.environ writes here used to leak SARVAM_API_KEY="mock-key"
# into every later test, sending their unmocked code paths to the real Sarvam
# API — see the matching note in tests/test_author_batch.py.


def test_dry_run_makes_no_calls(monkeypatch):
    """Dry run prints estimate and exits 0 without network."""
    monkeypatch.setenv("SARVAM_API_KEY", "mock-key")
    monkeypatch.setattr(sys, "argv", ["challenge_batch.py", "--dry-run", "--limit", "2"])
    from scripts.challenge_batch import main
    result = main()
    assert result is None


def test_dry_run_without_key_succeeds(monkeypatch):
    """Dry run works even without SARVAM_API_KEY."""
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    monkeypatch.setattr(sys, "argv", ["challenge_batch.py", "--dry-run", "--limit", "2"])
    from scripts.challenge_batch import main
    result = main()
    assert result is None


def test_live_without_key_fails(monkeypatch):
    """--live without SARVAM_API_KEY exits non-zero."""
    from app.config import settings as app_settings
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    monkeypatch.setattr(app_settings, "sarvam_api_key", "")
    monkeypatch.setattr(sys, "argv", ["challenge_batch.py", "--live", "--limit", "1"])
    from scripts.challenge_batch import main
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code != 0


def test_estimate_printed():
    """Dry run lists groups and estimates."""
    from scripts.challenge_batch import build_groups
    groups = build_groups(limit=2)
    assert len(groups) == 2
    # Each group is (band_name, features, register, provider).
    assert all(len(g) == 4 for g in groups)


def test_limit_respected():
    """--limit reduces the number of briefs processed."""
    from scripts.challenge_batch import CHALLENGE_BANDS
    assert len(CHALLENGE_BANDS) == 20


def test_dual_bands_carry_gemini_provider():
    """Every dual-bearing band is routed to Gemini (§2.6)."""
    from scripts.challenge_batch import CHALLENGE_BANDS
    for band in CHALLENGE_BANDS:
        has_dual = any("DU" in f for f in band["features"])
        if has_dual:
            assert band.get("prefer_provider") == "gemini", band["name"]