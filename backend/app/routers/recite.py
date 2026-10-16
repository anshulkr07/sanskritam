"""POST /recite/score + GET /recite/due (handover_recite 8.3, 8.6)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.config import settings
from app.db import get_db
from app.models import Learner, ReciteAttempt, Shloka
from app.services import activity as act
from app.services import review as rev
from app.services import scorer_client
from app.services.audio_meta import estimate_seconds
from app.services.chant_text import chant_lines, verse_uid as _uid
from app.services.localtime import local_date_of
from app.services.recite_tips import tips as _tips

router = APIRouter(prefix="/recite")

_BAND_MAP = {"green": "ok", "red": "fix", "amber": "unclear"}


def _parse_unit(unit: str, lines: list[dict]) -> list[dict]:
    u = (unit or "verse").strip()
    if u == "verse":
        return [ln for ln in lines if ln.get("kind") != "speaker"]
    if u.startswith("line:"):
        try:
            i = int(u.split(":")[1])
        except ValueError:
            raise HTTPException(status_code=422, detail="Bad unit.")
        return [ln for ln in lines if ln.get("i") == i]
    if u.startswith("lines:"):
        try:
            a, b = u.split(":")[1].split("-")
            lo, hi = int(a), int(b)
        except ValueError:
            raise HTTPException(status_code=422, detail="Bad unit.")
        return [ln for ln in lines if lo <= ln.get("i", -1) <= hi]
    raise HTTPException(status_code=422, detail="Bad unit.")


async def rubric_v2(reference: list[str], res: dict, audio: bytes):
    """Rubric v2 for one scored recording: words from the transcript, flow
    and pace from voiced spans measured in the audio. None when it cannot
    be computed; the old percent still stands then."""
    import asyncio

    from app.services.recite_scoring_v2 import score_recording
    from app.services.recite_timing import voiced_spans
    try:
        spans = await asyncio.to_thread(voiced_spans, audio)
        return score_recording(reference, res.get("heard", "") or "", spans)
    except Exception:
        return None


@router.post("/stream-ticket")
def stream_ticket(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """A short-lived, single-use ticket for /ws/recite/{ticket} (live
    captions). The provider key stays on the server."""
    from app.services.play.matches import make_ticket
    if not settings.sarvam_api_key:
        raise HTTPException(status_code=503, detail="Live captions are not available.")
    from app.services.quota import _limit, usage_since
    if settings.quota_enabled and usage_since(db, learner.id, "stt_seconds",
                                              settings.quota_window_hours) >= _limit("stt_seconds"):
        raise HTTPException(status_code=429, detail="Speech allowance used up. Try again later.")
    return {"ticket": make_ticket(db, learner, None, scope="recite"),
            "max_seconds": STREAM_MAX_SECONDS}


STREAM_MAX_SECONDS = 120


@router.post("/score")
async def score_recite(
    file: UploadFile = File(...),
    verse_uid: str = Form(""),
    unit: str = Form("verse"),
    mode: str = Form("strict"),
    purpose: str = Form("practise"),
    hide_level: int = Form(0),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    strict = (mode or "strict") != "liberal"
    # 1. Find verse.
    shloka = db.query(Shloka).filter(Shloka.verse_uid == verse_uid).first()
    if shloka is None:
        # Fallback: compute over rows for DBs whose listener has not run.
        for s in db.query(Shloka).all():
            if _uid(s.source_ref or "", s.devanagari or "") == verse_uid:
                shloka = s
                break
    if shloka is None:
        raise HTTPException(status_code=404, detail="No such verse.")
    lines = chant_lines(shloka.devanagari or "")
    use = _parse_unit(unit, lines)
    reference = [ln["tts"] for ln in use]
    data = await file.read()
    # 3. Daily cap.
    day = local_date_of(datetime.now(timezone.utc), getattr(learner, "timezone", None))
    secs = estimate_seconds(data)
    from app.commerce.access import require_practice
    require_practice(db, learner, shloka, secs)
    dur_ms = int(secs * 1000)
    # Sum today's duration.
    from sqlalchemy import func as _func
    today_rows = db.query(ReciteAttempt).filter(
        ReciteAttempt.learner_id == learner.id).all()
    used = sum(r.duration_ms or 0 for r in today_rows
               if local_date_of(r.created_at, getattr(learner, "timezone", None)) == day)
    if used + dur_ms > settings.quota_recite_seconds_per_day * 1000:
        from app.services.localtime import local_now
        now_local = local_now(getattr(learner, "timezone", None))
        secs_left = max(0, 24 * 3600 - (now_local.hour * 3600 + now_local.minute * 60 + now_local.second))
        raise HTTPException(status_code=429, detail="Daily recitation time used up. Try again tomorrow.",
                            headers={"Retry-After": str(secs_left)})
    # 4/5. Scorer.
    res = await scorer_client.score_attempt(data, reference, strict, db=db,
                                           learner=learner, surface="recite")
    dur_ms = int(res.get("duration_ms", dur_ms))
    status = res.get("status", "scored")
    n = res.get("n", {}) or {}
    g = int(n.get("green", 0))
    r_ = int(n.get("red", 0))
    a_ = int(n.get("amber", 0))
    # Map bands: scorer returns flat list for fake; real returns per-line.
    raw_lines = res.get("lines", [])
    # Normalise to per-unit-line akshara rows with mapped bands.
    out_lines = []
    flat: list[dict] = []
    if raw_lines and raw_lines and isinstance(raw_lines[0], dict):
        flat = raw_lines  # fake shape
    else:
        for grp in raw_lines:
            flat.extend(grp if isinstance(grp, list) else [])
    # Group flat back by use-lines proportionally? Fake has one group; for
    # real scorer lines already align per reference line. Re-split by counts
    # is unnecessary: return one row per reference line with mapped bands by
    # slicing flat sequentially using per-line akshara counts is complex
    # without counts; instead emit per-line slices from raw when nested.
    if raw_lines and raw_lines and isinstance(raw_lines[0], list):
        for idx, grp in enumerate(raw_lines):
            aks = [{"t": b.get("t", ""), "band": _BAND_MAP.get(b.get("band", ""), "unclear"),
                    **({"heard": b.get("heard", "")} if b.get("heard") else {})}
                   for b in grp]
            out_lines.append({"i": use[idx]["i"] if idx < len(use) else idx, "aksharas": aks})
        flat_mapped = [a for grp in out_lines for a in grp["aksharas"]]
    else:
        mapped = [{"t": b.get("t", ""), "band": _BAND_MAP.get(b.get("band", ""), "unclear"),
                   **({"heard": b.get("heard", "")} if b.get("heard") else {})} for b in flat]
        # Single pseudo-line when fake.
        out_lines = [{"i": use[0]["i"] if use else 0, "aksharas": mapped}] if mapped else []
        flat_mapped = mapped
    pct = None
    if status == "scored":
        pct = (res.get("percent_strict", 0.0) * 100.0) if strict else (res.get("percent_liberal", 0.0) * 100.0)
        pct = round(float(pct), 1)
    bands_str = "".join({"ok": "o", "fix": "f", "unclear": "u"}.get(b.get("band", "unclear"), "u") for b in flat_mapped)[:512]
    perfect = bool(status == "scored" and pct == 100.0 and a_ == 0)
    tip_list = _tips([{"t": b.get("t", ""), "band": {"ok": "green", "fix": "red", "unclear": "amber"}.get(b.get("band", "unclear"), "amber"),
                             "heard": b.get("heard", "")} for b in flat_mapped],
                     [l.get("i", 0) for l in use for _ in range(99)][:len(flat_mapped)],
                     perfect=perfect)
    row = ReciteAttempt(learner_id=learner.id, verse_uid=verse_uid, unit=unit[:16],
                        purpose=purpose[:16], mode=("strict" if strict else "liberal"),
                        status=status, percent=pct, n_ok=g, n_fix=r_, n_unclear=a_,
                        bands=bands_str, duration_ms=dur_ms)
    # Rubric v2 components (handover_games_daily_multiplayer §8). Timing
    # evidence comes from the provider when it returns timestamps; without
    # them the timing components stay None — partial, never invented.
    components_payload = None
    if status == "scored":
        v2 = await rubric_v2(reference, res, data)
        if v2 is not None and v2.status == "scored":
            components_payload = v2.as_payload()
    row.components = components_payload
    db.add(row)
    review_info = None
    if purpose == "recite" and unit == "verse":
        if status == "unclear":
            verdict = "unsure"
        elif (pct or 0) >= 90:
            verdict = "correct"
        elif (pct or 0) >= 70:
            verdict = "off_by_one"
        else:
            verdict = "incorrect"
        if verdict != "unsure":
            ri = rev.schedule_review(db, learner.id, f"verse:{verse_uid}", "verse", verdict)
            db.flush()
            if ri is not None:
                review_info = {"verdict": verdict, "due_at": ri.due_at.isoformat() if hasattr(ri.due_at, "isoformat") else str(ri.due_at)}
        else:
            review_info = {"verdict": "unsure", "due_at": ""}
        xp = 10 if (pct or 0) >= 90 and status == "scored" else (5 if 70 <= (pct or 0) < 90 else 0)
        if xp:
            act.record_activity(db, learner, xp=xp, attempts=1)
    db.commit()
    resp = {"status": status, "percent": pct, "mode": "strict" if strict else "liberal",
            "counts": {"ok": g, "fix": r_, "unclear": a_},
            "lines": out_lines if status == "scored" else [],
            "tips": tip_list, "perfect": perfect, "heard": res.get("heard", "")}
    if components_payload is not None:
        resp["components"] = components_payload.get("components")
        resp["rubric_version"] = components_payload.get("rubric_version")
        resp["total"] = components_payload.get("total")
    if review_info is not None:
        resp["review"] = review_info
    return resp


@router.get("/due")
def recite_due(
    limit: int = 20,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    items = rev.due_items(db, learner.id, limit=limit, kinds=["verse"])
    out = []
    for it in items:
        key = it.item_key or ""
        uid = key.split("verse:", 1)[1] if key.startswith("verse:") else ""
        shloka = db.query(Shloka).filter(Shloka.verse_uid == uid).first()
        last = (db.query(ReciteAttempt)
                .filter(ReciteAttempt.learner_id == learner.id, ReciteAttempt.verse_uid == uid)
                .order_by(ReciteAttempt.id.desc()).first())
        out.append({"verse_uid": uid,
                    "source_ref": shloka.source_ref if shloka else "",
                    "due_at": it.due_at.isoformat() if hasattr(it.due_at, "isoformat") else str(it.due_at),
                    "last_percent": (last.percent if last else None)})
    return {"items": out}
