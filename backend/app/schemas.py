"""Pydantic v2 request/response schemas."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Auth ───

class DevLoginRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=128)
    bridge_langs: list[str] = Field(default=["en", "hi"])


class DevLoginResponse(BaseModel):
    token: str
    learner: dict[str, Any]


# ─── Learner ───

class LearnerProfile(BaseModel):
    id: str
    display_name: str
    bridge_langs: list[str]
    sanskrit_ratio: float
    script_ratio: float
    feature_mastery: dict[str, float]
    streak: int
    voice_minutes_used: float


class UpdateMeRequest(BaseModel):
    script_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    sanskrit_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    bridge_langs: Optional[list[str]] = None
    display_name: Optional[str] = None


class MeResponse(BaseModel):
    learner: LearnerProfile
    model: dict[str, Any]


# ─── Challenges ───

class ChallengeResponse(BaseModel):
    id: str
    prompt_l1: str
    prompt_lang: str
    target_sanskrit: str
    target_iast: str
    features: list[str]
    audio_url: str
    register: str


# ─── Attempts ───

class AttemptRequest(BaseModel):
    challenge_id: str
    response_text: str = Field(..., min_length=1)


class AttemptResponse(BaseModel):
    verdict: str  # correct | off_by_one | incorrect
    parsed_features: dict[str, str]
    expected_features: list[dict[str, str]]
    diff: list[dict[str, Any]]
    diagnosis: str
    grammar_note: Optional[dict[str, Any]] = None
    abstained: bool
    updated_model: dict[str, Any]


# ─── Shlokas ───

class WordBreakdown(BaseModel):
    word: str
    meaning: str = ""
    features: list[str] = []


class ShlokaResponse(BaseModel):
    id: str
    date: str
    source_ref: str
    devanagari: str
    iast: str
    metre: str
    word_breakdown: list[dict[str, Any]]
    features: list[str]
    audio_url: str


# ─── Grammar ───

class VarnamalaChar(BaseModel):
    devanagari: str
    iast: str
    place: str  # kanthya|talavya|murdhanya|dantya|oshthya
    voicing: str  # voiceless|voiced|nasal|etc
    kind: str  # vowel|consonant|sibilant|other


class VarnamalaResponse(BaseModel):
    vowels: list[dict[str, Any]]
    consonants: list[list[dict[str, Any]]]  # 5 rows x ~5 columns
    nasals: list[dict[str, Any]]
    others: list[dict[str, Any]]


class FeatureResponse(BaseModel):
    id: str
    kind: str
    rank: int
    label_en: str
    label_hi: str


# ─── Admin ───

class CreateChallengeRequest(BaseModel):
    prompt_l1: str
    prompt_lang: str = "en"
    target_sanskrit: str
    target_iast: str = ""
    features: list[str] = []
    accepted_parses: list[dict[str, str]] = []
    register: str = "laukika"
    audio_url: str = ""


class PipelineReport(BaseModel):
    total: int
    passed: int
    failed: int
    anomalies: list[dict[str, Any]]
    details: list[dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str