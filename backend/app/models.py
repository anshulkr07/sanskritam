"""SQLAlchemy 2.0 ORM models for the Shabd backend."""

import uuid
from datetime import datetime

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, Boolean, JSON, DateTime
from sqlalchemy.orm import relationship

from app.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex[:16]


class Feature(Base):
    """Feature taxonomy: cases, numbers, tenses, voices, sandhi types."""

    __tablename__ = "features"

    id = Column(String(64), primary_key=True)  # e.g. "ACC", "DUAL", "PRES.1SG"
    kind = Column(String(32), nullable=False, index=True)  # case|number|tense|voice|sandhi|other
    rank = Column(Integer, default=0)  # ordering for progression
    label_en = Column(String(128), default="")
    label_hi = Column(String(256), default="")

    def __repr__(self) -> str:
        return f"<Feature {self.id} ({self.kind})>"


class Token(Base):
    """Auth token stored server-side, linked to a learner."""

    __tablename__ = "tokens"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    learner = relationship("Learner", back_populates="tokens")


class Learner(Base):
    """Learner profile + adaptive model state."""

    __tablename__ = "learners"

    id = Column(String(64), primary_key=True, default=_uuid)
    display_name = Column(String(128), nullable=False)
    bridge_langs = Column(JSON, default=list)  # ["en", "hi"]
    sanskrit_ratio = Column(Float, default=0.3)
    script_ratio = Column(Float, default=0.3)
    feature_mastery = Column(JSON, default=dict)  # {feature_id: score 0..1}
    streak = Column(Integer, default=0)
    voice_minutes_used = Column(Float, default=0.0)
    recent_challenge_ids = Column(JSON, default=list)  # last N served — no-repeat window
    created_at = Column(DateTime, default=datetime.utcnow)

    tokens = relationship("Token", back_populates="learner", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="learner", cascade="all, delete-orphan")


class Challenge(Base):
    """A Sanskrit challenge: prompt in bridge language, target in Sanskrit."""

    __tablename__ = "challenges"

    id = Column(String(64), primary_key=True, default=_uuid)
    prompt_l1 = Column(Text, nullable=False)  # prompt in bridge language
    prompt_lang = Column(String(8), default="en")  # "en" | "hi"
    target_sanskrit = Column(Text, nullable=False)  # Devanagari
    target_iast = Column(Text, default="")
    features = Column(JSON, default=list)  # list of feature_ids this exercises
    accepted_parses = Column(JSON, default=list)  # list of {word_role -> feature} dicts
    audio_url = Column(String(512), default="")
    register = Column(String(16), default="laukika", index=True)  # laukika | classical
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "prompt_l1": self.prompt_l1,
            "prompt_lang": self.prompt_lang,
            "target_sanskrit": self.target_sanskrit,
            "target_iast": self.target_iast,
            "features": self.features,
            "accepted_parses": self.accepted_parses,
            "audio_url": self.audio_url,
            "register": self.register,
        }


class AcceptedParse(Base):
    """Individual accepted feature-set for a challenge (normalized)."""

    __tablename__ = "accepted_parses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    challenge_id = Column(String(64), ForeignKey("challenges.id"), nullable=False)
    features = Column(JSON, nullable=False)  # {word_role -> feature}

    challenge = relationship("Challenge", backref="parse_records")


class Shloka(Base):
    """Daily shloka with word breakdown."""

    __tablename__ = "shlokas"

    id = Column(String(64), primary_key=True, default=_uuid)
    date = Column(String(10), nullable=False, index=True)  # "2026-08-29"
    source_ref = Column(String(128), default="")
    devanagari = Column(Text, nullable=False)
    iast = Column(Text, default="")
    metre = Column(String(64), default="")
    word_breakdown = Column(JSON, default=list)  # list of {word, meaning, features}
    features = Column(JSON, default=list)
    audio_url = Column(String(512), default="")
    register = Column(String(16), default="classical")


class Attempt(Base):
    """Audit record of a learner's attempt on a challenge."""

    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    challenge_id = Column(String(64), ForeignKey("challenges.id"), nullable=False)
    raw_text = Column(Text, default="")
    parsed_features = Column(JSON, default=dict)
    verdict = Column(String(16), nullable=False)  # correct | off_by_one | incorrect
    diff = Column(JSON, default=list)
    diagnosis = Column(Text, default="")
    grammar_note = Column(JSON, nullable=True)
    abstained = Column(Boolean, default=False)
    ts = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="attempts")
    challenge = relationship("Challenge")


class Session(Base):
    """Optional session grouping for attempts."""

    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)