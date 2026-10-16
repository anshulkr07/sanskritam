"""Reader policy shared by paged books, legacy lists and individual verse lookups."""
from datetime import timedelta

from sqlalchemy import or_
from app.config import settings
from app.models import CanonText, Shloka, VerseAudio
from app.commerce.models import AdGrant
from app.commerce import service as svc


def context(db, learner_id=None):
    key = ("commerce_access", learner_id)
    if key not in db.info:
        db.info[key] = {"texts": db.query(CanonText).all(), "previews": {}, "audio": {}, "chapter_counts": {},
                        "titles": {r.title_id for r in svc.active_unlocks(db, learner_id)} if learner_id else set(),
                        "ads": db.query(AdGrant).filter_by(learner_id=learner_id).filter(AdGrant.transaction_id.isnot(None), AdGrant.expires_at > svc.now()).all() if learner_id else []}
    return db.info[key]


def has_title(db, learner_id, title_id):
    return title_id in context(db, learner_id)["titles"]


def canon_for(db, row):
    texts = context(db)["texts"]
    if row.book:
        return next((t for t in texts if t.slug == row.book), None)
    for text in texts:
        if text.paged:
            continue
        if any(p and p in (row.source_ref or "") for p in (text.ref_prefixes or [])):
            return text
    return None


def has_ad(db, learner_id, title_id, kind, target=None):
    return any(r.title_id == title_id and r.kind == kind and (target is None or r.target == target)
               for r in context(db, learner_id)["ads"])


def reading_open(db, learner, text, row):
    if not settings.commerce_enabled:
        return True
    if has_title(db, learner.id, text.slug + ":book"):
        return True
    if text.paged and row.chapter and has_ad(db, learner.id, text.slug + ":book", "reading", row.chapter or ""):
        counts = context(db, learner.id)["chapter_counts"]
        if text.slug not in counts:
            counts[text.slug] = db.query(Shloka.chapter).filter_by(book=text.slug, in_daily=False).distinct().count()
        if counts[text.slug] > 1:
            return True
    previews = context(db, learner.id)["previews"]
    if text.slug in previews:
        value = previews[text.slug]
        return row.id in value if isinstance(value, set) else row.chapter == value
    if text.paged:
        first = db.query(Shloka).filter_by(book=text.slug, in_daily=False).order_by(Shloka.seq, Shloka.id).first()
        if not first:
            return False
        chapters = db.query(Shloka.chapter).filter_by(book=text.slug, in_daily=False).distinct().count()
        if chapters > 1:
            previews[text.slug] = first.chapter
            return row.chapter == first.chapter
        grants = sum(r.kind == "reading" and r.title_id == text.slug + ":book" for r in context(db, learner.id)["ads"])
        allowed = db.query(Shloka.id).filter_by(book=text.slug, in_daily=False).order_by(Shloka.seq, Shloka.id).limit(5 * (1 + grants)).all()
    else:
        predicates = [Shloka.source_ref.contains(p) for p in (text.ref_prefixes or []) if p]
        grants = sum(r.kind == "reading" and r.title_id == text.slug + ":book" for r in context(db, learner.id)["ads"])
        allowed = db.query(Shloka.id).filter(Shloka.in_daily.is_(True), or_(*predicates)).order_by(Shloka.date, Shloka.id).limit(5 * (1 + grants)).all() if predicates else []
    previews[text.slug] = {r[0] for r in allowed}
    return row.id in previews[text.slug]


def audio_offset(db, learner, text, row):
    cache = context(db, learner.id)["audio"]
    if text.slug not in cache:
        query = db.query(Shloka)
        if text.paged:
            query = query.filter_by(book=text.slug, in_daily=False).order_by(Shloka.seq, Shloka.id)
        else:
            predicates = [Shloka.source_ref.contains(p) for p in (text.ref_prefixes or []) if p]
            query = query.filter(Shloka.in_daily.is_(True), or_(*predicates)).order_by(Shloka.date, Shloka.id)
        rows = query.all()
        uids = [r.verse_uid for r in rows if r.verse_uid]
        durations = {uid: duration for uid, duration in db.query(VerseAudio.verse_uid, VerseAudio.duration_ms).filter(VerseAudio.verse_uid.in_(uids), VerseAudio.voice == settings.chant_voice)}
        offset, positions, seen = 0, {}, {}
        for r in rows:
            if r.verse_uid in seen:
                positions[r.id] = seen[r.verse_uid]
                continue
            positions[r.id] = offset
            if r.verse_uid:
                seen[r.verse_uid] = offset
            # Unmeasured legacy audio must not create unlimited free previews.
            offset += int(durations.get(r.verse_uid) or (120000 if r.audio_url else 0))
        cache[text.slug] = positions
    return cache[text.slug].get(row.id, 120000)


def filter_reading(db, learner, rows):
    if not settings.commerce_enabled:
        return rows
    cache = {}
    result = []
    for row in rows:
        key = row.book or row.source_ref
        if key not in cache:
            cache[key] = canon_for(db, row)
        text = cache[key]
        if text is None or reading_open(db, learner, text, row):
            result.append(row)
    return result


def protect_audio(db, learner, row, response, free_daily=False):
    if not settings.commerce_enabled:
        return response
    from app.commerce.router import sign
    text = None if free_daily else canon_for(db, row)
    slug = text.slug if text else "daily"
    # Audio is a separate title. Preview is server-clipped, never a full URL.
    unlocked = text is None or has_title(db, learner.id, slug + ":audio")
    limit_ms = None
    if not unlocked:
        extension = 120000 * sum(r.kind == "audio" and r.title_id == slug + ":audio" for r in context(db, learner.id)["ads"])
        used = audio_offset(db, learner, text, row)
        limit_ms = max(0, 120000 + extension - used)
    def url(kind):
        token = sign({"scope": "media", "sub": learner.id, "row": row.id, "kind": kind,
                      "limit_ms": limit_ms, "title": slug + ":audio", "exp": svc.now() + timedelta(minutes=5)})
        return "/commerce/media?ticket=" + token
    if limit_ms == 0:
        return response.model_copy(update={"audio_url": "", "chant": None})
    chant = response.chant
    if chant:
        chant = chant.model_copy(update={"url": url("chant"), "duration_ms": min(chant.duration_ms, limit_ms) if limit_ms else chant.duration_ms})
    return response.model_copy(update={"audio_url": url("legacy") if response.audio_url else "", "chant": chant})


def require_practice(db, learner, row, seconds):
    """Ordinary practice previews; scored competition endpoints remain independent."""
    if not settings.commerce_enabled:
        return
    from fastapi import HTTPException
    from app.models import Competition
    text = canon_for(db, row)
    if text is None or has_title(db, learner.id, text.slug + ":book") or has_title(db, learner.id, text.slug + ":audio"):
        return
    # A preview verse is also a sample recitation exercise.
    if reading_open(db, learner, text, row):
        return
    def contains(value):
        if isinstance(value, dict):
            return value.get("verse_uid") == row.verse_uid or any(contains(v) for v in value.values())
        return isinstance(value, list) and any(contains(v) for v in value)
    if any(contains(c.pieces) for c in db.query(Competition).filter(Competition.opens_at <= svc.now(), Competition.closes_at >= svc.now())):
        return
    svc.lock_wallet(db, learner.id)
    grant = db.query(AdGrant).filter_by(learner_id=learner.id, kind="practice").filter(
        AdGrant.title_id.in_([text.slug + ":book", text.slug + ":audio"]),
        AdGrant.transaction_id.isnot(None), AdGrant.expires_at > svc.now(), AdGrant.used_units + seconds <= 300).first()
    if not grant:
        raise HTTPException(402, "Unlock this title or use an optional ad to extend ordinary practice")
    import math
    grant.used_units += math.ceil(seconds)
    db.commit()
