"""The free preview of a paid book or audiobook (owner decision 2026-11-06).

Books show 5% of their pages, and always at least one. The pages are picked once
per book and are the same for everyone, the way Google Books previews work. The
opening page is always free; most of the others come from the first fifth of the
book and the rest are scattered through the middle and the end, with gaps
between them, so the preview is never one continuous run. A percentage, not a
chapter, keeps a book with two chapters from giving half of itself away.

Audiobooks play their first 5% of running time free, and always at least the
whole first verse.

A page is one verse page of the reader. Changing PICK_VERSION re-draws every
book's pages; nothing else should.
"""
import hashlib
import math
import random

from sqlalchemy import or_

SHARE = 0.05
PICK_VERSION = "v1"
EARLY_SHARE = 0.6    # of the free pages, how many come from the opening fifth
EARLY_PART = 0.2     # the opening fifth of the book


def page_count(total):
    """How many of ``total`` pages are free."""
    return 0 if total <= 0 else min(total, max(1, math.ceil(total * SHARE)))


def _rng(slug):
    seed = hashlib.sha256(f"{slug}:preview:{PICK_VERSION}".encode()).digest()[:8]
    return random.Random(int.from_bytes(seed, "big"))


def pages(slug, total):
    """Zero-based indexes of the free pages, in reading order. Deterministic."""
    want = page_count(total)
    if not want:
        return []
    rng, chosen = _rng(slug), {0}

    def free(i):
        # Not already chosen and not next to a chosen page: the gaps are what
        # make it a preview rather than a run of the book.
        return i not in chosen and i - 1 not in chosen and i + 1 not in chosen

    def take(candidates, count):
        candidates = [i for i in candidates if free(i)]
        rng.shuffle(candidates)
        for i in candidates:
            if count <= 0:
                break
            if free(i):
                chosen.add(i)
                count -= 1
        return count

    early_end = max(2, math.ceil(total * EARLY_PART))
    early = max(0, round(want * EARLY_SHARE) - 1)
    short = take(range(2, early_end), early)
    rest = want - 1 - early + short
    if rest > 0 and early_end < total:
        # One page from each equal stretch of the middle and end.
        span = (total - early_end) / rest
        for n in range(rest):
            lo, hi = early_end + math.floor(n * span), early_end + math.floor((n + 1) * span)
            rest -= 1 - take(range(lo, max(lo + 1, hi)), 1)
    if len(chosen) < want:
        # Small books: anywhere that still leaves a gap, then anywhere at all.
        take(range(total), want - len(chosen))
    if len(chosen) < want:
        spare = [i for i in range(total) if i not in chosen]
        rng.shuffle(spare)
        chosen.update(spare[: want - len(chosen)])
    return sorted(chosen)


def book_rows(db, text):
    """The book's verse ids in reading order: one id per reader page."""
    from app.models import Shloka
    if text.paged:
        query = db.query(Shloka.id).filter_by(book=text.slug, in_daily=False).order_by(Shloka.seq, Shloka.id)
    else:
        predicates = [Shloka.source_ref.contains(p) for p in (text.ref_prefixes or []) if p]
        if not predicates:
            return []
        query = db.query(Shloka.id).filter(Shloka.in_daily.is_(True), or_(*predicates)).order_by(Shloka.date, Shloka.id)
    return [row[0] for row in query]


def free_ids(db, text):
    """Ids of the verses anyone may read in this book's preview."""
    ids = book_rows(db, text)
    return {ids[i] for i in pages(text.slug, len(ids))}


def audio_budget(total_ms, first_ms):
    """Free listening in milliseconds: 5% of the running time, at least the first verse."""
    if total_ms <= 0:
        return 0
    return max(int(first_ms or 0), math.ceil(total_ms * SHARE))
