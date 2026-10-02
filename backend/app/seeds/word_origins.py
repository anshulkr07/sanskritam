"""Word journey seed (handover_language 5.2).

Content is data in ``app/seeds/word_origins/batch-*.json``. The database is
a copy of the files, never the other way round. Idempotent: a second boot
changes nothing. Rows that no file carries any more become withdrawn, never
deleted. If vidyut.lipi cannot be imported, load nothing and log one warning.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path

logger = logging.getLogger("shabd.seed.word_origins")


def _data_dir() -> Path:
    return Path(__file__).resolve().parent / "word_origins"


def seed_word_origins(db) -> dict:
    """Load every batch-*.json into word_origins/word_routes. Idempotent."""
    try:
        import vidyut.lipi as lipi
    except Exception:
        logger.warning("word_origins: vidyut.lipi unavailable, loading nothing")
        return {"origins": 0, "routes": 0, "skipped_no_lipi": True}
    from app.models import WordOrigin, WordRoute
    from app.services import iast as iast_svc
    from app.services.romanize import romanize_ru

    files = sorted(_data_dir().glob("batch-*.json"))
    seen_origins: set[str] = set()
    seen_routes: set[str] = set()
    n_origins = 0
    n_routes = 0

    def _slp_to_dev(slp: str) -> str:
        return lipi.transliterate((slp or "").strip(), lipi.Scheme.Slp1, lipi.Scheme.Devanagari)

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
        items = doc.get("items") or []
        for pos, it in enumerate(items):
            if (it.get("status") or "") != "approved":
                continue
            routes = [r for r in (it.get("routes") or []) if (r.get("status") or "") == "approved"]
            if not routes:
                continue
            oid = str(it.get("id") or "").strip()
            if not oid:
                continue
            mw_key = str(it.get("mw_key") or "").strip()
            if not mw_key:
                continue
            try:
                dev = _slp_to_dev(mw_key)
                iast = iast_svc.to_iast(dev)
            except Exception:
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
            try:
                sched = (start + timedelta(days=pos)).isoformat()
            except Exception:
                continue
            seen_origins.add(oid)
            row = db.query(WordOrigin).filter(WordOrigin.id == oid).first()
            if row is None:
                row = WordOrigin(id=oid)
                db.add(row)
            row.batch = batch[:8]
            row.rank = pos
            row.scheduled_date = sched
            row.mw_key = mw_key[:64]
            row.sanskrit_dev = (dev or "")[:64]
            row.sanskrit_iast = (iast or "")[:64]
            row.display_dev = (disp_dev or "")[:64]
            row.display_iast = (disp_iast or "")[:64]
            row.gloss = str(it.get("gloss") or "")[:200]
            row.attested = str(it.get("attested") or "")[:200]
            row.note = str(it.get("note") or "")
            row.status = "approved"
            n_origins += 1
            for rpos, r in enumerate(routes):
                rid = str(r.get("id") or "").strip()
                if not rid:
                    continue
                seen_routes.add(rid)
                script = str(r.get("script") or "")
                word = str(r.get("word") or "")
                roman = ""
                if script == "cyrillic":
                    try:
                        roman = romanize_ru(word)[:64]
                    except Exception:
                        roman = str(r.get("roman") or "")[:64]
                rrow = db.query(WordRoute).filter(WordRoute.id == rid).first()
                if rrow is None:
                    rrow = WordRoute(id=rid)
                    db.add(rrow)
                rrow.origin_id = oid
                rrow.rank = rpos
                rrow.lang = str(r.get("lang") or "")[:8]
                rrow.lang_name = str(r.get("lang_name") or "")[:32]
                rrow.word = word[:64]
                rrow.script = script[:16]
                rrow.roman = roman[:64]
                rrow.gloss = str(r.get("gloss") or "")[:160]
                rrow.kind = str(r.get("kind") or "")[:8]
                rrow.confidence = str(r.get("confidence") or "")[:12]
                rrow.hops = r.get("hops") or []
                rrow.source_keys = r.get("sources") or []
                rrow.lookup = str(r.get("lookup") or "")[:120]
                rrow.checked_on = str(r.get("checked_on") or "")[:10]
                rrow.status = "approved"
                n_routes += 1
    # Withdraw rows no file carries any more. Never delete.
    try:
        for row in db.query(WordOrigin).all():
            if row.id not in seen_origins and (row.status or "") == "approved":
                row.status = "withdrawn"
        for rrow in db.query(WordRoute).all():
            if rrow.id not in seen_routes and (rrow.status or "") == "approved":
                rrow.status = "withdrawn"
    except Exception as e:
        logger.warning("word_origins: withdraw pass failed: %s", e)
    db.flush()
    logger.info("WordOrigins: %d origins, %d routes from %d batches", n_origins, n_routes, len(files))
    return {"origins": n_origins, "routes": n_routes, "batches": len(files)}
