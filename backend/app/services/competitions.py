"""Competition tick + ranking (handover_recite 11.5, 11.6, 11.8, 11.10).

All functions take now (UTC) so tests can move time. Idempotent.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Certificate,
    Competition,
    CompetitionEntry,
    MonthlyWinner,
    ReciteAttempt,
    Shloka,
    VerseAudio,
)
from app.services.chant_text import verse_uid as _uid

_KIND_WEEKEND = "weekend"
_KIND_MIDWEEK = "midweek"


def _tz() -> ZoneInfo:
    try:
        return ZoneInfo(settings.competition_tz or "Asia/Kolkata")
    except Exception:
        return ZoneInfo("Asia/Kolkata")


def _as_aware(dt: datetime) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _window_for_fixed(local: datetime):
    wd = local.weekday()
    hour = settings.competition_results_hour or 8
    if 3 <= wd <= 5:
        days_back = wd - 3
        opens = (local - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        closes = opens + timedelta(days=2, hours=23, minutes=59, seconds=59)
        results = (opens + timedelta(days=3)).replace(hour=hour, minute=0, second=0, microsecond=0)
        return (_KIND_WEEKEND, opens, closes, results)
    days_back = 0 if wd == 6 else wd + 1
    opens = (local - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
    closes = opens + timedelta(days=3, hours=23, minutes=59, seconds=59)
    results = (opens + timedelta(days=4)).replace(hour=hour, minute=0, second=0, microsecond=0)
    return (_KIND_MIDWEEK, opens, closes, results)


def _to_utc(naive_local: datetime) -> datetime:
    return naive_local.replace(tzinfo=_tz()).astimezone(timezone.utc)


def _slug(opens_utc: datetime, kind: str) -> str:
    local = opens_utc.astimezone(_tz())
    return f"{local.date().isoformat()}-{kind}"


def _next_piece(db: Session) -> dict | None:
    from app.seeds import competition_pieces as _pieces
    used_refs = set()
    for (pieces,) in db.query(Competition.pieces).all():
        for p in (pieces or []):
            if isinstance(p, dict) and p.get("source_ref"):
                used_refs.add(p["source_ref"])
    statuses = [s.strip() for s in (settings.chant_serve_statuses or "").split(",") if s.strip()]
    for ref in _pieces.PIECES:
        if ref in used_refs:
            continue
        # Match by source_ref; take row with served chant.
        rows = db.query(Shloka).filter(Shloka.source_ref == ref).all()
        best = None
        for s in rows:
            uid = getattr(s, "verse_uid", "") or _uid(s.source_ref or "", s.devanagari or "")
            q = db.query(VerseAudio).filter(
                VerseAudio.verse_uid == uid,
                VerseAudio.voice == settings.chant_voice,
                VerseAudio.qc_status.in_(statuses) if statuses else True,
                VerseAudio.duration_ms <= settings.competition_piece_max_ms).first()
            if q is not None:
                best = (s, uid)
                break
        if best is not None:
            s, uid = best
            return {"source_ref": ref, "verse_uid": uid}
    return None


def ensure_next(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    local = now_utc.astimezone(_tz()).replace(tzinfo=None)
    made = 0
    # Window containing now + next window.
    for delta_days in (0, 7):
        probe = local + timedelta(days=delta_days) if delta_days else local
        # For delta, compute the window that contains probe, then also the
        # following window by stepping past closes.
        kind, opens_l, closes_l, results_l = _window_for_fixed(probe)
        for win in [(kind, opens_l, closes_l, results_l)]:
            k, o_l, c_l, r_l = win
            o_u, c_u, r_u = _to_utc(o_l), _to_utc(c_l), _to_utc(r_l)
            slug = _slug(o_u, k)
            if db.query(Competition).filter(Competition.slug == slug).first() is None:
                piece = _next_piece(db)
                if piece is None:
                    continue
                db.add(Competition(slug=slug, kind=k, opens_at=o_u, closes_at=c_u,
                                   results_at=r_u, pieces=[piece], status="scheduled",
                                   rules_version=settings.competition_rules_version))
                made += 1
        if delta_days == 0:
            # Also ensure the NEXT window (step past this window's close).
            nxt_local = closes_l + timedelta(seconds=1)
            kind2, o2, c2, r2 = _window_for_fixed(nxt_local)
            o_u, c_u, r_u = _to_utc(o2), _to_utc(c2), _to_utc(r2)
            slug = _slug(o_u, kind2)
            if db.query(Competition).filter(Competition.slug == slug).first() is None:
                piece = _next_piece(db)
                if piece is not None:
                    db.add(Competition(slug=slug, kind=kind2, opens_at=o_u, closes_at=c_u,
                                       results_at=r_u, pieces=[piece], status="scheduled",
                                       rules_version=settings.competition_rules_version))
                    made += 1
    db.flush()
    return made


def open_due(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    rows = db.query(Competition).filter(Competition.status == "scheduled",
                                        Competition.opens_at <= now_utc).all()
    for r in rows:
        r.status = "open"
    db.flush()
    return len(rows)


def close_due(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    rows = db.query(Competition).filter(Competition.status == "open",
                                        Competition.closes_at <= now_utc).all()
    for r in rows:
        r.status = "closed"
    db.flush()
    return len(rows)


def rank_entries(db: Session, comp: Competition) -> list[CompetitionEntry]:
    rows = db.query(CompetitionEntry).filter(
        CompetitionEntry.competition_id == comp.id,
        CompetitionEntry.disqualified.is_(False),
        CompetitionEntry.best_percent.is_not(None)).all()
    rows.sort(key=lambda e: (-(e.best_percent or 0), e.best_at or datetime.max.replace(tzinfo=timezone.utc)))
    return rows


def _cert_code() -> str:
    import base64
    raw = secrets.token_bytes(7)
    return base64.b32encode(raw).decode().rstrip("=")[:10]


def publish_comp(db: Session, comp: Competition) -> str:
    """Publish per 11.6. Returns status after attempt: held|published."""
    entries = rank_entries(db, comp)
    top3 = entries[:3]
    for e in top3:
        flags = e.flags or {}
        cleared = e.flags_cleared or {}
        pending = {k: v for k, v in flags.items() if v and not cleared.get(k)}
        if pending:
            comp.status = "held"
            db.flush()
            return "held"
    # Write final ranks + certificates.
    for idx, e in enumerate(entries):
        e.final_rank = idx + 1
    for idx, e in enumerate(entries[:3]):
        piece_ref = ""
        try:
            pieces = comp.pieces or []
            if pieces and isinstance(pieces[0], dict):
                piece_ref = pieces[0].get("source_ref", "")
        except Exception:
            pass
        exists = db.query(Certificate).filter(
            Certificate.competition_id == comp.id,
            Certificate.learner_id == e.learner_id).first()
        if exists is None:
            db.add(Certificate(code=_cert_code(), kind="competition",
                               competition_id=comp.id, month=None,
                               learner_id=e.learner_id, rank=idx + 1,
                               public_name=e.public_name or "",
                               piece_ref=piece_ref))
    comp.status = "published"
    comp.published_at = datetime.now(timezone.utc)
    db.flush()
    return "published"


def publish_due(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    rows = db.query(Competition).filter(Competition.status == "closed",
                                        Competition.results_at <= now_utc).all()
    n = 0
    for r in rows:
        publish_comp(db, r)
        n += 1
    return n


def month_end(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    local = now_utc.astimezone(_tz())
    # Months with published results before this month lacking a winner row.
    months: set[str] = set()
    for (results_at,) in db.query(Competition.results_at).filter(
            Competition.status == "published").all():
        if results_at is None:
            continue
        loc = _as_aware(results_at).astimezone(_tz())
        months.add(f"{loc.year:04d}-{loc.month:02d}")
    this_month = f"{local.year:04d}-{local.month:02d}"
    made = 0
    for m in sorted(months):
        if m >= this_month:
            continue
        if db.query(MonthlyWinner).filter(MonthlyWinner.month == m).first() is not None:
            continue
        # Count final ranks in that month.
        wins: dict[str, dict] = {}
        first_win_at: dict[str, datetime] = {}
        comps = db.query(Competition).filter(Competition.status == "published").all()
        for c in comps:
            loc = _as_aware(c.results_at).astimezone(_tz())
            if f"{loc.year:04d}-{loc.month:02d}" != m:
                continue
            for e in db.query(CompetitionEntry).filter(
                    CompetitionEntry.competition_id == c.id,
                    CompetitionEntry.final_rank.is_not(None)).all():
                d = wins.setdefault(e.learner_id, {"wins": 0, "seconds": 0, "thirds": 0,
                                                   "name": e.public_name or ""})
                if e.final_rank == 1:
                    d["wins"] += 1
                    if e.learner_id not in first_win_at and e.best_at is not None:
                        first_win_at[e.learner_id] = _as_aware(e.best_at)
                elif e.final_rank == 2:
                    d["seconds"] += 1
                elif e.final_rank == 3:
                    d["thirds"] += 1
        if not wins:
            continue
        ordered = sorted(wins.items(),
                         key=lambda kv: (-kv[1]["wins"], -kv[1]["seconds"], -kv[1]["thirds"],
                                         first_win_at.get(kv[0], datetime.max.replace(tzinfo=timezone.utc))))
        lid, d = ordered[0]
        code = _cert_code()
        db.add(MonthlyWinner(month=m, learner_id=lid, public_name=d["name"],
                             wins=d["wins"], claim_code=code))
        # Monthly certificate (rank 1 of the month).
        db.add(Certificate(code=_cert_code(), kind="monthly", competition_id=None,
                           month=m, learner_id=lid, rank=1,
                           public_name=d["name"], piece_ref=""))
        made += 1
    db.flush()
    return made


def purge(db: Session, now: datetime) -> int:
    now_utc = _as_aware(now)
    cutoff = now_utc - timedelta(days=settings.competition_audio_days or 30)
    n = 0
    try:
        from app.services.storage import get_storage
        store = get_storage()
    except Exception:
        store = None
    rows = db.query(CompetitionEntry).filter(CompetitionEntry.audio_key.is_not(None)).all()
    comp_by_id = {c.id: c for c in db.query(Competition).all()}
    for e in rows:
        c = comp_by_id.get(e.competition_id)
        if c is None or c.results_at is None:
            continue
        if _as_aware(c.results_at) < cutoff:
            if store is not None and e.audio_key:
                try:
                    store.delete_private(e.audio_key)
                except Exception:
                    pass
            e.audio_key = None
            n += 1
    db.flush()
    return n


def tick(db: Session, now: datetime) -> dict:
    made = ensure_next(db, now)
    opened = open_due(db, now)
    closed = close_due(db, now)
    published = publish_due(db, now)
    months = month_end(db, now)
    purged = purge(db, now)
    db.commit()
    return {"made": made, "opened": opened, "closed": closed,
            "published": published, "months": months, "purged": purged}
