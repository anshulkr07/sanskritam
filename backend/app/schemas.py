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


class AnonLoginRequest(BaseModel):
    install_id: str = Field(..., min_length=16, max_length=64)
    bridge_langs: list[str] = Field(default=["en", "hi"])
    display_name: Optional[str] = None
    # IANA key from the device ("Asia/Kolkata"). Sets the learner's day
    # boundary; an unknown key degrades to UTC rather than failing the login.
    timezone: Optional[str] = Field(None, max_length=64)


class GoogleAuthRequest(BaseModel):
    # The Google ID token (JWT) minted for the app by Google Sign-in. The
    # backend verifies its signature + audience and binds the learner to its
    # `sub`.
    id_token: str = Field(..., min_length=20)
    bridge_langs: list[str] = Field(default=["en", "hi"])
    timezone: Optional[str] = Field(None, max_length=64)


class AppleAuthRequest(BaseModel):
    # The Apple identityToken (JWT, ES256) minted for the app by Sign in with
    # Apple. The backend verifies its signature + audience and binds the
    # learner to its `sub`. Apple sends the user's name/email only on the
    # FIRST authorization, so the client forwards `display_name` when it has
    # one; otherwise we fall back to the email local part, then a label.
    id_token: str = Field(..., min_length=20)
    bridge_langs: list[str] = Field(default=["en", "hi"])
    timezone: Optional[str] = Field(None, max_length=64)
    display_name: Optional[str] = Field(None, max_length=128)


# ─── Learner ───

class LearnerProfile(BaseModel):
    id: str
    display_name: str
    bridge_langs: list[str]
    sanskrit_ratio: float
    sanskrit_ratio_setting: Optional[float] = None
    script_ratio: float
    feature_mastery: dict[str, float]
    streak: int
    voice_minutes_used: float
    timezone: str = "UTC"


class UpdateMeRequest(BaseModel):
    script_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    sanskrit_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    bridge_langs: Optional[list[str]] = None
    display_name: Optional[str] = None
    timezone: Optional[str] = Field(None, max_length=64)


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
    verdict: str  # correct | off_by_one | incorrect | unsure
    parsed_features: dict[str, str]
    accepted_parses: list[dict[str, str]]
    diff: list[dict[str, Any]]
    diagnosis: str
    grammar_note: Optional[dict[str, Any]] = None
    abstained: bool
    updated_model: dict[str, Any]
    # P9-3: the correct form's derivation, attached on a grammatical mismatch.
    # Never present on an `unsure` verdict. The LLM gloss (grammar_note) and
    # this derivation are independent — either may be absent.
    derivation: Optional["DerivationResponse"] = None


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
    place: Optional[str] = None  # kanthya|talavya|murdhanya|dantya|oshthya (None for anusvara/visarga)
    voicing: Optional[str] = None  # voiceless|voiced|nasal|etc
    kind: str  # vowel|consonant|nasal|sibilant|aspirate|semivowel|anusvara|visarga
    iast_place: Optional[str] = None  # IAST display label, e.g. "kaṇṭhya"


class VarnamalaResponse(BaseModel):
    vowels: list[VarnamalaChar]
    consonants: list[VarnamalaChar]  # flat cells; group by `place` to rebuild the 5x5 matrix
    nasals: list[VarnamalaChar]
    others: list[VarnamalaChar]


class FeatureResponse(BaseModel):
    id: str
    kind: str
    rank: int
    label_en: str
    label_hi: str


# ─── Path spine (P7-5) ───

class PathNodeResponse(BaseModel):
    id: str                    # stable node id = the feature id ("NOM.SG")
    feature: str               # the feature this unit teaches
    kind: str                  # case | number | tense | voice | gender | sandhi | other
    rank: int                  # teaching order (features.rank)
    label_en: str
    label_hi: str
    approved_count: int        # approved challenges exercising this feature
    pending_count: int         # backlog awaiting review (P8-0)
    mastery: Optional[float] = None  # the CALLER's mastery, filled for the learner
    has_lesson: bool = False   # P22-4: a Lesson row exists → Path routes Learn first


class PathSpineResponse(BaseModel):
    nodes: list[PathNodeResponse]
    features_covered: int      # distinct features with >=1 approved challenge
    features_total: int


# ─── Derivation (P9) ───

class DerivationStep(BaseModel):
    code: str
    sutra_text: str = ""
    sutra_devanagari: str = ""
    result: str


class DerivationResponse(BaseModel):
    result: str
    step_count: int
    steps: list[DerivationStep]


# ─── Scansion (P11-1) ───

class ScanSyllable(BaseModel):
    syllable_devanagari: str
    weight: str  # G (guru/long) | L (laghu/short)


class ScanLine(BaseModel):
    syllables: list[ScanSyllable]


class ScansionResponse(BaseModel):
    lines: list[ScanLine]
    metre: Optional[str] = None  # often None — anuṣṭubh & friends are variable


# ─── Word order (P11-3) ───

class WordOrderResponse(BaseModel):
    words: list[str]
    equivalent_orders: list[list[str]]
    per_word: list[dict[str, Any]]  # [{word, role, ending}] — ending carries the role
    wrong_endings: list[dict[str, Any]]  # [{word, wrong_ending, effect}]
    refused: Optional[str] = None  # set when the sentence is beyond the length cap


# ─── Varna distance (P11-4) ───

class VarnaDistanceResponse(BaseModel):
    a: str
    b: str
    distance: int
    axis: Optional[str] = None  # place | voicing | aspiration | nasality


# ─── Paradigm (P11-5) ───

class ParadigmCell(BaseModel):
    vibhakti: str
    vacana: str
    form: Optional[str] = None
    derivation: Optional[DerivationResponse] = None


class ParadigmResponse(BaseModel):
    rows: list[list[ParadigmCell]]  # 8 vibhakti × 3 vacana (nouns), or lakāra grid (verbs)
    kind: str  # subanta | tinanta


# ─── Curriculum (P22) ───

class LessonExample(BaseModel):
    devanagari: str
    iast: str = ""
    gloss: str = ""
    derivation: Optional[dict[str, Any]] = None  # stored prakriya steps


class LessonResponse(BaseModel):
    id: str = ""
    feature_id: str
    features: list[str] = []
    unit_id: str
    rank: int
    title_en: str
    title_hi: str
    body: str
    examples: list[LessonExample]
    visual_type: str  # grid | tree | state_machine | none
    visual_data: dict[str, Any]
    audio_url: str = ""
    register: str
    attribution: str = ""  # P23-4a registry key — the join, not free text


class VocabExample(BaseModel):
    devanagari: str
    iast: str = ""
    gloss: str = ""


class VocabWordResponse(BaseModel):
    topic: str
    rank: int
    devanagari: str
    iast: str
    gloss: str
    gender: str = ""
    stem: str = ""
    examples: list[VocabExample] = []


class ReaderPassageResponse(BaseModel):
    tier: int
    sort_order: int
    devanagari: str
    iast: str
    word_breakdown: list[dict[str, Any]]
    parse: list[dict[str, Any]]
    features: list[str]
    register: str


# ─── Curriculum spine as data (P23) ───

class LessonSummary(BaseModel):
    id: str
    feature_id: str
    features: list[str] = []
    unit_id: str
    rank: int
    title_en: str
    title_hi: str
    register: str = "laukika"
    step_count: int = 0
    attribution: str = ""


class UnitResponse(BaseModel):
    id: str
    rank: int
    layer: int
    title_en: str
    title_hi: str
    blurb: str = ""
    lessons: list[LessonSummary] = []
    progress: float = 0.0  # mean mastery over the unit's lesson features


class StepResponse(BaseModel):
    rank: int
    kind: str
    # Renderable and answer-free: explain text, or the generate()d item.
    payload: dict[str, Any] = {}
    abstained: bool = False


class StepAttemptRequest(BaseModel):
    answer: dict[str, Any] = {}


class StepAttemptResponse(BaseModel):
    verdict: str  # correct | off_by_one | incorrect | unsure
    abstained: bool = False
    mastery: dict[str, float] = {}
    due_at: Optional[str] = None
    item_key: str = ""


# ─── Licence registry (P23-4a) ───

class LicenceResponse(BaseModel):
    key: str
    name: str = ""
    url: str = ""
    licence: str = ""
    credit: str = ""
    taken: str = ""


# ─── Lesson videos (P24) ───

class VideoItemResponse(BaseModel):
    id: str
    unit_id: str
    rank: int = 0
    title: str = ""
    channel: str = ""
    youtube_id: str | None = None
    url: str = ""
    lang: str = "en"
    duration_s: int = 0
    playback: str = "embed"  # embed | link
    source_key: str = ""


# ─── Review schedule (P23-5) ───

class ReviewItemResponse(BaseModel):
    item_key: str
    kind: str = "step"
    due_at: str
    stability: float = 1.0
    difficulty: float = 0.3
    lapses: int = 0
    last_verdict: str = ""


# ─── Grammar guide (Grammar-tab Learn map) ───

class GuideExample(BaseModel):
    devanagari: str
    gloss: str = ""


class GuideProof(BaseModel):
    type: str  # derive | paradigm | sandhi | word-order | scansion
    params: dict[str, Any] = {}


class GuideSection(BaseModel):
    id: str
    rank: int
    title_en: str
    title_hi: str = ""
    unit_ids: list[str] = []
    feature_ids: list[str] = []
    body_beginner: str = ""
    body_intermediate: str = ""
    body_advanced: str = ""
    examples: list[GuideExample] = []
    proof: Optional[GuideProof] = None


class GuideResponse(BaseModel):
    version: str
    sections: list[GuideSection]


# ─── Story deck (Discover Sanskrit) ───

class StoryCardResponse(BaseModel):
    id: str
    chapter_id: str
    rank: int = 0
    title_en: str = ""
    title_hi: str = ""
    body: str = ""
    example_dev: str = ""
    example_iast: str = ""
    example_gloss: str = ""
    deep_link: str = "none"
    deep_link_label: str = ""
    attribution: str = ""


class StoryChapterResponse(BaseModel):
    id: str
    rank: int = 0
    title_en: str = ""
    title_hi: str = ""
    blurb: str = ""
    cards: list[StoryCardResponse] = []


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


# ─── Speech ───

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2500)
    language_code: str = "hi-IN"
    speaker: str = "aditya"  # valid bulbul:v3 speaker (old 'meera' 400s)
    pace: float = Field(1.0, ge=0.5, le=2.0)
    surface: str = ""


class TTSResponse(BaseModel):
    audio_base64: str
    duration_hint: Optional[float] = None


class STTResponse(BaseModel):
    transcript: str
    language_code: str  # "" when auto-detect heard no language
    # Saaras' confidence in `language_code`, on auto-detect only. Diagnostic:
    # nothing thresholds it, because Sanskrit came back en-IN at 1.0.
    language_probability: Optional[float] = None


# ─── Daily word (P12) ───

class DailyWordTile(BaseModel):
    character: str
    state: str  # exact | near | present | absent
    axis: Optional[str] = None  # place | voicing | aspiration | nasality


class DailyWordPuzzle(BaseModel):
    date: str
    available: bool
    solved: bool
    finished: bool
    guesses_used: int
    max_guesses: int
    word_length: int
    clue: str = ""
    streak: int = 0
    status: str = "open"  # open | solved | finished | no_word
    # Never set until the game has ended (P12-2.3).
    revealed: Optional[dict[str, Any]] = None


class DailyWordGuessRequest(BaseModel):
    guess: str = Field(..., min_length=1, max_length=64)


class DailyWordGuessResponse(BaseModel):
    status: str  # open | solved | finished | completed | refused | no_word
    solved: bool
    finished: bool
    tiles: list[DailyWordTile] = []
    guesses_used: int
    max_guesses: int
    revealed: Optional[dict[str, Any]] = None
    reason: Optional[str] = None


# ─── Notify (P13) ───

class PushTokenRequest(BaseModel):
    device_id: str = Field("", max_length=128)
    token: str = Field(..., min_length=8, max_length=512)
    platform: str = Field("", max_length=16)


class PushTokenResponse(BaseModel):
    device_id: str
    platform: str
    dead: bool