import io
from datetime import timedelta

import pytest
from fastapi import HTTPException
from PIL import Image

from app.community_models import now
from app.models import Learner, ContentReport
from app.services import profile_photos as photos
from tests.test_community import group_api, post, get, direct_chat


def image_data(fmt="JPEG"):
    out = io.BytesIO()
    image = Image.new("RGB", (120, 80), "orange")
    image.save(out, format=fmt, exif=b"Exif\x00\x00private-metadata")
    return out.getvalue()


@pytest.fixture
def photo_store(monkeypatch):
    saved = {}

    class Store:
        def store_private(self, data, key, mime):
            assert mime == "image/jpeg"
            saved[key] = data
            return key

        def read_private(self, key):
            return saved[key]

        def delete_private(self, key):
            saved.pop(key, None)

    monkeypatch.setattr("app.routers.me.get_storage", lambda: Store())
    monkeypatch.setattr("app.services.storage.get_storage", lambda: Store())

    async def allow(*args):
        pass

    monkeypatch.setattr(photos, "screen_image", allow)
    return saved


def upload(c, user, data=None, mime="image/jpeg"):
    return c.post("/me/photo", headers=user[1], files={"file": ("photo.jpg", image_data() if data is None else data, mime)})


def test_shared_photo_private_replacement_and_removal(group_api, photo_store):
    c, users, sessions = group_api
    a, b, _ = users
    r = upload(c, a)
    assert r.status_code == 200, r.text
    path = r.json()["learner"]["avatar_url"]
    assert r.json()["learner"]["community_verified"] is True
    assert get(c, "/profile", a[1]).json()["avatar_url"] == path
    assert c.get(path).status_code == 401
    response = c.get(path, headers=b[1])
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    image = Image.open(io.BytesIO(response.content))
    assert image.size == (512, 512)
    assert not image.getexif()
    assert b"private-metadata" not in response.content
    assert upload(c, a).status_code == 429
    with sessions() as db:
        db.get(Learner, a[0]).avatar_updated_at = now() - timedelta(minutes=2)
        db.commit()
    r2 = upload(c, a)
    assert r2.status_code == 200
    assert r2.json()["learner"]["avatar_url"] != path
    assert len(photo_store) == 1
    assert c.get(path, headers=b[1]).status_code == 404
    assert c.delete("/me/photo", headers=a[1]).status_code == 200
    assert not photo_store


def test_reject_invalid_files_and_guests(group_api, photo_store):
    c, users, sessions = group_api
    a, b, _ = users
    assert upload(c, a, b"fake").status_code == 422
    assert upload(c, a, b"x" * (512 * 1024 + 1)).status_code == 413
    assert upload(c, a, image_data("PNG"), "image/jpeg").status_code == 422
    assert upload(c, a, b"<svg/>", "image/svg+xml").status_code == 422
    with sessions() as db:
        db.get(Learner, b[0]).google_sub = None
        db.commit()
    assert upload(c, b).status_code == 403
    assert post(c, "/groups", b[1], {"name": "Guest"}).status_code == 403
    assert post(c, "/profile", b[1], {"rules": True}, method="put").status_code == 403
    assert not photo_store


def test_moderation_fails_closed_without_changing_picture(group_api, photo_store, monkeypatch):
    c, users, sessions = group_api
    a = users[0]
    path = upload(c, a).json()["learner"]["avatar_url"]
    with sessions() as db:
        db.get(Learner, a[0]).avatar_updated_at = now() - timedelta(minutes=2)
        db.commit()

    async def unavailable(*args):
        raise HTTPException(503, "Unavailable")

    monkeypatch.setattr(photos, "screen_image", unavailable)
    assert upload(c, a).status_code == 503
    assert c.get("/me", headers=a[1]).json()["learner"]["avatar_url"] == path
    assert len(photo_store) == 1

    async def rejected(*args):
        raise HTTPException(422, "Rejected")

    monkeypatch.setattr(photos, "screen_image", rejected)
    assert upload(c, a).status_code == 422
    assert len(photo_store) == 1


def test_block_and_admin_suspension(group_api, photo_store):
    c, users, sessions = group_api
    a, b, _ = users
    path = upload(c, a).json()["learner"]["avatar_url"]
    direct_chat(c, users)
    assert post(c, "/friends", b[1], {"user_id": a[0], "action": "block"}).status_code == 200
    assert c.get(path, headers=b[1]).status_code == 404
    url = f"/admin/community/learners/{a[0]}"
    body = {"suspended": True, "remove_photo": True, "reason": "Reviewed harmful conduct"}
    assert c.put(url, headers=b[1], json=body).status_code == 401
    response = c.put(url, headers={"X-Admin-Token": "test-admin"}, json=body)
    assert response.status_code == 200, response.text
    assert not photo_store
    assert get(c, "/status", a[1]).status_code == 403
    assert upload(c, a).status_code == 403
    assert c.get("/me", headers=a[1]).status_code == 200
    assert c.get(path, headers=a[1]).status_code == 404
    with sessions() as db:
        assert db.query(ContentReport).filter_by(surface="group_admin", learner_id=a[0]).count() == 1
    body["suspended"] = False
    assert c.put(url, headers={"X-Admin-Token": "test-admin"}, json=body).status_code == 200
    assert get(c, "/status", a[1]).status_code == 200


def test_real_screen_requires_explicit_allow(group_api, monkeypatch):
    import asyncio
    from app.evals.providers import LLMResponse
    c, users, sessions = group_api
    answer = {"text": '{"allowed":false}'}

    async def complete(*args, **kwargs):
        return LLMResponse(provider="vertex", model="test", **answer)

    monkeypatch.setattr(photos.ImageScreen, "complete", complete)
    for text, expected in [('{"allowed":false}', 422), ('{"allowed":"true"}', 422), ('nonsense', 422), ('{}', 422)]:
        answer["text"] = text
        with sessions() as db, pytest.raises(HTTPException) as error:
            asyncio.run(photos.screen_image(db, db.get(Learner, users[0][0]), image_data()))
        assert error.value.status_code == expected
    answer["text"] = '{"allowed":true}'
    with sessions() as db:
        asyncio.run(photos.screen_image(db, db.get(Learner, users[0][0]), image_data()))
    answer.update(text="", error="network down")
    with sessions() as db, pytest.raises(HTTPException) as error:
        asyncio.run(photos.screen_image(db, db.get(Learner, users[0][0]), image_data()))
    assert error.value.status_code == 503


def test_link_signin_preserves_guest_profile_and_prevents_takeover(group_api, monkeypatch):
    from app.config import settings
    c, users, sessions = group_api
    a, b, _ = users
    monkeypatch.setattr(settings, "google_client_id", "test-audience")
    monkeypatch.setattr("app.routers.auth_router._verify_google_id_token", lambda token, audience: {"sub": "new-identity"})
    with sessions() as db:
        learner = db.get(Learner, a[0])
        learner.google_sub = None
        learner.streak = 7
        db.commit()
    body = {"id_token": "signed-identity-token-example"}
    response = c.post("/me/link/google", headers=a[1], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["learner"]["id"] == a[0]
    assert response.json()["learner"]["streak"] == 7
    assert response.json()["learner"]["community_verified"] is True
    with sessions() as db:
        linked_name = db.get(Learner, a[0]).display_name
    assert c.post("/auth/dev-login", json={"display_name": linked_name}).status_code in (403, 404)
    with sessions() as db:
        db.get(Learner, b[0]).google_sub = None
        db.commit()
    assert c.post("/me/link/google", headers=b[1], json=body).status_code == 409
    monkeypatch.setattr("app.routers.auth_router._verify_google_id_token", lambda *args: None)
    assert c.post("/me/link/google", headers=b[1], json=body).status_code == 401
    with sessions() as db:
        assert db.get(Learner, b[0]).google_sub is None
