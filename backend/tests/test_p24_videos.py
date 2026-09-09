"""P24 — lesson videos: catalogue, attribution, and the no-grading rule.

Metadata only: the app never downloads, caches, or re-hosts video, so these
tests assert the catalogue contract, that every row's source_key resolves in
the licence registry (P23-4a's red-on-gap rule, extended), and that watching
writes nothing — there is deliberately no attempt endpoint for videos.
"""


def _auth_h(client, name="p24user"):
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_videos_list_and_unit_filter(client):
    h = _auth_h(client, "p24list")
    all_videos = client.get("/videos", headers=h).json()
    assert len(all_videos) >= 15, f"expected the seeded catalogue, got {len(all_videos)}"
    u1 = client.get("/videos?unit_id=u1", headers=h).json()
    assert len(u1) >= 4, f"U1 should carry the varnamala block, got {len(u1)}"
    ranks = [v["rank"] for v in u1]
    assert ranks == sorted(ranks), "videos serve ranked within the unit"
    assert {v["unit_id"] for v in u1} == {"u1"}


def test_videos_lesson_resolution(client):
    """lesson_id resolves through the lesson's unit (lesson ids are seeds)."""
    h = _auth_h(client, "p24lesson")
    units = client.get("/units", headers=h).json()
    u2 = next(u for u in units if u["id"] == "u2")
    assert u2["lessons"], "U2 must have lessons for this test"
    lid = u2["lessons"][0]["id"]
    via_lesson = client.get(f"/videos?lesson_id={lid}", headers=h).json()
    via_unit = client.get("/videos?unit_id=u2", headers=h).json()
    assert via_lesson == via_unit
    assert client.get("/videos?lesson_id=no-such-lesson", headers=h).status_code == 404


def test_videos_lang_and_playback_filters(client):
    h = _auth_h(client, "p24lang")
    hi = client.get("/videos?lang=hi", headers=h).json()
    assert len(hi) >= 2, "Hindi-medium rows must exist (U6/U8/U9/U10)"
    assert {v["lang"] for v in hi} == {"hi"}
    links = client.get("/videos?playback=link", headers=h).json()
    assert links, "link-out rows must exist (NPTEL course, playlists, e-PG)"
    assert {v["playback"] for v in links} == {"link"}
    for v in links:
        assert v["url"], f"link row needs a URL: {v['title']}"


def test_video_embeds_carry_ids_and_watch_urls(client):
    h = _auth_h(client, "p24embed")
    embeds = client.get("/videos?playback=embed", headers=h).json()
    assert embeds
    for v in embeds:
        assert v["youtube_id"], f"embed row needs a YouTube id: {v['title']}"
        assert f"watch?v={v['youtube_id']}" in v["url"], v["title"]
        assert v["channel"], v["title"]


def test_video_source_keys_resolve(client):
    """Every video row's source_key matches a content_sources row."""
    h = _auth_h(client, "p24attr")
    keys = {r["key"] for r in client.get("/licences", headers=h).json()}
    assert {"yt-nptel", "yt-tattvam", "yt-ubc", "yt-vyoma", "yt-samskritabharati",
            "yt-sanskritsense", "yt-namaste-sanskrit", "yt-mpes", "yt-apna-classes",
            "yt-vakratunda", "epgp"} <= keys
    from app.db import SessionLocal
    from app.models import VideoItem

    db = SessionLocal()
    try:
        for (sk,) in db.query(VideoItem.source_key).distinct().all():
            assert (sk or "") in keys, f"video source_key {sk!r} unattributed"
    finally:
        db.close()


def test_video_registry_credits_present(client):
    """New registry rows carry verbatim credit lines (Licences screen)."""
    h = _auth_h(client, "p24cred")
    by_key = {r["key"]: r for r in client.get("/licences", headers=h).json()}
    for key in ("yt-nptel", "yt-tattvam", "yt-ubc", "yt-sanskritstudio",
                "yt-yourhindicoach", "yt-mamta-ojha", "yt-vibha-mam",
                "yt-magnet-brains", "yt-vyoma", "yt-successcds",
                "yt-samskritabharati", "yt-sanskritsense", "yt-namaste-sanskrit",
                "yt-mpes", "yt-apna-classes", "yt-vakratunda", "epgp"):
        assert by_key[key]["credit"], key
        assert by_key[key]["licence"], key


def test_every_unit_has_video(client):
    """No unit renders an empty Watch-first block: U4/U7/U11 gaps closed."""
    h = _auth_h(client, "p24gaps")
    for unit_id in ("u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10", "u11"):
        rows = client.get(f"/videos?unit_id={unit_id}", headers=h).json()
        assert rows, f"{unit_id} has no videos"
    u11 = client.get("/videos?unit_id=u11", headers=h).json()
    assert any(v["playback"] == "embed" for v in u11), "U11 needs an embed, not just links"


def test_watching_writes_nothing(client):
    """There is no attempt/grade endpoint for videos: GET-only resource."""
    h = _auth_h(client, "p24nowrite")
    before = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    client.get("/videos?unit_id=u1", headers=h)
    client.get("/videos?unit_id=u6", headers=h)
    after = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    assert before == after, "reading videos must not touch mastery"
    assert client.post("/videos", headers=h).status_code in (404, 405)
