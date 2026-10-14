"""Multi-shloka competition sets (handover_games_daily_multiplayer §9).

A *set* is a weekly event prescribing three shlokas (short, medium, longer).
Every entrant in a division completes the same set; pieces may be submitted
in any order, but nobody can rank by picking only easy verses: the event
total is the mean of the best eligible attempt per piece across ALL pieces,
so an incomplete set stays provisional ("2 of 3 submitted") outside the
final ranked table and uncompleted pieces count as zero after close.

Divisions freeze at entry (beginner | standard) and each division has its
own set: beginners get three pieces from the shorter half of the supply,
standard gets short / medium / longer across all of it. A piece dict carries
"division"; a piece without one belongs to every division.

Rules versions: SETS_RULES_VERSION ("2026-10-14-sets") scores every piece
with recitation rubric v2 (words, order, flow, pace) and ranks only attempts
with all four components. Events created under LEGACY_SETS_VERSION
("2026-10-13-sets") keep the akshara percent they were run with; nothing is
silently re-averaged. Single-piece events keep their own rules.

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

SETS_RULES_VERSION = "2026-10-14-sets"
LEGACY_SETS_VERSION = "2026-10-13-sets"
SET_VERSIONS = (SETS_RULES_VERSION, LEGACY_SETS_VERSION)
WEEKS_TO_SCHEDULE = 8
NO_REPEAT_WEEKS = 4
PIECES_PER_SET = 3
DIVISIONS = ("standard", "beginner")


def norm_division(value: str | None) -> str:
    return "beginner" if (value or "").strip().lower() == "beginner" else "standard"


def uses_v2(comp: Competition) -> bool:
    """Scored with recitation rubric v2 (all four components required)."""
    return (comp.rules_version or "") == SETS_RULES_VERSION


def pieces_for(comp: Competition, division: str | None) -> list[dict]:
    """The prescribed pieces of one division (pieces without a division
    belong to every division)."""
    d = norm_division(division)
    return [p for p in (comp.pieces or []) if isinstance(p, dict)
            and (p.get("division") or d) == d]


def _book(ref: str) -> str:
    import re
    return re.sub(r"[\s\d.:,\-–]+$", "", ref or "").strip().lower()


def _pick_set(pool: list[dict], recent: set[str], seed: str) -> list[dict]:
    """Short / medium / longer from `pool` (sorted by length): one piece from
    each third, chosen by a seeded draw, avoiding recent pieces and repeating
    a book only when the third offers nothing else."""
    import random
    rng = random.Random(seed)
    fresh = [p for p in pool if p["source_ref"] not in recent]
    if len(fresh) < PIECES_PER_SET:
        fresh = list(pool)  # supply exhausted: allow repeats rather than skip weeks
    n = len(fresh)
    thirds = [fresh[: max(1, n // 3)], fresh[n // 3: max(n // 3 + 1, 2 * n // 3)], fresh[2 * n // 3:]]
    picks: list[dict] = []
    books: set[str] = set()
    for band in thirds:
        band = [p for p in band if p not in picks] or [p for p in fresh if p not in picks]
        other_books = [p for p in band if _book(p["source_ref"]) not in books]
        choice = rng.choice(other_books or band)
        picks.append(choice)
        books.add(_book(choice["source_ref"]))
    return picks


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
    week, each with a standard and a beginner set. Idempotent per slug.
    Still-scheduled events from the legacy sets version (no entries yet) move
    to the current scoring version at this boundary."""
    now_utc = _as_aware(now)
    local = now_utc.astimezone(_tz())
    for old in db.query(Competition).filter(Competition.status == "scheduled",
                                            Competition.rules_version == LEGACY_SETS_VERSION).all():
        if db.query(CompetitionEntry).filter(CompetitionEntry.competition_id == old.id).first() is None:
            db.delete(old)  # rebuilt below with both divisions
    db.flush()
    pool = _eligible_pool(db)
    made = 0
    if len(pool) < PIECES_PER_SET * 2:
        logger.info("set scheduling: only %d eligible pieces", len(pool))
        return 0
    beginner_pool = pool[: max(PIECES_PER_SET, len(pool) // 2)]
    monday = (local - timedelta(days=local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0)
    used_recent: dict[str, list[set[str]]] = {d: [] for d in DIVISIONS}
    for w in range(WEEKS_TO_SCHEDULE):
        week_monday = monday + timedelta(days=7 * w)
        opens = _to_utc(week_monday)
        closes = _to_utc(week_monday + timedelta(days=6, hours=23, minutes=59, seconds=59))
        results = _to_utc((week_monday + timedelta(days=8)).replace(hour=settings.competition_results_hour or 8))
        slug = _slug(opens, "set")
        row = db.query(Competition).filter(Competition.slug == slug).first()
        if row is not None:
            for d in DIVISIONS:
                used_recent[d].append({p.get("source_ref", "") for p in pieces_for(row, d)})
            continue
        picks: list[dict] = []
        for division, src in (("standard", pool), ("beginner", beginner_pool)):
            recent = set().union(*used_recent[division][-NO_REPEAT_WEEKS:]) if used_recent[division] else set()
            chosen = _pick_set(src, recent, f"{slug}:{division}")
            picks += [dict(p, length=label, division=division)
                      for p, label in zip(chosen, ("short", "medium", "longer"))]
            used_recent[division].append({p["source_ref"] for p in chosen})
        for p in picks:
            p.pop("n", None)
        pre = preflight(db, picks)
        if not pre["ok"]:
            logger.info("set %s failed preflight: %s", slug, pre["problems"])
            continue
        db.add(Competition(slug=slug, kind="set", opens_at=opens, closes_at=closes,
                           results_at=results, pieces=picks, status="scheduled",
                           rules_version=SETS_RULES_VERSION))
        made += 1
    db.flush()
    return made


def record_piece_result(db: Session, entry: CompetitionEntry, comp: Competition,
                        piece_ref: str, attempt_id: int, percent: float,
                        audio_key: str | None = None) -> bool:
    """Best eligible attempt per (entry, piece). Returns True when it became
    the piece best. Never averages only submitted verses."""
    results = dict(entry.piece_results or {})
    prev = results.get(piece_ref)
    if prev is not None and float(prev.get("percent", -1)) >= float(percent):
        return False
    results[piece_ref] = {"attempt_id": int(attempt_id), "percent": round(float(percent), 1),
                          "at": datetime.now(timezone.utc).isoformat(),
                          **({"audio_key": audio_key} if audio_key else {})}
    entry.piece_results = results
    return True


def entry_audio_keys(entry: CompetitionEntry) -> list[str]:
    """Every private recording an entry holds: the overall best and one per
    set piece."""
    keys = [entry.audio_key] if entry.audio_key else []
    for v in (entry.piece_results or {}).values():
        if isinstance(v, dict) and v.get("audio_key"):
            keys.append(v["audio_key"])
    return keys


def drop_piece_audio(entry: CompetitionEntry) -> None:
    results = {}
    for ref, v in (entry.piece_results or {}).items():
        results[ref] = {k: x for k, x in v.items() if k != "audio_key"} if isinstance(v, dict) else v
    entry.piece_results = results


def event_progress(entry: CompetitionEntry, comp: Competition) -> dict:
    """{submitted, total, percent}: mean over ALL pieces; incomplete sets are
    provisional by construction."""
    refs = [p.get("source_ref", "") for p in pieces_for(comp, entry.division)]
    results = entry.piece_results or {}
    submitted = [r for r in refs if r in results]
    total = sum(float(results[r]["percent"]) for r in submitted) / len(refs) if refs else 0.0
    return {"submitted": len(submitted), "total": len(refs),
            "provisional_total": round(total, 1),
            "complete": len(submitted) == len(refs) and len(refs) > 0}


def rank_entries_sets(db: Session, comp: Competition,
                      division: str | None = None) -> list[CompetitionEntry]:
    """Entries ranked by event total within a division (all divisions when
    None). Incomplete entries rank below complete ones."""
    q = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.disqualified.is_(False))
    if division is not None:
        q = q.filter(CompetitionEntry.division == norm_division(division))
    scored = [(e, event_progress(e, comp)) for e in q.all()]
    late = datetime.max.replace(tzinfo=timezone.utc)
    key = lambda t: (-t[1]["provisional_total"], _as_aware(t[0].updated_at) if t[0].updated_at else late)  # noqa: E731
    complete = sorted([t for t in scored if t[1]["complete"]], key=key)
    incomplete = sorted([t for t in scored if not t[1]["complete"]], key=key)
    return [e for e, _ in complete] + [e for e, _ in incomplete]


def event_standings(db: Session, comp: Competition, division: str) -> list[dict]:
    """Weekly board rows for one division: complete entries ranked (ties
    share a rank), then provisional entries without a rank ("2 of 3")."""
    rows = []
    prev = None
    rank = 0
    for i, e in enumerate(rank_entries_sets(db, comp, division)):
        prog = event_progress(e, comp)
        r = {"learner_id": e.learner_id, "public_name": e.public_name or "",
             "percent": prog["provisional_total"], "submitted": prog["submitted"],
             "total": prog["total"], "complete": prog["complete"], "rank": None}
        if prog["complete"]:
            if prog["provisional_total"] != prev:
                rank = i + 1
                prev = prog["provisional_total"]
            r["rank"] = rank
        rows.append(r)
    return rows


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


def monthly_standings(db: Session, month_key: str, division: str | None = None) -> list[dict]:
    """Monthly recitation standings: mean of weekly event totals whose
    closing date falls in `month_key` ("YYYY-MM"), per division when given.
    After an event closes an incomplete set counts zero; before it closes the
    partial total counts and the event is reported as pending. Equal
    averages share a rank; display order then favours more completed events.
    """
    tz = _tz()
    rows: dict[str, dict] = {}
    now = datetime.now(timezone.utc)
    comps = (db.query(Competition)
             .filter(Competition.rules_version.in_(SET_VERSIONS),
                     Competition.status.in_(("published", "closed", "open")))
             .all())
    for c in comps:
        closes = _as_aware(c.closes_at).astimezone(tz)
        if f"{closes.year:04d}-{closes.month:02d}" != month_key:
            continue
        closed = closes <= now
        q = db.query(CompetitionEntry).filter(
            CompetitionEntry.competition_id == c.id,
            CompetitionEntry.disqualified.is_(False))
        if division is not None:
            q = q.filter(CompetitionEntry.division == norm_division(division))
        for e in q.all():
            prog = event_progress(e, c)
            row = rows.setdefault(e.learner_id, {"sum": 0.0, "counted": 0, "complete": 0,
                                                 "pending": 0, "name": e.public_name or ""})
            row["counted"] += 1
            if prog["complete"]:
                row["complete"] += 1
                row["sum"] += prog["provisional_total"]
            elif not closed:
                row["pending"] += 1
                row["sum"] += prog["provisional_total"]
    out = []
    for lid, r in rows.items():
        avg = r["sum"] / r["counted"] if r["counted"] else 0.0
        out.append({"learner_id": lid, "name": r["name"],
                    "average": round(avg, 1), "events_counted": r["counted"],
                    "events_complete": r["complete"], "events_pending": r["pending"]})
    out.sort(key=lambda x: (-x["average"], -x["events_complete"]))
    prev = None
    rank = 0
    for i, r in enumerate(out):
        if r["average"] != prev:
            rank = i + 1
            prev = r["average"]
        r["rank"] = rank
    return out


def month_has_sets(db: Session, month_key: str) -> bool:
    tz = _tz()
    for (closes_at,) in db.query(Competition.closes_at).filter(
            Competition.rules_version.in_(SET_VERSIONS)).all():
        loc = _as_aware(closes_at).astimezone(tz)
        if f"{loc.year:04d}-{loc.month:02d}" == month_key:
            return True
    return False


def monthly_winner(db: Session, month_key: str) -> dict | None:
    """The month's prize under the set rules: first place in the Standard
    monthly table. A tie on the average goes to more completed events, then
    to whoever completed their last event first (published in the rules)."""
    rows = [r for r in monthly_standings(db, month_key, "standard") if r["events_complete"] > 0]
    if not rows:
        return None
    top = [r for r in rows if r["rank"] == 1]
    if len(top) > 1:
        def last_done(r):
            ts = []
            for e in db.query(CompetitionEntry).filter(CompetitionEntry.learner_id == r["learner_id"]).all():
                for v in (e.piece_results or {}).values():
                    if isinstance(v, dict) and v.get("at"):
                        ts.append(v["at"])
            return max(ts) if ts else "9999"
        top.sort(key=lambda r: (-r["events_complete"], last_done(r)))
    return top[0]


def is_set(comp: Competition) -> bool:
    return (comp.rules_version or "") in SET_VERSIONS and len(comp.pieces or []) > 1
