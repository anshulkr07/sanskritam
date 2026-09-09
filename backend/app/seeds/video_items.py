"""P24 · lesson-video seed — metadata ONLY, bytes stay on YouTube.

Every ``youtube_id`` below was verified live (YouTube oEmbed, 2026-09-09):
the video exists and its channel matches ``channel``. One row that failed
verification (``caf1HAXHhdA``, http 401) was dropped, not shipped.

Idempotent by (unit_id, youtube_id) for embeds and (unit_id, url) for
link-out rows. ``source_key`` points at the ``content_sources`` registry —
attribution is a join, never free text (P23-4a rule). Watching writes
nothing: there is no attempt endpoint for videos by design.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("shabd.seed.videos")


def _watch(vid: str) -> str:
    return "https://www.youtube.com/watch?v=" + vid


# (unit_id, rank, title, channel, youtube_id|None, url, lang, playback, source_key)
SEED_VIDEOS: list[tuple] = [
    # U1 · Sounds — the 5x5 grid, pronunciation, writing.
    ("u1", 1, "Introduction to the devanagari script: varnamala",
     "NPTEL IIT Kharagpur", "G7dYEFxJOuc", _watch("G7dYEFxJOuc"), "en", "embed", "yt-nptel"),
    ("u1", 2, "The sounds of Sanskrit: its alphabet",
     "NPTEL IIT Kharagpur", "UgVwzueOKRU", _watch("UgVwzueOKRU"), "en", "embed", "yt-nptel"),
    ("u1", 3, "Science of Sanskrit sounds",
     "Tattvam", "3aKT5cv1bpc", _watch("3aKT5cv1bpc"), "en", "embed", "yt-tattvam"),
    ("u1", 4, "Difference between sha, Sha and sa",
     "Tattvam", "AiiMtFipaCM", _watch("AiiMtFipaCM"), "en", "embed", "yt-tattvam"),
    ("u1", 5, "Learning to write Sanskrit consonants",
     "Tattvam", "UTOvQfty0l0", _watch("UTOvQfty0l0"), "en", "embed", "yt-tattvam"),
    ("u1", 6, "Proper pronunciation of nasal sounds",
     "Tattvam", "iwVi7v4WlyY", _watch("iwVi7v4WlyY"), "en", "embed", "yt-tattvam"),
    ("u1", 7, "Sanskrit Course: Pravesha Level 1 (full playlist)",
     "Samskrita Bharati", None,
     "https://www.youtube.com/playlist?list=PLWV98cyTzbXzF0LyF8liA00e2JYcNtCTU",
     "en", "link", "yt-samskritabharati"),
    # U2 · First Words — nominal sentences, first verbs.
    ("u2", 1, "Verbs (asti, bhavati) and nominal sentences",
     "SanskritStudio", "cL8Q_5sh-wo", _watch("cL8Q_5sh-wo"), "en", "embed", "yt-sanskritstudio"),
    ("u2", 2, "NPTEL: Basic + Intermediate Spoken Sanskrit (full course)",
     "NPTEL IIT Kharagpur", None, "https://nptel.ac.in/courses/109105135", "en", "link", "yt-nptel"),
    # U3 · More Cases — what each vibhakti means.
    ("u3", 1, "The vibhaktis 4-7: dative, ablative, genitive, locative",
     "UBC Sanskrit", "ildrlrXg17M", _watch("ildrlrXg17M"), "en", "embed", "yt-ubc"),
    ("u3", 2, "The sixth case",
     "Your Hindi Coach", "eI3-svIPC58", _watch("eI3-svIPC58"), "en", "embed", "yt-yourhindicoach"),
    # U4 · Numbers — eka/dvi/tri/catur variations, then counting to 100.
    ("u4", 1, "Sanskrit numbers 1-10: variations of 1-4",
     "Namaste Sanskrit", "CJEcn87tdWg", _watch("CJEcn87tdWg"), "en", "embed", "yt-namaste-sanskrit"),
    ("u4", 2, "Counting 1 to 100: interactive tutorial",
     "Sanskrit Sense", "Ulezcfjk9Xo", _watch("Ulezcfjk9Xo"), "en", "embed", "yt-sanskritsense"),
    ("u4", 3, "1 to 100 in Sanskrit: a fun test",
     "Sanskrit Sense", "-PY79PgpbAw", _watch("-PY79PgpbAw"), "en", "embed", "yt-sanskritsense"),
    # U5 · Persons — verbs across the 9-cell grid.
    ("u5", 1, "Basic verbs and some conjugations",
     "NPTEL IIT Kharagpur", "wKBXhXVEXXo", _watch("wKBXhXVEXXo"), "en", "embed", "yt-nptel"),
    # U6 · Sandhi — f(a,b)->c, with exercises.
    ("u6", 1, "Sandhi: full chapter explanation and exercise",
     "Magnet Brains", "7lSMWknu9LE", _watch("7lSMWknu9LE"), "hi", "embed", "yt-magnet-brains"),
    ("u6", 2, "Sandhi playlist (SuccessCDs Education)",
     "SuccessCDs Education", None,
     "https://www.youtube.com/playlist?list=PL9vL8QnJ37pIIWno5umex4-HTNCt239wA",
     "hi", "link", "yt-successcds"),
    # U7 · Genders — stem type predicts the paradigm; balak as template.
    ("u7", 1, "Balak shabd roop: masculine a-stem forms, line by line",
     "MPES Classes", "YA7Yamtumec", _watch("YA7Yamtumec"), "en", "embed", "yt-mpes"),
    ("u7", 2, "Balak shabd roop trick",
     "APNA CLASSES", "D2ohBcsWKwU", _watch("D2ohBcsWKwU"), "hi", "embed", "yt-apna-classes"),
    # U8 · More Tenses — lrit, and the PG shelf beyond the app.
    ("u8", 1, "As-dhatu in lrit lakar (future tense)",
     "Mamta Ojha", "uuCF2pr8z8I", _watch("uuCF2pr8z8I"), "hi", "embed", "yt-mamta-ojha"),
    ("u8", 2, "e-PG Pathshala: Sanskrit MA / Acharya Vyakarana modules",
     "INFLIBNET Centre", None, "https://epgp.inflibnet.ac.in/", "en", "link", "epgp"),
    # U9 · Voices — parasmaipada vs atmanepada.
    ("u9", 1, "Atmanepada across lakars",
     "Vibha Mam Sanskrit Classes", "KJECT1nS9YY", _watch("KJECT1nS9YY"), "hi", "embed", "yt-vibha-mam"),
    # U10 · Compounds — the four samasa types.
    ("u10", 1, "Samas, part 1 (Class 10)",
     "Magnet Brains", "PFO0ccMkcoQ", _watch("PFO0ccMkcoQ"), "hi", "embed", "yt-magnet-brains"),
    ("u10", 2, "Samaasa types, part 1",
     "Learn Sanskrit Online : vyoma-samskrta-pathasala", "ZXPZZS7GwCA",
     _watch("ZXPZZS7GwCA"), "en", "embed", "yt-vyoma"),
    # U11 · Karaka — vibhakti use explained through karaka contexts.
    ("u11", 1, "Sanskrit karak rules, part 1 (Class 9 & 10)",
     "Vakratunda Sanskrit Classes by Sonali", "WZmlHAFjGqc", _watch("WZmlHAFjGqc"),
     "hi", "embed", "yt-vakratunda"),
    ("u11", 2, "Vibhakti: sentences with correct case-endings (course)",
     "Vyoma", None,
     "https://www.sanskritfromhome.org/course-details/vibhakti-batch-2-7140",
     "en", "link", "yt-vyoma"),
]


def seed_video_items(db) -> dict[str, int]:
    """Idempotent video catalogue seed. Retunes copy on every boot; never
    deletes a row (an importer or a learner bookmark may point at it)."""
    from app.models import VideoItem

    added = 0
    updated = 0
    for (unit_id, rank, title, channel, youtube_id, url, lang, playback, source_key) in SEED_VIDEOS:
        if youtube_id:
            row = db.query(VideoItem).filter(
                VideoItem.unit_id == unit_id,
                VideoItem.youtube_id == youtube_id,
            ).first()
        else:
            row = db.query(VideoItem).filter(
                VideoItem.unit_id == unit_id,
                VideoItem.url == url,
            ).first()
        if row is None:
            db.add(VideoItem(
                unit_id=unit_id, rank=rank, title=title, channel=channel,
                youtube_id=youtube_id, url=url, lang=lang, playback=playback,
                source_key=source_key,
            ))
            added += 1
            continue
        if (row.rank, row.title, row.channel, row.url, row.lang, row.playback,
                row.source_key) != (rank, title, channel, url, lang, playback, source_key):
            row.rank, row.title, row.channel = rank, title, channel
            row.url, row.lang, row.playback, row.source_key = url, lang, playback, source_key
            updated += 1
    db.flush()
    logger.info("VideoItems: %d added, %d retuned", added, updated)
    return {"added": added, "updated": updated}
