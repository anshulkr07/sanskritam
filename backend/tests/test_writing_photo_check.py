"""POST /writing/photo-check: a photographed letter, read by Sarvam Document
Intelligence and graded on the server.

The vendor is always mocked: nothing here touches the network. What is pinned:
the three-valued verdict (an exact read is `correct`, anything else is
`unsure`, never `wrong`); that quota is charged and REFUNDED when the vendor
fails; that an image is never trusted by its header or accepted oversize; that
no key configured is a 503 with no charge; and that the client speaks the job
protocol (create, poll, download a ZIP) without sending the API key to the
download host.
"""

import io
import types
import zipfile

import httpx
import pytest

from app.routers import writing as writing_router
from app.services import sarvam
from app.services.quota import usage_since

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64

_learners: list[str] = []


@pytest.fixture(autouse=True)
def _remove_our_attempts():
    """The suite shares one database, and test_p20_writing asserts the photo
    abstention rate over ALL photo attempts in it. These tests create confident
    `correct` photo attempts, so they must not leave them behind."""
    yield
    from app.db import SessionLocal
    from app.models import WritingAttempt

    if not _learners:
        return
    db = SessionLocal()
    try:
        db.query(WritingAttempt).filter(WritingAttempt.learner_id.in_(_learners)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
        _learners.clear()


def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200
    data = r.json()
    _learners.append(data["learner"]["id"])
    return {"Authorization": f"Bearer {data['token']}"}, data["learner"]["id"]


def _item(client, headers, tier=1, index=0):
    items = client.get(f"/writing/items?tier={tier}", headers=headers).json()
    assert items, "the drill corpus is seeded"
    return items[index]


class _FakeSarvam:
    def __init__(self, text="", fail=False):
        self.text = text
        self.fail = fail
        self.calls = []

    async def digitise_image(self, image, filename, mime, language_code):
        self.calls.append({"bytes": len(image), "filename": filename, "mime": mime, "lang": language_code})
        if self.fail:
            raise sarvam.SarvamError(502, "boom")
        return self.text


@pytest.fixture
def fake(monkeypatch):
    f = _FakeSarvam()
    monkeypatch.setattr(writing_router, "get_sarvam_client", lambda: f)
    return f


def _post(client, headers, item_id, body=JPEG, ctype="image/jpeg"):
    return client.post(
        f"/writing/photo-check?item_id={item_id}",
        content=body,
        headers={**headers, "Content-Type": ctype},
    )


def _pages(learner_id):
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        return usage_since(db, learner_id, "doc_pages", 24)
    finally:
        db.close()


# ─── Verdicts ─────────────────────────────────────────────────────────────

def test_an_exact_read_is_correct(client, fake):
    h, lid = _login(client, "photo-correct")
    item = _item(client, h)
    fake.text = item["devanagari"]
    r = _post(client, h, item["id"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["verdict"] == "correct"
    assert body["abstained"] is False
    assert body["recognised_text"] == item["devanagari"]
    assert fake.calls and fake.calls[0]["mime"] == "image/jpeg"
    assert fake.calls[0]["lang"] == "sa-IN"
    assert _pages(lid) == 1


def test_markdown_spaces_and_dandas_around_the_letter_are_tolerated(client, fake):
    h, _ = _login(client, "photo-markdown")
    item = _item(client, h)
    fake.text = f"# \n\n**{item['devanagari']}** ।\n"
    body = _post(client, h, item["id"]).json()
    assert body["verdict"] == "correct", body


def test_a_different_letter_is_unsure_never_wrong(client, fake):
    h, _ = _login(client, "photo-other")
    items = client.get("/writing/items?tier=1", headers=h).json()
    target, other = items[0], items[1]
    fake.text = other["devanagari"]
    body = _post(client, h, target["id"]).json()
    assert body["verdict"] == "unsure"
    assert body["abstained"] is True
    assert body["recognised_text"] == other["devanagari"]


def test_an_unreadable_photo_is_unsure(client, fake):
    h, _ = _login(client, "photo-blank")
    item = _item(client, h)
    fake.text = "   \n"
    body = _post(client, h, item["id"]).json()
    assert body["verdict"] == "unsure"
    assert body["recognised_text"] == ""


def test_a_png_is_accepted(client, fake):
    h, _ = _login(client, "photo-png")
    item = _item(client, h)
    fake.text = item["devanagari"]
    r = _post(client, h, item["id"], body=PNG, ctype="image/png")
    assert r.status_code == 200
    assert fake.calls[-1]["mime"] == "image/png"


def test_the_attempt_is_stored_as_text_only(client, fake):
    """The row keeps the recognised text and the source. There is no image column."""
    from app.db import SessionLocal
    from app.models import WritingAttempt

    h, lid = _login(client, "photo-row")
    item = _item(client, h)
    fake.text = item["devanagari"]
    _post(client, h, item["id"])
    db = SessionLocal()
    try:
        row = db.query(WritingAttempt).filter(WritingAttempt.learner_id == lid).order_by(WritingAttempt.id.desc()).first()
        assert row.source == "photo"
        assert row.recognised_text == item["devanagari"]
        columns = {c.name for c in WritingAttempt.__table__.columns}
        assert not columns & {"image", "photo", "image_bytes", "blob", "data"}
    finally:
        db.close()


# ─── Quota ────────────────────────────────────────────────────────────────

def test_a_vendor_failure_is_a_503_and_refunds_the_page(client, monkeypatch):
    h, lid = _login(client, "photo-fail")
    item = _item(client, h)
    monkeypatch.setattr(writing_router, "get_sarvam_client", lambda: _FakeSarvam(fail=True))
    r = _post(client, h, item["id"])
    assert r.status_code == 503
    assert "—" not in r.json()["detail"]
    assert _pages(lid) == 0, "a failed read must not cost the learner a page"


def test_the_daily_page_limit_is_a_429_and_the_vendor_is_not_called(client, fake, monkeypatch):
    from app.config import settings

    h, lid = _login(client, "photo-limit")
    item = _item(client, h)
    monkeypatch.setattr(settings, "quota_doc_pages_per_day", 1)
    fake.text = item["devanagari"]
    assert _post(client, h, item["id"]).status_code == 200
    calls = len(fake.calls)
    r = _post(client, h, item["id"])
    assert r.status_code == 429
    assert len(fake.calls) == calls
    assert "Retry-After" in r.headers


def test_pages_count_toward_the_service_budget():
    """doc_pages carries a price, so it counts against the daily rupee ceiling."""
    from app.config import settings
    from app.services.quota import _price_inr

    assert _price_inr("doc_pages") == settings.price_doc_inr_per_page == 0.5


# ─── Refusals ─────────────────────────────────────────────────────────────

def test_requires_auth(client):
    r = client.post("/writing/photo-check?item_id=x", content=JPEG, headers={"Content-Type": "image/jpeg"})
    assert r.status_code == 401


def test_unknown_item_is_404(client, fake):
    h, _ = _login(client, "photo-404")
    assert _post(client, h, "no-such-item").status_code == 404


def test_a_non_image_is_415_whatever_its_header_says(client, fake):
    h, lid = _login(client, "photo-gif")
    item = _item(client, h)
    r = _post(client, h, item["id"], body=b"GIF89a" + b"0" * 64, ctype="image/jpeg")
    assert r.status_code == 415
    assert not fake.calls
    assert _pages(lid) == 0


def test_an_empty_body_is_400(client, fake):
    h, _ = _login(client, "photo-empty")
    item = _item(client, h)
    assert _post(client, h, item["id"], body=b"").status_code == 400


def test_an_oversize_photo_is_413_before_it_is_read_in_full(client, fake, monkeypatch):
    from app.config import settings

    h, lid = _login(client, "photo-big")
    item = _item(client, h)
    monkeypatch.setattr(settings, "writing_photo_max_bytes", 1024)
    r = _post(client, h, item["id"], body=JPEG + b"0" * 4096)
    assert r.status_code == 413
    assert not fake.calls
    assert _pages(lid) == 0


def test_no_api_key_is_a_503_and_no_charge(client, monkeypatch):
    def no_key():
        raise RuntimeError("SARVAM_API_KEY is not configured")

    monkeypatch.setattr(writing_router, "get_sarvam_client", no_key)
    h, lid = _login(client, "photo-nokey")
    item = _item(client, h)
    assert _post(client, h, item["id"]).status_code == 503
    assert _pages(lid) == 0


# ─── OCR normalisation ────────────────────────────────────────────────────

@pytest.mark.parametrize("raw, clean", [
    ("क", "क"),
    ("**क**", "क"),
    ("क ।", "क"),
    ("क॥", "क"),
    ("का\n", "का"),
    ("k क", "क"),
    ("१२ कमल", "कमल"),
    ("<p>कमल</p>", "कमल"),
    ("", ""),
    (None, ""),
])
def test_normalise_ocr(raw, clean):
    assert writing_router.normalise_ocr(raw) == clean


# ─── The client speaks the job protocol ───────────────────────────────────

def _zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, text in files.items():
            zf.writestr(name, text)
    return buf.getvalue()


def _client_with(api_handler, download_handler, monkeypatch):
    real = httpx.AsyncClient
    c = sarvam.SarvamClient(api_key="secret-key")
    c._http = real(
        base_url="https://api.sarvam.ai",
        headers={"api-subscription-key": "secret-key"},
        transport=httpx.MockTransport(api_handler),
    )
    monkeypatch.setattr(
        sarvam.httpx, "AsyncClient",
        lambda **kw: real(transport=httpx.MockTransport(download_handler), **{k: v for k, v in kw.items() if k == "timeout"}),
    )
    return c


def test_digitise_image_creates_polls_downloads_and_unzips(monkeypatch):
    import asyncio

    seen = {"polls": 0, "download_had_key": None, "create_form": None}

    def api(request):
        path = request.url.path
        assert request.headers["api-subscription-key"] == "secret-key"
        if request.method == "POST" and path == "/doc-ai/v1/job/digitise":
            seen["create_form"] = request.content
            return httpx.Response(202, json={"job_id": "job-1", "status": "pending"})
        if path == "/doc-ai/v1/job/job-1/status":
            seen["polls"] += 1
            return httpx.Response(200, json={"status": "running" if seen["polls"] < 2 else "completed"})
        if path == "/doc-ai/v1/job/job-1/download-url":
            return httpx.Response(200, json={"method": "GET", "url": "https://files.example/job-1.zip"})
        return httpx.Response(404)

    def download(request):
        seen["download_had_key"] = "api-subscription-key" in request.headers
        # The layout Sarvam really returns (observed live, 2026-09-30): the
        # result sits in a folder named after the uploaded file.
        return httpx.Response(200, content=_zip({
            "writing.jpg/writing.md": "## क\n",
            "writing.jpg/metadata/page_001.json": "{}",
            "manifest.json": "{}",
        }))

    c = _client_with(api, download, monkeypatch)
    text = asyncio.run(c.digitise_image(b"\xff\xd8\xff-image", poll_interval_s=0, language_code="sa-IN"))
    assert text.strip() == "## क"
    assert seen["polls"] == 2
    assert seen["download_had_key"] is False, "the API key must not be sent to the download host"
    assert b'name="language"' in seen["create_form"] and b"sa-IN" in seen["create_form"]
    assert b'name="output_format"' in seen["create_form"] and b"md" in seen["create_form"]


@pytest.mark.parametrize("state", ["failed", "rejected"])
def test_a_failed_job_raises(state, monkeypatch):
    import asyncio

    def api(request):
        if request.method == "POST":
            return httpx.Response(202, json={"job_id": "j", "status": "pending"})
        return httpx.Response(200, json={"status": state})

    c = _client_with(api, lambda r: httpx.Response(500), monkeypatch)
    with pytest.raises(sarvam.SarvamError):
        asyncio.run(c.digitise_image(b"img", poll_interval_s=0))


def test_a_job_that_never_finishes_times_out(monkeypatch):
    import asyncio

    def api(request):
        if request.method == "POST":
            return httpx.Response(202, json={"job_id": "j", "status": "pending"})
        return httpx.Response(200, json={"status": "running"})

    c = _client_with(api, lambda r: httpx.Response(500), monkeypatch)
    with pytest.raises(sarvam.SarvamError) as exc:
        asyncio.run(c.digitise_image(b"img", poll_interval_s=0, timeout_s=0.05))
    assert exc.value.status_code == 504


def test_a_create_error_surfaces_the_status(monkeypatch):
    import asyncio

    c = _client_with(lambda r: httpx.Response(429, text="slow down"), lambda r: httpx.Response(500), monkeypatch)
    with pytest.raises(sarvam.SarvamError) as exc:
        asyncio.run(c.digitise_image(b"img", poll_interval_s=0))
    assert exc.value.status_code == 429
