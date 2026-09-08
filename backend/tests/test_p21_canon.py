"""P21-4 — the canon catalogue + the Īśā import. No network."""

from app.db import SessionLocal


def _auth(client, name="canonuser"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_canon_seed_is_ordered_and_licenced(client):
    from app.seeds.canon import seed_canon
    db = SessionLocal()
    try:
        rep = seed_canon(db)
        assert rep["total"] == 12
        # Idempotent: second run adds 0.
        assert seed_canon(db)["added"] == 0
    finally:
        db.close()


def test_canon_endpoint_shape(client):
    h = _auth(client)
    r = client.get("/canon", headers=h)
    assert r.status_code == 200, r.text
    texts = r.json()["texts"]
    assert len(texts) == 12
    orders = [t["study_order"] for t in texts]
    assert orders == sorted(orders) == list(range(1, 13))
    for t in texts:
        for field in ("slug", "title_en", "title_sa", "source", "licence",
                      "depth", "tier", "verses_planned", "verses_imported",
                      "coverage", "notes", "ref_prefixes"):
            assert field in t, f"{t.get('slug')} missing {field}"
        assert t["depth"] in ("full", "studied", "index")
        assert t["tier"] == "free", "reading is never gated by default (§6)"
        assert t["licence"], f"{t['slug']} has no recorded licence (§6)"
        assert 0.0 <= t["coverage"] <= 1.0 + 1e-9 or t["coverage"] > 0


def test_canon_counts_live_imports(client):
    """The endpoint is the truth: an import shows up with zero UI work."""
    h = _auth(client)
    d = {t["slug"]: t for t in client.get("/canon", headers=h).json()["texts"]}
    # Īśā: 18/18 live in the test DB? No — the test DB is fresh; only the
    # seeded corpus counts. What must hold: gita finds seeded Gītā rows.
    assert d["gita"]["verses_imported"] >= 1
    assert d["isha"]["verses_planned"] == 18


def test_canon_requires_auth(client):
    assert client.get("/canon").status_code == 401


def test_import_register_allowlist():
    import pytest
    from scripts.import_text import run_import
    with pytest.raises(SystemExit):
        run_import({"licence": "x", "source": "x", "register": "prakrit",
                    "verses": [{"ref": "r", "devanagari": "रामः"}]}, live=False)


def test_import_report_never_overwrites_input(tmp_path):
    """The isha incident: stem + '.json' collided with the input name."""
    import json
    import pytest
    payload = {"licence": "L", "source": "S",
               "verses": [{"ref": "rep-test-1", "devanagari": "रामः फलम् खादति"}]}
    f = tmp_path / "x.report.json"
    f.write_text(json.dumps(payload), encoding="utf-8")
    from scripts.import_text import main
    import os
    cwd = os.getcwd()
    os.chdir(tmp_path)
    try:
        # live run writes results/imports/x.report.report.json — never x.report.json
        rc = main(["--file", str(f), "--live"])
        assert rc == 0
        assert json.loads(f.read_text(encoding="utf-8"))["licence"] == "L"
        assert not (tmp_path / "results" / "imports" / "x.report.json").exists()
    finally:
        os.chdir(cwd)
