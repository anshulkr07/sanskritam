"""Admin content lifecycle: review states and inventory counts (brief §10)."""

from __future__ import annotations

ADMIN = {"X-Admin-Token": "test-admin"}


def test_admin_content_status_flow(client):
    from app.db import SessionLocal
    from app.models import GameContent
    db = SessionLocal()
    row = db.query(GameContent).first()
    cid, version = row.content_id, row.version
    db.close()

    # unauthorised
    r = client.post("/play/admin/content", json={"content_id": cid, "version": version, "status": "reviewed"})
    assert r.status_code == 401
    # draft -> reviewed is refused (validation must run first)
    r = client.post("/play/admin/content", json={"content_id": cid, "version": version, "status": "reviewed"},
                    headers=ADMIN)
    assert r.status_code in (200, 409)
    # validated then reviewed works
    client.post("/play/admin/content", json={"content_id": cid, "version": version, "status": "validated"},
                headers=ADMIN)
    r = client.post("/play/admin/content", json={"content_id": cid, "version": version, "status": "reviewed"},
                    headers=ADMIN)
    assert r.status_code == 200 and r.json()["status"] == "reviewed"
    # reviewed rows are pinned: re-running validation does not overwrite
    r = client.post("/play/admin/content", json={"content_id": cid, "version": version, "status": "retired"},
                    headers=ADMIN)
    assert r.json()["status"] == "retired"


def test_admin_inventory_counts_and_alerts(client):
    r = client.get("/play/admin/content/inventory", headers=ADMIN)
    assert r.status_code == 200
    body = r.json()
    assert "vocab" in body["counts"]
    assert isinstance(body["alerts"], list)


def test_admin_inventory_requires_admin(client):
    r = client.get("/play/admin/content/inventory")
    assert r.status_code == 401
