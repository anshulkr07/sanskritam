"""P7-5 — the /grammar/path endpoint: the approved-content spine."""

from app.db import SessionLocal


def _approve_one_challenge_each(db):
    """Ensure at least one approved challenge exists so the spine has content.
    The seeded challenges are approved by P7-11 grandfathering, so this just
    reads the state."""
    return db


def test_path_requires_auth(client):
    r = client.get("/grammar/path")
    assert r.status_code == 401


def test_path_spine_shape(client):
    r = client.get("/grammar/path", headers=auth_h(client))
    assert r.status_code == 200
    d = r.json()
    assert set(d) == {"nodes", "features_covered", "features_total"}
    assert d["features_total"] == len(d["nodes"])
    assert d["features_covered"] <= d["features_total"]
    for n in d["nodes"]:
        for field in ("id", "feature", "kind", "rank", "label_en", "label_hi",
                      "approved_count", "pending_count", "mastery"):
            assert field in n, f"node missing {field}"
    # teaching order is by rank
    ranks = [n["rank"] for n in d["nodes"]]
    assert ranks == sorted(ranks)


def test_path_spine_counts_match_pool(client):
    """approved_count must reflect actual approved challenges, so the path
    shows servable content — not the brief catalogue (P7-5's whole point)."""
    import json as _json
    from app.models import Challenge

    db = SessionLocal()
    try:
        rows = db.query(Challenge.review_status, Challenge.features).all()
        expected: dict[str, int] = {}
        for status, feats in rows:
            if status != "approved":
                continue
            if isinstance(feats, str):  # SQLite may hand back the raw JSON text
                feats = _json.loads(feats)
            for f in feats or []:
                expected[f] = expected.get(f, 0) + 1
    finally:
        db.close()

    d = client.get("/grammar/path", headers=auth_h(client)).json()
    by_id = {n["id"]: n for n in d["nodes"]}
    for fid, count in expected.items():
        assert by_id[fid]["approved_count"] == count, fid


def auth_h(client):
    r = client.post("/auth/dev-login", json={"display_name": "pathuser", "bridge_langs": ["en", "hi"]})
    return {"Authorization": f"Bearer {r.json()['token']}"}
