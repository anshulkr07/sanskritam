import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.models import Learner, Token
from app.main import create_app
from app.community_models import (
    CommunityMedia,
    CommunityConversation,
    CommunityMember,
    CommunityMessage,
    now,
)


@pytest.fixture()
def group_api():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def db_dep():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_db] = db_dep
    users = []
    with sessions() as db:
        for name in ["Anaya", "Bharat", "Chitra"]:
            u = Learner(id=uuid.uuid4().hex[:16], display_name=name)
            db.add(u)
            db.flush()
            t = Token(id=uuid.uuid4().hex, learner_id=u.id)
            db.add(t)
            users.append((u.id, {"Authorization": "Bearer " + t.id}))
        db.commit()
    yield TestClient(app), users, sessions
    engine.dispose()


def post(c, path, h, body=None):
    return c.post("/community" + path, headers=h, json=body or {})


def get(c, path, h):
    return c.get("/community" + path, headers=h)


def direct_chat(c, users):
    a, b = users[:2]
    assert (
        post(c, "/friends", a[1], {"user_id": b[0], "action": "request"}).status_code
        == 200
    )
    r = post(c, "/friends", b[1], {"user_id": a[0], "action": "accept"})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_private_groups(group_api):
    c, users, _ = group_api
    a, b, x = users
    assert get(c, "/conversations", {}).status_code == 401
    r = post(c, "/groups", a[1], {"name": "Sanskrit grammar", "public": False})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    assert get(c, "/conversations?discover=true", b[1]).json() == []
    assert post(c, f"/groups/{cid}/join", b[1]).status_code == 403
    assert post(c, f"/groups/{cid}/invite", b[1], {"user_id": x[0]}).status_code == 403
    assert get(c, f"/conversations/{cid}/messages", b[1]).status_code == 403
    direct_chat(c, users)
    assert post(c, f"/groups/{cid}/invite", a[1], {"user_id": b[0]}).status_code == 200
    assert get(c, f"/conversations/{cid}/messages", b[1]).status_code == 200


def test_direct_idempotency_privacy_and_unread(group_api):
    c, users, _ = group_api
    a, b, x = users
    assert post(c, "/direct", a[1], {"user_id": b[0]}).status_code == 403
    cid = direct_chat(c, users)
    assert post(c, "/direct", a[1], {"user_id": b[0]}).json()["id"] == cid
    body = {"content": "namaste", "client_id": "retry-id-123"}
    msg = post(c, f"/conversations/{cid}/messages", a[1], body)
    assert msg.status_code == 200, msg.text
    assert (
        post(c, f"/conversations/{cid}/messages", a[1], body).json()["id"]
        == msg.json()["id"]
    )
    assert len(get(c, f"/conversations/{cid}/messages", b[1]).json()) == 1
    assert get(c, f"/conversations/{cid}/messages", x[1]).status_code == 403
    assert get(c, "/status", b[1]).json()["unread"] == 1
    post(c, f"/conversations/{cid}/read", b[1], {"message_id": msg.json()["id"]})
    assert get(c, "/status", b[1]).json()["unread"] == 0
    other = post(c, "/groups", a[1], {"name": "Other"}).json()["id"]
    assert (
        post(
            c,
            f"/conversations/{other}/messages",
            a[1],
            {
                "content": "quote",
                "client_id": "quote-123",
                "reply_to": msg.json()["id"],
            },
        ).status_code
        == 422
    )
    post(c, "/friends", b[1], {"user_id": a[0], "action": "block"})
    assert (
        post(
            c,
            f"/conversations/{cid}/messages",
            a[1],
            {"content": "blocked", "client_id": "blocked-123"},
        ).status_code
        == 403
    )


def test_expired_media_skips_storage(group_api, monkeypatch):
    c, users, sessions = group_api
    a, b, x = users
    cid = direct_chat(c, users)
    with sessions() as db:
        db.add(
            CommunityMedia(
                id="expired",
                conversation_id=cid,
                user_id=a[0],
                key="ephemeral-chat/2026-10-12/x.webp",
                mime="image/webp",
                size=12,
                duration=0,
                expires_at=now() - timedelta(seconds=1),
            )
        )
        db.commit()

    def no_store():
        raise AssertionError("Expired attachment touched storage")

    monkeypatch.setattr("app.routers.community.object_store", no_store)
    assert get(c, "/media/expired", b[1]).status_code == 410
    assert get(c, "/media/expired", x[1]).status_code == 403
    assert (
        post(
            c,
            f"/conversations/{cid}/messages",
            a[1],
            {"client_id": "expired-123", "media_id": "expired"},
        ).status_code
        == 422
    )


def test_upload_validation_and_retention(group_api, monkeypatch):
    c, users, sessions = group_api
    a, b, x = users
    cid = direct_chat(c, users)
    writes = []

    class Store:
        def put_object(self, **kw):
            writes.append(kw)

    monkeypatch.setattr(
        "app.routers.community.object_store", lambda: (Store(), "private")
    )
    route = f"/community/conversations/{cid}/media"
    assert (
        c.post(
            route,
            headers=x[1],
            files={"file": ("x.webp", b"RIFFxxxxWEBPx", "image/webp")},
        ).status_code
        == 403
    )
    assert (
        c.post(
            route, headers=a[1], files={"file": ("x.webp", b"x" * 153601, "image/webp")}
        ).status_code
        == 413
    )
    assert (
        c.post(
            route, headers=a[1], files={"file": ("x.webp", b"fake", "image/webp")}
        ).status_code
        == 422
    )
    assert (
        c.post(
            route, headers=a[1], files={"file": ("x.wav", b"a", "audio/wav")}
        ).status_code
        == 422
    )
    r = c.post(
        route,
        headers=a[1],
        files={"file": ("x.webp", b"RIFFxxxxWEBPdata", "image/webp")},
    )
    assert r.status_code == 200, r.text
    assert writes[0]["Key"].startswith(f"ephemeral-chat/{now():%Y-%m-%d}/")
    with sessions() as db:
        media = db.get(CommunityMedia, r.json()["id"])
        assert 47.99 < (media.expires_at - now()).total_seconds() / 3600 <= 48
    assert (
        post(
            c,
            f"/conversations/{cid}/messages",
            b[1],
            {"client_id": "stolen-123", "media_id": r.json()["id"]},
        ).status_code
        == 422
    )


def test_audio_access_and_incoming(group_api, monkeypatch):
    c, users, sessions = group_api
    a, b, x = users
    cid = direct_chat(c, users)
    monkeypatch.setattr("app.services.community_audio.create", lambda *args: None)
    monkeypatch.setattr("app.services.community_audio.users", lambda *args: None)
    monkeypatch.setattr(
        "app.services.community_audio.token",
        lambda uid, kind, rid: {"user_id": uid, "kind": kind, "id": rid},
    )
    monkeypatch.setattr("app.services.community_audio.end", lambda *args: None)
    room = post(c, "/rooms", a[1], {"title": "Daily Sanskrit"}).json()
    assert post(c, f"/rooms/{room['id']}/end", b[1]).status_code == 403
    assert (
        post(
            c, f"/rooms/{room['id']}/permission", b[1], {"user_id": b[0], "allow": True}
        ).status_code
        == 403
    )
    assert (
        post(
            c, "/stream-token", b[1], {"kind": "audio_room", "id": room["id"]}
        ).status_code
        == 200
    )
    assert (
        post(
            c,
            "/stream-token",
            a[1],
            {"kind": "default", "id": "made-up", "conversation_id": cid},
        ).status_code
        == 403
    )
    call = post(c, f"/conversations/{cid}/call", a[1]).json()
    assert post(c, "/stream-token", x[1], call).status_code == 403
    assert get(c, "/status", a[1]).json()["incoming"] == []
    assert get(c, "/status", b[1]).json()["incoming"][0]["id"] == call["id"]
    assert post(c, f"/rooms/{room['id']}/end", a[1]).status_code == 200
    assert (
        post(
            c, "/stream-token", b[1], {"kind": "audio_room", "id": room["id"]}
        ).status_code
        == 404
    )


def test_delete_account_transfers_shared_group(group_api):
    c, users, sessions = group_api
    a, b, _ = users
    cid = direct_chat(c, users)
    group = post(c, "/groups", a[1], {"name": "Shared study"}).json()["id"]
    post(c, f"/groups/{group}/join", b[1])
    post(
        c,
        f"/conversations/{group}/messages",
        a[1],
        {"content": "Delete my words", "client_id": "delete-123"},
    )
    assert c.delete("/me", headers=a[1]).status_code == 204
    with sessions() as db:
        assert db.get(CommunityConversation, cid) is None
        assert db.get(CommunityConversation, group).creator_id == b[0]
        assert db.get(CommunityMember, (group, b[0])).role == "admin"
        assert db.query(CommunityMessage).filter_by(sender_id=a[0]).count() == 0
        assert db.get(Learner, a[0]) is None


def test_single_use_websocket_ticket_and_delivery(group_api, monkeypatch):
    c, users, sessions = group_api
    a = users[0]
    monkeypatch.setattr("app.routers.community.SessionLocal", sessions)
    secret = post(c, "/realtime-ticket", a[1]).json()["ticket"]
    with c.websocket_connect("/community/realtime") as ws:
        ws.send_text(secret)
        first = ws.receive_json()
        assert first["type"] == "refresh"
        post(c, "/groups", a[1], {"name": "Realtime group"})
        seen = ws.receive_json()
        if seen["type"] == "heartbeat":
            seen = ws.receive_json()
        assert seen["type"] == "refresh" and seen["version"] > first["version"]
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with c.websocket_connect("/community/realtime") as ws:
            ws.send_text(secret)
            ws.receive_json()


def test_stream_creation_disables_video_and_paid_features(group_api, monkeypatch):
    from app.services import community_audio

    c, users, sessions = group_api
    with sessions() as db:
        u = db.get(Learner, users[0][0])
        db.expunge(u)
    requests = []

    class Call:
        def get_or_create(self, **kw):
            requests.append(kw)

    class Video:
        def call(self, *args):
            return Call()

    class Stream:
        video = Video()

        def upsert_users(self, *users):
            pass

    monkeypatch.setattr(community_audio, "client", lambda: Stream())
    community_audio.create("audio_room", "safe-call", u, [u], "Practice")
    settings = requests[0]["data"].settings_override
    assert settings.video.enabled is False
    assert settings.video.camera_default_on is False
    assert settings.screensharing.enabled is False
    assert settings.recording.mode == "disabled"
    assert settings.transcription.mode == "disabled"
    assert settings.audio.mic_default_on is False


def test_stream_token_is_scoped_to_one_call(monkeypatch):
    from getstream import Stream
    from app.services import community_audio
    import jwt, time

    secret = "test-only-secret-with-at-least-32-bytes"
    monkeypatch.setattr(community_audio, "client", lambda: Stream("test-key", secret))
    payload = community_audio.token("learner", "default", "private-call")
    decoded = jwt.decode(payload["token"], secret, algorithms=["HS256"])
    assert decoded["call_cids"] == ["default:private-call"]
    assert decoded["user_id"] == "learner"
    assert decoded["exp"] <= int(time.time()) + 3600
