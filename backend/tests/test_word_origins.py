"""Word journey (handover_language 5.6): storage, API, content rules.

Modelled on tests/test_story.py. Batch 0 is hand-checked content; the tests
pin its shape, the loader, the schedule and the read-only rule.
"""

import json
from datetime import date, timedelta
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "seeds" / "word_origins"


def _auth_h(client, name="worduser"):
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _batch_items():
    out = []
    for p in sorted(DATA_DIR.glob("batch-*.json")):
        doc = json.loads(p.read_text(encoding="utf-8"))
        out.append((p, doc))
    return out


def _live_origins():
    from app.db import SessionLocal
    from app.models import WordOrigin
    db = SessionLocal()
    try:
        return db.query(WordOrigin).filter(WordOrigin.status == "approved").all()
    finally:
        db.close()


def _live_routes():
    from app.db import SessionLocal
    from app.models import WordRoute
    db = SessionLocal()
    try:
        return db.query(WordRoute).filter(WordRoute.status == "approved").all()
    finally:
        db.close()


def test_batch0_loads(client):
    origins = _live_origins()
    routes = _live_routes()
    assert len(origins) >= 34, f"expected >=34 origins, got {len(origins)}"
    assert len(routes) >= 79, f"expected >=79 routes, got {len(routes)}"


def test_every_origin_has_route_and_sources_resolve(client):
    h = _auth_h(client, "wordshape")
    keys = {r["key"] for r in client.get("/licences", headers=h).json()}
    from app.db import SessionLocal
    from app.models import WordOrigin, WordRoute
    db = SessionLocal()
    try:
        origins = db.query(WordOrigin).filter(WordOrigin.status == "approved").all()
        assert origins
        for o in origins:
            rs = db.query(WordRoute).filter(
                WordRoute.origin_id == o.id, WordRoute.status == "approved").all()
            assert rs, f"{o.id} has no live route"
            for r in rs:
                for k in (r.source_keys or []):
                    assert k in keys, f"{r.id} source {k!r} not in registry"
    finally:
        db.close()


def test_sanskrit_matches_lipi():
    import vidyut.lipi as lipi
    from app.services import iast as iast_svc
    for _p, doc in _batch_items():
        for it in doc.get("items", []):
            mw_key = it.get("mw_key") or ""
            assert mw_key, it.get("id")
            want_dev = lipi.transliterate(mw_key, lipi.Scheme.Slp1, lipi.Scheme.Devanagari)
            assert it["sanskrit"]["dev"] == want_dev, it["id"]
            assert iast_svc.matches(it["sanskrit"]["dev"], it["sanskrit"]["iast"]), it["id"]
            if it.get("display_key"):
                want_d = lipi.transliterate(it["display_key"], lipi.Scheme.Slp1, lipi.Scheme.Devanagari)
                assert it["display"]["dev"] == want_d, it["id"]
                assert iast_svc.matches(it["display"]["dev"], it["display"]["iast"]), it["id"]


def test_display_key_is_first_case_singular():
    from vidyut.kosha import Kosha
    kosha = Kosha("vidyut-data/kosha")
    seen = 0
    for _p, doc in _batch_items():
        for it in doc.get("items", []):
            dk = it.get("display_key")
            if not dk:
                continue
            stem = it.get("mw_key") or ""
            seen += 1
            entries = kosha.get(dk)
            assert entries, f"{it['id']}: kosha has no {dk!r}"
            hit = False
            for e in entries:
                r = repr(e)
                if ("Subanta" in r and ("text='%s'" % stem) in r
                        and "Prathama" in r and "Eka" in r):
                    hit = True
                    break
            assert hit, f"{it['id']}: {dk!r} is not Prathama Eka of {stem!r}"
    assert seen >= 8, f"expected >=8 display_keys, saw {seen}"


def test_romanize_ru_matches_batch():
    from app.services.romanize import romanize_ru
    for _p, doc in _batch_items():
        for it in doc.get("items", []):
            for r in it.get("routes", []):
                if r.get("status") != "approved":
                    continue
                if r.get("script") == "cyrillic":
                    assert romanize_ru(r["word"]) == r["roman"], r["id"]
                elif r.get("script") == "latin":
                    assert (r.get("roman") or "") == "", r["id"]
    # Spot pins from the handover.
    assert romanize_ru("сахар") == "sakhar"
    assert romanize_ru("джунгли") == "dzhungli"
    assert romanize_ru("огонь") == "ogon'"
    assert romanize_ru("новый") == "novyy"
    assert romanize_ru("мёд") == "myod"
    assert romanize_ru("дочь") == "doch'"


def test_kind_confidence_and_hops():
    from app.db import SessionLocal
    from app.models import WordRoute
    db = SessionLocal()
    try:
        rows = db.query(WordRoute).filter(WordRoute.status == "approved").all()
        assert rows
        for r in rows:
            assert r.kind in ("loan", "related", "inherit"), r.id
            assert r.confidence in ("certain", "probable"), r.id
            for h in (r.hops or []):
                assert isinstance(h, dict), r.id
                assert h.get("lang") and h.get("form"), r.id
    finally:
        db.close()


def test_no_em_dash_and_note_length():
    for _p, doc in _batch_items():
        for it in doc.get("items", []):
            for field in [it.get("gloss") or "", it.get("note") or "", it.get("attested") or ""]:
                assert "—" not in field, it["id"]
                assert " – " not in field, it["id"]
            note = (it.get("note") or "").strip()
            if note:
                assert len(note.split()) <= 40, it["id"]
            for r in it.get("routes", []):
                for field in [r.get("gloss") or ""]:
                    assert "—" not in field, r.get("id")
                    assert " – " not in field, r.get("id")
                for h in r.get("hops", []):
                    for field in [h.get("gloss") or ""]:
                        assert "—" not in field, r.get("id")


def test_no_rejected_word_is_live():
    rej = json.loads((DATA_DIR / "rejected.json").read_text(encoding="utf-8"))
    banned = {(str(i.get("lang") or "").lower(), str(i.get("word") or "").casefold())
              for i in rej.get("items", [])}
    from app.db import SessionLocal
    from app.models import WordRoute
    db = SessionLocal()
    try:
        rows = db.query(WordRoute).filter(WordRoute.status == "approved").all()
        for r in rows:
            assert ((r.lang or "").lower(), (r.word or "").casefold()) not in banned, r.id
    finally:
        db.close()


def test_no_two_origins_share_date():
    from app.db import SessionLocal
    from app.models import WordOrigin
    db = SessionLocal()
    try:
        rows = db.query(WordOrigin).filter(WordOrigin.status == "approved").all()
        dates = [r.scheduled_date for r in rows]
        assert len(dates) == len(set(dates)), "duplicate scheduled_date"
    finally:
        db.close()


def test_no_two_items_share_a_date_across_files():
    """The files themselves, not the table: the unique index would hide a clash
    by dropping the later item at boot."""
    seen: dict[str, str] = {}
    for p, doc in _batch_items():
        start = date.fromisoformat(doc["start_date"])
        for pos, it in enumerate(doc.get("items", [])):
            if it.get("status") != "approved":
                continue
            day = (start + timedelta(days=pos)).isoformat()
            assert day not in seen, f"{p.name}: {it['id']} and {seen[day]} share {day}"
            seen[day] = it["id"]


def test_no_origin_id_is_carried_twice():
    seen: dict[str, str] = {}
    for p, doc in _batch_items():
        for it in doc.get("items", []):
            assert it["id"] not in seen, f"{it['id']} is in {seen.get(it['id'])} and {p.name}"
            seen[it["id"]] = p.name


def _seed_from(folder):
    """Run the word loader against another folder of batch files."""
    import app.seeds.word_origins as seedmod
    from app.db import SessionLocal
    real = seedmod._data_dir
    seedmod._data_dir = lambda: folder
    db = SessionLocal()
    try:
        out = seedmod.seed_word_origins(db)
        db.commit()
        return out
    finally:
        db.close()
        seedmod._data_dir = real


def _table():
    from app.db import SessionLocal
    from app.models import WordOrigin
    db = SessionLocal()
    try:
        return {o.id: (o.scheduled_date, o.status, o.gloss, o.attested)
                for o in db.query(WordOrigin).all()}
    finally:
        db.close()


def _pipeline_dates():
    """Dates held by words the daily pipeline wrote (batch "auto"). The loader
    leaves those rows alone and skips a file item that wants one of their days."""
    from app.db import SessionLocal
    from app.models import WordOrigin
    db = SessionLocal()
    try:
        return {o.scheduled_date for o in db.query(WordOrigin).filter(WordOrigin.batch == "auto").all()}
    finally:
        db.close()


def _copy_of_batch0(tmp_path, name, change):
    folder = tmp_path / name
    folder.mkdir()
    for other in DATA_DIR.glob("batch-*.json"):
        if other.name != "batch-0000.json":
            (folder / other.name).write_bytes(other.read_bytes())
    doc = json.loads((DATA_DIR / "batch-0000.json").read_text(encoding="utf-8"))
    change(doc)
    (folder / "batch-0000.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    return folder, doc


def test_reseed_when_the_start_date_moves_or_an_item_goes(client, tmp_path):
    """The owner sets start_date to the release day, and may drop an item.
    Dates then pass from one row to another under a unique index; the seed
    runs at startup, so it must not raise."""
    before = _table()
    try:
        for days in (5, -5, 60):
            _seed_from(DATA_DIR)

            def move(doc, days=days):
                start = date.fromisoformat(doc["start_date"]) + timedelta(days=days)
                doc["start_date"] = start.isoformat()

            folder, doc = _copy_of_batch0(tmp_path, f"moved{days}", move)
            _seed_from(folder)
            rows = _table()
            taken = _pipeline_dates()
            for pos, it in enumerate(doc["items"]):
                want = (date.fromisoformat(doc["start_date"]) + timedelta(days=pos)).isoformat()
                if want not in taken:
                    assert rows[it["id"]][0] == want, (days, it["id"])

        _seed_from(DATA_DIR)
        gone = {}

        def drop(doc):
            gone["id"] = doc["items"].pop(3)["id"]

        folder, doc = _copy_of_batch0(tmp_path, "dropped", drop)
        _seed_from(folder)
        rows = _table()
        assert rows[gone["id"]][:2] == (None, "withdrawn")
        start = date.fromisoformat(doc["start_date"])
        assert rows[doc["items"][3]["id"]][0] == (start + timedelta(days=3)).isoformat()
    finally:
        _seed_from(DATA_DIR)
    assert _table() == before


def test_loader_leaves_pipeline_rows_alone(client):
    """A word the daily pipeline stored (batch "auto") is in no file. The
    loader must not withdraw it or take its date."""
    from app.db import SessionLocal
    from app.models import WordOrigin, WordRoute
    db = SessionLocal()
    try:
        db.add(WordOrigin(id="test-auto", batch="auto", rank=0, scheduled_date="2999-01-01",
                          mw_key="yoga", sanskrit_dev="x", sanskrit_iast="x", status="approved"))
        db.add(WordRoute(id="test-auto.en.x", origin_id="test-auto", rank=0, lang="en",
                         lang_name="English", word="x", script="latin", kind="loan",
                         confidence="certain", hops=[], source_keys=["ahd"], status="approved"))
        db.commit()
    finally:
        db.close()
    try:
        _seed_from(DATA_DIR)
        assert _table()["test-auto"][:2] == ("2999-01-01", "approved")
    finally:
        db = SessionLocal()
        try:
            for rr in db.query(WordRoute).filter(WordRoute.origin_id == "test-auto").all():
                db.delete(rr)
            row = db.query(WordOrigin).filter(WordOrigin.id == "test-auto").first()
            if row is not None:
                db.delete(row)
            db.commit()
        finally:
            db.close()


def test_a_later_batch_cannot_take_over_an_origin(client, tmp_path):
    """A second file that reuses an origin id is skipped with a warning: the
    first file's word keeps its date, its meaning and its "Found in"."""
    before = _table()
    folder, doc = _copy_of_batch0(tmp_path, "twice", lambda doc: None)
    first = doc["items"][0]
    last_day = date.fromisoformat(doc["start_date"]) + timedelta(days=len(doc["items"]))
    clash = {
        "batch": "0001", "made_on": "2026-10-02", "maker": "test", "model": "",
        "start_date": last_day.isoformat(),
        "items": [{
            "id": first["id"], "status": "approved", "mw_key": first["mw_key"],
            "sanskrit": first["sanskrit"], "gloss": "another meaning",
            "attested_abbr": [], "attested": "", "note": "",
            "routes": [{
                "id": first["id"] + ".en.madeup", "status": "approved", "lang": "en",
                "lang_name": "English", "word": "madeup", "script": "latin", "roman": "",
                "gloss": "x", "kind": "loan", "confidence": "certain", "hops": [],
                "sources": ["ahd"], "lookup": "madeup", "checked_on": "2026-10-02",
                "checked_by": "rule"}],
        }],
    }
    (folder / "batch-9999.json").write_text(json.dumps(clash, ensure_ascii=False), encoding="utf-8")
    try:
        _seed_from(folder)
        assert _table() == before
    finally:
        _seed_from(DATA_DIR)


def _made_rows():
    # origins with scheduled dates, routes by origin.
    origins = [
        {"id": "a", "scheduled_date": "2026-10-15", "rank": 0},
        {"id": "b", "scheduled_date": "2026-10-16", "rank": 1},
        {"id": "c", "scheduled_date": "2026-10-17", "rank": 2},
    ]
    by_origin = {
        "a": [{"id": "a.en.x", "rank": 0, "status": "approved", "kind": "loan",
               "hops": [], "word": "x"},
              {"id": "a.de.y", "rank": 1, "status": "approved", "kind": "loan",
               "hops": [{"lang": "X", "form": "y"}], "word": "y"}],
        "b": [{"id": "b.en.z", "rank": 0, "status": "approved", "kind": "loan",
               "hops": [], "word": "z"}],
        "c": [{"id": "c.en.w", "rank": 0, "status": "approved", "kind": "loan",
               "hops": [], "word": "w"}],
    }
    return origins, by_origin


def test_pick():
    from app.services import word_origins as svc
    origins, by_origin = _made_rows()
    # Scheduled word on its date headlines its first route.
    o, r = svc.pick(origins, by_origin, "2026-10-16")
    assert o["id"] == "b" and r["id"] == "b.en.z"
    # Before the first date: nothing.
    o, r = svc.pick(origins, by_origin, "2026-10-14")
    assert o is None and r is None
    # Same date gives the same answer on every call.
    o1, r1 = svc.pick(origins, by_origin, "2026-10-20")
    o2, r2 = svc.pick(origins, by_origin, "2026-10-20")
    assert (o1["id"], r1["id"]) == (o2["id"], r2["id"])
    # After the last date the list comes round; second lap headlines next route.
    # First lap: 10-15 a, 10-16 b, 10-17 c, 10-18 a, 10-19 b, 10-20 c,
    # second lap starts 10-18+3=10-21? Compute offset from 10-15:
    # 10-18 offset 3 -> them[0]=a again, lap 1 -> route 1 (a.de.y).
    o, r = svc.pick(origins, by_origin, "2026-10-18")
    assert o["id"] == "a" and r["id"] == "a.de.y", (o, r)


def test_today_empty_table(client):
    from app.db import SessionLocal
    from app.models import WordOrigin, WordRoute
    db = SessionLocal()
    try:
        o_rows = db.query(WordOrigin).all()
        r_rows = db.query(WordRoute).all()
        saved_o = [(o.id, o.status) for o in o_rows]
        saved_r = [(r.id, r.status) for r in r_rows]
        for o in o_rows:
            db.delete(o)
        for r in r_rows:
            # origins cascade would delete, but be explicit for detached rows
            try:
                db.delete(r)
            except Exception:
                pass
        db.commit()
        h = _auth_h(client, "wordempty")
        resp = client.get("/word-origins/today", headers=h)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["available"] is False
        assert body["origin"] is None
        assert body["headline_route_id"] == ""
    finally:
        db.close()
        # Restore by re-seeding.
        from app.db import SessionLocal as SL
        from app.seeds.word_origins import seed_word_origins
        db2 = SL()
        try:
            seed_word_origins(db2)
            db2.commit()
        finally:
            db2.close()


def test_origin_404(client):
    h = _auth_h(client, "word404")
    assert client.get("/word-origins/no-such-word", headers=h).status_code == 404
    # A row scheduled tomorrow is 404 until its day.
    from app.db import SessionLocal
    from app.models import WordOrigin as WO, WordRoute as WR
    from app.services.localtime import local_date
    today = local_date("UTC")
    db = SessionLocal()
    try:
        # The first day after today that no word holds (the date is unique,
        # and a batch may well be running through tomorrow).
        held = {o.scheduled_date for o in db.query(WO).all() if o.id != "test-future"}
        nxt = date.fromisoformat(today) + timedelta(days=1)
        while nxt.isoformat() in held:
            nxt += timedelta(days=1)
        fut_day = nxt.isoformat()
        fo = db.query(WO).filter(WO.id == "test-future").first()
        if fo is None:
            fo = WO(id="test-future", batch="test", rank=999,
                    scheduled_date=fut_day, mw_key="agni",
                    sanskrit_dev="x", sanskrit_iast="x",
                    gloss="t", status="approved")
            db.add(fo)
            db.add(WR(id="test-future.en.x", origin_id="test-future",
                      rank=0, lang="en", lang_name="English", word="x",
                      script="latin", kind="loan", confidence="certain",
                      hops=[], source_keys=["ahd"], status="approved"))
            db.commit()
        else:
            fo.scheduled_date = fut_day
            fo.status = "approved"
            db.commit()
    finally:
        db.close()
    assert client.get("/word-origins/test-future", headers=h).status_code == 404

    def _set(**fields):
        db2 = SessionLocal()
        try:
            row = db2.query(WO).filter(WO.id == "test-future").first()
            for name, value in fields.items():
                setattr(row, name, value)
            db2.commit()
        finally:
            db2.close()

    try:
        # Once its day has come the same row is served...
        _set(scheduled_date="2000-01-01")
        assert client.get("/word-origins/test-future", headers=h).status_code == 200
        ids = [o["id"] for o in client.get("/word-origins", headers=h).json()["origins"]]
        assert "test-future" in ids
        # ...and withdrawn it is 404 again, and gone from the list.
        _set(status="withdrawn")
        assert client.get("/word-origins/test-future", headers=h).status_code == 404
        ids = [o["id"] for o in client.get("/word-origins", headers=h).json()["origins"]]
        assert "test-future" not in ids
    finally:
        db3 = SessionLocal()
        try:
            for rr in db3.query(WR).filter(WR.origin_id == "test-future").all():
                db3.delete(rr)
            fo2 = db3.query(WO).filter(WO.id == "test-future").first()
            if fo2 is not None:
                db3.delete(fo2)
            db3.commit()
        finally:
            db3.close()


def test_post_today_and_me_unchanged(client):
    h = _auth_h(client, "wordnowrite")
    before = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    assert client.post("/word-origins/today", headers=h).status_code in (404, 405)
    client.get("/word-origins/today", headers=h)
    # List may be empty before the start date; still a read.
    client.get("/word-origins", headers=h)
    after = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    assert before == after


def test_include_related_off(client, monkeypatch):
    from app.services import word_origins as svc
    monkeypatch.setattr(svc, "INCLUDE_RELATED", False)
    h = _auth_h(client, "wordnorel")
    # Patch the day into the batch window so /today has an answer.
    import app.services.localtime as lt
    monkeypatch.setattr(lt, "local_date", lambda tz=None: "2026-10-20")
    body = client.get("/word-origins/today", headers=h).json()
    if body.get("available"):
        for r in body["origin"]["routes"]:
            assert r["kind"] != "related", r["id"]
    # agni carries only related routes in batch 0, so it has no card.
    assert client.get("/word-origins/agni", headers=h).status_code == 404
