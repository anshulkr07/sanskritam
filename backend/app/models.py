"""SQLAlchemy 2.0 ORM models for the Sanskritam backend."""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy import Column, Float, ForeignKey, Integer, LargeBinary, String, Text, Boolean, JSON, DateTime, UniqueConstraint
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
    # Google identity when the learner signed in with "Continue with Google".
    # Unique — one Google account maps to one learner. Present only for
    # Google-authenticated learners; anonymous/dev learners leave it NULL.
    google_sub = Column(String(64), unique=True, nullable=True, index=True)
    # Apple identity when the learner signed in with "Sign in with Apple".
    # Unique — one Apple account maps to one learner (App Store Guideline 4.8
    # requires Apple sign-in wherever Google sign-in is offered).
    apple_sub = Column(String(64), unique=True, nullable=True, index=True)
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
    # P23-5: handwriting progress lives here, NOT in feature_mastery.
    # feature_mastery maps feature_id -> float; writing progress maps
    # item-iast -> {attempts, correct}. Mixing them made feature_mastery
    # heterogeneous and broke every float() reader (§2.2-adjacent live bug).
    writing_mastery = Column(JSON, default=dict)  # {item_key: {attempts, correct}}
    # Spec E: varnamala drill coverage lives here, NOT in feature_mastery.
    # {varna_id: {reps, last_ts}} — coverage only, no verdict (ship the
    # drill, ship no scoring). Same homogeneous-dict rule as writing_mastery.
    varna_progress = Column(JSON, default=dict)
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
    """Daily shloka with word breakdown.

    A paged book's rows (handover_reading_shelf.md section 6) carry
    ``book`` = its slug and ``in_daily`` = False; its verses are served by
    chapter (GET /canon/{slug}/chapters + /verses), never by GET /shlokas.
    Classic rows have ``book`` None and ``in_daily`` True.
    """

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
    # Recite (2026-10): stable id across databases; see services/chant_text.
    verse_uid = Column(String(16), nullable=True, index=True)
    # P21-5: per-verse translations carried by corpus imports (Gītā et al.).
    # "" = not translated yet; attribution lives per text in canon_texts.
    translation_hi = Column(Text, nullable=False, default="", server_default="")
    translation_en = Column(Text, nullable=False, default="", server_default="")
    # Reading shelf (2026-10-09): paged books served one chapter at a time.
    book = Column(String(64), nullable=True)
    chapter = Column(String(64), nullable=False, default="", server_default="")
    seq = Column(Integer, nullable=False, default=0, server_default="0")
    in_daily = Column(Boolean, nullable=False, default=True, server_default=sa.true())

    __table_args__ = (
        sa.Index("ix_shlokas_book_chapter_seq", "book", "chapter", "seq"),
    )


# Recite: keep verse_uid in sync on every insert/update without touching
# import scripts. Imported here so models import alone is enough.
try:  # pragma: no cover - exercised via tests
    import sqlalchemy as _sa_events
    from sqlalchemy import event as _sa_event

    @_sa_event.listens_for(Shloka, "before_insert")
    def _shloka_uid_insert(mapper, connection, target):  # noqa: ANN001,ANN202
        try:
            from app.services.chant_text import verse_uid as _verse_uid_fn
            target.verse_uid = _verse_uid_fn(
                getattr(target, "source_ref", "") or "",
                getattr(target, "devanagari", "") or "",
            )
        except Exception:
            pass

    @_sa_event.listens_for(Shloka, "before_update")
    def _shloka_uid_update(mapper, connection, target):  # noqa: ANN001,ANN202
        try:
            from app.services.chant_text import verse_uid as _verse_uid_fn
            target.verse_uid = _verse_uid_fn(
                getattr(target, "source_ref", "") or "",
                getattr(target, "devanagari", "") or "",
            )
        except Exception:
            pass
except Exception:  # pragma: no cover
    pass


class VerseAudio(Base):
    """One chanted verse (Vagdhenu). Keyed by (verse_uid, voice)."""

    __tablename__ = "verse_audio"

    id = Column(Integer, primary_key=True, autoincrement=True)
    verse_uid = Column(String(16), nullable=False, index=True)
    voice = Column(String(48), nullable=False, default="vagdhenu-steer-2026-06-17")
    url = Column(String(512), nullable=False, default="")
    duration_ms = Column(Integer, nullable=False, default=0)
    lines = Column(JSON, nullable=False, default=list)
    meter = Column(String(32), nullable=False, default="", server_default="")
    qc_status = Column(String(16), nullable=False, default="needs_listen")
    qc_reasons = Column(JSON, nullable=False, default=list)
    source_commit = Column(String(48), nullable=False, default="", server_default="")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        UniqueConstraint("verse_uid", "voice", name="uq_verse_audio_uid_voice"),
    )


class ReciteAttempt(Base):
    """One scored recitation. No audio, no transcript stored."""

    __tablename__ = "recite_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    verse_uid = Column(String(16), nullable=False, index=True)
    unit = Column(String(16), nullable=False, default="verse")
    purpose = Column(String(16), nullable=False, default="practise")
    mode = Column(String(8), nullable=False, default="strict")
    status = Column(String(8), nullable=False, default="scored")
    percent = Column(Float, nullable=True)
    n_ok = Column(Integer, nullable=False, default=0)
    n_fix = Column(Integer, nullable=False, default=0)
    n_unclear = Column(Integer, nullable=False, default=0)
    bands = Column(String(512), nullable=False, default="")
    duration_ms = Column(Integer, nullable=False, default=0)
    competition_id = Column(String(64), nullable=True, index=True)
    camera = Column(JSON, nullable=True)
    counted = Column(Boolean, nullable=False, default=False, server_default="0")
    flags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=_utcnow, index=True)


class Competition(Base):
    """One twice-weekly recitation contest."""

    __tablename__ = "competitions"

    id = Column(String(64), primary_key=True, default=_uuid)
    slug = Column(String(64), nullable=False, unique=True, index=True)
    kind = Column(String(16), nullable=False, default="weekend")
    opens_at = Column(DateTime, nullable=False)
    closes_at = Column(DateTime, nullable=False)
    results_at = Column(DateTime, nullable=False)
    pieces = Column(JSON, nullable=False, default=list)
    status = Column(String(16), nullable=False, default="scheduled", index=True)
    rules_version = Column(String(32), nullable=False, default="2026-10-1")
    created_at = Column(DateTime, default=_utcnow)
    published_at = Column(DateTime, nullable=True)


class CompetitionEntry(Base):
    """One learner's entry in one competition."""

    __tablename__ = "competition_entries"

    id = Column(String(64), primary_key=True, default=_uuid)
    competition_id = Column(String(64), ForeignKey("competitions.id"), nullable=False, index=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    public_name = Column(String(64), nullable=False, default="")
    best_percent = Column(Float, nullable=True)
    best_at = Column(DateTime, nullable=True)
    best_attempt_id = Column(Integer, nullable=True)
    attempts_counted = Column(Integer, nullable=False, default=0)
    flags = Column(JSON, nullable=False, default=dict)
    flags_cleared = Column(JSON, nullable=False, default=dict)
    disqualified = Column(Boolean, nullable=False, default=False, server_default="0")
    dq_reason = Column(Text, nullable=False, default="", server_default="")
    final_rank = Column(Integer, nullable=True)
    audio_key = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        UniqueConstraint("competition_id", "learner_id", name="uq_comp_entry"),
    )


class LearnerPublic(Base):
    """Public competition profile for one learner."""

    __tablename__ = "learner_public"

    learner_id = Column(String(64), ForeignKey("learners.id"), primary_key=True)
    public_name = Column(String(64), nullable=False, default="")
    age_confirmed_at = Column(DateTime, nullable=True)
    rules_version = Column(String(32), nullable=False, default="")
    rules_accepted_at = Column(DateTime, nullable=True)
    recordings_consent_at = Column(DateTime, nullable=True)
    banned = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime, default=_utcnow)


class Certificate(Base):
    """A top-3 or monthly certificate, verified at /certificates/<code>."""

    __tablename__ = "certificates"

    code = Column(String(16), primary_key=True)
    kind = Column(String(16), nullable=False, default="competition")
    competition_id = Column(String(64), nullable=True, index=True)
    month = Column(String(8), nullable=True, index=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False, default=1)
    public_name = Column(String(64), nullable=False, default="")
    piece_ref = Column(String(128), nullable=False, default="")
    issued_at = Column(DateTime, default=_utcnow)


class MonthlyWinner(Base):
    """The master-board winner of one calendar month."""

    __tablename__ = "monthly_winners"

    month = Column(String(8), primary_key=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False)
    public_name = Column(String(64), nullable=False, default="")
    wins = Column(Integer, nullable=False, default=0)
    claim_code = Column(String(16), nullable=False, default="")
    created_at = Column(DateTime, default=_utcnow)


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
    kind = Column(String(16), nullable=False)   # "tts_chars" | "stt_seconds" | "llm_calls" | "doc_pages"
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


class WritingItem(Base):
    """A drillable writing target (P20-1): the script taught in articulation
    order, then mātrā forms, then whole words drawn from the challenge pool.

    Tier 1 rows mirror U4-1's phonetics (varṇamālā); tier 3 REFERENCES existing
    challenge rows (`challenge_id`) rather than duplicating their content. The
    IAST is derived from lipi at seed time (P7-13) — never hand-typed.
    """

    __tablename__ = "writing_items"

    id = Column(String(64), primary_key=True, default=_uuid)
    tier = Column(Integer, nullable=False, index=True)   # 1 letter | 2 mātrā | 3 word
    sort_order = Column(Integer, nullable=False, default=0)
    devanagari = Column(String(64), nullable=False)      # the akṣara / word to write
    iast = Column(String(128), default="")               # lipi-derived (P7-13)
    gloss = Column(String(256), default="")              # bridge-language meaning
    stroke_paths = Column(JSON, default=list)            # P20-2: ordered stroke paths
    challenge_id = Column(String(64), ForeignKey("challenges.id"), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("tier", "devanagari", name="uq_writing_item_tier_dev"),
    )


class WritingAttempt(Base):
    """One handwriting attempt (P20-3). What crosses the wire is a recognised
    string and a confidence — NEVER the strokes, NEVER the image (§2.16).

    The verdict is three-valued and the recogniser is the one that abstains:
    an `unsure` provably cannot lower mastery or break a streak (§2.2).
    """

    __tablename__ = "writing_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    item_id = Column(String(64), ForeignKey("writing_items.id"), nullable=False, index=True)
    recognised_text = Column(String(128), default="")  # on-device ML Kit output
    confidence = Column(Float, default=0.0)
    source = Column(String(8), default="ink")          # 'ink' | 'photo'
    verdict = Column(String(16), nullable=False)       # correct|wrong|unsure
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
    # The learner's own language for THIS conversation, settled per turn by
    # services/lang_detect.py and remembered here. Stickiness is the point: a
    # learner does not switch from Telugu to Tamil halfway, so a settled
    # session outranks a classifier guess on a short or ambiguous line.
    # NULL until the first turn that carries enough signal to decide.
    native_lang = Column(String(8), nullable=True)
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


class ErrorLog(Base):
    """Server-side crash log (P8-2) — stack traces and route names ONLY.

    Never learner audio, transcripts, or Devanagari answers: that is learner
    speech and P1-4's retention rule governs it. A 500 for a stranger currently
    produces silence; with 10 users a silent failure is the whole signal lost.
    Written by the exception middleware in ``app/main.py``; read by
    ``GET /admin/errors``."""

    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=_utcnow, index=True)
    route = Column(String(128), default="")     # method + path pattern
    error_type = Column(String(128), default="")  # exception class name
    detail = Column(String(256), default="")    # str(e), truncated
    traceback = Column(Text, default="")        # stack trace — code only
    request_id = Column(String(32), default="")


class Unit(Base):
    """One unit of the curriculum spine (CURRICULUM.md §6.2: u1..u11).

    The spine used to live only in prose: ``Lesson.unit_id`` was a bare
    string and nothing enumerated the eleven units, their order, or where
    each sits in the three-layer model. This table makes the spine data —
    Path renders it, the seed asserts against it, and retuning the order is
    a row update rather than a release.

    ``layer`` is CURRICULUM.md §6.1's conceptual layer: 0 = the alphabet as
    a mathematical set, 1 = word formation as functions, 2 = sentence
    construction as relations.
    """

    __tablename__ = "units"

    id = Column(String(16), primary_key=True)            # "u1".."u11"
    rank = Column(Integer, nullable=False, default=0)    # order in the spine
    layer = Column(Integer, nullable=False, default=1)   # 0 | 1 | 2
    title_en = Column(String(128), default="")
    title_hi = Column(String(128), default="")
    blurb = Column(Text, default="")   # one line: what this unit buys you
    created_at = Column(DateTime, default=_utcnow)

    lessons = relationship("Lesson", back_populates="unit",
                           order_by="Lesson.rank")


class Lesson(Base):
    """A teaching lesson: an ordered sequence of gradable steps (see
    ``LessonStep``), belonging to a unit of the curriculum spine.

    Two things changed from P22-1. ``feature_id`` is no longer UNIQUE and is
    joined by ``features``: a lesson teaches a concept, not a tag, and a
    concept can span several — "sandhi is f(a,b)→c" is one lesson and four
    features. And ``body`` is no longer the teaching surface; it survives as
    the lesson's summary, while the teaching lives in ``steps``.

    Every example was verified against the engine at seed time: the stored
    derivation reproduces the example's surface form, or the example was
    dropped. A lesson cannot claim a form the engine cannot produce (§6
    provenance rule applied to content). ``provenance`` records which source
    and which licence; ``attribution`` carries the credit line a licence
    requires (CC BY 4.0 for learnsanskrit.org-derived prose).
    """

    __tablename__ = "lessons"

    id = Column(String(64), primary_key=True, default=_uuid)
    # NOT unique since the step rebuild: the feature a lesson leads with.
    # ``features`` carries the full set the lesson exercises.
    feature_id = Column(String(64), ForeignKey("features.id"), nullable=False, index=True)
    features = Column(JSON, default=list)
    unit_id = Column(String(16), ForeignKey("units.id"), nullable=False, index=True)
    rank = Column(Integer, default=0)  # order within the unit
    title_en = Column(String(256), default="")
    title_hi = Column(String(256), default="")
    body = Column(Text, default="")  # summary — the steps do the teaching
    # [{devanagari, iast, gloss, derivation: {result, step_count, steps}}]
    examples = Column(JSON, default=list)
    visual_type = Column(String(16), default="none")  # grid|tree|state_machine|none
    visual_data = Column(JSON, default=dict)  # pre-computed; the client renders it
    audio_url = Column(String(512), default="")  # pre-rendered spoken lesson
    register = Column(String(16), default="laukika", index=True)
    provenance = Column(String(256), default="")  # which source, which licence
    attribution = Column(String(256), default="")  # credit line the licence requires
    created_at = Column(DateTime, default=_utcnow)

    unit = relationship("Unit", back_populates="lessons")
    steps = relationship("LessonStep", back_populates="lesson",
                         order_by="LessonStep.rank",
                         cascade="all, delete-orphan")


class LessonStep(Base):
    """One step of a lesson — the unit of teaching AND of grading.

    A lesson used to be a body of prose with a Practice button at the end:
    nothing between opening it and leaving it was answered, so nothing in it
    could be graded. The step is the fix. ``kind`` selects the renderer on
    the client and the grader on the server, ``payload`` is everything that
    renderer needs, and ``grading`` is the contract an answer is checked
    against.

    Kinds fall in three families:

    - **authored** — ``explain`` (prose, ≤120 words). ``payload`` holds the
      text; ``grading`` is empty, because there is nothing to answer.
    - **generated** — ``grid_fill``, ``derive_next``, ``sandhi_split``,
      ``sandhi_join``, ``scan_metre``, ``reorder``, ``contrast``.
      ``payload`` carries generator arguments under ``gen``; the exercise
      itself is produced at serve time by ``services/exercise_gen.py``.
      Generated steps need no review queue: the engine that poses the
      question is the engine that marks it, so a wrong item cannot be
      authored into existence.
    - **practice** — ``build``, ``articulate``, ``read``. The client renders
      the sandbox component (WordBank / VocalTract / passage) and the
      attempt is a no-op: correct, graded False, mastery and schedule
      untouched — the Play-rule reversal (sandbox practice, not assessment).
      They stay practice until a grader the engine can honestly support
      exists (§2.2, §6.2: no forced alignment, no invented grading).
    """

    __tablename__ = "lesson_steps"

    id = Column(String(64), primary_key=True, default=_uuid)
    lesson_id = Column(String(64), ForeignKey("lessons.id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False, default=0)  # order within the lesson
    kind = Column(String(24), nullable=False, index=True)
    payload = Column(JSON, default=dict)
    grading = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_utcnow)

    lesson = relationship("Lesson", back_populates="steps")

    __table_args__ = (
        UniqueConstraint("lesson_id", "rank", name="uq_step_lesson_rank"),
    )


class VocabWord(Base):
    """One vocabulary entry (P22-5), grouped by topic slug (the 10 SITUATIONS
    slugs in seeds/briefs.py). Frequency-ordered within a topic (``rank``).

    Seed curation is original (glosses authored here, example sentences drawn
    from Vidyut-gated challenge rows containing the word). WordNet
    cross-referencing is deferred pending the licence confirmation P22-5 §6
    requires — recorded per row in ``provenance``.
    """

    __tablename__ = "vocab_words"

    id = Column(String(64), primary_key=True, default=_uuid)
    topic = Column(String(32), nullable=False, index=True)  # SITUATIONS slug
    rank = Column(Integer, default=0)  # frequency order within the topic
    devanagari = Column(String(64), nullable=False)
    iast = Column(String(128), default="")  # lipi-derived (P7-13)
    gloss = Column(String(256), default="")
    gender = Column(String(16), default="")  # MASC|FEM|NEUT|""
    stem = Column(String(64), default="")
    examples = Column(JSON, default=list)  # [{devanagari, iast, gloss}]
    provenance = Column(String(256), default="")
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("topic", "devanagari", name="uq_vocab_topic_dev"),
    )


class ReaderPassage(Base):
    """One graded-reading sentence (P22-6): 50 simple → 50 with sandhi → 50
    with compounds. Tiers: 1 (Units 2–3) · 2 (Unit 6, sandhi) · 3 (Unit 10,
    compounds/classical).

    Seeded from already-servable content (approved challenges, served
    ślokas) — every row carries the Vidyut parse produced at seed time, and
    ``provenance`` records which pool it came from. A DCS import is the later
    volume step, gated on the per-source licence record P21/P22-6 require.
    """

    __tablename__ = "reader_passages"

    id = Column(String(64), primary_key=True, default=_uuid)
    tier = Column(Integer, nullable=False, index=True)  # 1|2|3
    sort_order = Column(Integer, default=0)
    devanagari = Column(Text, nullable=False)
    iast = Column(Text, default="")  # lipi-derived (P7-13)
    word_breakdown = Column(JSON, default=list)  # [{word, meaning, features}]
    parse = Column(JSON, default=list)  # Vidyut read at seed time
    features = Column(JSON, default=list)
    register = Column(String(16), default="laukika")
    provenance = Column(String(256), default="")
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("tier", "devanagari", name="uq_reader_tier_dev"),
    )


class CanonText(Base):
    """One text of the readable canon (P21-4): the editorial position.

    The catalogue is not the product — but WHICH texts, in WHAT order, at
    WHAT depth, and whether any of it is gated, is an editorial position, and
    this table records it instead of scattering it across seeds and docs.

    Depth: ``full`` = every verse imported with word_breakdown (the reader's
    instrumentation); ``studied`` = curated passages imported; ``index`` =
    catalogue entry only, import planned. ``verses_imported`` is recomputed
    live by the /canon endpoint from ``ref_prefixes`` for classic books and
    from the ``book`` column for paged books — the column is the plan, the
    endpoint is the truth. Tier ``plus`` books lock behind ``CANON_PLUS_GATE``
    (owner, 2026-10-09): with the gate off nothing is locked for anyone.
    """
    __tablename__ = "canon_texts"

    id = Column(String(64), primary_key=True, default=_uuid)
    slug = Column(String(64), nullable=False, unique=True, index=True)
    title_en = Column(String(256), default="")
    title_sa = Column(String(256), default="")
    source = Column(String(256), default="")  # where the text comes from
    licence = Column(String(512), default="")  # per-text licence (§6)
    # P23-4a: pointer into the licence registry — one registry, not two.
    # The per-text ``licence`` string stays (it is the verbatim record); this
    # key is the join that proves it is attributed.
    source_key = Column(String(64), nullable=True, index=True)
    study_order = Column(Integer, nullable=False, default=0)  # reading order
    depth = Column(String(16), nullable=False, default="index")  # full|studied|index
    tier = Column(String(16), nullable=False, default="free")  # free|plus
    verses_planned = Column(Integer, default=0)
    ref_prefixes = Column(JSON, default=list)  # source_ref substrings identifying its rows
    notes = Column(Text, default="")
    paged = Column(Boolean, nullable=False, default=False, server_default=sa.false())
    created_at = Column(DateTime, default=_utcnow)


class PushToken(Base):
    """One device's push token (P13-1): a collection, not a column.

    One learner has several devices; one row per (learner, device) with a
    ``last_seen`` timestamp. A token that fails delivery twice is dead —
    marked, never sent to again, but NOT deleted (the same device often comes
    back with the same token). No learner content ever lives here.
    """

    __tablename__ = "push_tokens"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    device_id = Column(String(128), nullable=False, default="")  # client install/device id
    token = Column(String(512), nullable=False)  # Expo push token / FCM token
    platform = Column(String(16), default="")  # "android" | "ios" | ""
    last_seen = Column(DateTime, default=_utcnow)
    fail_count = Column(Integer, default=0)
    dead = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("learner_id", "device_id", name="uq_push_learner_device"),
    )


class NotificationSend(Base):
    """Idempotency ledger for the daily-notify job (P13-1).

    One row per (learner, local_date, kind): the write IS the idempotency
    check, so running the same job twice sends once. The job survives a
    restart because the ledger is in the DB, not in memory.
    """

    __tablename__ = "notification_sends"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    local_date = Column(String(10), nullable=False, index=True)  # learner-local YYYY-MM-DD
    kind = Column(String(32), nullable=False, default="reminder")  # reminder|sloka|word
    ignored_streak = Column(Integer, default=0)  # consecutive unopened sends at write time
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("learner_id", "local_date", "kind", name="uq_notify_learner_date_kind"),
    )


class Entitlement(Base):
    """One entitlement per learner (P14-1): tier, source, validity window.

    NEVER derived from a client claim — the client asserts a receipt, the
    server verifies it (verification itself is owner-gated; until a store is
    wired every row is tier "free"). ``has_entitlement`` in
    ``services/entitlement.py`` is the ONLY reader; routers never scatter
    tier checks. See P14-2 for what is never gated.
    """

    __tablename__ = "entitlements"

    id = Column(String(64), primary_key=True, default=_uuid)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, unique=True, index=True)
    tier = Column(String(32), nullable=False, default="free")  # free|plus|institutional
    source = Column(String(32), nullable=False, default="none")  # none|store|promo|institution
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class ContentSource(Base):
    """One row per source we take anything from (P23-4a).

    The licence registry. Content rows stop carrying free text:
    ``Lesson.attribution``, ``VocabWord.provenance`` and
    ``ReaderPassage.provenance`` hold a registry KEY, so "is everything
    attributed?" becomes a join rather than a reading exercise. The registry
    owns the wording (the credit line is rendered VERBATIM — a paraphrased
    credit is not a credit); the row owns the pointer.
    """

    __tablename__ = "content_sources"

    key = Column(String(64), primary_key=True)  # learnsanskrit|vidyut-data|sa-wikisource|public-domain|original
    name = Column(String(256), default="")
    url = Column(String(512), default="")
    licence = Column(String(64), default="")  # named exactly: CC BY 4.0|MIT|CC BY-SA 3.0|public domain
    credit = Column(Text, default="")  # rendered verbatim wherever attribution is shown
    taken = Column(Text, default="")  # one line on what we actually used
    created_at = Column(DateTime, default=_utcnow)


class ReviewItem(Base):
    """One schedulable memory per learner (P23-5).

    An item is a step instance or a vocab word — NOT just a feature tag.
    That is the whole point: the old adaptive.py kept one 0..1 score per
    feature with no due dates, no intervals, no time decay and no item-level
    memory, so a learner returning after a month saw exactly the state they
    left. ``due_at`` is UTC; ``stability`` is days; ``difficulty`` is 0..1.
    """

    __tablename__ = "review_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    item_key = Column(String(128), nullable=False, index=True)  # step:<lesson_id>:<rank> | vocab:<word_id>
    kind = Column(String(16), default="step")  # step | vocab
    due_at = Column(DateTime, nullable=False, index=True)
    stability = Column(Float, default=1.0)  # days until next review at last grade
    difficulty = Column(Float, default=0.3)  # 0..1, rises on lapses
    lapses = Column(Integer, default=0)
    last_verdict = Column(String(16), default="")
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        UniqueConstraint("learner_id", "item_key", name="uq_review_learner_item"),
    )


class VideoItem(Base):
    """One lesson video (P24): metadata ONLY — bytes stay on YouTube.

    The app never downloads, caches, or re-hosts video. ``embed`` rows play
    through YouTube's own player (all views and ads accrue to the creator);
    ``link`` rows open the source page (course sites, playlists, NC-licensed
    material that must never be embedded in a commercial app). Watching a
    video writes nothing: no mastery, no XP, no review item — the steps
    below the video are the only graded surface (YouTube Playback Integrity
    forbids incentivised viewing).

    Keyed to ``units`` (stable ``u1``..``u11`` ids), not to lessons — lesson
    ids are seed-generated uuids, so ``GET /videos?lesson_id=`` resolves the
    lesson's unit server-side. ``source_key`` points at the ``content_sources``
    registry: attribution stays a join, never free text (P23-4a rule).
    """

    __tablename__ = "video_items"

    id = Column(String(64), primary_key=True, default=_uuid)
    unit_id = Column(String(16), ForeignKey("units.id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False, default=0)  # order within the unit
    title = Column(String(256), default="")
    channel = Column(String(128), default="")
    youtube_id = Column(String(32), nullable=True)  # None for link-out rows
    url = Column(String(512), default="")  # watch / playlist / course URL
    lang = Column(String(8), default="en")  # teaching medium: en | hi
    duration_s = Column(Integer, default=0)  # 0 = unknown; the client hides it
    playback = Column(String(8), default="embed")  # embed | link
    source_key = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("unit_id", "youtube_id", name="uq_video_unit_youtube"),
    )


class StoryChapter(Base):
    """One chapter of the Sanskrit story deck (Discover Sanskrit).

    The swipeable story that takes a learner from "what is Sanskrit?" to
    sandhi/samāsa/kāraka. Chapters are the section headers; the teaching
    lives in ``StoryCard`` rows. Read-only content: reading a card writes
    nothing — no mastery, no review item — so the deck stays outside the
    grading contracts (adaptive.py stays frozen).

    Ids are stable strings (``s0``..``s6``), seeded by
    ``seeds/story_cards.py`` and safe for the client to persist as progress.
    """

    __tablename__ = "story_chapters"

    id = Column(String(16), primary_key=True)            # "s0".."s6"
    rank = Column(Integer, nullable=False, default=0)    # order in the deck
    title_en = Column(String(128), default="")
    title_hi = Column(String(128), default="")
    blurb = Column(Text, default="")   # one line: what this chapter buys you
    created_at = Column(DateTime, default=_utcnow)

    cards = relationship("StoryCard", back_populates="chapter",
                         order_by="StoryCard.rank",
                         cascade="all, delete-orphan")


class StoryCard(Base):
    """One swipeable card of the story deck.

    A card is one idea in ≤120 words: title, short body, one optional
    Sanskrit example (Devanāgarī + lipi-derived IAST + gloss), and an
    optional dive-deeper link into a screen that already exists
    (``deep_link`` is a route name from the client's whitelist, or
    ``"none"``). ``attribution`` is a ``content_sources`` registry key —
    attribution stays a join, never free text (P23-4a rule).
    """

    __tablename__ = "story_cards"

    id = Column(String(64), primary_key=True)  # stable: "s0c1".. — client progress keys
    chapter_id = Column(String(16), ForeignKey("story_chapters.id"),
                        nullable=False, index=True)
    rank = Column(Integer, nullable=False, default=0)  # order within the chapter
    title_en = Column(String(256), default="")
    title_hi = Column(String(256), default="")
    body = Column(Text, default="")  # the idea, ≤120 words
    example_dev = Column(Text, default="")    # Devanagari example (may be "")
    example_iast = Column(Text, default="")   # lipi-derived at seed time
    example_gloss = Column(Text, default="")  # bridge-language gloss
    deep_link = Column(String(32), default="none")  # route name or "none"
    deep_link_label = Column(String(128), default="")  # button text ("See the mouth-map")
    attribution = Column(String(64), default="original")  # registry key
    created_at = Column(DateTime, default=_utcnow)

    chapter = relationship("StoryChapter", back_populates="cards")

    __table_args__ = (
        UniqueConstraint("chapter_id", "rank", name="uq_story_chapter_rank"),
    )


class ContentReport(Base):
    """A learner-flagged AI reply (Play AI-Generated Content policy).

    ``surface`` is "talk" or "ask"; ``question``/``answer``/``reason`` are
    clipped to 2000 characters at the router. Rows are listed in the admin
    router and deleted with the account.
    """

    __tablename__ = "content_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    surface = Column(String(16), nullable=False, default="")
    question = Column(Text, default="")
    answer = Column(Text, default="")
    reason = Column(Text, default="")
    created_at = Column(DateTime, default=_utcnow, index=True)


class AskAnswer(Base):
    """A model-written answer about a verse, kept for good.

    The first learner to ask pays for one model call; everyone after is
    served this row (services/verse_study.py). ``key`` is the SHA-256 of the
    verse text, the question and the answer's language, so the same verse
    asked in English and in Hindi holds two rows. ``payload`` is the Ask
    response as sent (explanation and card). A row whose payload has an empty
    card and an empty explanation records "asked, nothing honest to say", so
    a line the model could not read is not paid for twice.
    """

    __tablename__ = "ask_answers"

    key = Column(String(64), primary_key=True)
    subject = Column(Text, nullable=False)
    question = Column(String(512), nullable=False, default="")
    language = Column(String(48), nullable=False, default="")
    payload = Column(JSON, nullable=False, default=dict)
    provider = Column(String(64), default="")
    created_at = Column(DateTime, default=_utcnow)


class GameResult(Base):
    """One finished game round (Play hub, HANDOVER 5.7).

    ``date`` is the learner-local date the round finished on. ``daily`` marks
    a round played as today's challenge; ``goal_met`` says the game's goal
    was met. Indexed on (learner_id, date) for the streak query.
    """

    __tablename__ = "game_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    learner_id = Column(String(64), ForeignKey("learners.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)
    game = Column(String(32), nullable=False, default="")
    mode = Column(String(32), nullable=False, default="")
    score = Column(Integer, default=0)
    moves = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    daily = Column(Boolean, default=False)
    goal_met = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        sa.Index("ix_game_results_learner_date", "learner_id", "date"),
    )


class WordOrigin(Base):
    """One Sanskrit word with its routes (Word journey, handover_language).

    Two makers. Hand-checked rows are seeded from
    ``app/seeds/word_origins/batch-*.json`` and are a copy of those files:
    ``scheduled_date`` is ``start_date + position``, and a row no file carries
    any more becomes ``withdrawn``, never deleted. Rows the daily pipeline
    writes (services/daily_content.py) have ``batch`` "auto", live only in the
    database, and take the next free ``scheduled_date``, which is unique.
    """

    __tablename__ = "word_origins"

    id = Column(String(32), primary_key=True)
    batch = Column(String(8), default="")
    rank = Column(Integer, default=0)
    scheduled_date = Column(String(10), unique=True, index=True)
    mw_key = Column(String(64), default="")
    sanskrit_dev = Column(String(64), default="")
    sanskrit_iast = Column(String(64), default="")
    display_dev = Column(String(64), default="")
    display_iast = Column(String(64), default="")
    gloss = Column(String(200), default="")
    attested = Column(String(200), default="")
    note = Column(Text, default="")
    status = Column(String(12), default="approved", index=True)
    created_at = Column(DateTime, default=_utcnow)

    routes = relationship("WordRoute", back_populates="origin",
                          order_by="WordRoute.rank",
                          cascade="all, delete-orphan")


class WordRoute(Base):
    """One route from a Sanskrit word to a word in another language."""

    __tablename__ = "word_routes"

    id = Column(String(64), primary_key=True)
    origin_id = Column(String(32), ForeignKey("word_origins.id"), nullable=False, index=True)
    rank = Column(Integer, default=0)
    lang = Column(String(8), default="")
    lang_name = Column(String(32), default="")
    word = Column(String(64), default="")
    script = Column(String(16), default="")
    roman = Column(String(64), default="")
    gloss = Column(String(160), default="")
    kind = Column(String(8), default="")  # loan|related
    confidence = Column(String(12), default="")  # certain|probable
    hops = Column(JSON, default=list)
    source_keys = Column(JSON, default=list)
    lookup = Column(String(120), default="")
    checked_on = Column(String(10), default="")
    # A route the daily pipeline wrote (services/daily_content.py) carries the
    # page that states its origin and checked_by "page". A hand-checked route
    # leaves all three empty or "hand".
    source_url = Column(String(500), default="")
    source_site = Column(String(120), default="")
    checked_by = Column(String(12), default="")
    status = Column(String(12), default="approved")
    created_at = Column(DateTime, default=_utcnow)

    origin = relationship("WordOrigin", back_populates="routes")

    __table_args__ = (
        UniqueConstraint("origin_id", "lang", "word", name="uq_word_route_origin_lang_word"),
    )


class FactCard(Base):
    """One "Do you know" fact resting on a quoted verse (daily content).

    Written by the daily pipeline (services/daily_content.py): the model
    proposes the fact and quotes the verse, and code opens a page on a trusted
    site and finds the verse there before the row is written. ``source_url``
    is that page. ``scheduled_date`` is the day the fact is shown and is
    unique. A withdrawn row is kept, never deleted.
    """

    __tablename__ = "fact_cards"

    id = Column(String(32), primary_key=True, default=_uuid)
    scheduled_date = Column(String(10), unique=True, index=True)
    fact = Column(Text, default="")
    claim_kind = Column(String(12), default="")  # text|tradition|modern
    text_name = Column(String(120), default="")
    ref = Column(String(64), default="")
    ref_key = Column(String(160), default="", index=True)
    devanagari = Column(Text, default="")
    iast = Column(Text, default="")
    translation = Column(Text, default="")
    explanation = Column(Text, default="")
    source_url = Column(String(500), default="")
    source_site = Column(String(120), default="")
    verse_match = Column(Float, default=0.0)  # share of the quote found on the page
    checked_on = Column(String(10), default="")
    made_by = Column(String(12), default="auto")
    status = Column(String(12), default="approved", index=True)
    created_at = Column(DateTime, default=_utcnow)


class ContentJob(Base):
    """One run of the daily content pipeline, and where it stands.

    ``active_key`` equals ``kind`` while the run is in flight and is NULL once
    it has ended, so its unique index allows one run per kind at a time.
    ``stage`` is propose | cite | check | done | failed. ``payload`` carries
    the candidates between stages; ``stats`` is what the run did.
    ``locked_until`` (epoch seconds) keeps two overlapping ticks apart.
    """

    __tablename__ = "content_jobs"

    id = Column(String(40), primary_key=True)
    kind = Column(String(8), nullable=False, index=True)  # words|facts
    active_key = Column(String(8), unique=True, nullable=True)
    stage = Column(String(12), default="propose")
    job_name = Column(String(255), default="")
    payload = Column(JSON, default=dict)
    stats = Column(JSON, default=dict)
    error = Column(Text, default="")
    locked_until = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow)


class ContentRejection(Base):
    """A candidate the daily pipeline turned down, so it is not proposed again.

    ``key`` is the word (case folded) for words, the reference key for facts.
    ``reason`` is the check that failed. No page text is stored.
    """

    __tablename__ = "content_rejections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    kind = Column(String(8), nullable=False)  # words|facts
    lang = Column(String(8), nullable=False, default="")
    key = Column(String(160), nullable=False, default="")
    reason = Column(String(64), default="")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("kind", "lang", "key", name="uq_content_rejection"),
    )


class VerseVector(Base):
    """One verse's meaning as numbers, for Ask's book search.

    services/book_search.py compares a question with these to find verses
    about the same thing in any language. Written by
    scripts/build_verse_index.py; ``text_hash`` is the hash of the text that
    was embedded, so a changed verse or translation is embedded again.
    ``vec`` is float32, little-endian, ``dims`` long, unit length.
    """

    __tablename__ = "verse_vectors"

    shloka_id = Column(String(64), ForeignKey("shlokas.id", ondelete="CASCADE"), primary_key=True)
    model = Column(String(64), nullable=False)
    dims = Column(Integer, nullable=False)
    text_hash = Column(String(64), nullable=False)
    vec = Column(LargeBinary, nullable=False)
    updated_at = Column(DateTime, default=_utcnow)
