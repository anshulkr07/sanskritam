"""Seed orchestrator — idempotently populates the database with content."""

import uuid
import logging

from app.db import SessionLocal
from app.models import Challenge, Feature, Shloka
from app.seeds.features import SEED_FEATURES
from app.seeds.challenges import SEED_CHALLENGES
from app.seeds.shlokas import SEED_SLOKAS
from app.seeds.dialogue import seed_dialogue

logger = logging.getLogger("shabd.seed")

_SEEDED_KEY = "_seeded_v1"


def run_seed():
    """Idempotent seed: run once per database."""
    db = SessionLocal()
    try:
        # Check if already seeded using a simple sentinel
        existing_features = db.query(Feature).count()
        if existing_features > 10:
            logger.info("Database already seeded (%d features found)", existing_features)
            # Content added after the first seed still needs a pass: each of
            # these is self-idempotent, so run them on every startup.
            seed_dialogue(db)
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
    """Insert shloka data."""
    for sdata in SEED_SLOKAS:
        existing = db.query(Shloka).filter(
            Shloka.source_ref == sdata["source_ref"],
            Shloka.date == sdata["date"],
        ).first()
        if existing:
            continue
        shloka = Shloka(
            id=uuid.uuid4().hex[:16],
            date=sdata["date"],
            source_ref=sdata["source_ref"],
            devanagari=sdata["devanagari"],
            iast=sdata.get("iast", ""),
            metre=sdata.get("metre", ""),
            word_breakdown=sdata.get("word_breakdown", []),
            features=sdata.get("features", []),
            register=sdata.get("register", "classical"),
            audio_url=sdata.get("audio_url", ""),
        )
        db.add(shloka)
    logger.info("Seeded %d shlokas", len(SEED_SLOKAS))