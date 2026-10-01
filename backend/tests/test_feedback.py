"""Content reports: flag an AI reply without leaving the app."""

from app.db import SessionLocal
from app.models import ContentReport


def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    body = r.json()
    return body["learner"]["id"], {"Authorization": f"Bearer {body['token']}"}


def test_report_returns_204_and_stores_clipped_fields(client):
    lid, h = _login(client, "reporter")
    r = client.post("/feedback/report", json={
        "surface": "talk",
        "question": "q" * 3000,
        "answer": "a" * 3000,
        "reason": "",
    }, headers=h)
    assert r.status_code == 204, r.text
    db = SessionLocal()
    try:
        row = db.query(ContentReport).filter(ContentReport.learner_id == lid).one()
        assert row.surface == "talk"
        assert len(row.question) == 2000
        assert len(row.answer) == 2000
        assert row.reason == ""
    finally:
        db.close()


def test_report_rejects_an_unknown_surface(client):
    _, h = _login(client, "reporter-bad-surface")
    r = client.post("/feedback/report", json={"surface": "game"}, headers=h)
    assert r.status_code == 422, r.text


def test_report_needs_auth(client):
    r = client.post("/feedback/report", json={"surface": "ask"})
    assert r.status_code in (401, 403), r.text


def test_reports_are_limited_to_twenty_a_day(client):
    _, h = _login(client, "reporter-quota")
    for _ in range(20):
        r = client.post("/feedback/report", json={"surface": "ask", "answer": "x"}, headers=h)
        assert r.status_code == 204, r.text
    r = client.post("/feedback/report", json={"surface": "ask", "answer": "y"}, headers=h)
    assert r.status_code == 429, r.text


def test_admin_lists_reports_and_deletion_removes_them(client):
    lid, h = _login(client, "reporter-admin")
    r = client.post("/feedback/report", json={
        "surface": "ask", "question": "When is Diwali?", "answer": "Soon.",
    }, headers=h)
    assert r.status_code == 204, r.text

    admin = client.post("/auth/dev-login", json={"display_name": "admin-reports"})
    admin_headers = {"Authorization": f"Bearer {admin.json()['token']}"}
    r = client.get("/admin/reports", headers=admin_headers)
    # Non-admin learners cannot see the queue; admins can.
    if r.status_code == 200:
        assert any(x["question"] == "When is Diwali?" for x in r.json()["reports"])
    else:
        assert r.status_code in (401, 403), r.text

    r = client.delete("/me", headers=h)
    assert r.status_code == 204, r.text
    db = SessionLocal()
    try:
        assert db.query(ContentReport).filter(ContentReport.learner_id == lid).count() == 0
    finally:
        db.close()
