"""Usage quota enforcement for metered voice APIs (TTS/STT).

Rolling-window quota per learner, checked before each Sarvam call.
Completely disabled when ``settings.quota_enabled`` is False.
"""

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Learner, UsageEvent


class QuotaExceeded(Exception):
    """Raised when a request would exceed the learner's quota window.

    Converted to HTTP 429 by the calling route.
    """

    def __init__(self, kind: str, used: float, limit: float, retry_after_s: int) -> None:
        self.kind = kind
        self.used = used
        self.limit = limit
        self.retry_after_s = retry_after_s
        super().__init__(f"Quota exceeded for {kind}: {used:.1f}/{limit:.0f}")


def _window_start(hours: int) -> datetime:
    """Return the earliest timestamp in the rolling window."""
    return datetime.now(timezone.utc) - timedelta(hours=hours)


def usage_since(db: Session, learner_id: str, kind: str, hours: int) -> float:
    """Sum of ``amount`` for this learner+kind within the rolling window."""
    cutoff = _window_start(hours)
    result = (
        db.query(func.coalesce(func.sum(UsageEvent.amount), 0.0))
        .filter(
            UsageEvent.learner_id == learner_id,
            UsageEvent.kind == kind,
            UsageEvent.ts >= cutoff,
        )
        .scalar()
    )
    return float(result)


def check_and_consume(
    db: Session,
    learner: Learner,
    kind: str,
    amount: float,
    surface: str = "",
) -> None:
    """Raise ``QuotaExceeded`` if this request would cross the limit; otherwise
    record a ``UsageEvent`` and commit. No-op when ``settings.quota_enabled`` is False.

    For STT consumption (``kind == \"stt_seconds\"``), also mirrors the usage
    onto ``learner.voice_minutes_used``.
    """
    if not settings.quota_enabled:
        return

    # Determine the limit for this kind
    if kind == "tts_chars":
        limit = settings.quota_tts_chars_per_day
    elif kind == "stt_seconds":
        limit = settings.quota_stt_seconds_per_day
    elif kind == "llm_calls":
        limit = settings.quota_llm_calls_per_day
    else:
        raise ValueError(f"Unknown quota kind: {kind!r}. Known kinds: tts_chars, stt_seconds, llm_calls")

    window_hours = settings.quota_window_hours
    used = usage_since(db, learner.id, kind, window_hours)

    # Check if adding would exceed the limit
    if used + amount > limit:
        # How long until the window rolls back enough to fit?
        # Simplification: retry_after = 1 hour (the consumer just needs to wait)
        retry_after_s = 3600
        raise QuotaExceeded(kind=kind, used=used, limit=limit, retry_after_s=retry_after_s)

    # Record usage
    event = UsageEvent(
        learner_id=learner.id,
        kind=kind,
        amount=amount,
        surface=surface,
        source="live",
        ts=datetime.now(timezone.utc),
    )
    db.add(event)

    # Mirror onto the denormalized counter for STT
    if kind == "stt_seconds":
        learner.voice_minutes_used = (learner.voice_minutes_used or 0.0) + (amount / 60.0)

    db.commit()


def refund_quota(
    db: Session,
    learner: Learner,
    kind: str,
    amount: float,
    surface: str = "",
    reason: str = "downstream_failure",
) -> None:
    """Record a compensating negative UsageEvent when a downstream service
    fails after quota was consumed.

    This prevents an outage from silently eating the learner's quota.
    Nets to zero: a consumed+refunded pair shows as 0.0 in the rolling sum.
    No-op when ``settings.quota_enabled`` is False.

    Does NOT modify ``learner.voice_minutes_used`` — the refund is purely a
    UsageEvent adjustment that offsets the positive event. The debited call
    did not actually complete, so the counter should not have been debited
    either, but to keep the code simple we leave the existing positive event
    in place and add the negative here.
    """
    if not settings.quota_enabled:
        return

    event = UsageEvent(
        learner_id=learner.id,
        kind=kind,
        amount=-abs(amount),
        surface=surface,
        source=reason,
        ts=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
