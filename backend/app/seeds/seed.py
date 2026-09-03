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
from app.services.chandas import scan as chandas_scan

logger = logging.getLogger("shabd.seed")

_SEEDED_KEY = "_seeded_v1"


def run_seed():
    """Idempotent seed: run once per database, refill content every boot."""
    db = SessionLocal()
    try:
        # Check if already seeded using a simple sentinel
        existing_features = db.query(Feature).count()
        if existing_features > 10:
            logger.info("Database already seeded (%d features found)", existing_features)
            # Content added after the first seed still needs a pass: each of
            # these is self-idempotent, so run them on every startup. The
            # śloka well is seeded unconditionally too (P7-6) — a daily
            # surface must be able to refill, never just on the first seed.
            seed_dialogue(db)
            seed_daily_words(db)
            _seed_shlokas(db)
            db.commit()
            return

        # Seed features
        _seed_features(db)

        # Seed challenges
        _seed_challenges(db)

        # Seed shlokas
        _seed_shlokas(db)

        # Seed dialogue scenario
        seed_dialogue(db)

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
    """Insert challenge data."""
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
            target_iast=cdata.get("target_iast", ""),
            features=cdata.get("features", []),
            accepted_parses=cdata.get("accepted_parses", []),
            register=cdata.get("register", "laukika"),
        )
        db.add(challenge)
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
            source_ref=sdata["source_ref"],
            devanagari=sdata["devanagari"],
            iast=sdata.get("iast", ""),
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