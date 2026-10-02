"""Seed orchestrator — idempotently populates the database with content."""

import uuid
import logging
from datetime import timedelta

from app.db import SessionLocal
from app.models import Challenge, Feature, Shloka
from app.seeds.features import SEED_FEATURES
from app.seeds.challenges import SEED_CHALLENGES
from app.seeds.shlokas import SEED_SLOKAS, SHLOKA_ANCHOR
from app.seeds.dialogue import seed_dialogue
from app.seeds.daily_words import seed_daily_words
from app.services import iast
from app.services.chandas import scan as chandas_scan

logger = logging.getLogger("shabd.seed")

_SEEDED_KEY = "_seeded_v1"


def run_seed():
    """Idempotent seed: run once per database, refill content every boot.

    Every content seed below is self-idempotent — each checks for existing
    rows and skips — so they all run unconditionally on every startup. There
    is deliberately a single code path and no first-run-only branch: a
    surface that must keep filling (daily word, śloka, dialogue, challenges)
    can never be skipped because the seeder took a different path. This is
    P7-9 — daily words were once only seeded on the already-seeded branch,
    so a fresh database started with zero daily words until its second boot.
    """
    db = SessionLocal()
    try:
        # Seed features
        _seed_features(db)

        # Seed challenges
        _seed_challenges(db)

        # Seed shlokas
        _seed_shlokas(db)

        # Reader corrections (HANDOVER 7.5): renumber 8.30 to 8.8, prefix
        # unnumbered lines as Sūkti, delete rows that duplicate an imported
        # verse. Keyed on the old reference and date so existing databases
        # are repaired the same way fresh ones seed.
        _correct_reader_rows(db)

        # Seed dialogue scenario
        seed_dialogue(db)

        # Seed daily words
        seed_daily_words(db)

        # Seed writing items (P20-1)
        from app.seeds.writing_items import seed_writing_items
        seed_writing_items(db)

        # Seed curriculum: the unit spine (P23-1) FIRST — lessons carry a
        # foreign key to it, so nothing below can land until it exists.
        # Then lessons + their steps (P22-1/P22-3/P23-2), vocabulary
        # (P22-5), graded reading (P22-6) — all additive and idempotent
        # (§2.13).
        from app.seeds.units import seed_units
        from app.seeds.licences import seed_content_sources
        from app.seeds.lessons import seed_lessons
        from app.seeds.lesson_steps import seed_lesson_steps
        from app.seeds.reader_passages import seed_reader_passages
        from app.seeds.vocab import seed_vocab
        from app.seeds.video_items import seed_video_items
        seed_units(db)
        # P23-4a: the registry FIRST — every content row below points at it.
        seed_content_sources(db)
        seed_lessons(db)
        seed_lesson_steps(db)
        seed_vocab(db)
        seed_reader_passages(db)
        # P24: the video catalogue — metadata only, after the registry it
        # points at (source_key must resolve like every other attribution).
        seed_video_items(db)

        # Seed the canon catalogue (P21-4) — additive, idempotent
        from app.seeds.canon import seed_canon
        seed_canon(db)

        # Seed the story deck (Discover Sanskrit) — additive, idempotent.
        # After the registry it points at (attribution must resolve).
        from app.seeds.story_cards import seed_story
        seed_story(db)

        # Seed the word journey (handover_language) — after the registry it
        # points at. Additive and idempotent; rows missing from files withdraw.
        from app.seeds.word_origins import seed_word_origins
        seed_word_origins(db)

        db.commit()
        logger.info("Database seeded successfully")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _seed_features(db):
    """Insert feature taxonomy."""
    for fdata in SEED_FEATURES:
        existing = db.query(Feature).filter(Feature.id == fdata["id"]).first()
        if existing:
            continue
        feature = Feature(**fdata)
        db.add(feature)
    logger.info("Seeded %d features", len(SEED_FEATURES))


def _seed_challenges(db):
    """Insert challenge data.

    Idempotent per ``(target_sanskrit, register)``. English and Hindi prompt
    variants can share the same Sanskrit target — under the P7-10 unique
    constraint that is one row, so the existence check must see an added row
    before the next candidate (flush per add). Seed challenges are
    hand-authored and shipped content, so they carry ``review_status``
    "approved" (P7-11 grandfathering); generated ones start "pending".
    """
    for cdata in SEED_CHALLENGES:
        existing = db.query(Challenge).filter(
            Challenge.target_sanskrit == cdata["target_sanskrit"],
            Challenge.register == cdata["register"],
        ).first()
        if existing:
            continue
        challenge = Challenge(
            id=uuid.uuid4().hex[:16],
            prompt_l1=cdata["prompt_l1"],
            prompt_lang=cdata.get("prompt_lang", "en"),
            target_sanskrit=cdata["target_sanskrit"],
            # P7-13: IAST is derived from lipi, never hand-typed — the seed
            # file's values are ignored so the table-wide invariant holds.
            target_iast=iast.to_iast(cdata["target_sanskrit"]),
            features=cdata.get("features", []),
            accepted_parses=cdata.get("accepted_parses", []),
            register=cdata.get("register", "laukika"),
            review_status="approved",
        )
        db.add(challenge)
        db.flush()
    logger.info("Seeded %d challenges", len(SEED_CHALLENGES))


def _seed_shlokas(db):
    """Insert shloka data — self-idempotent, runs on every startup (P7-6).

    Dates derive from a FIXED anchor (SHLOKA_ANCHOR + day_offset), never
    date.today(), so a re-seed or a fresh boot cannot drift the schedule.
    ``metre`` is computed from the chandas engine rather than hand-typed;
    anuṣṭubh (variable) returns empty, which is correct (§6).
    """
    inserted = 0
    for sdata in SEED_SLOKAS:
        date_iso = (SHLOKA_ANCHOR + timedelta(days=sdata["day_offset"])).isoformat()
        ref = _normalise_ref(sdata["source_ref"])
        existing = db.query(Shloka).filter(
            Shloka.source_ref == ref,
            Shloka.date == date_iso,
        ).first()
        # Also skip when the old (pre-correction) ref already seeded: the
        # corrections step renames it, and re-inserting the old row would
        # bring the wrong reference back.
        if existing is None and ref != sdata["source_ref"]:
            existing = db.query(Shloka).filter(
                Shloka.source_ref == sdata["source_ref"],
                Shloka.date == date_iso,
            ).first()
        if existing:
            continue
        # Metre from the engine, never hand-typed (§6 / P7-6).
        metre = ""
        try:
            metre = (chandas_scan(sdata["devanagari"]).get("metre") or "") or ""
        except Exception:  # chandas data missing/unsupported — metre stays absent
            metre = ""
        shloka = Shloka(
            id=uuid.uuid4().hex[:16],
            date=date_iso,
            source_ref=ref,
            devanagari=sdata["devanagari"],
            # P7-13: derived from lipi, never hand-typed — the seed file's
            # value is ignored so the table-wide invariant holds.
            iast=iast.to_iast(sdata["devanagari"]),
            metre=metre,
            word_breakdown=sdata.get("word_breakdown", []),
            features=sdata.get("features", []),
            register=sdata.get("register", "classical"),
            audio_url=sdata.get("audio_url", ""),
        )
        db.add(shloka)
        inserted += 1
    if inserted:
        logger.info("Seeded %d new shlokas", inserted)


def _normalise_ref(source_ref: str) -> str:
    """Seed-time reference normalisation (HANDOVER 7.5).

    - "Bhagavad Gita 8.30" does not exist (chapter 8 has 28 verses; the
      text is 8.8), so it becomes 8.8 in fresh databases.
    - A line with no verse number does not belong in a book: it is
      prefixed "Sukti" so the reader shows it in one "Sayings" book.
    """
    import re as _re

    ref = (source_ref or "").strip()
    if "8.30" in ref and "Bhagavad" in ref:
        ref = ref.replace("8.30", "8.8")
    if ref.startswith("Sūkti") or ref.startswith("Sukti"):
        return ref
    if not _re.search(r"\d+\.\d+", ref):
        return f"Sūkti: {ref}" if ref else "Sūkti"
    return ref


def _correct_reader_rows(db) -> None:
    """Repair existing databases the same way fresh seeds insert (7.5).

    Keyed on the old reference and date: renames 8.30 to 8.8, prefixes
    unnumbered lines as Sūkti, and deletes a row that then duplicates
    another verse. Changing a reference in place keeps the row's id and
    date, so the daily schedule and the (source_ref, date) key are
    untouched and the startup seed does not put the old row back.
    """
    import re as _re

    rows = db.query(Shloka).all()
    seen: set[tuple[str, str]] = set()
    for r in rows:
        want = _normalise_ref(r.source_ref or "")
        if want != (r.source_ref or ""):
            dup = db.query(Shloka).filter(
                Shloka.source_ref == want,
                Shloka.date == r.date,
                Shloka.id != r.id,
            ).first()
            if dup is not None:
                db.delete(r)
                continue
            r.source_ref = want
    db.flush()
    # Delete exact duplicates that share the normalised ref and date.
    for r in db.query(Shloka).order_by(Shloka.date, Shloka.id).all():
        key = ((r.source_ref or ""), (r.date or ""))
        if key in seen:
            db.delete(r)
        else:
            seen.add(key)
    # Drop any residual 8.30 that slipped through (chapter 8 has 28 verses).
    for r in db.query(Shloka).filter(Shloka.source_ref.contains("8.30")).all():
        if "Bhagavad" in (r.source_ref or ""):
            dup = db.query(Shloka).filter(
                Shloka.source_ref == (r.source_ref or "").replace("8.30", "8.8"),
                Shloka.date == r.date,
            ).first()
            if dup is not None:
                db.delete(r)
            else:
                r.source_ref = (r.source_ref or "").replace("8.30", "8.8")
    db.flush()