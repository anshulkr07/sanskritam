"""The story course's blueprints: every file under ``content/`` is one of these.

Read this first if you are writing course content. The shapes are strict
(``extra="forbid"``): a misspelt key fails the build instead of vanishing.

Hierarchy
    Course ─ acts (story acts, shown as map regions)
      Act ─ parts (each part ends with one leaf of the lost book)
        Part ─ units (one grammar chapter + one story episode + one ghost)
          Unit ─ lessons (scenes), one revision lesson, one check
            Lesson ─ cards (the shared swipeable card player renders them)

Rules the shapes encode
    * Learner-facing text is ``Text`` (``en`` + ``hi``), both written natively.
    * Sanskrit is a bare Devanagari string under ``sa``. Its IAST is added by
      the builder from lipi; sūtra text comes from the engine's sūtrapāṭha.
      Neither is ever typed by an author.
    * A ``check`` is an engine claim about the Sanskrit it sits on. It runs in
      tests and in ``python -m app.curriculum check --engine``; the client
      never sees it.
    * Ids are stable names, never positions. Order lives only in the parent's
      list (course → acts → parts → units → lessons). Moving a lesson keeps
      its id, so a learner's progress follows it.
"""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

ID_RE = re.compile(r"^[a-z0-9][a-z0-9.\-]*$")
LESSON_ID_MAX = 32  # GameResult.mode (progress) and the client cache key


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class Text(Strict):
    """A learner-facing string in English and Hindi. ``{{संस्कृत}}`` marks
    inline Sanskrit (rendered in the Sanskrit face); ``**bold**`` is allowed."""

    en: str
    hi: str = ""


def _id(v: str) -> str:
    if not ID_RE.match(v or ""):
        raise ValueError(f"id {v!r} must be lower-case letters, digits, '.' or '-'")
    return v


class Identified(Strict):
    """Anything with a stable id."""

    id: str

    @field_validator("id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return _id(v)


# ─── Engine claims (server-only) ─────────────────────────────────────────────

class Check(Strict):
    """One engine claim; the same vocabulary as the Grammar guide's checks
    (``app.services.grammar_guide.model``). Names are vidyut's: linga
    Pum/Stri/Napumsaka; vibhakti Prathama, Dvitiya, Trtiya, Caturthi,
    Panchami, Sasthi, Saptami, Sambodhana; vacana Eka/Dvi/Bahu; lakara Lat,
    Lit, Lut, Lrt, Let, Lot, Lan, VidhiLin, AshirLin, Lun, Lrn; purusha
    Prathama/Madhyama/Uttama."""

    type: Literal["subanta", "tinanta", "krdanta", "taddhita", "sandhi"]
    stem: Optional[str] = None
    linga: Optional[str] = None
    vibhakti: Optional[str] = None
    vacana: Optional[str] = None
    stem_type: Optional[str] = None
    dhatu: Optional[str] = None
    lakara: Optional[str] = None
    purusha: Optional[str] = None
    prayoga: Optional[str] = None
    sanadi: Optional[list[str]] = None
    prefixes: Optional[list[str]] = None
    gana: Optional[str] = None
    krt: Optional[str] = None
    taddhita: Optional[str] = None
    first: Optional[str] = None
    second: Optional[str] = None
    joined: Optional[str] = None
    form: Optional[str] = None


# ─── Sanskrit pieces ─────────────────────────────────────────────────────────

class Word(Strict):
    sa: str
    gloss: Text
    check: Optional[Check] = None


class Example(Strict):
    """A Sanskrit example: the text, its meaning, optional word-by-word gloss
    and a source (a text reference such as "Kathāsaritsāgara 1.8", or omitted
    for our own sentences)."""

    sa: str
    meaning: Text
    words: list[Word] = []
    source: Optional[str] = None
    check: Optional[Check] = None


class Quote(Strict):
    """A real line from a text, shown with its reference. ``source`` is
    required: a quote without a reference is not allowed."""

    sa: str
    gloss: Text
    source: str


class Line(Strict):
    """One line spoken in a story card. Either Sanskrit (``sa`` + ``gloss``)
    or plain speech in the learner's language (``text``)."""

    speaker: str  # character id from the story bible
    sa: Optional[str] = None
    gloss: Optional[Text] = None
    text: Optional[Text] = None
    check: Optional[Check] = None


class Term(Strict):
    """A technical term introduced on a card, with its plain meaning."""

    sa: str
    meaning: Text


class Step(Strict):
    """One step of a formation shown left to right: पठ् → पठ → पठति."""

    sa: str
    label: Text


class Row(Strict):
    """A short contrast row (2–4 per card)."""

    sa: str
    gloss: Text
    check: Optional[Check] = None


class Cell(Strict):
    """A table cell: Sanskrit (``sa``) or a learner-language label (``text``)."""

    sa: Optional[str] = None
    text: Optional[Text] = None
    highlight: bool = False
    check: Optional[Check] = None


class ImageRef(Identified):
    """A picture on a card. ChatGPT draws it from ``brief``; the delivery
    registry (``content/images/deliveries.yaml``) maps ``id`` to the files.
    ``text_in_image`` lists every string the picture must show, exactly, so
    the text verifier can compare what was drawn."""

    id: str
    brief: str
    alt: Text
    text_in_image: list[str] = []
    ratio: Literal["16:9", "4:3", "1:1", "3:4", "9:16"] = "4:3"
    cast: list[str] = []  # character ids in the picture
    place: Optional[str] = None  # place id



class Source(Strict):
    """Where adapted material came from. Licences outside ALLOWED_LICENCES
    fail the build (no non-commercial sources)."""

    title: str
    url: Optional[str] = None
    licence: str
    note: Optional[str] = None


ALLOWED_LICENCES = {
    "original", "public domain", "CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0", "MIT",
}


# ─── Cards ───────────────────────────────────────────────────────────────────

class CardBase(Identified):
    id: str
    title: Optional[Text] = None
    image: Optional[ImageRef] = None
    #: "panini" cards are extra depth, shown only when the learner turns on
    #: Pāṇini depth in Settings. Never a fold-out: a separate card.
    depth: Literal["core", "panini"] = "core"
    #: Skills this card teaches or practises (ids from the unit skill lists).
    skills: list[str] = []
    #: Sūtra numbers (e.g. "1.2.27"); text is filled from the sūtrapāṭha.
    sutras: list[str] = []



class StoryCard(CardBase):
    """A story panel: picture, a few sentences of narration, optional spoken
    lines and an optional real quote from a text."""

    kind: Literal["story"]
    narration: Text
    lines: list[Line] = []
    quote: Optional[Quote] = None


class TeachCard(CardBase):
    """One idea, taught. ``body`` is ≤ 60 English words."""

    kind: Literal["teach"]
    body: Text
    examples: list[Example] = []
    rows: list[Row] = []
    steps: list[Step] = []
    formula: Optional[str] = None  # Devanagari formula, e.g. "अ + इ → ए"
    term: Optional[Term] = None


class TableCard(CardBase):
    kind: Literal["table"]
    caption: Text
    columns: list[Text]
    rows: list[list[Cell]]
    note: Optional[Text] = None


EXPLORE_WIDGETS = (
    "letter_builder",      # add vowel signs to a consonant; snap conjuncts
    "mouth_map",           # tap a place of articulation ↔ its letters
    "form_explorer",       # switch case/number/gender or person/number/tense
    "role_arrows",         # draw noun → verb arrows and name each role
    "time_slider",         # one sentence slid past → present → future
    "word_shuffle",        # reorder words; meaning stays the same
    "sandhi_mixer",        # drop one word on another to join; pull to split
    "compound_unpacker",   # split a compound, build its meaning tree
    "word_factory",        # root + suffix snap into a new word
    "mark_words",          # tap every word in a passage that matches
    "rhythm_tapper",       # tap light/heavy per syllable; the metre appears
    "derivation_stepper",  # a word built one sūtra at a time
)


class ExploreCard(CardBase):
    """A hands-on widget. ``params`` are the widget's own inputs, one of the
    ``*Params`` shapes below (``WIDGET_PARAMS`` maps widget → shape; the
    checker parses them, so a wrong key fails like anywhere else)."""

    kind: Literal["explore"]
    widget: Literal[EXPLORE_WIDGETS]  # type: ignore[valid-type]
    prompt: Text
    params: dict[str, Any] = {}
    #: "after": hide the Roman letters (IAST) until the learner is done
    #: (script lessons, where they would give the answer away).
    roman: Literal["show", "after"] = "show"


# ─── Widget inputs ───────────────────────────────────────────────────────────
# Each widget's params. Sanskrit is Devanagari; the builder adds an
# ``iast`` map for every Sanskrit string and precomputes whatever the engine
# must supply (places, paradigms, derivations, metre), so widgets work
# offline and never guess. "→ built" names what the builder adds.

class LetterBuilderParams(Strict):
    """Drag a vowel sign onto a consonant, or a half letter (with ्) onto a
    consonant to snap a conjunct. Results are plain Unicode joins
    (क + ि = कि, क् + ष = क्ष); ``targets`` are optional goals to tick off."""

    bases: list[str]
    signs: list[str] = []
    halves: list[str] = []
    targets: list[str] = []


class MouthMapParams(Strict):
    """A side view of the mouth; tap a letter to light its place, or a place
    to list its letters. → built: ``places`` {letter: [place ids]}."""

    letters: list[str]


class StemSpec(Strict):
    stem: str
    linga: Literal["Pum", "Stri", "Napumsaka"]
    stem_type: Optional[str] = None
    gloss: Optional[Text] = None


class RootSpec(Strict):
    dhatu: str
    lakaras: list[str] = ["Lat"]
    gana: Optional[str] = None
    prayoga: Optional[str] = None
    gloss: Optional[Text] = None


class FormExplorerParams(Strict):
    """Switch case/number (nouns) or person/number/tense (verbs) and watch
    the form change. Give ``stems`` or ``roots``, not both. → built: every
    grid from the engine (``paradigms``)."""

    stems: list[StemSpec] = []
    roots: list[RootSpec] = []
    vibhaktis: list[str] = []  # limit the rows; empty = all eight
    vacanas: list[str] = []    # limit the columns; empty = all three


ROLES = ("karta", "karma", "karana", "sampradana", "apadana", "sambandha",
         "adhikarana", "sambodhana", "kriya", "other")


class RoleWord(Strict):
    sa: str
    role: Literal[ROLES]  # type: ignore[valid-type]
    gloss: Text
    check: Optional[Check] = None


class RoleArrowsParams(Strict):
    """Draw an arrow from each noun to the verb and name its role."""

    sentence: list[RoleWord]
    meaning: Text


class TimeForm(Strict):
    label: Text  # "yesterday", "now", "tomorrow"
    sa: str
    meaning: Text
    check: Optional[Check] = None  # on the verb, via ``form`` if the line is longer


class TimeSliderParams(Strict):
    """One sentence slid from past to present to future."""

    forms: list[TimeForm]


class WordShuffleParams(Strict):
    """Reorder the words freely; the meaning stays the same. ``not_first``
    lists words that follow another word and never open a sentence (the
    particles च, वा, हि…): an order that starts with one is shown as not
    natural. Authored, for the scholar to confirm; the app decides nothing."""

    words: list[str]
    meaning: Text
    not_first: list[str] = []


class SandhiPair(Strict):
    first: str
    second: str
    joined: str
    sutras: list[str] = []


class SandhiMixerParams(Strict):
    """Drop one word on another to join them; pull them apart to split.
    Every pair is checked against the engine's sandhi table."""

    pairs: list[SandhiPair]


COMPOUND_KINDS = ("tatpurusha", "karmadharaya", "dvigu", "dvandva", "bahuvrihi", "avyayibhava")


class CompoundUnpackerParams(Strict):
    """Split a compound and build its meaning tree. The engine does not
    check compounds: these need the scholar's review."""

    compound: str
    parts: list[str]
    kind: Literal[COMPOUND_KINDS]  # type: ignore[valid-type]
    vigraha: str  # the analysing phrase, e.g. राज्ञः पुरुषः
    meaning: Text


class FactoryRoot(Strict):
    dhatu: str
    gloss: Text
    gana: Optional[str] = None


class FactorySuffix(Strict):
    krt: str  # vidyut's name: kta, ktavatu, ktvA, lyap, tumun, Satf, …
    label: Text


class WordFactoryParams(Strict):
    """Snap a suffix onto a root and get a new word. → built: ``results``
    {dhātu|krt: form} from the engine (a cell it cannot make is left out)."""

    roots: list[FactoryRoot]
    suffixes: list[FactorySuffix]
    linga: Literal["Pum", "Stri", "Napumsaka"] = "Pum"  # the gender the made words are shown in


class MarkWordsParams(Strict):
    """Tap every word in the passage that matches the prompt."""

    passage: list[str]
    targets: list[str]


class RhythmTapperParams(Strict):
    """Tap for a light syllable, hold for a heavy one; the pattern (and the
    metre's name) appears. → built: ``scan`` per line from the engine."""

    lines: list[str]


class DerivationStepperParams(Strict):
    """A word built one sūtra at a time. ``spec`` says what to derive (the
    same vocabulary as a check). → built: ``steps`` from the engine."""

    target: str
    spec: Check


WIDGET_PARAMS: dict[str, type[Strict]] = {
    "letter_builder": LetterBuilderParams,
    "mouth_map": MouthMapParams,
    "form_explorer": FormExplorerParams,
    "role_arrows": RoleArrowsParams,
    "time_slider": TimeSliderParams,
    "word_shuffle": WordShuffleParams,
    "sandhi_mixer": SandhiMixerParams,
    "compound_unpacker": CompoundUnpackerParams,
    "word_factory": WordFactoryParams,
    "mark_words": MarkWordsParams,
    "rhythm_tapper": RhythmTapperParams,
    "derivation_stepper": DerivationStepperParams,
}
assert set(WIDGET_PARAMS) == set(EXPLORE_WIDGETS)


def widget_params(card: "ExploreCard") -> Strict:
    """The card's params parsed into its widget's shape (raises if wrong)."""
    return WIDGET_PARAMS[card.widget].model_validate(card.params)


class Option(Strict):
    """A choice: Sanskrit (``sa``) or a learner-language label (``text``)."""

    sa: Optional[str] = None
    text: Optional[Text] = None
    correct: bool = False
    #: Shown when this wrong option is picked (optional, specific feedback).
    why: Optional[Text] = None


class EngineExercise(Strict):
    """A generated exercise (``app.services.exercise_gen``): the builder
    renders it once at build time and stores the item and its answer, so the
    card works offline and every shipped item is one the engine could make."""

    kind: Literal["grid_fill", "derive_next", "sandhi_split", "sandhi_join",
                  "scan_metre", "reorder", "contrast"]
    params: dict[str, Any] = {}
    seed: int = 0


class Pair(Strict):
    left: Option
    right: Option


class StoryResult(Strict):
    """What the story says after a gate is solved, or missed."""

    success: Text
    failure: Text


class PracticeCard(CardBase):
    """A check. Modes:
    choice  – options, exactly one ``correct``
    type    – the learner builds the Sanskrit answer from tiles or types it;
              ``answers`` lists every accepted form (anusvāra/visarga pause
              variants are added by the builder)
    order   – ``tokens`` in the right order; the learner re-orders them
    match   – ``pairs`` the learner joins
    engine  – a generated exercise (``exercise``)
    A ``gate`` practice is a story puzzle: the story waits until it is solved
    and ``story`` narrates the result."""

    kind: Literal["practice"]
    mode: Literal["choice", "type", "order", "match", "engine"]
    prompt: Text
    explain: Text  # why the answer is right; shown after answering
    options: list[Option] = []
    answers: list[str] = []
    tiles: list[str] = []  # for "type": the pieces offered (answer + decoys)
    tokens: list[str] = []
    pairs: list[Pair] = []
    exercise: Optional[EngineExercise] = None
    check: Optional[Check] = None  # engine claim on answers[0]
    gate: bool = False
    story: Optional[StoryResult] = None
    #: "after": hide the Roman letters (IAST) until answered (script
    #: lessons, where they would give the answer away).
    roman: Literal["show", "after"] = "show"


class SummaryPoint(Strict):
    sa: Optional[str] = None
    text: Text


class SummaryCard(CardBase):
    """The lesson's own quick sheet (the last card of a scene)."""

    kind: Literal["summary"]
    points: list[SummaryPoint]


class Sentence(Strict):
    sa: str
    meaning: Text
    words: list[Word] = []
    check: Optional[Check] = None


class ReadingCard(CardBase):
    """A passage read in Sanskrit with tap-to-gloss words (episode readings,
    leaf tales)."""

    kind: Literal["reading"]
    passage: list[Sentence]


class RevisionRow(Strict):
    """One rule in a revision lesson. Either ``taught_in`` names the card that
    taught it ("<lesson id>#<card id>") or ``new_here`` says the revision
    lesson is where it is first met (then ``example`` is required)."""

    skill: Optional[str] = None
    formula: Optional[str] = None
    rule: Text
    example: Optional[Example] = None
    sutras: list[str] = []
    tag: Literal["core", "good", "rare"] = "core"
    taught_in: Optional[str] = None
    new_here: bool = False


REVISION_SECTIONS = ("core", "conditions", "exceptions", "optional", "blocked",
                     "splitting", "mistakes", "panini", "quick_sheet")


class RevisionCard(CardBase):
    """One section of a revision lesson (rows are paged ~6 per card by the
    client)."""

    kind: Literal["revision"]
    section: Literal[REVISION_SECTIONS]  # type: ignore[valid-type]
    rows: list[RevisionRow]


class VideoCard(CardBase):
    """A short YouTube clip at a unit's end. Watching earns nothing (YouTube
    Developer Policies III.F.3). ``start``/``end`` in seconds clip a lecture."""

    kind: Literal["video"]
    youtube_id: str
    channel: str
    start: Optional[int] = None
    end: Optional[int] = None


Card = Annotated[
    Union[StoryCard, TeachCard, TableCard, ExploreCard, PracticeCard,
          SummaryCard, ReadingCard, RevisionCard, VideoCard],
    Field(discriminator="kind"),
]


# ─── Lessons, units, acts, course ────────────────────────────────────────────

class Lesson(Strict):
    """One lesson file. Templates:
    prologue – story cards only (the opening legend)
    scene    – story → teach → explore/examples → practice (≥ 40%) → summary
    episode  – the unit's story read in Sanskrit, with comprehension checks
    revision – the unit's complete rule list, in REVISION_SECTIONS order
    check    – the unit test: practice only, every unit skill at least once
    tale     – the readable tale inside a recovered leaf"""

    id: str
    template: Literal["prologue", "scene", "episode", "revision", "check", "tale"]
    title: Text
    title_sa: Optional[str] = None
    minutes: int = 6
    teaches: list[str] = []
    needs: list[str] = []
    #: draft → engine_ok (engine checks pass) → scholar_ok (a Sanskrit
    #: scholar signed off). Release builds require scholar_ok.
    review: Literal["draft", "engine_ok", "scholar_ok"] = "draft"
    sources: list[Source] = []
    cards: list[Card]

    @field_validator("id")
    @classmethod
    def _lesson_id(cls, v: str) -> str:
        _id(v)
        if len(v) > LESSON_ID_MAX:
            raise ValueError(f"lesson id {v!r} is longer than {LESSON_ID_MAX}")
        return v


class Skill(Identified):
    id: str
    title: Text
    sutras: list[str] = []



class PlannedLesson(Identified):
    """A lesson in the syllabus that is not written yet."""

    id: str
    title: Text
    teaches: list[str] = []
    notes: Optional[str] = None  # for the author: what the lesson must do



class Episode(Strict):
    """The unit's story. ``summary`` is the "story so far" card for anyone
    arriving here (learner-facing, both languages); ``beats`` is the plot
    outline for authors, approved before any Sanskrit is written."""

    summary: Text
    beats: list[str] = []


class UnitVideo(Strict):
    youtube_id: str
    channel: str
    title: str
    start: Optional[int] = None
    end: Optional[int] = None


class Unit(Identified):
    id: str
    title: Text
    title_sa: Optional[str] = None
    status: Literal["ready", "planned"] = "planned"
    ghost: Optional[str] = None  # ghost id from the story bible
    episode: Episode
    skills: list[Skill]
    lessons: list[str] = []          # written lessons, in order
    planned: list[PlannedLesson] = []  # not yet written, in order
    revision: Optional[str] = None
    check: Optional[str] = None
    video: Optional[UnitVideo] = None



class Part(Strict):
    leaf: str  # leaf id from the story bible
    units: list[str]


class Act(Identified):
    id: str
    n: int
    title: Text
    title_sa: str
    place: str  # place id from the story bible
    color: str  # the act's colour on the map
    goal: Text
    parts: list[Part]
    #: The painted backdrop of this act's stretch of the journey map (9:16,
    #: no text, no path: the app draws the road and the stops on top).
    map: Optional[ImageRef] = None



class Course(Strict):
    id: str
    title: Text
    title_sa: str
    prologue: str  # lesson id (template "prologue")
    acts: list[str]


# ─── Story bible ─────────────────────────────────────────────────────────────

class Character(Identified):
    id: str
    name_sa: str
    name: Text
    kind: Literal["human", "animal", "ghost", "divine", "historical"]
    role: Text
    #: How the character looks, for every picture ChatGPT draws (keep fixed).
    look: str
    #: A square portrait for speaker chips, the cast page and the map (a
    #: ghost's portrait is shown greyed until the ghost is freed).
    portrait: Optional[ImageRef] = None



class Place(Identified):
    id: str
    name_sa: str
    name: Text
    look: str



class SaLine(Strict):
    sa: str
    gloss: Text
    check: Optional[Check] = None


class Ghost(Identified):
    """The ghost freed when a unit is finished."""

    id: str  # also a character id
    unit: str
    waits_for: Text  # what the ghost needs, in story terms
    freed_line: SaLine
    clue: Optional[SaLine] = None  # points the story to the next unit
    #: The moment of freeing, shown on the unit-end screen.
    freed_image: Optional[ImageRef] = None



class Leaf(Identified):
    """One of the seven tales of Guṇāḍhya's book. Leaves 1–6 are the burned
    tales recovered at the end of each part; leaf 7 is the tale that
    survived, read at the end of the course."""

    id: str
    n: int
    title: Text
    title_sa: str
    tale: Optional[str] = None  # lesson id of the readable tale (template "tale")
    about: Text
    #: The recovered leaf (palm leaf with its tale's vignette), for the leaf
    #: shelf and the part-end screen. Its title may be written on it.
    image: Optional[ImageRef] = None



class Bible(Strict):
    style: str  # the art style every picture uses
    characters: list[Character]
    places: list[Place]
    ghosts: list[Ghost]
    leaves: list[Leaf]


class ImageDelivery(Strict):
    """A delivered picture (written by the image agent after verification)."""

    id: str
    phone: str  # URL of the phone WebP
    tablet: str
    width: int
    height: int
    sha256: str
    text_verified: bool = False
    prompt: Optional[str] = None
