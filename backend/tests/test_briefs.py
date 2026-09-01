"""Tests for SCENARIO_BRIEFS catalogue (P2-1).

Verifies the static data file has the correct shape.
"""

from app.seeds.briefs import SCENARIO_BRIEFS


def test_fifty_briefs():
    """There must be exactly 50 briefs (10 situations × 5 feature bands)."""
    assert len(SCENARIO_BRIEFS) == 50, f"Expected 50 briefs, got {len(SCENARIO_BRIEFS)}"


def test_slugs_unique():
    """Every slug must be unique."""
    slugs = [b["slug"] for b in SCENARIO_BRIEFS]
    assert len(slugs) == len(set(slugs)), "Slugs must be unique — found duplicates"


def test_features_exist_in_db():
    """Every target_features entry exists in the seeded features table."""
    import os, sys, tempfile
    from pathlib import Path

    os.environ["DB_PATH"] = str(Path(tempfile.mkdtemp(prefix="test-briefs-")) / "test.db")
    from app.db import init_db, SessionLocal
    from app.seeds.seed import run_seed
    from app.models import Feature

    init_db()
    run_seed()

    db = SessionLocal()
    try:
        valid_ids = {f.id for f in db.query(Feature).all()}
    finally:
        db.close()

    for brief in SCENARIO_BRIEFS:
        for fid in brief["target_features"]:
            assert fid in valid_ids, f"Feature {fid} in brief '{brief['slug']}' not found in DB"


def test_ratio_bands_valid():
    """min_ratio <= max_ratio for every brief."""
    for brief in SCENARIO_BRIEFS:
        assert brief["min_ratio"] <= brief["max_ratio"], \
            f"Brief '{brief['slug']}' has min_ratio > max_ratio ({brief['min_ratio']} > {brief['max_ratio']})"
        assert 0.0 <= brief["min_ratio"] <= 1.0
        assert 0.0 <= brief["max_ratio"] <= 1.0


def test_band_e_prefers_gemini():
    """Every band-(e) brief must set prefer_provider='gemini'."""
    for brief in SCENARIO_BRIEFS:
        slug = brief["slug"]
        if slug.endswith("-e"):
            assert brief.get("prefer_provider") == "gemini", \
                f"Brief '{slug}' (band e) must prefer Gemini, got {brief.get('prefer_provider')}"
        else:
            # Non band-e briefs should NOT have prefer_provider
            assert "prefer_provider" not in brief, \
                f"Brief '{slug}' (non band-e) should not set prefer_provider"


def test_every_situation_appears_five_times():
    """Every situation appears exactly 5 times (once per feature band)."""
    from collections import Counter
    situation_slugs = [b["slug"].rsplit("-", 1)[0] for b in SCENARIO_BRIEFS]
    counts = Counter(situation_slugs)
    for slug, count in counts.items():
        assert count == 5, f"Situation '{slug}' appears {count} times, expected 5"


def test_briefs_have_required_fields():
    """Every brief has all required fields."""
    required = {"slug", "title", "description", "register", "situation",
                "target_features", "min_ratio", "max_ratio", "est_minutes", "n_turns"}
    for brief in SCENARIO_BRIEFS:
        missing = required - set(brief.keys())
        assert not missing, f"Brief '{brief.get('slug', '?')}' missing fields: {missing}"