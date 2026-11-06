"""5% previews and the Lite/Plus monthly allowances (owner decisions 2026-11-06)."""
from datetime import timedelta

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import require_learner
from app.config import settings
from app.db import Base, get_db
from app.models import CanonText, Learner, ReciteAttempt, Shloka, VerseAudio
from app.commerce import access, hybrid, plans, preview, service as svc
from app.commerce.models import OwnedEdition, Setting, Title

PAGES = 60  # two chapters of thirty verses; 5% is three pages


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_voice_enabled", True)
    monkeypatch.setattr(settings, "commerce_signing_key", "test-key-with-more-than-thirty-two-characters")
    engine = create_engine("sqlite:///" + str(tmp_path / "plans.db"))
    Base.metadata.create_all(engine)
    with sessionmaker(engine)() as db:
        db.add(Learner(id="u", display_name="Learner", google_sub="verified-u"))
        db.add(Setting(key="ai_costs", value={"voice": {"bound_inr": 2, "pipeline_id": hybrid.VOICE_PIPELINE_ID,
                                                        "verified_at": "test", "evidence": "Measured staging voice pipeline for test"}}))
        db.add(CanonText(slug="gita", paged=True, title_en="Bhagavad Gita", tier="free"))
        for n in range(PAGES):
            chapter = "1" if n < 30 else "2"
            db.add(Shloka(id=f"v{n:02d}", date="2026-01-01", devanagari=f"धर्म {n}", book="gita", chapter=chapter,
                          seq=n + 1, in_daily=False, source_ref=f"BG {chapter}.{n % 30 + 1}"))
        db.flush()
        for row in db.query(Shloka):  # verse_uid is derived when the row is saved
            db.add(VerseAudio(verse_uid=row.verse_uid, voice=settings.chant_voice, url="https://example.org/a.m4a",
                              duration_ms=20_000))
        for medium in ("book", "audio"):
            db.add(Title(id="gita:" + medium, slug="gita", medium=medium, name="Gita", credits=199,
                         published=True, metadata_json={"premium": True}))
        db.add(Title(id="free:book", slug="free", medium="book", name="Free", credits=0, published=True, metadata_json={}))
        db.commit()
        yield db
    engine.dispose()


def pay(db, product, tx, original=None, paid_at=None, days=30):
    paid_at = paid_at or svc.now()
    row = svc.apply_purchase(db, "u", {"provider": "apple", "transaction_id": tx, "original_id": original or tx,
        "product_id": hybrid.PREFIX + product, "paid_at": paid_at, "paid_until": paid_at + timedelta(days=days), "evidence": {}})
    db.commit()
    return row


@pytest.fixture
def client(db):
    from app.commerce.router import router
    from app.routers.canon import router as canon_router
    app = FastAPI(); app.include_router(router); app.include_router(canon_router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_learner] = lambda: db.get(Learner, "u")
    with TestClient(app) as test_client:
        yield test_client


def test_five_percent_of_pages_mostly_early_never_one_run_and_the_same_for_everyone():
    pages = preview.pages("gita", 700)
    assert len(pages) == 35 and pages[0] == 0
    assert all(b - a > 1 for a, b in zip(pages, pages[1:])), "a gap between every two free pages"
    assert sum(1 for i in pages if i < 140) >= 21, "most from the opening fifth"
    assert sum(1 for i in pages if i >= 350) >= 5, "some from the second half"
    assert preview.pages("gita", 700) == pages and preview.pages("katha", 700) != pages
    assert preview.pages("isha", 18) == [0] and preview.pages("none", 0) == []
    assert [preview.page_count(n) for n in (1, 20, 21, 40, 41)] == [1, 1, 2, 2, 3]


def test_audiobooks_play_five_percent_of_their_running_time_and_at_least_the_first_verse():
    assert preview.audio_budget(600_000, 20_000) == 30_000
    assert preview.audio_budget(100_000, 20_000) == 20_000
    assert preview.audio_budget(0, 0) == 0


def test_reader_and_contents_show_the_scattered_preview_until_the_book_is_owned(db, client):
    contents = client.get("/canon/gita/chapters").json()
    assert contents["preview"]["pages"] == 3 and contents["preview"]["of"] == PAGES and contents["preview"]["percent"] == 5
    free = {c["chapter"]: c["free"] for c in contents["chapters"]}
    assert sum(free.values()) == 3 and free["1"] >= 1
    expected = [i for i in preview.pages("gita", PAGES) if i < 30]
    chapter = client.get("/canon/gita/verses", params={"chapter": "1"}).json()
    assert chapter["locked"] and chapter["count"] == 30 and chapter["positions"] == expected
    assert [v["source_ref"] for v in chapter["verses"]] == [f"BG 1.{i + 1}" for i in expected]
    db.add(OwnedEdition(learner_id="u", title_id="gita:book", purchase_id="mudra:test")); db.commit()
    db.info.clear()
    chapter = client.get("/canon/gita/verses", params={"chapter": "1"}).json()
    assert not chapter["locked"] and len(chapter["verses"]) == 30 and chapter["positions"] is None


def test_the_audio_preview_ends_at_five_percent_of_the_book(db, client):
    learner = db.get(Learner, "u")
    text = db.query(CanonText).filter_by(slug="gita").one()
    positions, budget, total = access.audio_positions(db, learner, text)
    assert total == PAGES * 20_000 and budget == 60_000
    open_verses = [vid for vid, at in positions.items() if budget - at > 0]
    assert sorted(open_verses) == ["v00", "v01", "v02"]
    info = client.get("/commerce/titles/gita:audio/preview").json()
    assert info == {"title_id": "gita:audio", "medium": "audio", "owned": False, "percent": 5,
                    "free_ms": 60_000, "of_ms": 1_200_000}
    assert client.get("/commerce/titles/gita:book/preview").json()["pages"] == 3


def test_plan_guru_minutes_come_after_the_trial_and_before_bought_minutes(db):
    pay(db, "lite.v2.monthly", "lite")
    pay(db, "guru.minutes.5", "pack")
    call = hybrid.reserve_call(db, "u"); db.commit()
    assert (call.trial_ms, call.plan_ms, call.paid_ms) == (180_000, 420_000, 0)
    hybrid.settle_call(db, call, 300_000); db.commit()
    state = hybrid.snapshot(db, "u")
    assert state["trial_seconds"] == 0 and state["plan_seconds"] == 1680 and state["paid_seconds"] == 300
    call = hybrid.reserve_call(db, "u"); db.commit()
    assert (call.trial_ms, call.plan_ms, call.paid_ms) == (0, 600_000, 0)
    hybrid.settle_call(db, call, 0); db.commit()
    assert hybrid.snapshot(db, "u")["plan_seconds"] == 1680  # unused plan time returns to its month


def test_plan_minutes_renew_each_plan_month_and_do_not_pile_up(db):
    start = svc.now() - timedelta(days=31)
    pay(db, "lite.v2.monthly", "first", original="sub", paid_at=start, days=30)
    db.query(hybrid.VoiceCall).delete()
    pay(db, "lite.v2.monthly", "second", original="sub", paid_at=start + timedelta(days=30), days=30)
    assert hybrid.snapshot(db, "u")["plan_seconds"] == 30 * 60
    hybrid.balance(db, "u").trial_used_ms = hybrid.TRIAL_MS
    call = hybrid.reserve_call(db, "u"); db.commit()
    hybrid.settle_call(db, call, 900_000); db.commit()  # one call lasts at most ten minutes
    assert hybrid.snapshot(db, "u")["plan_seconds"] == 20 * 60
    pay(db, "lite.v2.monthly", "third", original="sub", paid_at=svc.now(), days=30)
    assert hybrid.snapshot(db, "u")["plan_seconds"] == 30 * 60  # a fresh month, not 50 minutes


def test_an_annual_plan_adds_its_mudra_one_month_at_a_time_and_a_refund_takes_them_all(db):
    purchase = pay(db, "plus.v2.annual", "year", paid_at=svc.now() - timedelta(days=65), days=365)
    assert svc.lock_wallet(db, "u").balance == 500
    assert plans.current(db, "u")["index"] == 2
    wallet = svc.lock_wallet(db, "u")
    assert plans.grant_due(db, "u") == 1000 and plans.grant_due(db, "u") == 0
    db.commit()
    assert svc.lock_wallet(db, "u").balance == 1500
    svc.refund_purchase(db, purchase); db.commit()
    assert svc.lock_wallet(db, "u").balance == 0 and wallet is not None


def add_scored(db, count, competition=None):
    for _ in range(count):
        db.add(ReciteAttempt(learner_id="u", verse_uid="uid00", status="scored", competition_id=competition))
    db.commit()


def test_two_scored_recitations_a_day_free_and_the_plan_month_allowance_with_a_plan(db):
    learner = db.get(Learner, "u")
    add_scored(db, 1)
    add_scored(db, 5, competition="weekly")  # competition entries are never counted
    plans.check_recite(db, learner)
    add_scored(db, 1)
    with pytest.raises(HTTPException) as refused:
        plans.check_recite(db, learner)
    assert refused.value.status_code == 429 and refused.value.detail["per"] == "day"
    pay(db, "lite.v2.monthly", "lite")
    plans.check_recite(db, learner)  # the plan month starts now
    add_scored(db, 100)
    with pytest.raises(HTTPException) as refused:
        plans.check_recite(db, learner)
    assert refused.value.detail["per"] == "month" and refused.value.detail["total"] == 100


def test_plan_use_never_waits_behind_the_shared_free_budget(db, monkeypatch):
    from app.services.quota import QuotaExceeded, check_and_consume
    monkeypatch.setattr(settings, "quota_enabled", True)
    monkeypatch.setattr(settings, "quota_daily_budget_inr", 0.01)
    monkeypatch.setattr(settings, "quota_stt_seconds_per_day", 100)
    learner = db.get(Learner, "u")
    with pytest.raises(QuotaExceeded):
        check_and_consume(db, learner, "stt_seconds", 10)
    pay(db, "lite.v2.monthly", "lite")
    check_and_consume(db, learner, "stt_seconds", 150)  # twice the free daily allowance
    with pytest.raises(QuotaExceeded):
        check_and_consume(db, learner, "stt_seconds", 60)


def test_free_books_save_offline_with_a_plan_and_owned_editions_without_one(db, client):
    refused = client.get("/commerce/titles/free:book/licence")
    assert refused.status_code == 403 and "Lite and Plus" in refused.json()["detail"]
    assert "Mudrā" in client.get("/commerce/titles/gita:book/licence").json()["detail"]
    pay(db, "plus.v2.monthly", "plus")
    grant = client.get("/commerce/titles/free:book/licence").json()
    assert grant["expires_at"].startswith(str(svc.membership(db, "u").paid_until.date()))


def test_the_shop_ledger_names_what_mudra_bought(db, client):
    from app.commerce import mudra
    pay(db, "mudra.330", "pack")
    for item, request_id, expected in (("title:gita:book", "book-1", 199), ("guru:5", "guru-1", 50)):
        mudra.spend(db, "u", item, request_id, expected)
    db.commit()
    items = client.get("/commerce/mudra/history").json()["items"]
    assert [(i["label"], i["amount"]) for i in items] == [
        ("Guru · 5 minutes", -50), ("Gita · book", -199), ("Mudrā pack", 330)]


def test_custom_amount_packs_follow_one_rule():
    # Owner, 2026-11-06: same as the price below ₹300, 10% extra from there,
    # 20% extra from ₹1,000; the three shop presets are points on the same rule.
    from app.commerce.hybrid import MUDRA_PACKS, PRODUCTS, PREFIX, mudra_for_inr
    assert [mudra_for_inr(p) for p in (49, 99, 249, 299, 499, 999, 4999)] == [50, 100, 250, 330, 550, 1200, 6000]
    packs = {v["inr"]: (k, v) for k, v in PRODUCTS.items() if v["kind"] == "refill"}
    assert sorted(packs) == [inr for inr, _ in MUDRA_PACKS]
    assert {k for k, v in packs.values() if v["preset"]} == {PREFIX + "mudra.100", PREFIX + "mudra.330", PREFIX + "mudra.1200"}
    for inr, (key, product) in packs.items():
        assert key == PREFIX + f"mudra.{product['credits']}" and product["credits"] == mudra_for_inr(inr)


def test_the_history_downloads_as_csv_with_a_running_balance(db, client):
    from app.commerce import mudra
    pay(db, "mudra.330", "pack")
    mudra.spend(db, "u", "title:gita:book", "book-1", 199)
    db.commit()
    response = client.get("/commerce/mudra/history.csv")
    assert response.status_code == 200 and response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"].startswith('attachment; filename="mudra-history-')
    text = response.content.decode("utf-8")
    assert text.startswith("﻿Date,Description,Mudrā,Balance\r\n")
    rows = [line.split(",") for line in text.strip().split("\r\n")[1:]]
    assert [(r[1], r[2], r[3]) for r in rows] == [("Mudrā pack", "+330", "330"), ("Gita · book", "-199", "131")]


def test_members_pay_less_for_books_but_not_for_talk_minutes(db):
    from app.commerce import mudra
    assert mudra.quote(db, "u", "title:gita:book")["price"] == 199
    pay(db, "lite.v2.monthly", "lite")
    lite = mudra.quote(db, "u", "title:gita:book")
    assert (lite["price"], lite["list_price"], lite["discount"]) == (149, 199, 25)
    assert mudra.quote(db, "u", "guru:5")["price"] == 50
    pay(db, "plus.v2.monthly", "plus")
    assert mudra.quote(db, "u", "title:gita:book")["price"] == 99
    assert mudra.quote(db, "u", "both:gita")["price"] == (99 + 99) * 9 // 10
    view = mudra.wallet_view(db, "u")
    assert view["discount"] == 50 and view["member_prices"]["gita:book"] == 99 and view["prices"]["gita:book"] == 199


def test_a_premium_book_without_its_own_price_is_priced_by_demand(db):
    from app.commerce import hybrid
    for medium in ("book", "audio"):
        db.get(Title, "gita:" + medium).credits = 0
    db.commit()
    db.info.clear()
    # The Gītā is the flagship, whatever its length.
    assert (hybrid.price(db, "gita:book"), hybrid.price(db, "gita:audio")) == (199, 249)
    # The owner can move a book to another tier on its catalogue row.
    db.get(Title, "gita:book").metadata_json = {"premium": True, "tier": "popular"}
    db.commit(); db.info.clear()
    assert hybrid.price(db, "gita:book") == 99
    # A book on no list is priced by length: 60 verse pages is scholarly.
    assert hybrid.TIER_OF.get("other") is None
    db.get(Title, "gita:book").slug = "gita"
    title = db.get(Title, "gita:book"); title.metadata_json = {"premium": True}
    assert hybrid.TIER_PRICES == {"flagship": (199, 249), "popular": (99, 149), "stotra": (29, 49), "scholarly": (79, 129)}


def test_noncommercial_texts_are_free_ad_free_and_save_offline_for_everyone(db, monkeypatch):
    from app.commerce import hybrid
    from app.commerce.ad_policy import eligibility
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    db.add(CanonText(slug="lilavati", paged=True, title_en="Līlāvatī",
                     licence="Text: public domain (ancient); transcription: GRETIL, CC BY-NC-SA 4.0 (non-commercial)"))
    db.add(Title(id="lilavati:book", slug="lilavati", medium="book", name="Līlāvatī", credits=99,
                 published=True, metadata_json={"premium": True}))
    db.commit()
    assert not hybrid.premium(db, "lilavati:book") and hybrid.price(db, "lilavati:book") is None
    assert hybrid.can_download(db, "u", "lilavati:book")
    assert not eligibility(db, "u", "lilavati:book")["allowed"]
    assert eligibility(db, "u", "gita:book")["allowed"]
