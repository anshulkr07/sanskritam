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

        # Seed corrections (2026-10-02): rows seeded from an earlier seed
        # file take the corrected reference, text and glosses, in place.
        _correct_seed_rows(db)

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

        # Play games (handover_games_daily_multiplayer): reviewed content and
        # the cosmetic catalogue — additive, idempotent.
        from app.seeds.game_content import seed_game_content, seed_cosmetics
        seed_game_content(db)
        seed_cosmetics(db)

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

    A seeded day is recognised by its date alone. Each day_offset is one date
    and one verse, so a row on that date IS this slot, whatever reference or
    text it holds by now: the reference may have been corrected since, or the
    text replaced by ``scripts/import_text --fix-existing``. The check used
    to be (source_ref, date), which put a second row on the date every time
    a reference in the seed file changed.
    """
    inserted = 0
    for sdata in SEED_SLOKAS:
        date_iso = (SHLOKA_ANCHOR + timedelta(days=sdata["day_offset"])).isoformat()
        # Boot repairs are for seed rows only (6.4): paged books share dates.
        if db.query(Shloka.id).filter(Shloka.date == date_iso, Shloka.in_daily.is_(True)).first():
            continue
        shloka = Shloka(
            id=uuid.uuid4().hex[:16],
            date=date_iso,
            source_ref=_normalise_ref(sdata["source_ref"]),
            devanagari=sdata["devanagari"],
            # P7-13: derived from lipi, never hand-typed — the seed file's
            # value is ignored so the table-wide invariant holds.
            iast=iast.to_iast(sdata["devanagari"]),
            # Metre from the engine, never hand-typed (§6 / P7-6).
            metre=_metre(sdata["devanagari"]),
            word_breakdown=sdata.get("word_breakdown", []),
            features=sdata.get("features", []),
            register=sdata.get("register", "classical"),
            audio_url=sdata.get("audio_url", ""),
            book=None,
            chapter="",
            seq=0,
            in_daily=True,
        )
        db.add(shloka)
        inserted += 1
    if inserted:
        logger.info("Seeded %d new shlokas", inserted)


def _metre(devanagari: str) -> str:
    """The verse's metre from the chandas engine, "" when it names none."""
    try:
        return (chandas_scan(devanagari).get("metre") or "") or ""
    except Exception:  # chandas data missing/unsupported — metre stays absent
        return ""


def _correct_seed_rows(db) -> None:
    """Bring rows seeded from an earlier seed file up to the current one.

    The seeder leaves a day that already has a row alone, so a correction in
    seeds/shlokas.py (a wrong reference, an invented line replaced by a real
    verse, a wrong gloss) would otherwise reach fresh databases only. Keyed
    on the date plus the exact Devanagari, so a row whose text something else
    changed (``import_text --fix-existing``) matches nothing and is left as
    it is:

    - the row holds the seed's text: its reference and word breakdown are
      brought to the seed's. Id, date, text and stored meaning stay.
    - the row holds a text the seed file used to carry for that day (the
      entry's ``was``): the verse is replaced in place, keeping id and date,
      so the daily schedule does not move. Unless the old text was the same
      verse misspelt, its translations are cleared: a meaning must not
      outlive the Sanskrit it was written for.

    The reference is not unique in this table. An imported Gītā holds the
    whole of 18.66 under the reference this step gives the seeded half-verse,
    and the seed itself repeats 2.47; a row with the same reference on
    another date is not touched. A second row on the SAME date holding the
    day's old or new text is a copy and is deleted.

    Last, what was stored under a retired text is removed once no verse
    carries that text: the ``ask_answers`` rows keyed by it
    (services/verse_study.py) and the graded-reading passage copied from it
    (seeds/reader_passages.py, which only ever adds).
    """
    from app.models import AskAnswer, ReaderPassage

    renamed = replaced = reglossed = 0
    retired: list[str] = []
    for sdata in SEED_SLOKAS:
        date_iso = (SHLOKA_ANCHOR + timedelta(days=sdata["day_offset"])).isoformat()
        text = sdata["devanagari"]
        was = dict(sdata.get("was") or [])  # old text -> same verse, respelt
        retired.extend(old for old, same in was.items() if not same)
        rows = db.query(Shloka).filter(Shloka.date == date_iso, Shloka.in_daily.is_(True)).order_by(Shloka.id).all()
        ours = [r for r in rows if r.devanagari == text or r.devanagari in was]
        if not ours:
            continue
        # One row carries the day: the one already holding the seed's text
        # (with a stored meaning, if two do), else one holding an old text.
        ours.sort(key=lambda r: (r.devanagari != text,
                                 not ((r.translation_en or "") + (r.translation_hi or "")).strip()))
        row = ours[0]
        for copy in ours[1:]:
            db.delete(copy)
        if row.devanagari != text:
            keep_meaning = was[row.devanagari]
            row.devanagari = text
            row.iast = iast.to_iast(text)
            row.metre = _metre(text)
            if not keep_meaning:
                row.translation_en = ""
                row.translation_hi = ""
                row.audio_url = sdata.get("audio_url", "")
            replaced += 1
        ref = _normalise_ref(sdata["source_ref"])
        if (row.source_ref or "") != ref:
            row.source_ref = ref
            renamed += 1
        breakdown = sdata.get("word_breakdown", [])
        if (row.word_breakdown or []) != breakdown:
            row.word_breakdown = breakdown
            row.features = sdata.get("features", [])
            reglossed += 1
    db.flush()

    if retired:
        still = {d for (d,) in db.query(Shloka.devanagari)
                 .filter(Shloka.devanagari.in_(retired)).all()}
        gone = [t for t in retired if t not in still]
        if gone:
            # ask_answers.subject is the verse text as asked, stripped.
            db.query(AskAnswer).filter(
                AskAnswer.subject.in_([t.strip() for t in gone])
            ).delete(synchronize_session=False)
            db.query(ReaderPassage).filter(
                ReaderPassage.devanagari.in_(gone)
            ).delete(synchronize_session=False)
    if renamed or replaced or reglossed:
        logger.info("Seed corrections: %d verse(s) replaced, %d reference(s) "
                    "corrected, %d word breakdown(s) updated",
                    replaced, renamed, reglossed)


def _normalise_ref(source_ref: str) -> str:
    """Seed-time reference normalisation (HANDOVER 7.5).

    - "Bhagavad Gita 8.30" does not exist (chapter 8 has 28 verses; the
      text is 8.8), so it becomes 8.8 in fresh databases.
    - A line with no verse number does not belong in a book: it is
      prefixed "Sukti" so the reader shows it in one "Sayings" book.
      A number is "2.47" or, for a text counted straight through, the
      trailing "13" of "Nītiśataka 13".
    - Until 2026-10-02 a trailing single number did not count, so rows
      such as the imported "Īśopaniṣad 1" were renamed "Sūkti: Īśopaniṣad 1"
      on every boot, which also broke re-importing them by reference. A
      prefixed reference that carries a number gets its own reference back.
    """
    import re as _re

    numbered = _re.compile(r"\d+\.\d+|\s\d+$")
    ref = (source_ref or "").strip()
    if "Bhagavad" in ref:
        # Chapter 8 has 28 verses: seed file's "8.30" is 8.8. The lookbehind
        # keeps "18.30" (a real verse) intact — it was once renamed to 18.8.
        ref = _re.sub(r"(?<!\d)8\.30\b", "8.8", ref)
    prefixed = _re.match(r"S[ūu]kti\b:?\s*(.*)$", ref)
    if prefixed:
        rest = prefixed.group(1).strip()
        return rest if rest and numbered.search(rest) else ref
    if not numbered.search(ref):
        return f"Sūkti: {ref}" if ref else "Sūkti"
    return ref


def _correct_reader_rows(db) -> None:
    """Repair existing databases the same way fresh seeds insert (7.5).

    Keyed on the old reference and date: renames 8.30 to 8.8, prefixes
    unnumbered lines as Sūkti, takes the prefix off a numbered line the old
    rule prefixed ("Sūkti: Īśopaniṣad 1"), and deletes a row that then duplicates
    another verse. Changing a reference in place keeps the row's id and
    date, so the daily schedule and the (source_ref, date) key are
    untouched and the startup seed does not put the old row back.
    """
    import re as _re

    rows = db.query(Shloka).filter(Shloka.in_daily.is_(True)).all()
    seen: set[tuple[str, str]] = set()
    for r in rows:
        want = _normalise_ref(r.source_ref or "")
        if want != (r.source_ref or ""):
            dup = db.query(Shloka).filter(
                Shloka.source_ref == want,
                Shloka.date == r.date,
                Shloka.in_daily.is_(True),
                Shloka.id != r.id,
            ).first()
            if dup is not None:
                db.delete(r)
                continue
            r.source_ref = want
    db.flush()
    # Delete exact duplicates that share the normalised ref and date.
    for r in db.query(Shloka).filter(Shloka.in_daily.is_(True)).order_by(Shloka.date, Shloka.id).all():
        key = ((r.source_ref or ""), (r.date or ""))
        if key in seen:
            db.delete(r)
        else:
            seen.add(key)
    # Drop any residual 8.30 that slipped through (chapter 8 has 28 verses).
    # Same standalone-8.30 rule as _normalise_ref: 18.30 is a real verse.
    for r in db.query(Shloka).filter(Shloka.source_ref.contains("8.30"), Shloka.in_daily.is_(True)).all():
        if "Bhagavad" in (r.source_ref or "") and _re.search(r"(?<!\d)8\.30\b", r.source_ref or ""):
            dup = db.query(Shloka).filter(
                Shloka.source_ref == _re.sub(r"(?<!\d)8\.30\b", "8.8", r.source_ref or ""),
                Shloka.date == r.date,
                Shloka.in_daily.is_(True),
            ).first()
            if dup is not None:
                db.delete(r)
            else:
                r.source_ref = _re.sub(r"(?<!\d)8\.30\b", "8.8", r.source_ref or "")
    db.flush()