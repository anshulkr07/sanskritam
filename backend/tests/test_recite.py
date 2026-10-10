"""POST /recite/score + /recite/due (8.7) with fake scorer."""

import io

import pytest


def _login(client, name="reciter"):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _verse_uid(client, headers):
    from app.db import SessionLocal
    from app.models import Shloka
    db = SessionLocal()
    try:
        s = db.query(Shloka).first()
        from app.services.chant_text import verse_uid as _u
        return getattr(s, "verse_uid", "") or _u(s.source_ref or "", s.devanagari or "")
    finally:
        db.close()


def test_scored_line_speaker_left_out_unclear_404_503_429(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "scorer_url", "fake")
    h = _login(client)
    uid = _verse_uid(client, h)
    # Verse unit scored.
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "unit": "verse", "purpose": "recite"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "scored" and j["percent"] is not None
    assert j["review"]["verdict"] in ("correct", "off_by_one", "incorrect")
    # Line unit.
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "unit": "line:0", "purpose": "practise"})
    assert r.status_code == 200, r.text
    # Unknown uid 404.
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"x", "audio/mp4")},
                    data={"verse_uid": "nope-nope-nope-no"})
    assert r.status_code == 404
    # Empty scorer 503.
    monkeypatch.setattr(settings, "scorer_url", "")
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"x", "audio/mp4")},
                    data={"verse_uid": uid})
    assert r.status_code == 503
    monkeypatch.setattr(settings, "scorer_url", "fake")
    # Cap: fake duration rows.
    from app.db import SessionLocal
    from app.models import ReciteAttempt
    from app.auth import get_learner_from_token
    token = h["Authorization"].split()[1]
    db = SessionLocal()
    try:
        learner = get_learner_from_token(token, db)
        db.add(ReciteAttempt(learner_id=learner.id, verse_uid=uid, unit="verse",
                             purpose="recite", mode="strict", status="scored",
                             percent=90.0, n_ok=1, n_fix=0, n_unclear=0,
                             bands="o", duration_ms=900 * 1000))
        db.commit()
    finally:
        db.close()
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid})
    assert r.status_code == 429
    # /review/due unchanged for old kinds (no verse items counted there).
    r = client.get("/review/due", headers=h)
    assert r.status_code == 200
    # /recite/due lists verse items.
    r = client.get("/recite/due", headers=h)
    assert r.status_code == 200 and "items" in r.json()


def test_tips_and_deletion(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "scorer_url", "fake")
    h = _login(client, "tiptest")
    uid = _verse_uid(client, h)
    r = client.post("/recite/score", headers=h,
                    files={"file": ("r.m4a", b"\x00" * 4000, "audio/mp4")},
                    data={"verse_uid": uid, "unit": "verse", "purpose": "recite"})
    assert r.status_code == 200
    assert isinstance(r.json().get("tips"), list)
    # Account deletion removes attempts.
    from app.db import SessionLocal
    from app.models import ReciteAttempt
    from app.auth import get_learner_from_token
    token = h["Authorization"].split()[1]
    db = SessionLocal()
    try:
        learner = get_learner_from_token(token, db)
        lid = learner.id
        assert db.query(ReciteAttempt).filter(ReciteAttempt.learner_id == lid).count() >= 1
    finally:
        db.close()
    d = client.delete("/me", headers=h)
    assert d.status_code == 204
    db = SessionLocal()
    try:
        assert db.query(ReciteAttempt).filter(ReciteAttempt.learner_id == lid).count() == 0
    finally:
        db.close()


def test_cloud_run_counts_as_production_even_if_env_is_not_set(monkeypatch):
    """ENV defaults to "dev". Cloud Run sets K_SERVICE on every revision, so a
    deploy that forgets ENV=production must still refuse the fake scorer."""
    import asyncio

    from app.config import settings
    from app.services import scorer_client

    monkeypatch.delenv("K_SERVICE", raising=False)
    monkeypatch.setattr(settings, "env", "dev")
    assert settings.is_production is False
    monkeypatch.setattr(settings, "scorer_url", "fake")
    res = asyncio.run(scorer_client.score(b"x", ["रामः"], True))
    assert res["model"] == "fake"          # fine on a dev machine

    monkeypatch.setenv("K_SERVICE", "sanskritam-api")
    assert settings.is_production is True
    with pytest.raises(scorer_client.ScorerError):
        asyncio.run(scorer_client.score(b"x", ["रामः"], True))

    monkeypatch.delenv("K_SERVICE")
    monkeypatch.setattr(settings, "env", " Production ")
    assert settings.is_production is True
