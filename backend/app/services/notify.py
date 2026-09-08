"""Push tokens and the daily-notify job (P13-1).

Design notes (HANDOVER P13-1):
- A token COLLECTION, not a column: one row per (learner, device) with
  ``last_seen``. A token that fails delivery twice is dead — marked, never
  sent to again, NOT deleted (the same device often comes back).
- Learner-local scheduling ONLY (§2.8): the job keys each send by the
  learner's own local date via ``localtime.learner_today``.
- One reminder a day maximum, and stop after ``MAX_IGNORED`` unopened sends:
  a product that nags a lapsed learner trains them to disable the channel.
- Send is a JOB, not a request path: it survives a restart (ledger in the
  DB) and never double-sends (the ``notification_sends`` write keyed by
  (learner, local_date, kind) IS the idempotency check).
- Copy rules (P13-2, UI_HANDOVER §7): no streak-loss shaming, no absence
  counts, no manufactured urgency, no fake social pressure. A reminder that
  carries content (today's verse/word) is preferred — but the content lines
  here carry only text the DB already holds, never newly generated Sanskrit.

The actual push transport (Expo/FCM HTTP) is injected as a callable so tests
run with NO network: ``transport(token, title, body) -> bool``.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.orm import Session

from app.models import Learner, NotificationSend, PushToken
from app.services.localtime import learner_today

# Stop nudging after this many consecutive unopened sends. The count comes
# from the ledger, not from any client claim.
MAX_IGNORED = 3

# A dead token is never retried. Two strikes (P13-1), then it stays in the
# table so a re-register on the same device revives it.
MAX_FAILS = 2

Transport = Callable[[str, str, str], bool]


def _utcnow():
    return datetime.now(timezone.utc)


def register_token(
    db: Session,
    learner: Learner,
    device_id: str,
    token: str,
    platform: str = "",
) -> PushToken:
    """Register or replace a device token. Re-registering revives a dead row."""
    row = (
        db.query(PushToken)
        .filter(
            PushToken.learner_id == learner.id,
            PushToken.device_id == (device_id or ""),
        )
        .first()
    )
    if row is None:
        row = PushToken(
            learner_id=learner.id,
            device_id=(device_id or ""),
            token=token,
            platform=(platform or "")[:16],
        )
        db.add(row)
    else:
        row.token = token
        row.platform = (platform or "")[:16]
        # A re-register means the device is back: revive.
        row.dead = False
        row.fail_count = 0
    row.last_seen = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def record_failure(db: Session, row: PushToken) -> PushToken:
    """Record one failed delivery; mark dead on the second strike."""
    row.fail_count = (row.fail_count or 0) + 1
    if row.fail_count >= MAX_FAILS:
        row.dead = True
    db.commit()
    db.refresh(row)
    return row


def ignored_streak(db: Session, learner_id: str) -> int:
    """Consecutive ledger sends with no recorded activity after them.

    Cheap proxy for "unopened": counts trailing sends on distinct local dates
    with no DailyActivity row on or after the latest send date. Kept in the
    service (not the router) so the job and the tests share one definition.
    """
    from app.models import DailyActivity

    sends = (
        db.query(NotificationSend)
        .filter(NotificationSend.learner_id == learner_id)
        .order_by(NotificationSend.local_date.desc())
        .limit(MAX_IGNORED + 1)
        .all()
    )
    if not sends:
        return 0
    latest_activity = (
        db.query(DailyActivity.date)
        .filter(DailyActivity.learner_id == learner_id)
        .order_by(DailyActivity.date.desc())
        .first()
    )
    if latest_activity is None:
        return len(sends)
    latest_day = latest_activity[0]
    streak = 0
    for s in sends:
        if s.local_date > latest_day:
            streak += 1
        else:
            break
    return streak


def build_message(kind: str, content: str = "") -> tuple[str, str]:
    """Copy for one send (P13-2). Never shames, never counts absence.

    ``content`` is verse/word text the DB already holds — never generated.
    """
    if kind == "sloka" and content:
        return ("आज का श्लोक", f"{content} — It's good to see you.")
    if kind == "word" and content:
        return ("आज का शब्द", f"{content} — It's good to see you.")
    return ("संस्कृतम्", "It's good to see you. Your daily verse is waiting.")


def run_notify_job(
    db: Session,
    transport: Transport | None = None,
    kind: str = "reminder",
    content_for: Callable[[Learner], str] | None = None,
    limit: int = 1000,
) -> dict:
    """One pass of the daily-notify job. Returns counts, never raises.

    For every learner with at least one live token: resolve THEIR local date,
    skip when a send already exists for (learner, date, kind) — the replayed
    job sends once — skip when the day already got any send (one-a-day max),
    skip when ``ignored_streak >= MAX_IGNORED``. Otherwise attempt delivery on
    each live token; a learner counts as sent when ANY token succeeds, and the
    ledger row is written exactly once per (learner, date, kind).
    """
    learners = db.query(Learner).limit(limit).all()
    sent = skipped_sent = skipped_ignored = skipped_day = failed = 0
    for learner in learners:
        try:
            today = learner_today(learner)
        except Exception:
            today = _utcnow().strftime("%Y-%m-%d")
        exists = (
            db.query(NotificationSend)
            .filter(
                NotificationSend.learner_id == learner.id,
                NotificationSend.local_date == today,
                NotificationSend.kind == kind,
            )
            .first()
        )
        if exists:
            skipped_sent += 1
            continue
        any_today = (
            db.query(NotificationSend)
            .filter(
                NotificationSend.learner_id == learner.id,
                NotificationSend.local_date == today,
            )
            .first()
        )
        if any_today:
            skipped_day += 1
            continue
        try:
            streak = ignored_streak(db, learner.id)
        except Exception:
            streak = 0
        if streak >= MAX_IGNORED:
            skipped_ignored += 1
            continue
        tokens = (
            db.query(PushToken)
            .filter(PushToken.learner_id == learner.id, PushToken.dead.is_(False))
            .all()
        )
        tokens = [t for t in tokens if not t.dead]
        if not tokens:
            continue
        content = ""
        if content_for is not None:
            try:
                content = content_for(learner) or ""
            except Exception:
                content = ""
        title, body = build_message(kind, content)
        delivered = False
        if transport is not None:
            for t in tokens:
                try:
                    ok = transport(t.token, title, body)
                except Exception:
                    ok = False
                if ok:
                    t.last_seen = _utcnow()
                    delivered = True
                else:
                    record_failure(db, t)
        else:
            # No transport configured: dry-run ledger write so the job's
            # idempotency is still exercised without any network.
            delivered = True
        if delivered:
            try:
                db.add(NotificationSend(
                    learner_id=learner.id,
                    local_date=today,
                    kind=kind,
                    ignored_streak=streak,
                ))
                db.commit()
                sent += 1
            except Exception:
                db.rollback()
                skipped_sent += 1
        else:
            failed += 1
    try:
        db.commit()
    except Exception:
        db.rollback()
    return {
        "sent": sent,
        "skipped_already_sent": skipped_sent,
        "skipped_one_a_day": skipped_day,
        "skipped_ignored": skipped_ignored,
        "failed": failed,
    }
