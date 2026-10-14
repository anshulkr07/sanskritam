"""Word journey seed (handover_language 5.2).

Content is data in ``app/seeds/word_origins/batch-*.json``. The database is
a copy of the files, never the other way round. Idempotent: a second boot
changes nothing. Rows that no file carries any more become withdrawn, never
deleted. If vidyut.lipi cannot be imported, load nothing and log one warning.

The files are read first and written second. ``scheduled_date`` is unique,
so a batch whose ``start_date`` moved, or that lost an item, hands dates
from one row to another: every date that is about to change is cleared and
flushed before the new ones are set. A file that cannot be honoured (an id
or a date another item already holds) costs that one item and a warning,
never the boot: ``run_seed()`` runs at startup and a raise there stops the
backend.

The tables also hold rows that come from no file: the daily pipeline writes
origins with ``batch = "auto"`` and routes with ``checked_by = "page"``.
Those are left exactly as they are; a file item that reuses one of their
ids or dates is skipped.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path

logger = logging.getLogger("shabd.seed.word_origins")

# How the daily pipeline marks the rows it writes straight into the tables.
AUTO_BATCH = "auto"
PAGE_CHECKED = "page"


def _data_dir() -> Path:
    return Path(__file__).resolve().parent / "word_origins"


def _read_files(lipi) -> tuple[dict[str, dict], dict[str, dict], int]:
    """What the batch files ask for: ({origin id: fields}, {route id: fields}, files)."""
    from app.services import iast as iast_svc
    from app.services.romanize import romanize_ru

    def _slp_to_dev(slp: str) -> str:
        return lipi.transliterate((slp or "").strip(), lipi.Scheme.Slp1, lipi.Scheme.Devanagari)

    origins: dict[str, dict] = {}
    routes: dict[str, dict] = {}
    date_owner: dict[str, str] = {}
    triple_owner: dict[tuple[str, str, str], str] = {}
    files = sorted(_data_dir().glob("batch-*.json"))

    for path in files:
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning("word_origins: cannot read %s: %s", path.name, e)
            continue
        batch = str(doc.get("batch") or path.stem.replace("batch-", ""))
        try:
            start = date.fromisoformat(str(doc.get("start_date") or ""))
        except Exception:
            logger.warning("word_origins: %s has no valid start_date, skipping", path.name)
            continue
        for pos, it in enumerate(doc.get("items") or []):
            if (it.get("status") or "") != "approved":
                continue
            item_routes = [r for r in (it.get("routes") or []) if (r.get("status") or "") == "approved"]
            oid = str(it.get("id") or "").strip()
            mw_key = str(it.get("mw_key") or "").strip()
            if not item_routes or not oid or not mw_key:
                continue
            if oid in origins:
                logger.warning("word_origins: %s repeats origin id %s, keeping the first", path.name, oid)
                continue
            try:
                dev = _slp_to_dev(mw_key)
                iast = iast_svc.to_iast(dev)
                sched = (start + timedelta(days=pos)).isoformat()
            except Exception:
                continue
            if sched in date_owner:
                logger.warning("word_origins: %s puts %s on %s, which %s already holds; skipped",
                               path.name, oid, sched, date_owner[sched])
                continue
            display_key = str(it.get("display_key") or "").strip()
            disp_dev = ""
            disp_iast = ""
            if display_key:
                try:
                    disp_dev = _slp_to_dev(display_key)
                    disp_iast = iast_svc.to_iast(disp_dev)
                except Exception:
                    disp_dev = ""
                    disp_iast = ""
            date_owner[sched] = oid
            origins[oid] = {
                "batch": batch[:8],
                "rank": pos,
                "scheduled_date": sched,
                "mw_key": mw_key[:64],
                "sanskrit_dev": (dev or "")[:64],
                "sanskrit_iast": (iast or "")[:64],
                "display_dev": (disp_dev or "")[:64],
                "display_iast": (disp_iast or "")[:64],
                "gloss": str(it.get("gloss") or "")[:200],
                "attested": str(it.get("attested") or "")[:200],
                "note": str(it.get("note") or ""),
                "status": "approved",
            }
            for rpos, r in enumerate(item_routes):
                rid = str(r.get("id") or "").strip()
                if not rid:
                    continue
                if rid in routes:
                    logger.warning("word_origins: %s repeats route id %s, keeping the first", path.name, rid)
                    continue
                script = str(r.get("script") or "")
                word = str(r.get("word") or "")
                lang = str(r.get("lang") or "")[:8]
                triple = (oid, lang, word[:64])
                if triple in triple_owner:
                    logger.warning("word_origins: %s repeats %s under %s; skipped",
                                   rid, triple_owner[triple], oid)
                    continue
                triple_owner[triple] = rid
                roman = str(r.get("roman") or "")[:64] if script != "latin" else ""
                if script == "cyrillic":
                    try:
                        roman = romanize_ru(word)[:64]
                    except Exception:
                        roman = str(r.get("roman") or "")[:64]
                routes[rid] = {
                    "origin_id": oid,
                    "rank": rpos,
                    "lang": lang,
                    "lang_name": str(r.get("lang_name") or "")[:32],
                    "word": word[:64],
                    "script": script[:16],
                    "roman": roman[:64],
                    "gloss": str(r.get("gloss") or "")[:160],
                    "kind": str(r.get("kind") or "")[:8],
                    "confidence": str(r.get("confidence") or "")[:12],
                    "hops": r.get("hops") or [],
                    "source_keys": r.get("sources") or [],
                    "lookup": str(r.get("lookup") or "")[:120],
                    "checked_on": str(r.get("checked_on") or "")[:10],
                    "checked_by": str(r.get("checked_by") or "")[:12],
                    "source_url": str(r.get("source_url") or "")[:500],
                    "source_site": str(r.get("source_site") or "")[:120],
                    "status": "approved",
                }
    return origins, routes, len(files)


def seed_word_origins(db) -> dict:
    """Load every batch-*.json into word_origins/word_routes. Idempotent."""
    try:
        import vidyut.lipi as lipi
    except Exception:
        logger.warning("word_origins: vidyut.lipi unavailable, loading nothing")
        return {"origins": 0, "routes": 0, "skipped_no_lipi": True}
    from app.models import WordOrigin, WordRoute

    want_origins, want_routes, n_files = _read_files(lipi)
    origin_rows = {row.id: row for row in db.query(WordOrigin).all()}
    route_rows = {row.id: row for row in db.query(WordRoute).all()}

    # Rows the daily pipeline wrote (services/daily_content.py) come from no
    # file and are not this loader's: an origin with batch "auto", a route
    # with checked_by "page". They are never withdrawn or re-dated here and
    # keep their dates. A file item that reuses the id of one of them, or
    # wants a date one of them holds, is skipped. (2026-10-14: batch-0001's
    # ratri reused the pipeline's ratri, was skipped for its own date, and
    # left the pipeline row's date uncounted; mantra then took that date and
    # the unique index stopped the boot.)
    def _auto_origin(row) -> bool:
        return (row.batch or "") == AUTO_BATCH

    def _page_route(rrow) -> bool:
        return (getattr(rrow, "checked_by", "") or "") == PAGE_CHECKED

    auto_ids = {oid for oid, row in origin_rows.items() if _auto_origin(row)}
    auto_dates = {origin_rows[oid].scheduled_date: oid for oid in auto_ids
                  if origin_rows[oid].scheduled_date}
    for oid in list(want_origins):
        sched = want_origins[oid]["scheduled_date"]
        if oid in auto_ids:
            logger.warning("word_origins: %s is already the pipeline's word; skipped", oid)
        elif sched in auto_dates:
            logger.warning("word_origins: %s wants %s, which the pipeline's %s holds; skipped",
                           oid, sched, auto_dates[sched])
        else:
            continue
        del want_origins[oid]
        for rid in [r for r, f in want_routes.items() if f["origin_id"] == oid]:
            del want_routes[rid]

    # Withdraw rows no file carries any more. Never delete. A withdrawn word
    # gives its date back, so another word can take it.
    for oid, row in origin_rows.items():
        if oid not in want_origins and not _auto_origin(row):
            if (row.status or "") == "approved":
                row.status = "withdrawn"
            if row.scheduled_date is not None:
                row.scheduled_date = None
    for rid, rrow in route_rows.items():
        if rid not in want_routes and not _page_route(rrow) and (rrow.status or "") == "approved":
            rrow.status = "withdrawn"

    # Clear every date that is about to change before any new one is set, so
    # no two rows hold one date while the updates go out.
    for oid, fields in want_origins.items():
        row = origin_rows.get(oid)
        if row is not None and row.scheduled_date is not None \
                and row.scheduled_date != fields["scheduled_date"]:
            row.scheduled_date = None
    db.flush()

    for oid, fields in want_origins.items():
        row = origin_rows.get(oid)
        if row is None:
            row = WordOrigin(id=oid)
            db.add(row)
            origin_rows[oid] = row
        for name, value in fields.items():
            setattr(row, name, value)

    # (origin, language, word) is unique too. A route that comes back under a
    # new id while its old row is still in the table cannot be stored.
    triple_owner = {(r.origin_id, r.lang or "", r.word or ""): r.id for r in route_rows.values()}
    n_routes = 0
    for rid, fields in want_routes.items():
        triple = (fields["origin_id"], fields["lang"], fields["word"])
        owner = triple_owner.get(triple)
        if owner is not None and owner != rid:
            logger.warning("word_origins: %s is already stored as %s; skipped", rid, owner)
            continue
        triple_owner[triple] = rid
        rrow = route_rows.get(rid)
        if rrow is None:
            rrow = WordRoute(id=rid)
            db.add(rrow)
            route_rows[rid] = rrow
        for name, value in fields.items():
            setattr(rrow, name, value)
        n_routes += 1
    db.flush()
    logger.info("WordOrigins: %d origins, %d routes from %d batches", len(want_origins), n_routes, n_files)
    return {"origins": len(want_origins), "routes": n_routes, "batches": n_files}
