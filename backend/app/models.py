"""SQLAlchemy 2.0 ORM models for the Shabd backend."""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, Boolean, JSON, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex[:16]


def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp (datetime.utcnow is deprecated + naive)."""
    return datetime.now(timezone.utc)


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
    created_at = Column(DateTime, default=_utcnow)
    learner = relationship("Learner", back_populates="tokens")


class Learner(Base):
    """Learner profile + adaptive model state."""

    __tablename__ = "learners"

    id = Column(String(64), primary_key=True, default=_uuid)
    display_name = Column(String(128), nullable=False)
    bridge_langs = Column(JSON, default=list)  # ["en", "hi"]
    install_id = Column(String(64), unique=True, nullable=True, index=True)  # device fingerprint for anonymous auth
    deleted_at = Column(DateTime, nullable=True)  # soft-delete marker (replaced by hard-delete in P1-3, kept for migration compat)
    # Effective ratio the system uses (drifts within the user's ceiling)
    sanskrit_ratio = Column(Float, default=0.3)
    # The USER's setting — ceiling for system drift. Owned exclusively by PATCH /me.
    sanskrit_ratio_setting = Column(Float, nullable=True)
    script_ratio = Column(Float, default=0.3)
    feature_mastery = Column(JSON, default=dict)  # {feature_id: score 0..1}
    streak = Column(Integer, default=0)
    voice_minutes_used = Column(Float, default=0.0)
    daily_goal_xp = Column(Integer, default=50)  # learner's daily XP target
    last_active_date = Column(String(10), default="")  # "2026-09-01", learner-local
    streak_freezes = Column(Integer, default=2)  # max 2 freezes
    # IANA key ("Asia/Kolkata"). The learner's day boundary is resolved
    # against this, never against server UTC — see services/localtime.py.
    timezone = Column(String(64), default="UTC")
    recent_challenge_ids = Column(JSON, default=list)  # last N served — no-repeat window
    created_at = Column(DateTime, default=_utcnow)

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
    # P7-11 review gate. Same vocabulary as DialogueScenario: generated
    # challenges land "pending"; only "approved" are served (selector filter).
    review_status = Column(String(16), default="pending", index=True)  # pending|approved|rejected
    review_note = Column(Text, default="")
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint(
            "target_sanskrit", "register", name="uq_challenges_target_register"
        ),
    )

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
            "review_status": self.review_status,
        }
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
    verdict = Column(String(16), nullable=False)  # correct | off_by_one | incorrect | unsure
    diff = Column(JSON, default=list)
    diagnosis = Column(Text, default="")
    grammar_note = Column(JSON, nullable=True)
    abstained = Column(Boolean, default=False)
    ts = Column(DateTime, default=_utcnow)

    learner = relationship("Learner", back_populates="attempts")
    challenge = relationship("Challenge")


class DialogueScenario(Base):
    """A pre-rendered dialogue-graph scenario (conversation)."""

    __tablename__ = "dialogue_scenarios"

    id = Column(String(64), primary_key=True, default=_uuid)
    title = Column(String(256), nullable=False)
    description = Column(Text, default="")
    register = Column(String(16), default="laukika", index=True)
    review_status = Column(String(16), default="pending", index=True)  # pending|approved|rejected
    review_note = Column(Text, default="")
    reviewed_at = Column(DateTime, nullable=True)
    entry_node_id = Column(String(64), nullable=True)
    min_ratio = Column(Float, default=0.0)
    max_ratio = Column(Float, default=1.0)
    est_minutes = Column(Integer, default=5)
    created_at = Column(DateTime, default=_utcnow)

    nodes = relationship("DialogueNode", back_populates="scenario", cascade="all, delete-orphan")
    edges = relationship("DialogueEdge", back_populates="scenario", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "register": self.register,
            "entry_node_id": self.entry_node_id,
            "min_ratio": self.min_ratio,
            "max_ratio": self.max_ratio,
            "est_minutes": self.est_minutes,
        }


class DialogueNode(Base):
    """A single tutor turn in a dialogue graph."""

    __tablename__ = "dialogue_nodes"

    id = Column(String(64), primary_key=True, default=_uuid)
    scenario_id = Column(String(64), ForeignKey("dialogue_scenarios.id"), nullable=False, index=True)
    kind = Column(String(16), nullable=False)  # "tutor" | "repair"
    repair_type = Column(String(16), nullable=True)  # "ask_again" | "narrow" | "bridge"
    lang = Column(String(8), nullable=False)  # "sa" | "hi" | "en"
    devanagari = Column(Text, nullable=False)
    iast = Column(Text, default="")
    gloss = Column(Text, default="")
    audio_url = Column(String(512), default="")
    ratio_band_min = Column(Float, default=0.0)
    ratio_band_max = Column(Float, default=1.0)
    sort = Column(Integer, default=0)

    scenario = relationship("DialogueScenario", back_populates="nodes")
    outgoing_edges = relationship(
        "DialogueEdge",
        back_populates="from_node",
        foreign_keys="DialogueEdge.from_node_id",
        cascade="all, delete-orphan",
    )


class DialogueEdge(Base):
    """An expected learner response transitioning between dialogue nodes."""

    __tablename__ = "dialogue_edges"

    id = Column(String(64), primary_key=True, default=_uuid)
    scenario_id = Column(String(64), ForeignKey("dialogue_scenarios.id"), nullable=False)
    from_node_id = Column(String(64), ForeignKey("dialogue_nodes.id"), nullable=False, index=True)
    to_node_id = Column(String(64), ForeignKey("dialogue_nodes.id"), nullable=True)
    lang = Column(String(8), nullable=False)  # "sa" | "bridge"
    expected_text = Column(Text, default="")
    accepted_parses = Column(JSON, default=list)
    expected_phrases = Column(JSON, default=list)
    features = Column(JSON, default=list)
    rank = Column(Integer, default=0)

    scenario = relationship("DialogueScenario", back_populates="edges")
    from_node = relationship(
        "DialogueNode",
        back_populates="outgoing_edges",
        foreign_keys=[from_node_id],
    )


class EscapeLog(Base):
    """Record of a learner's attempted utterance that triggered an escape to bridge language."""

    __tablename__ = "escape_logs"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=True)
    scenario_id = Column(String(64), ForeignKey("dialogue_scenarios.id"), nullable=False)
    node_id = Column(String(64), ForeignKey("dialogue_nodes.id"), nullable=False)
    transcript = Column(Text, default="")
    parsed_features = Column(JSON, default=dict)
    verdict = Column(String(16), nullable=False)
    ts = Column(DateTime, default=_utcnow)

    __table_args__ = (
        sa.Index("ix_escape_logs_scenario_node", "scenario_id", "node_id"),
    )


class UsageEvent(Base):
    """Append-only ledger of metered third-party usage, per learner."""

    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    kind = Column(String(16), nullable=False)   # "tts_chars" | "stt_seconds"
    amount = Column(Float, nullable=False)
    surface = Column(String(32), default="")    # "conversation" | "varnamala" | ...
    source = Column(String(16), default="live") # "live" | "prerendered"
    ts = Column(DateTime, default=_utcnow, index=True)


class PronunciationAttempt(Base):
    """Record of a learner's pronunciation attempt on an akṣara."""

    __tablename__ = "pronunciation_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    target = Column(String(32), nullable=False)       # the akṣara, Devanagari
    target_iast = Column(String(32), default="")
    transcript = Column(Text, default="")             # what Saaras heard
    verdict = Column(String(16), nullable=False)      # correct|near|incorrect|unsure
    contrast = Column(String(32), default="")         # e.g. "retroflex_vs_dental"
    confidence = Column(Float, default=0.0)
    abstained = Column(Boolean, default=False)
    ts = Column(DateTime, default=_utcnow)


class ConversationSession(Base):
    """Active conversation session tracking turn state."""

    __tablename__ = "conversation_sessions"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    scenario_id = Column(String(64), ForeignKey("dialogue_scenarios.id"), nullable=False)
    # NULL in "llm" mode: a free-form conversation has no position in the
    # dialogue graph. The scenario is still set — it supplies the situation and
    # the target features (the curriculum), just not a script.
    current_node_id = Column(String(64), ForeignKey("dialogue_nodes.id"), nullable=True)
    mode = Column(String(8), default="llm", nullable=False)  # "llm" | "graph"
    turn_count = Column(Integer, default=0)
    consecutive_escapes = Column(Integer, default=0)
    ratio_hint = Column(Float, default=0.3)
    started_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    learner = relationship("Learner")
    scenario = relationship("DialogueScenario")
    current_node = relationship("DialogueNode")
    turns = relationship(
        "ConversationTurn",
        back_populates="session",
        order_by="ConversationTurn.idx",
        cascade="all, delete-orphan",
    )


class ConversationTurn(Base):
    """One line of a free-form conversation — the LLM tutor's memory.

    The graph runtime never needed this: its history WAS the node pointer.
    A model-driven turn has to be told what was already said, and the learner
    has to be able to reopen a session and still see it.
    """

    __tablename__ = "conversation_turns"

    id = Column(String(64), primary_key=True, default=_uuid)
    session_id = Column(
        String(64), ForeignKey("conversation_sessions.id"), nullable=False, index=True
    )
    idx = Column(Integer, nullable=False, default=0)   # order within the session
    role = Column(String(16), nullable=False)          # "tutor" | "learner"
    devanagari = Column(Text, default="")              # Sanskrit, if any
    iast = Column(Text, default="")
    gloss = Column(Text, default="")                   # bridge-language line
    correction = Column(Text, default="")              # grammar note on a learner turn
    parsed_features = Column(JSON, default=dict)       # Vidyut's read of a learner turn
    verdict = Column(String(24), default="")
    ts = Column(DateTime, default=_utcnow)

    session = relationship("ConversationSession", back_populates="turns")


class DailyActivity(Base):
    """Daily activity tracking for XP, streak, and goals."""

    __tablename__ = "daily_activity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # "2026-09-01", learner-local
    xp = Column(Integer, default=0)
    attempts = Column(Integer, default=0)
    conversation_turns = Column(Integer, default=0)
    pronunciation_attempts = Column(Integer, default=0)
    goal_met = Column(Boolean, default=False)


class DailyWord(Base):
    """A curated daily word for the varṇamālā guessing game (P12).

    Words are curated from the common noun layer of the lexicon — never
    generated at request time. Each row carries the writer string date it is
    active, its answer, and a difficulty band, so the same local date always
    yields the same puzzle (handover §2.8 / P12-1).
    """

    __tablename__ = "daily_words"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String(10), nullable=False, unique=True, index=True)  # "YYYY-MM-DD"
    answer = Column(String(32), nullable=False)        # Devanagari
    answer_iast = Column(String(64), default="")
    clue = Column(String(256), default="")             # bridge-language gloss/legend
    difficulty = Column(String(16), default="easy")    # easy | medium | hard
    created_at = Column(DateTime, default=_utcnow)


class DailyWordPlay(Base):
    """Per-learner state for one daily-word day: whether it is solved and how
    many guesses were spent. A solved (or exhausted) day refuses further
    guesses — the share card's credibility depends on no replay (P12-2)."""

    __tablename__ = "daily_word_plays"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # learner-local
    guess_count = Column(Integer, default=0)
    solved = Column(Boolean, default=False)
    finished = Column(Boolean, default=False)  # solved OR guesses exhausted
    ts = Column(DateTime, default=_utcnow)

    __table_args__ = (
        sa.UniqueConstraint("learner_id", "date", name="uq_daily_word_learner_date"),
    )
