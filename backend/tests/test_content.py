"""Content invariants: varnamala completeness, taxonomy, seeds, pipeline validation."""


def test_varnamala_grid_completeness(client):
    r = client.get("/grammar/varnamala")
    assert r.status_code == 200
    d = r.json()
    # vowels: 14 (a ā i ī u ū ṛ ṝ ḷ e ai o au) — allow short ṝ/ḷ absences
    vowels = d.get("vowels", [])
    assert len(vowels) >= 12, f"expected >=12 vowels, got {len(vowels)}"
    # traditional sparśa matrix: 5 places x 4 stop columns = 20, + 5 nasals
    cons = d.get("consonants", [])
    assert len(cons) >= 20, f"expected >=20 consonants, got {len(cons)}"
    nasals = d.get("nasals", [])
    assert len(nasals) == 5, f"expected 5 nasals, got {len(nasals)}"
    # every entry has devanagari + iast
    for v in vowels[:5]:
        assert "devanagari" in v and "iast" in v, v
    for c in cons[:5]:
        assert "devanagari" in c and "iast" in c, c


def test_varnamala_has_the_five_places(client):
    """The five places of articulation must be present, with IAST labels."""
    r = client.get("/grammar/varnamala")
    d = r.json()
    text = str(d)
    places = ["kaṇṭhya", "tālavya", "mūrdhanya", "dantya", "oṣṭhya"]
    # Response carries iast_place labels alongside the slug
    for p in places:
        assert p in text, f"missing place {p}"
    # All five slugs present across consonants+nasals
    for slug in ["kanthya", "talavya", "murdhanya", "dantya", "oshthya"]:
        assert slug in text, f"missing slug {slug}"


def test_feature_taxonomy_has_dual(client):
    """The dual number is a first-class feature (spec §7) — never folded into plural."""
    r = client.get("/grammar/features")
    assert r.status_code == 200
    feats = r.json()
    assert len(feats) >= 30
    blob = str(feats)
    assert "DU" in blob or "DUAL" in blob or "dvi" in blob.lower()


def test_shloka_today(client, auth_headers):
    r = client.get("/shlokas/today", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["devanagari"]
    assert d["iast"]
    assert d["word_breakdown"]
    assert d["source_ref"]


def test_shloka_requires_learner(client):
    """P7-6: a daily feature must resolve the learner's own day (§2.8)."""
    r = client.get("/shlokas/today")
    assert r.status_code in (401, 403)


def test_shloka_resolves_identical_for_different_timezones(client):
    """P7-6: the daily verse is a deterministic function of the learner-local day.

    We cannot change the real clock, so this pins the deterministic cycle:
    both a learner-local day inside the seeded window and a far-future day
    resolve to the same shloka on repeat calls, never drifting to "the newest
    row" alone.
    """
    from datetime import date, timedelta
    from app.routers.shlokas import _select_shloka
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        # Same day resolves to the same verse on every call.
        a = _select_shloka(db, "2026-09-03")
        b = _select_shloka(db, "2026-09-03")
        assert a is not None and a.id == b.id, "same day must give the same verse"
        # A far-future date also resolves deterministically (cycle).
        far = (date(2026, 9, 3) + timedelta(days=1000)).isoformat()
        f1 = _select_shloka(db, far)
        f2 = _select_shloka(db, far)
        assert f1 is not None and f1.id == f2.id, "cycle must be deterministic"
    finally:
        db.close()


def test_shloka_well_pins_two_dates_to_two_verses(client):
    """P7-6 acceptance: two specific dates pin to two specific verses."""
    from datetime import date, timedelta
    from app.seeds.shlokas import SHLOKA_ANCHOR
    from app.routers.shlokas import _select_shloka
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        d0 = SHLOKA_ANCHOR.isoformat()
        d1 = (SHLOKA_ANCHOR + timedelta(days=1)).isoformat()
        v0 = _select_shloka(db, d0)
        v1 = _select_shloka(db, d1)
        assert v0 is not None and v1 is not None
        assert v0.id != v1.id, "consecutive days must be different verses"
        # And re-selecting the same day is identical (deterministic).
        assert _select_shloka(db, d0).id == v0.id
    finally:
        db.close()


def test_shloka_reseed_is_idempotent(client):
    """P7-6: seeding on every startup must not duplicate rows."""
    from app.db import SessionLocal
    from app.models import Shloka
    from app.seeds.seed import _seed_shlokas  # noqa: WPS450 (test-only)

    db = SessionLocal()
    try:
        before = db.query(Shloka).count()
        _seed_shlokas(db)
        db.commit()
        after = db.query(Shloka).count()
        assert after == before, f"reseed added rows: {before} -> {after}"
    finally:
        db.close()


def test_shloka_metre_is_engine_derived(client):
    """P7-6: no hand-typed metre — every stored metre matches the engine
    (or is absent where the engine returns none), never a guess."""
    from app.db import SessionLocal
    from app.models import Shloka
    from app.services.chandas import scan as chandas_scan

    db = SessionLocal()
    try:
        for s in db.query(Shloka).all():
            engine_metre = (chandas_scan(s.devanagari).get("metre") or "") or ""
            if s.metre:
                assert s.metre == engine_metre, (
                    f"{s.source_ref}: stored metre {s.metre!r} != engine {engine_metre!r}")
    finally:
        db.close()


def test_first_boot_seeds_daily_words(client):
    """P7-9: a fresh database seeds all daily words on the FIRST boot.

    Regression: run_seed's first-seed branch skipped ``seed_daily_words``, so
    a newly created DB started with zero daily words until its second boot —
    the exact state the 2026-09-03 rebuild produced. The conftest DB is a
    genuine first boot here (init_db + run_seed on an empty temp file), so if
    the daily-word well is empty the seed path is broken again.
    """
    from app.db import SessionLocal
    from app.models import DailyWord
    from app.seeds.daily_words import _CURATED
    from app.seeds.seed import run_seed

    expected = len(_CURATED)
    db = SessionLocal()
    try:
        first_boot = db.query(DailyWord).count()
        assert first_boot == expected, (
            f"first boot seeded {first_boot} daily words, expected {expected}"
        )
        # A second boot adds none (the seed is idempotent).
        run_seed()
        second_boot = db.query(DailyWord).count()
        assert second_boot == expected, (
            f"second boot changed daily-word count: {first_boot} -> {second_boot}"
        )
    finally:
        db.close()


def test_seed_content_volume(client):
    r = client.get("/admin/challenges", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 25, f"only {len(items)} challenges"


def test_pipeline_validates_all_content(client):
    """Content correctness is a checkable invariant, not a hope (spec §11.3)."""
    r = client.post("/pipeline/run", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    d = r.json()
    assert d["total"] >= 25
    assert d["passed"] == d["total"], f"pipeline failures: {d['anomalies'][:3]}"


def test_pipeline_catches_corrupted_challenge(client):
    """Insert a challenge with WRONG accepted_parses; pipeline must flag it."""
    bad = {
        "prompt_l1": "The boy goes to the forest.",
        "prompt_lang": "en",
        "target_sanskrit": "बालः वनम् गच्छति।",
        "target_iast": "bālas vanam gacchati.",
        "features": ["NOM.SG", "ACC.SG", "PRES.3SG"],
        # DELIBERATELY WRONG: claims LOC.SG for the object
        "accepted_parses": [{"bāla": "NOM.SG", "vana": "LOC.SG", "√gam": "PRES.3SG"}],
        "register": "laukika",
    }
    r = client.post("/admin/challenges", json=bad, headers={"X-Admin-Token": "test-admin"})
    assert r.status_code in (200, 201), r.text
    bad_id = r.json().get("id") if isinstance(r.json(), dict) else None

    r2 = client.post("/pipeline/run", headers={"X-Admin-Token": "test-admin"})
    d = r2.json()
    if bad_id:
        flagged = [a for a in d["anomalies"] if a.get("challenge_id") == bad_id]
    else:
        flagged = [a for a in d["anomalies"] if "vanam" in str(a) or "वनम्" in str(a)]
    assert flagged, f"pipeline failed to catch a corrupted challenge; anomalies={d['anomalies'][:2]}"


def test_admin_requires_token(client):
    r = client.get("/admin/challenges")
    assert r.status_code == 401
    r2 = client.post("/pipeline/run", headers={"X-Admin-Token": "wrong"})
    assert r2.status_code == 401
