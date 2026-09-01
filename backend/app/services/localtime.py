"""Learner-local date resolution.

Every "day" the learner experiences — the daily goal, the activity row, the
streak boundary — is a day in *their* timezone, not the server's.  Computing
it in UTC breaks streaks for anyone whose evening falls on the far side of the
UTC boundary: in IST (UTC+5:30) everything practised between 00:00 and 05:30
local is credited to the previous day, so a learner who studies Monday night
and again at 1am Tuesday gets both credited to Monday and loses Tuesday.

Timezones are IANA keys ("Asia/Kolkata"). Resolution never raises: an unknown,
empty, or malformed key falls back to UTC, because a wrong-by-hours date is a
much smaller failure than a 500 on the progress screen.

Requires the `tzdata` package on any host without a system IANA database —
Windows never has one, and minimal Linux containers frequently do not either.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger("shabd.localtime")

DATE_FMT = "%Y-%m-%d"
DEFAULT_TZ = "UTC"

# Resolved ZoneInfo objects, keyed by IANA name. Construction hits the disk,
# and this is called on every progress read.
_tz_cache: dict[str, ZoneInfo] = {}


def resolve_tz(tz_name: str | None) -> ZoneInfo:
    """Return a ZoneInfo for an IANA key, falling back to UTC. Never raises."""
    name = (tz_name or "").strip() or DEFAULT_TZ
    cached = _tz_cache.get(name)
    if cached is not None:
        return cached
    try:
        tz = ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        # Bad key from a client, or a host with no IANA database installed.
        logger.warning("Unknown timezone %r — falling back to %s", name, DEFAULT_TZ)
        tz = ZoneInfo(DEFAULT_TZ)
    _tz_cache[name] = tz
    return tz


def local_now(tz_name: str | None) -> datetime:
    """Current instant, expressed in the given timezone."""
    return datetime.now(timezone.utc).astimezone(resolve_tz(tz_name))


def local_date(tz_name: str | None) -> str:
    """Today's date ("YYYY-MM-DD") in the given timezone."""
    return local_now(tz_name).strftime(DATE_FMT)


def local_date_of(instant: datetime, tz_name: str | None) -> str:
    """The local date a UTC instant falls on, in the given timezone.

    A naive datetime is assumed to be UTC — every timestamp this project
    stores is written by ``models._utcnow``.
    """
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    return instant.astimezone(resolve_tz(tz_name)).strftime(DATE_FMT)


def learner_today(learner) -> str:
    """Today's date in the learner's own timezone. The canonical day boundary."""
    return local_date(getattr(learner, "timezone", None))
