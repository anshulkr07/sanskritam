"""Usage quota enforcement for metered vendor calls (TTS, STT, LLM, Gemini).

Two limits, checked together before each vendor call:

- **Per learner** — a rolling-window allowance per kind (``tts_chars``,
  ``stt_seconds``, ``llm_calls``, ``doc_pages``, ``gemini_inr``).
- **Per service** — a calendar-day budget across ALL learners, one
  per vendor: Sarvam (``settings.quota_daily_budget_inr``) and Gemini
  (``settings.gemini_daily_budget_usd``). Shared budgets reset at midnight IST. Per-learner limits alone do not
  bound spend: every new install is a new learner with a fresh allowance, so
  a crowd or a script is capped only by these. The two do not share money:
  a spent Gemini budget leaves Sarvam's untouched, and the other way round.

Completely disabled when ``settings.quota_enabled`` is False; a service
budget alone is disabled when its setting is 0.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo
from threading import RLock

from sqlalchemy import and_, case, func, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Learner, UsageEvent, BudgetCarry

logger = logging.getLogger("shabd.quota")

# ``QuotaExceeded.kind`` when a service-wide budget, not the learner's own
# allowance, is what ran out.
BUDGET_KIND = "daily_budget"
GEMINI_BUDGET_KIND = "gemini_budget"

# Online Gemini calls are metered in rupees, from the tokens each call used.
GEMINI_KIND = "gemini_inr"

_SARVAM = "sarvam"
_GEMINI = "gemini"

# Which vendor's budget a kind draws on.
_POOL = {
    "tts_chars": _SARVAM,
    "stt_seconds": _SARVAM,
    "llm_calls": _SARVAM,
    "doc_pages": _SARVAM,
    GEMINI_KIND: _GEMINI,
}

# Vendor units billed beyond what the learner is charged (three Saaras passes
# for one recording) go in a second row under ``<kind>_x``: the budget counts
# it, the learner's allowance does not. ``usage_events.kind`` is 16 characters.
_EXTRA = "_x"

# ``usage_events.source`` is 16 characters, and PostgreSQL refuses a longer
# value instead of cutting it. "downstream_failure" is 18.
_SOURCE_MAX = 16
_REFUND_SOURCE = "refund"

# Google's page, read 2026-10-02: Gemini 3.8 Flash doubles in price on this day.
_GEMINI_PRICE_STEP = date(2027, 1, 1)


class QuotaExceeded(Exception):
    """Raised when a request would exceed the learner's quota window, or a
    service budget (``kind`` is BUDGET_KIND or GEMINI_BUDGET_KIND, with
    used/limit in rupees).

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
    if kind.endswith(_EXTRA):
        kind = kind[: -len(_EXTRA)]
    return {
        "tts_chars": settings.price_tts_inr_per_char,
        "stt_seconds": settings.price_stt_inr_per_second,
        "llm_calls": settings.price_llm_inr_per_call,
        "doc_pages": settings.price_doc_inr_per_page,
        GEMINI_KIND: 1.0,
    }.get(kind, 0.0)


def _limit(kind: str) -> float:
    """The learner's allowance for ``kind`` in the rolling window."""
    limits = {
        "tts_chars": settings.quota_tts_chars_per_day,
        "stt_seconds": settings.quota_stt_seconds_per_day,
        "llm_calls": settings.quota_llm_calls_per_day,
        "doc_pages": settings.quota_doc_pages_per_day,
        GEMINI_KIND: settings.quota_gemini_inr_per_day,
    }
    if kind not in limits:
        raise ValueError(
            f"Unknown quota kind: {kind!r}. Known kinds: {', '.join(limits)}"
        )
    return limits[kind]


def budget_start() -> datetime:
    now = datetime.now(timezone.utc).astimezone(ZoneInfo(settings.budget_timezone))
    return now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)

def budget_retry_after() -> int:
    next_day = budget_start() + timedelta(days=1)
    return max(1, int((next_day - datetime.now(timezone.utc)).total_seconds()))

def budget_message(kind: str) -> str:
    vendor = "Gemini" if kind == GEMINI_BUDGET_KIND else "speech and tutor"
    return f"Today's shared {vendor} allowance has been used up. Please wait until tomorrow (resets at midnight India time). Reading, saved audio and local exercises remain available."

def gemini_budget_inr() -> float:
    return settings.gemini_daily_budget_usd * settings.usd_inr if settings.gemini_daily_budget_usd > 0 else settings.gemini_daily_budget_inr

_budget_locks = {"sarvam": RLock(), "gemini": RLock()}

def check_and_consume(db, learner, kind, amount, surface="", vendor_amount=None):
    # Postgres advisory transaction locks serialize ALL Cloud Run instances.
    # The local lock also makes SQLite development/tests thread safe.
    if not settings.quota_enabled:
        return
    _limit(kind)  # reject unknown kinds with the documented ValueError
    pool = _POOL[kind]
    with _budget_locks[pool]:
        if settings.quota_enabled and db.bind.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": 7319001 if pool == "sarvam" else 7319002})
        try:
            result = _check_and_consume(db, learner, kind, amount, surface, vendor_amount)
            db.info.setdefault("quota_reservations", {}).setdefault((learner.id, kind, surface, amount), []).append(result)
            return None
        except Exception:
            db.rollback()
            raise


def _budget(pool: str) -> tuple[float, str]:
    """``(rupees, QuotaExceeded.kind)`` for one vendor's service budget."""
    if pool == _GEMINI:
        return gemini_budget_inr(), GEMINI_BUDGET_KIND
    return settings.quota_daily_budget_inr, BUDGET_KIND


def _cost_inr(pool: str = _SARVAM):
    """SQL expression: the rupee cost of one UsageEvent row to one vendor."""
    kinds = [k for k, p in _POOL.items() if p == pool]
    kinds += [k + _EXTRA for k in kinds]
    return case(
        *((UsageEvent.kind == kind, UsageEvent.amount * _price_inr(kind)) for kind in kinds),
        else_=0.0,
    )


def gemini_cost_inr(prompt_tokens: float, output_tokens: float, on: Optional[date] = None) -> float:
    """Rupees for one Gemini Flash call. ``output_tokens`` includes reasoning."""
    if (on or date.today()) >= _GEMINI_PRICE_STEP:
        usd_in = settings.price_gemini_usd_per_m_input_2027
        usd_out = settings.price_gemini_usd_per_m_output_2027
    else:
        usd_in = settings.price_gemini_usd_per_m_input
        usd_out = settings.price_gemini_usd_per_m_output
    usd = (prompt_tokens * usd_in + output_tokens * usd_out) / 1_000_000
    return usd * settings.usd_inr


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


def spend_since(db: Session, hours: int, pool: str = _SARVAM) -> float:
    """Estimated rupees spent with one vendor ("sarvam" or "gemini") by ALL
    learners within the rolling window.

    Refund rows are negative, so a failed vendor call nets to zero here too.
    """
    cutoff = budget_start()
    result = (
        db.query(func.coalesce(func.sum(_cost_inr(pool)), 0.0))
        .filter(UsageEvent.ts >= cutoff)
        .scalar()
    )
    return float(result) + carried_spend(db, pool)


def carried_spend(db, pool):
    return float(db.query(BudgetCarry.amount).filter_by(day=budget_start().isoformat(), pool=pool).scalar() or 0)


def retain_deleted_spend(db, learner_id):
    """Erasing an account must not refill the owner's shared money pool.

    Transfer its current-day total into an anonymous per-vendor aggregate in
    the SAME transaction as deletion. There is no account key in this table.
    """
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    for pool in (_SARVAM, _GEMINI):
        if db.bind.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": 7319001 if pool == _SARVAM else 7319002})
        amount = float(db.query(func.coalesce(func.sum(_cost_inr(pool)), 0.0)).filter(UsageEvent.learner_id == learner_id, UsageEvent.ts >= budget_start()).scalar())
        if amount <= 0:
            continue
        insert = pg_insert if db.bind.dialect.name == "postgresql" else sqlite_insert
        statement = insert(BudgetCarry).values(day=budget_start().isoformat(), pool=pool, amount=amount)
        db.execute(statement.on_conflict_do_update(index_elements=["day", "pool"], set_={"amount": BudgetCarry.amount + amount}))


def gemini_headroom_inr(db: Session) -> float:
    """Rupees left under the Gemini ceiling in the rolling window.

    For work that spends on Gemini outside a learner's request (a scheduled
    batch job): check this before starting. ``inf`` when the ceiling is off.
    """
    budget = gemini_budget_inr()
    if not settings.quota_enabled or budget <= 0:
        return float("inf")
    return budget - spend_since(db, settings.quota_window_hours, _GEMINI)


def budget_status(db: Session) -> dict:
    """Spend against each vendor's ceiling, for GET /admin/metrics."""
    hours = settings.quota_window_hours
    return {
        "window_hours": hours,
        "sarvam_spent_inr": round(spend_since(db, hours, _SARVAM), 2),
        "sarvam_budget_inr": settings.quota_daily_budget_inr,
        "gemini_spent_inr": round(spend_since(db, hours, _GEMINI), 2),
        "gemini_budget_inr": gemini_budget_inr(),
        "gemini_budget_usd": settings.gemini_daily_budget_usd,
        "reset_timezone": settings.budget_timezone,
        "retry_after_s": budget_retry_after(),
    }


def _event(learner: Learner, kind: str, amount: float, surface: str, source: str, timestamp=None) -> UsageEvent:
    return UsageEvent(
        learner_id=learner.id,
        kind=kind,
        amount=amount,
        surface=surface,
        source=source,
        ts=timestamp or datetime.now(timezone.utc),
    )


def _check_and_consume(
    db: Session,
    learner: Learner,
    kind: str,
    amount: float,
    surface: str = "",
    vendor_amount: Optional[float] = None,
) -> None:
    """Raise ``QuotaExceeded`` if this request would cross the learner's limit
    or the vendor's service budget; otherwise record a ``UsageEvent`` and
    commit. No-op when ``settings.quota_enabled`` is False.

    ``vendor_amount`` is what the vendor bills when that is more than the
    learner is charged. The learner's allowance moves by ``amount``; the
    budget moves by ``vendor_amount``.

    For STT consumption (``kind == \"stt_seconds\"``), also mirrors the usage
    onto ``learner.voice_minutes_used``.
    """
    if not settings.quota_enabled:
        return

    limit = _limit(kind)
    pool = _POOL[kind]
    budget, budget_kind = _budget(pool)
    extra = max(0.0, (vendor_amount or 0.0) - amount)

    window_hours = settings.quota_window_hours
    if budget > 0:
        # Both sums in one statement: every extra round trip costs ~140 ms in
        # production, on every metered call.
        mine = case(
            (and_(UsageEvent.learner_id == learner.id, UsageEvent.kind == kind, UsageEvent.ts >= _window_start(window_hours)), UsageEvent.amount),
            else_=0.0,
        )
        used, spent = (
            db.query(
                func.coalesce(func.sum(mine), 0.0),
                func.coalesce(func.sum(case((UsageEvent.ts >= budget_start(), _cost_inr(pool)), else_=0.0)), 0.0),
            )
            .filter(UsageEvent.ts >= min(_window_start(window_hours), budget_start()))
            .one()
        )
        used, spent = float(used), float(spent) + carried_spend(db, pool)
    else:
        used, spent = usage_since(db, learner.id, kind, window_hours), 0.0

    # Check if adding would exceed the limit
    if used + amount > limit:
        # How long until the window rolls back enough to fit?
        # Simplification: retry_after = 1 hour (the consumer just needs to wait)
        retry_after_s = 3600
        raise QuotaExceeded(kind=kind, used=used, limit=limit, retry_after_s=retry_after_s)

    if budget > 0 and spent + (amount + extra) * _price_inr(kind) > budget:
        # Same simplification: the window rolls forward, so retry in an hour.
        raise QuotaExceeded(kind=budget_kind, used=spent, limit=budget, retry_after_s=budget_retry_after())

    # Record usage
    reserved_at = datetime.now(timezone.utc)
    db.add(_event(learner, kind, amount, surface, "live", reserved_at))
    if extra > 0:
        db.add(_event(learner, kind + _EXTRA, extra, surface, "live", reserved_at))

    # Mirror onto the denormalized counter for STT
    if kind == "stt_seconds":
        learner.voice_minutes_used = (learner.voice_minutes_used or 0.0) + (amount / 60.0)

    db.commit()
    return reserved_at


def refund_quota(
    db: Session,
    learner: Learner,
    kind: str,
    amount: float,
    surface: str = "",
    reason: str = "downstream_failure",
    vendor_amount: Optional[float] = None,
) -> None:
    """Record a compensating negative UsageEvent when a downstream service
    fails after quota was consumed.

    This prevents an outage from silently eating the learner's quota.
    Nets to zero: a consumed+refunded pair shows as 0.0 in the rolling sum.
    Pass the same ``vendor_amount`` the consume was given.
    No-op when ``settings.quota_enabled`` is False.

    Does NOT modify ``learner.voice_minutes_used`` — the refund is purely a
    UsageEvent adjustment that offsets the positive event. The debited call
    did not actually complete, so the counter should not have been debited
    either, but to keep the code simple we leave the existing positive event
    in place and add the negative here.
    """
    if not settings.quota_enabled:
        return

    # The ledger column holds 16 characters; the reason goes to the log.
    source = reason if len(reason) <= _SOURCE_MAX else _REFUND_SOURCE
    logger.info("refund %s %.4f for learner %s: %s", kind, abs(amount), learner.id, reason)
    reservations = db.info.get("quota_reservations", {}).get((learner.id, kind, surface, abs(amount)), [])
    timestamp = reservations.pop() if reservations else None
    db.add(_event(learner, kind, -abs(amount), surface, source, timestamp))
    extra = max(0.0, (vendor_amount or 0.0) - abs(amount))
    if extra > 0:
        db.add(_event(learner, kind + _EXTRA, -extra, surface, source, timestamp))
    db.commit()


def settle_quota(
    db: Session,
    learner: Learner,
    kind: str,
    reserved: float,
    actual: float,
    surface: str = "",
) -> None:
    """Replace a reservation with what the call really cost.

    A call whose price is only known afterwards (Gemini, billed by token)
    reserves its worst case with ``check_and_consume`` and settles here, so
    the budget can never be passed while calls are in flight and the ledger
    ends at the true figure.
    """
    if not settings.quota_enabled:
        return
    delta = actual - reserved
    if abs(delta) < 1e-9:
        return
    reservations = db.info.get("quota_reservations", {}).get((learner.id, kind, surface, reserved), [])
    timestamp = reservations.pop() if reservations else None
    db.add(_event(learner, kind, delta, surface, "settle", timestamp))
    db.commit()
