"""Multi-shloka competition sets (handover_games_daily_multiplayer §9).

A *set* is a weekly event prescribing three shlokas (short, medium, longer).
Every entrant in a division completes the same set; pieces may be submitted
in any order, but nobody can rank by picking only easy verses: the event
total is the mean of the best eligible attempt per piece across ALL pieces,
so an incomplete set stays provisional ("2 of 3 submitted") outside the
final ranked table and uncompleted pieces count as zero after close.

Divisions freeze at entry (beginner | standard). Rules version
SETS_RULES_VERSION ("2026-10-13-sets") governs these events; legacy
single-piece events keep their original rules and interpretation (the old
history is never silently re-averaged).

Pieces are chosen with preflight: no event is scheduled unless every piece
has text, a meaning source and served audio within the duration limit, and
no piece repeats within four weeks per division while supply allows.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Competition, CompetitionEntry, Shloka, VerseAudio
from app.services.competitions import _as_aware, _slug, _to_utc, _tz, _uid

logger = logging.getLogger("shabd.comp-sets")

SETS_RULES_VERSION = "2026-10-13-sets"
WEEKS_TO_SCHEDULE = 8
NO_REPEAT_WEEKS = 4
PIECES_PER_SET = 3


def _served_audio(db: Session, uid: str) -> VerseAudio | None:
    statuses = [s.strip() for s in (settings.chant_serve_statuses or "").split(",") if s.strip()]
    q = db.query(VerseAudio).filter(VerseAudio.verse_uid == uid,
                                    VerseAudio.voice == settings.chant_voice)
    if statuses:
        q = q.filter(VerseAudio.qc_status.in_(statuses))
    return q.filter(VerseAudio.duration_ms <= settings.competition_piece_max_ms).first()


def _eligible_pool(db: Session) -> list[dict]:
    """All eligible published pieces with usable audio, ordered by akshara
    length so a set can pick short / medium / longer."""
    from app.services.recite_scoring import aksharas
    pool = []
    for s in db.query(Shloka).all():
        uid = getattr(s, "verse_uid", "") or _uid(s.source_ref or "", s.devanagari or "")
        if _served_audio(db, uid) is None:
            continue
        text = (s.devanagari or "").strip()
        if not text or not (s.translation_en or s.translation_hi or s.word_breakdown):
            continue
        pool.append({"source_ref": s.source_ref or uid, "verse_uid": uid,
                     "n": len(aksharas(text))})
    pool.sort(key=lambda p: p["n"])
    return pool


def preflight(db: Session, pieces: list[dict]) -> dict:
    """Preflight a full event before scheduling: text, meaning availability,
    served audio and duration limits. Never advertise an event with missing
    media or unavailable checks."""
    problems = []
    for p in pieces:
        uid = p.get("verse_uid", "")
        s = db.query(Shloka).filter(Shloka.verse_uid == uid).first()
        if s is None or not (s.devanagari or "").strip():
            problems.append(f"{p.get('source_ref')}: no text")
            continue
        if not (s.translation_en or s.translation_hi):
            problems.append(f"{p.get('source_ref')}: no meaning")
        if _served_audio(db, uid) is None:
            problems.append(f"{p.get('source_ref')}: no served audio")
    return {"ok": not problems, "problems": problems}


def ensure_weekly_sets(db: Session, now: datetime) -> int:
    """Schedule up to WEEKS_TO_SCHEDULE weeks of three-piece events, one per
    week (the weekly track; the existing twice-weekly single-piece events
    continue unchanged). Idempotent per slug."""
    now_utc = _as_aware(now)
    local = now_utc.astimezone(_tz())
    pool = _eligible_pool(db)
    made = 0
    if len(pool) < PIECES_PER_SET:
        logger.info("set scheduling: only %d eligible pieces", len(pool))
        return 0
    # Monday of this week
    monday = (local - timedelta(days=local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0)
    used_recent: list[set[str]] = []
    for w in range(WEEKS_TO_SCHEDULE):
        week_monday = monday + timedelta(days=7 * w)
        opens = _to_utc(week_monday)
        closes = _to_utc(week_monday + timedelta(days=6, hours=23, minutes=59, seconds=59))
        results = _to_utc((week_monday + timedelta(days=8)).replace(hour=settings.competition_results_hour or 8))
        slug = _slug(opens, "set")
        if db.query(Competition).filter(Competition.slug == slug).first() is not None:
            # already scheduled: record its pieces for the no-repeat window
            row = db.query(Competition).filter(Competition.slug == slug).first()
            used_recent.append({p.get("source_ref", "") for p in (row.pieces or []) if isinstance(p, dict)})
            continue
        recent = set()
        for s in used_recent[-NO_REPEAT_WEEKS:]:
            recent |= s
        fresh = [p for p in pool if p["source_ref"] not in recent]
        if len(fresh) < PIECES_PER_SET:
            fresh = pool  # supply exhausted: allow repeats rather than skip weeks
        thirds = max(1, len(fresh) // PIECES_PER_SET)
        picks = [fresh[0], fresh[min(thirds, len(fresh) - 1)], fresh[-1]]
        picks = [dict(p, length=label) for p, label in zip(picks, ("short", "medium", "longer"))]
        pre = preflight(db, picks)
        if not pre["ok"]:
            logger.info("set %s failed preflight: %s", slug, pre["problems"])
            used_recent.append(set())
            continue
        comp = Competition(slug=slug, kind="weekend", opens_at=opens, closes_at=closes,
                           results_at=results, pieces=picks, status="scheduled",
                           rules_version=SETS_RULES_VERSION)
        db.add(comp)
        used_recent.append({p["source_ref"] for p in picks})
        made += 1
    db.flush()
    return made


def record_piece_result(db: Session, entry: CompetitionEntry, comp: Competition,
                        piece_ref: str, attempt_id: int, percent: float) -> bool:
    """Best eligible attempt per (entry, piece). Returns True when it became
    the piece best. Never averages only submitted verses."""
    results = dict(entry.piece_results or {})
    prev = results.get(piece_ref)
    if prev is not None and float(prev.get("percent", -1)) >= float(percent):
        return False
    results[piece_ref] = {"attempt_id": int(attempt_id), "percent": round(float(percent), 1),
                          "at": datetime.now(timezone.utc).isoformat()}
    entry.piece_results = results
    return True


def event_progress(entry: CompetitionEntry, comp: Competition) -> dict:
    """{submitted, total, percent}: mean over ALL pieces; incomplete sets are
    provisional by construction."""
    pieces = [p for p in (comp.pieces or []) if isinstance(p, dict)]
    refs = [p.get("source_ref", "") for p in pieces]
    results = entry.piece_results or {}
    submitted = [r for r in refs if r in results]
    total = sum(float(results[r]["percent"]) for r in submitted) / len(refs) if refs else 0.0
    return {"submitted": len(submitted), "total": len(refs),
            "provisional_total": round(total, 1),
            "complete": len(submitted) == len(refs) and len(refs) > 0}


def rank_entries_sets(db: Session, comp: Competition) -> list[CompetitionEntry]:
    """Complete entries ranked by event total; shared supply of pieces makes
    totals comparable. Incomplete entries rank below complete ones (after
    close their missing pieces count zero, but they still rank behind)."""
    rows = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.disqualified.is_(False)).all()
    scored = []
    for e in rows:
        prog = event_progress(e, comp)
        scored.append((e, prog))
    complete = [(e, p) for e, p in scored if p["complete"]]
    incomplete = [(e, p) for e, p in scored if not p["complete"]]
    complete.sort(key=lambda t: (-t[1]["provisional_total"],
                                 t[0].updated_at or datetime.max.replace(tzinfo=timezone.utc)))
    incomplete.sort(key=lambda t: (-t[1]["provisional_total"],
                                   t[0].updated_at or datetime.max.replace(tzinfo=timezone.utc)))
    return [e for e, _ in complete] + [e for e, _ in incomplete]


def publish_sets(db: Session, comp: Competition) -> str:
    """Publish a set event: final ranks (ties share), certificates for the
    top three of each division, immutable snapshot via final_rank."""
    from app.models import Certificate
    from app.services.competitions import _cert_code

    entries = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.disqualified.is_(False)).all()
    by_division: dict[str, list] = {}
    for e in entries:
        prog = event_progress(e, comp)
        if not prog["complete"]:
            continue  # incomplete entries are outside the final ranked table
        by_division.setdefault(e.division or "standard", []).append(e)
    for division, rows in by_division.items():
        rows.sort(key=lambda e: (-event_progress(e, comp)["provisional_total"],
                                 e.updated_at or datetime.max.replace(tzinfo=timezone.utc)))
        prev = None
        rank = 0
        for i, e in enumerate(rows):
            total = event_progress(e, comp)["provisional_total"]
            if total != prev:
                rank = i + 1
                prev = total
            e.final_rank = rank
            if rank <= 3:
                exists = db.query(Certificate).filter(
                    Certificate.competition_id == comp.id,
                    Certificate.learner_id == e.learner_id).first()
                if exists is None:
                    db.add(Certificate(code=_cert_code(), kind="competition",
                                       competition_id=comp.id, month=None,
                                       learner_id=e.learner_id, rank=rank,
                                       public_name=e.public_name or "",
                                       piece_ref=f"set:{division}"))
    comp.status = "published"
    comp.published_at = datetime.now(timezone.utc)
    db.flush()
    return "published"


def monthly_standings(db: Session, month_key: str) -> list[dict]:
    """Monthly recitation standings: mean of completed weekly event totals
    whose closing date falls in `month_key` ("YYYY-MM"). Uncompleted events
    count zero after closing; before close the denominator is shown as
    provisional."""
    tz = _tz()
    rows: dict[str, dict] = {}
    comps = (db.query(Competition)
             .filter(Competition.rules_version == SETS_RULES_VERSION,
                     Competition.status.in_(("published", "closed", "open", "scheduled")))
             .all())
    for c in comps:
        closes = _as_aware(c.closes_at).astimezone(tz)
        if f"{closes.year:04d}-{closes.month:02d}" != month_key:
            continue
        closed = closes <= datetime.now(timezone.utc)
        for e in db.query(CompetitionEntry).filter(
                CompetitionEntry.competition_id == c.id,
                CompetitionEntry.disqualified.is_(False)).all():
            prog = event_progress(e, c)
            contribution = prog["provisional_total"] if (prog["complete"] or not closed) else 0.0
            counts = prog["complete"] or not closed
            row = rows.setdefault(e.learner_id, {"sum": 0.0, "counted": 0,
                                                 "pending": 0,
                                                 "name": e.public_name or ""})
            if counts:
                row["sum"] += contribution
                row["counted"] += 1
                if not prog["complete"]:
                    row["pending"] += 1
    out = []
    for lid, r in rows.items():
        avg = r["sum"] / r["counted"] if r["counted"] else 0.0
        out.append({"learner_id": lid, "name": r["name"],
                    "average": round(avg, 1), "events_counted": r["counted"],
                    "events_pending": r["pending"]})
    out.sort(key=lambda x: -x["average"])
    prev = None
    rank = 0
    for i, r in enumerate(out):
        if r["average"] != prev:
            rank = i + 1
            prev = r["average"]
        r["rank"] = rank
    return out


def is_set(comp: Competition) -> bool:
    return (comp.rules_version or "") == SETS_RULES_VERSION and len(comp.pieces or []) > 1
