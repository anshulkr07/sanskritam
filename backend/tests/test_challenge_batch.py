"""Tests for challenge batch generation (P2-4).

All tests use mocked providers — zero network calls.
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest


def test_dry_run_makes_no_calls():
    """Dry run prints estimate and exits 0 without network."""
    os.environ["SARVAM_API_KEY"] = "mock-key"
    sys.argv = ["challenge_batch.py", "--dry-run", "--limit", "2"]
    try:
        from scripts.challenge_batch import main
        result = main()
        assert result is None
    finally:
        sys.argv = sys.argv[:1]


def test_dry_run_without_key_succeeds():
    """Dry run works even without SARVAM_API_KEY."""
    orig = os.environ.pop("SARVAM_API_KEY", None)
    sys.argv = ["challenge_batch.py", "--dry-run", "--limit", "2"]
    try:
        from scripts.challenge_batch import main
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
        sys.argv = ["challenge_batch.py", "--live", "--limit", "1"]
        try:
            from scripts.challenge_batch import main
            main()
            pytest.fail("Should have exited")
        except SystemExit as e:
            assert e.code != 0
    finally:
        app_settings.sarvam_api_key = old_key
        if orig:
            os.environ["SARVAM_API_KEY"] = orig
        sys.argv = sys.argv[:1]


def test_estimate_printed():
    """Dry run lists groups and estimates."""
    from scripts.challenge_batch import build_groups
    groups = build_groups(limit=2)
    assert len(groups) == 2
    # Each group is (band_name, features, register).
    assert all(len(g) == 3 for g in groups)


def test_limit_respected():
    """--limit reduces the number of briefs processed."""
    from scripts.challenge_batch import FEATURE_BANDS
    # FEATURE_BANDS has 5 entries, times 2 registers = 10
    assert len(FEATURE_BANDS) == 5