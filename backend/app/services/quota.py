"""Usage quota enforcement for metered vendor calls (TTS, STT, LLM).

Two limits, checked together before each Sarvam call:

- **Per learner** — a rolling-window allowance per kind (``tts_chars``,
  ``stt_seconds``, ``llm_calls``).
- **Per service** — a rolling-window rupee budget across ALL learners
  (``settings.quota_daily_budget_inr``). Per-learner limits alone do not bound
  spend: every new install is a new learner with a fresh allowance, so a crowd
  or a script is capped only by this.

Completely disabled when ``settings.quota_enabled`` is False; the service
budget alone is disabled when ``quota_daily_budget_inr`` is 0.
"""

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Learner, UsageEvent

# ``QuotaExceeded.kind`` when the service-wide budget, not the learner's own
# allowance, is what ran out.
BUDGET_KIND = "daily_budget"


class QuotaExceeded(Exception):
    """Raised when a request would exceed the learner's quota window, or the
    service budget (``kind == BUDGET_KIND``, with used/limit in rupees).

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


def _price_inr(kind: str) -> float:
    """Rupees per unit of ``kind`` at list price."""
    return {
        "tts_chars": settings.price_tts_inr_per_char,
        "stt_seconds": settings.price_stt_inr_per_second,
        "llm_calls": settings.price_llm_inr_per_call,
    }.get(kind, 0.0)


def _cost_inr():
    """SQL expression: the rupee cost of one UsageEvent row."""
    return case(
        *(
            (UsageEvent.kind == kind, UsageEvent.amount * _price_inr(kind))
            for kind in ("tts_chars", "stt_seconds", "llm_calls")
        ),
        else_=0.0,
    )


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


def spend_since(db: Session, hours: int) -> float:
    """Estimated rupees spent by ALL learners within the rolling window.

    Refund rows are negative, so a failed vendor call nets to zero here too.
    """
    cutoff = _window_start(hours)
    result = (
        db.query(func.coalesce(func.sum(_cost_inr()), 0.0))
        .filter(UsageEvent.ts >= cutoff)
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
    """Raise ``QuotaExceeded`` if this request would cross the learner's limit
    or the service budget; otherwise record a ``UsageEvent`` and commit. No-op
    when ``settings.quota_enabled`` is False.

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
    budget = settings.quota_daily_budget_inr
    if budget > 0:
        # Both sums in one statement: every extra round trip costs ~140 ms in
        # production, on every metered call.
        mine = case(
            (and_(UsageEvent.learner_id == learner.id, UsageEvent.kind == kind), UsageEvent.amount),
            else_=0.0,
        )
        used, spent = (
            db.query(
                func.coalesce(func.sum(mine), 0.0),
                func.coalesce(func.sum(_cost_inr()), 0.0),
            )
            .filter(UsageEvent.ts >= _window_start(window_hours))
            .one()
        )
        used, spent = float(used), float(spent)
    else:
        used, spent = usage_since(db, learner.id, kind, window_hours), 0.0

    # Check if adding would exceed the limit
    if used + amount > limit:
        # How long until the window rolls back enough to fit?
        # Simplification: retry_after = 1 hour (the consumer just needs to wait)
        retry_after_s = 3600
        raise QuotaExceeded(kind=kind, used=used, limit=limit, retry_after_s=retry_after_s)

    if budget > 0 and spent + amount * _price_inr(kind) > budget:
        # Same simplification: the window rolls forward, so retry in an hour.
        raise QuotaExceeded(kind=BUDGET_KIND, used=spent, limit=budget, retry_after_s=3600)

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
