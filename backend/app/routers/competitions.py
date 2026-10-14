"""Competitions: current, attempts, leaderboard, results, master, profiles, admin."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.auth import require_admin, require_learner
from app.config import settings
from app.db import get_db
from app.models import (
    Certificate,
    Competition,
    CompetitionEntry,
    Learner,
    LearnerPublic,
    MonthlyWinner,
    ReciteAttempt,
    Shloka,
    VerseAudio,
)
from app.services import competitions as svc
from app.services import scorer_client
from app.services.audio_meta import estimate_seconds
from app.services.chant_text import chant_lines, verse_uid as _uid
from app.services.competition_rules import RULES, RULES_VERSION
from app.services.localtime import local_date_of, local_now

router = APIRouter()

_RESERVED = {"admin", "sanskritam", "moderator", "support"}
_NAME_RE = re.compile(r"^[\w .\-_]+$", re.UNICODE)

_leader_cache: dict[str, tuple[float, dict]] = {}


def _band_map(b):
    return {"green": "ok", "red": "fix", "amber": "unclear"}.get(b, "unclear")


def _eligibility(db: Session, learner: Learner) -> str | None:
    """None when eligible, else missing step code."""
    if not (getattr(learner, "google_sub", None) or getattr(learner, "apple_sub", None)):
        return "sign_in"
    pub = db.query(LearnerPublic).filter(LearnerPublic.learner_id == learner.id).first()
    if pub is None or not (pub.public_name or "").strip():
        return "public_name"
    if getattr(pub, "banned", False):
        return "banned"
    if pub.age_confirmed_at is None:
        return "age"
    if (pub.rules_version or "") != (settings.competition_rules_version or RULES_VERSION):
        return "rules"
    if pub.recordings_consent_at is None:
        return "consent"
    return None


def _public_piece_results(entry: CompetitionEntry | None) -> dict:
    out = {}
    for ref, v in ((entry.piece_results if entry else None) or {}).items():
        if isinstance(v, dict):
            out[ref] = {"percent": v.get("percent"), "at": v.get("at", "")}
    return out


def _comp_out(db: Session, comp: Competition, learner: Learner | None) -> dict:
    from app.services.competition_sets import event_progress, event_standings, is_set, uses_v2
    pieces = comp.pieces or []
    set_event = is_set(comp)
    me = None
    if learner is not None:
        entry = db.query(CompetitionEntry).filter(
            CompetitionEntry.competition_id == comp.id,
            CompetitionEntry.learner_id == learner.id).first()
        # Attempts today (counted).
        day = local_date_of(datetime.now(timezone.utc), getattr(learner, "timezone", None))
        today = [a for a in db.query(ReciteAttempt).filter(
            ReciteAttempt.learner_id == learner.id,
            ReciteAttempt.competition_id == comp.id,
            ReciteAttempt.counted.is_(True)).all()
            if local_date_of(a.created_at, getattr(learner, "timezone", None)) == day]
        best = entry.best_percent if entry else None
        rank = None
        progress = None
        if set_event and entry is not None:
            progress = event_progress(entry, comp)
            best = progress["provisional_total"] if progress["submitted"] else None
            for r in event_standings(db, comp, entry.division):
                if r["learner_id"] == learner.id:
                    rank = r["rank"]
                    break
        elif entry is not None and entry.best_percent is not None:
            ordered = svc.rank_entries(db, comp)
            for i, e in enumerate(ordered):
                if e.id == entry.id:
                    rank = i + 1
                    break
        me = {"best_percent": best, "rank": rank,
              "attempts_today": len(today),
              "attempts_left": max(0, settings.competition_attempts_per_day - len(today)),
              "division": entry.division if entry else None,
              "piece_results": _public_piece_results(entry),
              "set_progress": progress}
    return {"id": comp.id, "slug": comp.slug, "kind": comp.kind,
            "opens_at": comp.opens_at.isoformat() if comp.opens_at else "",
            "closes_at": comp.closes_at.isoformat() if comp.closes_at else "",
            "results_at": comp.results_at.isoformat() if comp.results_at else "",
            "status": comp.status, "pieces": pieces, "me": me,
            "is_set": set_event, "scoring": "v2" if uses_v2(comp) else "akshara",
            "rules_version": comp.rules_version or ""}


@router.get("/competitions/rules")
def get_rules():
    return {"version": RULES_VERSION, "rules": RULES}


@router.get("/competitions/current")
def get_current(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    from app.services.competition_sets import is_set
    # Weekly sets come first while a legacy single-verse event runs out.
    open_all = db.query(Competition).filter(Competition.status == "open").order_by(Competition.opens_at).all()
    sets_open = [c for c in open_all if is_set(c)]
    open_c = sets_open[-1] if sets_open else (open_all[0] if open_all else None)  # newest set
    nxt = db.query(Competition).filter(Competition.status == "scheduled").order_by(Competition.opens_at).first()
    last = None
    pubs = db.query(Competition).filter(Competition.status == "published").order_by(Competition.results_at.desc()).all()
    for c in pubs:
        e = db.query(CompetitionEntry).filter(
            CompetitionEntry.competition_id == c.id, CompetitionEntry.learner_id == learner.id).first()
        if e is not None:
            code = db.query(Certificate).filter(
                Certificate.competition_id == c.id, Certificate.learner_id == learner.id).first()
            last = {"competition": _comp_out(db, c, learner), "my_rank": e.final_rank,
                    "certificate_code": code.code if code else None}
            break
    return {"open": _comp_out(db, open_c, learner) if open_c else None,
            "next": _comp_out(db, nxt, learner) if nxt else None,
            "last": last}


@router.get("/competitions/standings")
def standings(period: str = Query("weekly"), division: str = Query("standard"),
              month: str = Query(""), limit: int = Query(50, ge=1, le=100),
              learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    """Recitation standings in the Leaderboards shape: the current weekly
    set event (ranked = finished all three verses) or the month's table
    (average of weekly totals). Kept apart from game points."""
    from app.services.competition_sets import (
        SET_VERSIONS, event_standings, is_set, monthly_standings, norm_division,
    )
    div = norm_division(division)

    def shape(rows, me_row, total, end, key, frozen):
        return {"period": period, "period_key": key, "board": "recitation", "scope": div,
                "period_end": end, "rows": rows[:limit], "total": total, "me": me_row,
                "empty": total == 0, "frozen": frozen}

    if period == "monthly":
        tz_now = local_now(getattr(learner, "timezone", None))
        key = month or f"{tz_now.year:04d}-{tz_now.month:02d}"
        table = monthly_standings(db, key, div)
        rows = [{"rank": r["rank"], "learner_id": r["learner_id"], "name": r["name"],
                 "score": r["average"], "participation": r["events_complete"],
                 "pending": r["events_pending"], "is_me": r["learner_id"] == learner.id}
                for r in table]
        me = next((r for r in rows if r["is_me"]), None)
        y, m = (int(x) for x in key.split("-"))
        end_local = datetime(y + (m == 12), m % 12 + 1, 1, tzinfo=svc._tz())
        return shape(rows, me, len(rows), end_local.astimezone(timezone.utc).isoformat(), key,
                     end_local <= datetime.now(timezone.utc))
    comps = [c for c in db.query(Competition).filter(
        Competition.rules_version.in_(SET_VERSIONS),
        Competition.status.in_(("open", "closed", "published"))).order_by(Competition.opens_at.desc()).all()
        if is_set(c)]
    comp = next((c for c in comps if c.status == "open"), comps[0] if comps else None)
    if comp is None:
        return shape([], None, 0, "", "", False)
    table = event_standings(db, comp, div)
    rows = [{"rank": r["rank"] or 0, "learner_id": r["learner_id"], "name": r["public_name"],
             "score": r["percent"], "participation": r["submitted"], "of": r["total"],
             "complete": r["complete"], "is_me": r["learner_id"] == learner.id}
            for r in table]
    ranked = [r for r in rows if r["complete"]]
    me = next((r for r in rows if r["is_me"]), None)
    closes = svc._as_aware(comp.closes_at).isoformat() if comp.closes_at else ""
    return shape(ranked, me, len(ranked), closes, comp.slug, comp.status != "open")


@router.get("/competitions/{comp_id}/leaderboard")
def leaderboard(comp_id: str, limit: int = Query(50, ge=1, le=100), division: str = Query(""),
                learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    from app.services.competition_sets import event_standings, is_set, norm_division
    comp = db.query(Competition).filter(Competition.id == comp_id).first()
    if comp is None:
        raise HTTPException(status_code=404, detail="No such competition.")
    mine = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id, CompetitionEntry.learner_id == learner.id).first()
    if is_set(comp):
        div = norm_division(division or (mine.division if mine else ""))
        rows_all = event_standings(db, comp, div)
        ranked = [r for r in rows_all if r["complete"]]
        rows = [{"rank": r["rank"], "public_name": r["public_name"], "percent": r["percent"],
                 "is_me": r["learner_id"] == learner.id} for r in ranked[:limit]]
        me = None
        for r in rows_all:
            if r["learner_id"] == learner.id:
                me = {"rank": r["rank"], "percent": r["percent"], "submitted": r["submitted"],
                      "total": r["total"], "complete": r["complete"]}
        return {"status": comp.status, "division": div, "rows": rows, "me": me,
                "ranked": len(ranked), "provisional": len(rows_all) - len(ranked)}
    import time
    now_t = time.time()
    cached = _leader_cache.get(comp_id)
    if cached and now_t - cached[0] < 30:
        rows = cached[1]["rows"]
    else:
        ordered = svc.rank_entries(db, comp)
        rows = [{"rank": i + 1, "public_name": e.public_name, "percent": e.best_percent}
                for i, e in enumerate(ordered[:limit])]
        _leader_cache[comp_id] = (now_t, {"rows": rows})
    me = None
    if mine is not None and mine.best_percent is not None:
        ordered = svc.rank_entries(db, comp)
        for i, e in enumerate(ordered):
            if e.id == mine.id:
                me = {"rank": i + 1, "percent": mine.best_percent}
                break
    return {"status": comp.status, "rows": rows, "me": me}


@router.get("/me/public-profile")
def get_profile(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    pub = db.query(LearnerPublic).filter(LearnerPublic.learner_id == learner.id).first()
    if pub is None:
        return {"public_name": "", "age_confirmed": False, "rules_version": "",
                "recordings_consent": False}
    return {"public_name": pub.public_name or "", "age_confirmed": pub.age_confirmed_at is not None,
            "rules_version": pub.rules_version or "",
            "recordings_consent": pub.recordings_consent_at is not None}


@router.put("/me/public-profile")
def put_profile(body: dict, learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    pub = db.query(LearnerPublic).filter(LearnerPublic.learner_id == learner.id).first()
    if pub is None:
        pub = LearnerPublic(learner_id=learner.id)
        db.add(pub)
    now = datetime.now(timezone.utc)
    # Public name is optional per request so eligibility steps can be saved
    # one at a time (name, 18+, rules, consent). Validate only when provided.
    if "public_name" in body:
        name = str(body.get("public_name", "") or "").strip()
        if not name or len(name) < 3 or len(name) > 24 or not _NAME_RE.match(name):
            raise HTTPException(status_code=422, detail="Bad public name.")
        if name.lower() in _RESERVED:
            raise HTTPException(status_code=422, detail="Name is reserved.")
        other = db.query(LearnerPublic).filter(LearnerPublic.learner_id != learner.id).all()
        if any((o.public_name or "").lower() == name.lower() for o in other):
            raise HTTPException(status_code=422, detail="Name is taken.")
        pub.public_name = name
    if body.get("age_confirmed"):
        pub.age_confirmed_at = pub.age_confirmed_at or now
    if body.get("rules_version"):
        pub.rules_version = str(body["rules_version"])[:32]
        pub.rules_accepted_at = now
    if body.get("recordings_consent"):
        pub.recordings_consent_at = pub.recordings_consent_at or now
    # Accept current rules shorthand.
    if body.get("rules_accepted"):
        pub.rules_version = settings.competition_rules_version or RULES_VERSION
        pub.rules_accepted_at = now
    db.commit()
    return {"public_name": pub.public_name, "age_confirmed": pub.age_confirmed_at is not None,
            "rules_version": pub.rules_version or "",
            "recordings_consent": pub.recordings_consent_at is not None}


def _audio_kind(data: bytes) -> tuple[str, str]:
    return ("wav", "audio/wav") if data[:4] == b"RIFF" else ("m4a", "audio/mp4")


@router.post("/competitions/{comp_id}/attempts")
async def post_attempt(
    comp_id: str,
    file: UploadFile = File(...),
    verse_uid: str = Form(""),
    camera: str = Form("{}"),
    hidden: bool = Form(True),
    division: str = Form("standard"),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    from app.routers.recite import rubric_v2
    from app.services.competition_sets import (
        event_progress, is_set, norm_division, pieces_for, record_piece_result, uses_v2,
    )
    from app.services.recite_scoring_v2 import is_complete

    comp = db.query(Competition).filter(Competition.id == comp_id).first()
    if comp is None:
        raise HTTPException(status_code=404, detail="No such competition.")
    if comp.status != "open":
        raise HTTPException(status_code=409, detail="This competition has closed")
    set_event = is_set(comp)
    entry = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.learner_id == learner.id).first()
    # Division freezes at entry (brief §9): later requests cannot switch it.
    div = entry.division if entry is not None else norm_division(division)
    pieces = pieces_for(comp, div) if set_event else [p for p in (comp.pieces or []) if isinstance(p, dict)]
    piece_uids = {p.get("verse_uid") for p in pieces}
    piece_refs = {p.get("source_ref") for p in pieces}
    shloka = db.query(Shloka).filter(Shloka.verse_uid == verse_uid).first()
    if shloka is None:
        for s in db.query(Shloka).all():
            if _uid(s.source_ref or "", s.devanagari or "") == verse_uid:
                shloka = s
                break
    if shloka is None or (verse_uid not in piece_uids and (shloka.source_ref not in piece_refs)):
        raise HTTPException(status_code=422, detail="Not a verse of your division's set.")
    step = _eligibility(db, learner)
    if step:
        raise HTTPException(status_code=403, detail=step)
    # Daily counted limit.
    day = local_date_of(datetime.now(timezone.utc), getattr(learner, "timezone", None))
    todays = [a for a in db.query(ReciteAttempt).filter(
        ReciteAttempt.learner_id == learner.id, ReciteAttempt.competition_id == comp.id,
        ReciteAttempt.counted.is_(True)).all()
        if local_date_of(a.created_at, getattr(learner, "timezone", None)) == day]
    if len(todays) >= settings.competition_attempts_per_day:
        raise HTTPException(status_code=429, detail="Daily attempts used up.")
    data = await file.read()
    lines = chant_lines(shloka.devanagari or "")
    reference = [ln["tts"] for ln in lines if ln.get("kind") != "speaker"]
    if not scorer_client.available():
        raise HTTPException(status_code=503, detail="Scoring is not available yet")
    # Ref chant URL for replay check.
    ref_url = ""
    try:
        statuses = [s.strip() for s in (settings.chant_serve_statuses or "").split(",") if s.strip()]
        va = db.query(VerseAudio).filter(VerseAudio.verse_uid == verse_uid,
                                         VerseAudio.voice == settings.chant_voice).first()
        if va is not None and va.qc_status in statuses:
            ref_url = va.url or ""
    except Exception:
        ref_url = ""
    res = await scorer_client.score_attempt(data, reference, True, db=db,
                                           learner=learner, surface="competition", ref_audio_url=ref_url)
    # Rubric v2 (words, order, flow, pace) scores events run under it; a
    # result missing any component does not count there.
    v2 = None
    if res.get("status") == "scored":
        v2 = await rubric_v2(reference, res, data)
    try:
        cam = json.loads(camera or "{}")
    except Exception:
        cam = {}
    # Camera pass rule.
    face = float(cam.get("face_ratio", 0) or 0)
    eyes = float(cam.get("eyes_closed_ratio", 0) or 0)
    multi = float(cam.get("multi_face_ratio", 0) or 0)
    app_v = str(cam.get("app_version", "1.1.0"))
    def _v_ok(v: str) -> bool:
        try:
            return tuple(int(x) for x in v.split(".")) >= (1, 2, 0)
        except Exception:
            return False
    counted = True
    why = ""
    if res.get("status") != "scored":
        counted, why = False, "unclear"
    elif uses_v2(comp) and (v2 is None or not is_complete(v2)):
        counted, why = False, "no_timing"
    elif not hidden:
        counted, why = False, "text_shown"
    elif face < settings.competition_min_face_ratio:
        counted, why = False, "no_face"
    elif multi > settings.competition_max_multi_face_ratio:
        counted, why = False, "two_faces"
    elif eyes < settings.competition_min_eyes_closed_ratio:
        counted, why = False, "eyes_open"
    elif not _v_ok(app_v):
        counted, why = False, "old_app"
    n = res.get("n", {}) or {}
    pct = None
    if res.get("status") == "scored":
        if uses_v2(comp) and v2 is not None and is_complete(v2):
            pct = float(v2.total)
        else:
            pct = round(float(res.get("percent_strict", 0.0)) * 100.0, 1)
    row = ReciteAttempt(learner_id=learner.id, verse_uid=verse_uid, unit="verse",
                        purpose="competition", mode="strict",
                        status=res.get("status", "scored"), percent=pct,
                        n_ok=int(n.get("green", 0)), n_fix=int(n.get("red", 0)),
                        n_unclear=int(n.get("amber", 0)),
                        bands="", duration_ms=int(res.get("duration_ms", estimate_seconds(data) * 1000)),
                        competition_id=comp.id, camera=cam, counted=counted,
                        flags=[] if counted else [why],
                        components=v2.as_payload() if v2 is not None and v2.status == "scored" else None)
    db.add(row)
    db.flush()
    # Entry.
    pub = db.query(LearnerPublic).filter(LearnerPublic.learner_id == learner.id).first()
    if entry is None:
        entry = CompetitionEntry(competition_id=comp.id, learner_id=learner.id,
                                 public_name=(pub.public_name if pub else learner.display_name or "")[:64],
                                 division=div, rules_version=comp.rules_version or "")
        db.add(entry)
        db.flush()
    ext, mime = _audio_kind(data)

    def _store(key: str, old: str | None) -> str | None:
        try:
            from app.services.storage import get_storage
            store = get_storage()
            if old and old != key:
                try:
                    store.delete_private(old)
                except Exception:
                    pass
            return store.store_private(data, key, mime)
        except Exception:
            return None

    flags = dict(entry.flags or {})
    mouth = float(cam.get("mouth_moving_ratio", 1) or 1)
    sim = res.get("replay_similarity")
    # Set events: best eligible attempt per prescribed piece (event total =
    # mean of ALL pieces, so nobody ranks by picking easy verses).
    piece_best = False
    set_progress = None
    if set_event:
        if counted and pct is not None:
            piece_ref = next((p.get("source_ref", verse_uid) for p in pieces
                              if p.get("verse_uid") == verse_uid), shloka.source_ref or verse_uid)
            prev = (entry.piece_results or {}).get(piece_ref) or {}
            if prev.get("percent") is None or float(prev["percent"]) < pct:
                key = _store(f"competitions/{comp.id}/{entry.id}/{verse_uid}.{ext}", prev.get("audio_key"))
                if key is None:
                    flags["no_audio"] = True
                piece_best = record_piece_result(db, entry, comp, piece_ref, row.id, pct, key)
                if mouth < 0.3:
                    flags["mouth_still"] = True
                entry.best_at = datetime.now(timezone.utc)
        set_progress = event_progress(entry, comp)
        entry.best_percent = set_progress["provisional_total"] if set_progress["submitted"] else None
    is_best = False
    if not set_event and counted and pct is not None and (entry.best_percent is None or pct > entry.best_percent):
        entry.best_percent = pct
        entry.best_at = datetime.now(timezone.utc)
        entry.best_attempt_id = row.id
        if mouth < 0.3:
            flags["mouth_still"] = True
        if sim is not None and settings.competition_replay_threshold and sim > settings.competition_replay_threshold:
            flags["replay_suspect"] = True
        key = _store(f"competitions/{comp.id}/{entry.id}.{ext}", entry.audio_key)
        if key is None:
            flags["no_audio"] = True
        else:
            entry.audio_key = key
        is_best = True
    entry.flags = flags
    if counted:
        entry.attempts_counted = (entry.attempts_counted or 0) + 1
    db.commit()
    # Rank.
    rank = None
    if set_event:
        from app.services.competition_sets import event_standings
        for r in event_standings(db, comp, entry.division):
            if r["learner_id"] == learner.id:
                rank = r["rank"]
                break
    elif entry.best_percent is not None:
        for i, e in enumerate(svc.rank_entries(db, comp)):
            if e.id == entry.id:
                rank = i + 1
                break
    # Bands per reference line (same shape as /recite/score, strict).
    out_lines = []
    for idx, grp in enumerate(res.get("lines", []) or []):
        if not isinstance(grp, list):
            continue
        out_lines.append({"i": idx, "aksharas": [
            {"t": b.get("t", ""), "band": _band_map(b.get("band", "")),
             **({"heard": b.get("heard", "")} if b.get("heard") else {})} for b in grp]})
    resp = {"status": res.get("status", "scored"), "percent": pct, "mode": "strict",
            "counts": {"ok": int(n.get("green", 0)), "fix": int(n.get("red", 0)),
                       "unclear": int(n.get("amber", 0))},
            "lines": out_lines if res.get("status") == "scored" else [],
            "tips": [], "perfect": bool(pct == 100.0),
            "heard": res.get("heard", ""),
            "counted": counted, "why_not": "" if counted else why,
            "best_percent": entry.best_percent, "rank": rank, "is_new_best": is_best,
            "piece_best": piece_best, "division": entry.division,
            "set_progress": set_progress}
    if v2 is not None and v2.status == "scored":
        resp["components"] = v2.components
        resp["total"] = v2.total
        resp["rubric_version"] = v2.as_payload()["rubric_version"]
    return resp


@router.get("/competitions/{comp_id}/results")
def get_results(comp_id: str, division: str = Query(""), learner: Learner = Depends(require_learner),
                db: Session = Depends(get_db)):
    from app.services.competition_sets import event_progress, is_set, norm_division
    comp = db.query(Competition).filter(Competition.id == comp_id).first()
    if comp is None:
        raise HTTPException(status_code=404, detail="No such competition.")
    if comp.status != "published":
        raise HTTPException(status_code=409, detail="Results are not out yet.")
    mine = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id, CompetitionEntry.learner_id == learner.id).first()
    set_event = is_set(comp)
    q = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.final_rank.is_not(None))
    div = None
    if set_event:
        div = norm_division(division or (mine.division if mine else ""))
        q = q.filter(CompetitionEntry.division == div)

    def score(e):
        return event_progress(e, comp)["provisional_total"] if set_event else e.best_percent

    rows = [{"rank": e.final_rank, "public_name": e.public_name, "percent": score(e)}
            for e in q.order_by(CompetitionEntry.final_rank).limit(10).all()]
    me = None
    if mine is not None:
        code = None
        if mine.final_rank in (1, 2, 3):
            c = db.query(Certificate).filter(Certificate.competition_id == comp.id,
                                             Certificate.learner_id == learner.id).first()
            code = c.code if c else None
        me = {"rank": mine.final_rank, "percent": score(mine), "certificate_code": code,
              "division": mine.division}
    return {"rows": rows, "me": me, "division": div, "is_set": set_event}


@router.get("/competitions/master")
def master(month: str = Query(""), learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    tz = local_now(getattr(learner, "timezone", None))
    cur_month = month or f"{tz.year:04d}-{tz.month:02d}"
    if month in ("all", "all-time"):
        comps = db.query(Competition).filter(Competition.status == "published").all()
        winner = None
    else:
        comps = [c for c in db.query(Competition).filter(Competition.status == "published").all()
                 if c.results_at is not None and
                 f"{c.results_at.astimezone(svc._tz()).year:04d}-{c.results_at.astimezone(svc._tz()).month:02d}" == cur_month]
        winner = db.query(MonthlyWinner).filter(MonthlyWinner.month == cur_month).first()
    tally: dict[str, dict] = {}
    first_win: dict[str, datetime] = {}
    for c in comps:
        for e in db.query(CompetitionEntry).filter(
                CompetitionEntry.competition_id == c.id,
                CompetitionEntry.final_rank.is_not(None)).all():
            d = tally.setdefault(e.learner_id, {"public_name": e.public_name or "", "wins": 0,
                                                "seconds": 0, "thirds": 0})
            if e.final_rank == 1:
                d["wins"] += 1
                if e.learner_id not in first_win and e.best_at is not None:
                    first_win[e.learner_id] = e.best_at
            elif e.final_rank == 2:
                d["seconds"] += 1
            elif e.final_rank == 3:
                d["thirds"] += 1
    ordered = sorted(tally.items(), key=lambda kv: (-kv[1]["wins"], -kv[1]["seconds"],
                                                    -kv[1]["thirds"],
                                                    first_win.get(kv[0], datetime.max.replace(tzinfo=timezone.utc))))
    rows = [{"rank": i + 1, "public_name": v["public_name"], "wins": v["wins"],
             "seconds": v["seconds"], "thirds": v["thirds"]} for i, (k, v) in enumerate(ordered)]
    me = None
    if learner.id in tally:
        for r in rows:
            pass
        idx = [k for k, _ in ordered].index(learner.id)
        me = {"rank": idx + 1, **tally[learner.id]}
    w = None
    if winner is not None:
        w = {"public_name": winner.public_name, "wins": winner.wins,
             "claim_code": winner.claim_code if winner.learner_id == learner.id else ""}
    return {"month": cur_month, "rows": rows, "me": me, "winner": w}


@router.get("/me/certificates")
def my_certs(learner: Learner = Depends(require_learner), db: Session = Depends(get_db)):
    rows = db.query(Certificate).filter(Certificate.learner_id == learner.id).order_by(Certificate.issued_at.desc()).all()
    return {"certificates": [{"code": c.code, "kind": c.kind, "rank": c.rank,
                              "competition_id": c.competition_id, "month": c.month,
                              "piece_ref": c.piece_ref} for c in rows]}


# ── Admin ──

@router.post("/admin/competitions")
def admin_create(body: dict, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.chant_text import verse_uid as _u
    kind = body.get("kind", "weekend")
    opens_at = body.get("opens_at", "")
    pieces_in = body.get("pieces", []) or []
    try:
        opens = datetime.fromisoformat(str(opens_at).replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Bad opens_at.")
    # Derive window from opens (same math as tick).
    tz = svc._tz()
    local = opens.astimezone(tz).replace(tzinfo=None)
    k, o_l, c_l, r_l = svc._window_for_fixed(local)
    kind = body.get("kind", k)
    o_u, c_u, r_u = svc._to_utc(o_l), svc._to_utc(c_l), svc._to_utc(r_l)
    slug = svc._slug(o_u, kind)
    pieces = []
    for ref in pieces_in:
        s = db.query(Shloka).filter(Shloka.source_ref == ref).first()
        if s is None:
            continue
        pieces.append({"source_ref": ref,
                       "verse_uid": getattr(s, "verse_uid", "") or _u(s.source_ref or "", s.devanagari or "")})
    row = db.query(Competition).filter(Competition.slug == slug).first()
    if row is None:
        row = Competition(slug=slug, kind=kind, opens_at=o_u, closes_at=c_u,
                          results_at=r_u, pieces=pieces, status="scheduled",
                          rules_version=svc.LEGACY_EVENT_RULES)
        db.add(row)
    else:
        row.pieces = pieces
        row.status = "scheduled"
    db.commit()
    return {"id": row.id, "slug": slug}


@router.get("/admin/competitions/{comp_id}/review")
def admin_review(comp_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    comp = db.query(Competition).filter(Competition.id == comp_id).first()
    if comp is None:
        raise HTTPException(status_code=404, detail="No such competition.")
    ordered = svc.rank_entries(db, comp)
    out = []
    for e in ordered[:10]:
        att = db.query(ReciteAttempt).filter(ReciteAttempt.id == e.best_attempt_id).first() if e.best_attempt_id else None
        out.append({"entry_id": e.id, "public_name": e.public_name, "best_percent": e.best_percent,
                    "camera": att.camera if att else None, "flags": e.flags,
                    "audio": f"/admin/competitions/{comp.id}/entries/{e.id}/audio" if e.audio_key else ""})
    return {"competition": comp.slug, "entries": out}


@router.get("/admin/competitions/{comp_id}/entries/{entry_id}/audio")
def admin_audio(comp_id: str, entry_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    e = db.query(CompetitionEntry).filter(CompetitionEntry.id == entry_id,
                                          CompetitionEntry.competition_id == comp_id).first()
    if e is None or not e.audio_key:
        raise HTTPException(status_code=404, detail="No audio.")
    from app.services.storage import get_storage
    data = get_storage().read_private(e.audio_key)
    return StreamingResponse(iter([data]), media_type="audio/mp4")


@router.post("/admin/competitions/{comp_id}/clear-flags")
def admin_clear(body: dict, comp_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    e = db.query(CompetitionEntry).filter(CompetitionEntry.id == body.get("entry_id"),
                                          CompetitionEntry.competition_id == comp_id).first()
    if e is None:
        raise HTTPException(status_code=404, detail="No such entry.")
    e.flags_cleared = dict(e.flags or {})
    db.commit()
    return {"ok": True}


@router.post("/admin/competitions/{comp_id}/disqualify")
def admin_dq(body: dict, comp_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    e = db.query(CompetitionEntry).filter(CompetitionEntry.id == body.get("entry_id"),
                                          CompetitionEntry.competition_id == comp_id).first()
    if e is None:
        raise HTTPException(status_code=404, detail="No such entry.")
    e.disqualified = True
    e.dq_reason = str(body.get("reason", ""))[:256]
    db.commit()
    return {"ok": True}


@router.post("/admin/competitions/{comp_id}/publish")
def admin_publish(comp_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    comp = db.query(Competition).filter(Competition.id == comp_id).first()
    if comp is None:
        raise HTTPException(status_code=404, detail="No such competition.")
    st = svc.publish_comp(db, comp)
    db.commit()
    return {"status": st}


@router.post("/admin/public-names/{learner_id}/reset")
def admin_name_reset(learner_id: str, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    pub = db.query(LearnerPublic).filter(LearnerPublic.learner_id == learner_id).first()
    if pub is None:
        raise HTTPException(status_code=404, detail="No profile.")
    pub.public_name = ""
    db.commit()
    return {"ok": True}


@router.post("/admin/competitions/tick")
def admin_tick(request: Request, _ok: bool = Depends(require_admin), db: Session = Depends(get_db)):
    # Test clock: admin-only now override, never in production.
    now = datetime.now(timezone.utc)
    try:
        body = None
    except Exception:
        body = None
    override = request.headers.get("X-Test-Now", "")
    if override and not settings.is_production:
        try:
            now = datetime.fromisoformat(override.replace("Z", "+00:00"))
        except Exception:
            pass
    return svc.tick(db, now)


@router.get("/admin/review", response_class=HTMLResponse, include_in_schema=False)
def admin_page():
    return HTMLResponse(
        "<!doctype html><html><head><meta charset='utf-8'><title>Competition review</title></head>"
        "<body><h1>Competition review</h1>"
        "<label>Admin token <input id='t' type='password'></label> "
        "<label>Competition id <input id='c'></label> "
        "<button onclick='load()'>Load</button><div id='rows'></div>"
        "<script>async function load(){const t=document.getElementById('t').value;"
        "const c=document.getElementById('c').value;"
        "const r=await fetch('/admin/competitions/'+c+'/review',{headers:{'X-Admin-Token':t}});"
        "document.getElementById('rows').textContent=await r.text();}</script>"
        "</body></html>")
