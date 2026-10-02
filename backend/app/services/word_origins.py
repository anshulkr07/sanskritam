"""Word journey service (handover_language 5.4).

Pure pick() plus DB helpers. The day is always the learner's local date,
never server UTC.
"""

from __future__ import annotations

from datetime import date

INCLUDE_RELATED = True


def _get(obj, key: str):
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _visible_routes(routes) -> list:
    out = []
    for r in routes or []:
        status = _get(r, "status") or "approved"
        if status != "approved":
            continue
        kind = _get(r, "kind") or ""
        if not INCLUDE_RELATED and kind == "related":
            continue
        out.append(r)
    # Order by rank when present, stable otherwise.
    try:
        out.sort(key=lambda r: (_get(r, "rank") or 0))
    except Exception:
        pass
    return out


def _parse_day(s: str):
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def pick(origins, routes_by_origin: dict, day: str):
    """Pick today's origin and its headline route. Pure, deterministic.

    origins: list of rows/dicts with ``id`` and ``scheduled_date``.
    routes_by_origin: {origin_id: [routes]} (raw; visibility filtered here).
    day: "YYYY-MM-DD".

    Returns (origin, route) or (None, None). No randomness, no hash().
    """
    day_d = _parse_day(day)
    if day_d is None:
        return (None, None)
    # Visible routes per origin.
    visible: dict[str, list] = {}
    for o in origins or []:
        oid = _get(o, "id")
        if not oid:
            continue
        vr = _visible_routes((routes_by_origin or {}).get(oid, []))
        if vr:
            visible[oid] = vr
    if not visible:
        return (None, None)
    # Sort origins by scheduled_date, oldest first.
    def _sd(o):
        return _get(o, "scheduled_date") or ""
    ordered = sorted([o for o in origins if _get(o, "id") in visible],
                     key=lambda o: (_sd(o), _get(o, "id") or ""))
    if not ordered:
        return (None, None)
    # 1. Exact date match headlines its first route.
    for o in ordered:
        if _sd(o) == day:
            vr = visible[_get(o, "id")]
            return (o, vr[0])
    # 2. Otherwise rotate among those scheduled on/before today.
    them = [o for o in ordered if _sd(o) <= day]
    if not them:
        return (None, None)
    first_d = _parse_day(_sd(them[0]))
    if first_d is None:
        return (None, None)
    offset = (day_d - first_d).days
    if offset < 0:
        return (None, None)
    n = len(them)
    origin = them[offset % n]
    vr = visible[_get(origin, "id")]
    if not vr:
        return (None, None)
    route = vr[(offset // n) % len(vr)]
    return (origin, route)


def relation_of(route) -> str:
    """Worked out, not stored: related|borrowed|travelled|traced.

    A hand-checked loan with no stops was read in a dictionary as a direct
    borrowing: "borrowed". A route the daily pipeline wrote is only known to
    go back to the Sanskrit word (the page was checked for the word and its
    source, not for how it travelled), so without confirmed stops it is
    "traced", which the app words as "Goes back to Sanskrit".
    """
    kind = _get(route, "kind") or ""
    if kind == "related":
        return "related"
    if kind == "loan":
        hops = _get(route, "hops") or []
        if isinstance(hops, list) and len(hops) > 0:
            return "travelled"
        if (_get(route, "checked_by") or "") == "page":
            return "traced"
        return "borrowed"
    return ""


def read_in_dictionary(origin) -> bool:
    """True when the Sanskrit word itself was read in Monier-Williams.

    That holds for every hand-checked batch and for no pipeline row: the
    pipeline checks a stem against the Vidyut kosha, not against the
    dictionary, so its cards must not name the dictionary as a source.
    """
    return (_get(origin, "batch") or "") != "auto"


def source_keys_of(origin, routes) -> set[str]:
    """Licence-registry keys behind one origin's card."""
    keys: set[str] = {"mw"} if read_in_dictionary(origin) else set()
    for r in routes or []:
        for k in (_get(r, "source_keys") or []):
            if k:
                keys.add(k)
    return keys


def today_for(db, learner):
    """DB helper for GET /word-origins/today. At most 3 queries after auth."""
    from app.models import ContentSource, WordOrigin, WordRoute
    from app.services.localtime import local_date

    day = local_date(getattr(learner, "timezone", None))
    origins = (
        db.query(WordOrigin)
        .filter(WordOrigin.status == "approved", WordOrigin.scheduled_date <= day)
        .order_by(WordOrigin.scheduled_date)
        .all()
    )
    if not origins:
        return (day, None, None, [], [])
    ids = [o.id for o in origins]
    all_routes = (
        db.query(WordRoute)
        .filter(WordRoute.origin_id.in_(ids), WordRoute.status == "approved")
        .order_by(WordRoute.origin_id, WordRoute.rank)
        .all()
    )
    by_origin: dict[str, list] = {}
    for r in all_routes:
        by_origin.setdefault(r.origin_id, []).append(r)
    origin, headline = pick(origins, by_origin, day)
    if origin is None:
        return (day, None, None, [], [])
    routes = _visible_routes(by_origin.get(origin.id, []))
    keys = source_keys_of(origin, routes)
    sources = db.query(ContentSource).filter(ContentSource.key.in_(sorted(keys))).all() if keys else []
    return (day, origin, headline, routes, sources)


def list_for(db, learner):
    """Origins scheduled on or before today, newest first, with routes."""
    from app.models import WordOrigin, WordRoute
    from app.services.localtime import local_date

    day = local_date(getattr(learner, "timezone", None))
    origins = (
        db.query(WordOrigin)
        .filter(WordOrigin.status == "approved", WordOrigin.scheduled_date <= day)
        .order_by(WordOrigin.scheduled_date.desc())
        .all()
    )
    if not origins:
        return (day, [], {})
    ids = [o.id for o in origins]
    all_routes = (
        db.query(WordRoute)
        .filter(WordRoute.origin_id.in_(ids), WordRoute.status == "approved")
        .order_by(WordRoute.origin_id, WordRoute.rank)
        .all()
    )
    by_origin: dict[str, list] = {}
    for r in all_routes:
        by_origin.setdefault(r.origin_id, []).append(r)
    # Drop origins left with no visible route.
    kept = []
    for o in origins:
        if _visible_routes(by_origin.get(o.id, [])):
            kept.append(o)
    return (day, kept, by_origin)


def get_for(db, origin_id: str, learner):
    """One origin for detail screen, or None if unknown/withdrawn/future."""
    from app.models import ContentSource, WordOrigin, WordRoute
    from app.services.localtime import local_date

    day = local_date(getattr(learner, "timezone", None))
    origin = db.query(WordOrigin).filter(WordOrigin.id == origin_id).first()
    if origin is None:
        return (day, None, [], [])
    if (origin.status or "") != "approved":
        return (day, None, [], [])
    if (origin.scheduled_date or "") > day:
        return (day, None, [], [])
    routes = (
        db.query(WordRoute)
        .filter(WordRoute.origin_id == origin.id, WordRoute.status == "approved")
        .order_by(WordRoute.rank)
        .all()
    )
    routes = _visible_routes(routes)
    if not routes:
        return (day, None, [], [])
    keys = source_keys_of(origin, routes)
    sources = db.query(ContentSource).filter(ContentSource.key.in_(sorted(keys))).all() if keys else []
    return (day, origin, routes, sources)
