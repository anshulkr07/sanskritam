"""What a text's licence lets the app do with it (owner, 2026-11-06).

Most transcriptions allow commercial use with attribution: public domain, CC0,
MIT, CC BY (Digital Corpus of Sanskrit) and CC BY-SA (sa.wikisource). GRETIL's
CC BY-NC-SA 4.0 transcriptions do not. That licence allows only uses "not
primarily intended for or directed towards commercial advantage or monetary
compensation" (s.1, NonCommercial). Ads inside such a text are monetary
compensation, so a non-commercial text is never sold, never carries ad pages or
player ads, and saves offline for everyone rather than being a plan perk.

The Digital Corpus of Sanskrit (CC BY 4.0) has the Arthaśāstra and the
Garuḍapurāṇa, so those two can move off GRETIL; Līlāvatī is not in it.
"""
import re

NONCOMMERCIAL = re.compile(r"\bNC\b|non-?commercial", re.IGNORECASE)


def noncommercial_licence(licence):
    return bool(NONCOMMERCIAL.search(licence or ""))


def noncommercial(db, title_or_slug):
    """True when the book's recorded licence forbids commercial use.
    Takes "gita:book" or "gita"; cached for the request."""
    from app.models import CanonText
    slug = (title_or_slug or "").split(":")[0]
    if not slug:
        return False
    cache = db.info.setdefault("noncommercial", {})
    if slug not in cache:
        text = db.query(CanonText).filter_by(slug=slug).first()
        cache[slug] = bool(text and noncommercial_licence(text.licence))
    return cache[slug]
