"""The rules every course file must pass before it can ship.

``validate(data)`` returns issues; ``error`` blocks, ``warning`` reports.
Structure is checked here (fast, every build). Engine claims are checked in
``engine.py`` (slower: tests and the CLI's ``--engine``).

Release mode (``release=True``) adds the owner's sign-off gates: every
shipped lesson reviewed by a Sanskrit scholar, every picture delivered and
its text verified.
"""

from __future__ import annotations

import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Iterator, Optional

from pydantic import BaseModel, ValidationError

from .loader import CourseData, Issue
from .phonetics import PLACES, VIRAMA, VOWEL_SIGNS
from .schema import (
    ALLOWED_LICENCES, REVISION_SECTIONS, ExploreCard, ImageRef, Lesson, Line,
    PracticeCard, RevisionCard, StoryCard, SummaryCard, TeachCard, Text,
    widget_params,
)

LATIN = re.compile(r"[A-Za-z]")
DEVANAGARI = re.compile(r"[ऀ-ॿ]")
INLINE_SA = re.compile(r"\{\{.*?\}\}")
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")

TEACH_BODY_MAX_WORDS = 60
STORY_NARRATION_MAX_WORDS = 70
SCENE_CARDS = (8, 14)          # target range (warning outside)
SCENE_CARDS_HARD = (5, 20)     # error outside
PRACTICE_SHARE_MIN = 0.30      # error below
PRACTICE_SHARE_TARGET = 0.40   # warning below
CHECK_MIN_ITEMS = 6

#: The fourteen Śiva sūtras, cited as SS.1 … SS.14 (not numbered in the
#: Aṣṭādhyāyī itself).
SHIVA_SUTRAS = {
    "SS.1": "अइउण्", "SS.2": "ऋऌक्", "SS.3": "एओङ्", "SS.4": "ऐऔच्",
    "SS.5": "हयवरट्", "SS.6": "लण्", "SS.7": "ञमङणनम्", "SS.8": "झभञ्",
    "SS.9": "घढधष्", "SS.10": "जबगडदश्", "SS.11": "खफछठथचटतव्", "SS.12": "कपय्",
    "SS.13": "शषसर्", "SS.14": "हल्",
}

SUTRAPATHA = Path(__file__).resolve().parents[2] / "vidyut-data" / "prakriya" / "sutrapatha.tsv"


@lru_cache(maxsize=1)
def sutra_table() -> dict[str, str]:
    """ref → Devanagari sūtra text, from the engine's own sūtrapāṭha (MIT)."""
    table: dict[str, str] = dict(SHIVA_SUTRAS)
    if not SUTRAPATHA.exists():
        return table
    from vidyut.lipi import Scheme, transliterate

    for line in SUTRAPATHA.read_text(encoding="utf-8").splitlines()[1:]:
        parts = line.split("\t")
        if len(parts) >= 2 and parts[0] and parts[1]:
            table[parts[0]] = transliterate(parts[1], Scheme.Slp1, Scheme.Devanagari)
    return table


# ─── Walkers ────────────────────────────────────────────────────────────────

def walk(node, path: str = "") -> Iterator[tuple[str, object]]:
    """Every (path, value) under a model, depth first."""
    if isinstance(node, BaseModel):
        yield path, node
        for name in type(node).model_fields:
            yield from walk(getattr(node, name), f"{path}.{name}" if path else name)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{path}[{i}]")
    else:
        yield path, node


SA_FIELDS = {"sa", "formula", "title_sa", "name_sa"}
SA_LIST_FIELDS = {"answers", "tokens", "tiles"}
#: Sanskrit inside widget params (and the checks they carry).
PARAM_SA_FIELDS = {"bases", "signs", "halves", "targets", "letters", "stem", "dhatu",
                   "words", "first", "second", "joined", "compound", "parts", "vigraha",
                   "passage", "lines", "target"}

VIBHAKTIS = ("Prathama", "Dvitiya", "Trtiya", "Caturthi", "Panchami", "Sasthi", "Saptami", "Sambodhana")
VACANAS = ("Eka", "Dvi", "Bahu")


def sanskrit_strings(node, path: str = "", keys: Optional[set[str]] = None) -> Iterator[tuple[str, str]]:
    keys = keys if keys is not None else SA_FIELDS | SA_LIST_FIELDS
    for p, v in walk(node, path):
        leaf = p.rsplit(".", 1)[-1]
        base = leaf.split("[", 1)[0]
        if isinstance(v, str) and base in keys:
            yield p, v


def buildable(answer: str, tiles: list[str]) -> bool:
    """Can ``answer`` be written by joining some of ``tiles`` (each at most
    once, any order)? Spaces in the answer are free."""
    target = answer.replace(" ", "")
    pieces = [t.replace(" ", "") for t in tiles if t.strip()]
    seen: set[tuple[int, int]] = set()

    def go(pos: int, used: int) -> bool:
        if pos == len(target):
            return True
        if (pos, used) in seen:
            return False
        seen.add((pos, used))
        for i, t in enumerate(pieces):
            if not used & (1 << i) and target.startswith(t, pos) and go(pos + len(t), used | (1 << i)):
                return True
        return False

    return go(0, 0)


def texts(node, path: str = "") -> Iterator[tuple[str, Text]]:
    for p, v in walk(node, path):
        if isinstance(v, Text):
            yield p, v


def _words(s: str) -> int:
    return len(re.findall(r"\w+", INLINE_SA.sub("x", s or "")))


# ─── Checks ─────────────────────────────────────────────────────────────────

class Checker:
    def __init__(self, data: CourseData, release: bool = False):
        self.d = data
        self.release = release
        self.issues: list[Issue] = list(data.issues)
        self.skills: dict[str, str] = {}  # skill id → unit id
        self.characters: set[str] = set()
        self.places: set[str] = set()
        self.ready_units: set[str] = set()
        self.unit_of_lesson: dict[str, str] = {}
        self.image_ids: dict[str, str] = {}  # image id → where it is used

    def err(self, where: str, msg: str) -> None:
        self.issues.append(Issue("error", where, msg))

    def warn(self, where: str, msg: str) -> None:
        self.issues.append(Issue("warning", where, msg))

    # bible ------------------------------------------------------------------
    def bible(self) -> None:
        b = self.d.bible
        if b is None:
            return
        where = self.d.bible_path
        seen: set[str] = set()
        for c in b.characters:
            if c.id in seen:
                self.err(where, f"character {c.id} defined twice")
            seen.add(c.id)
        self.characters = seen
        self.places = {p.id for p in b.places}
        if len(self.places) != len(b.places):
            self.err(where, "a place id is defined twice")
        for c in b.characters:
            if c.portrait is not None:
                self._image(f"{where}:characters.{c.id}.portrait", c.portrait, strict=True)
        for leaf in b.leaves:
            if leaf.image is not None:
                self._image(f"{where}:leaves.{leaf.id}.image", leaf.image, strict=True)
        for g in b.ghosts:
            if g.freed_image is not None:
                self._image(f"{where}:ghosts.{g.id}.freed_image", g.freed_image, strict=True)
        ns = [leaf.n for leaf in b.leaves]
        if sorted(ns) != list(range(1, len(ns) + 1)):
            self.err(where, f"leaves must be numbered 1..{len(ns)} once each, got {sorted(ns)}")
        ghost_ids: set[str] = set()
        for g in b.ghosts:
            if g.id in ghost_ids:
                self.err(where, f"ghost {g.id} defined twice")
            ghost_ids.add(g.id)
            ch = next((c for c in b.characters if c.id == g.id), None)
            if ch is None:
                self.err(where, f"ghost {g.id} is not a character")
            elif ch.kind != "ghost":
                self.err(where, f"character {g.id} is a ghost but its kind is {ch.kind}")
            u = self.d.unit(g.unit)
            if u is None:
                self.err(where, f"ghost {g.id} belongs to unknown unit {g.unit}")
            elif u.ghost != g.id:
                self.err(where, f"ghost {g.id} says unit {g.unit}, but that unit's ghost is {u.ghost}")
            for p, s in sanskrit_strings(g, f"ghosts.{g.id}"):
                self._sa(f"{where}:{p}", s)

    # course structure ---------------------------------------------------------
    def structure(self) -> None:
        c = self.d.course
        if c is None:
            return
        where = self.d.course_path
        pro = self.d.lesson(c.prologue)
        if pro is None:
            self.err(where, f"prologue lesson {c.prologue} not found")
        elif pro.template != "prologue":
            self.err(where, f"prologue {c.prologue} must use template prologue")
        units_seen: dict[str, str] = {}
        leaves_used: dict[str, str] = {}
        last_n = 0
        for act_id in c.acts:
            loc = self.d.acts.get(act_id)
            if loc is None:
                self.err(where, f"act {act_id} listed but no acts/{act_id}/act.yaml")
                continue
            act = loc.obj
            if act.n <= last_n:
                self.warn(loc.path, f"act number {act.n} is not after {last_n}")
            last_n = act.n
            if act.place not in self.places:
                self.err(loc.path, f"unknown place {act.place}")
            if not HEX.match(act.color):
                self.err(loc.path, f"color {act.color} must be #RRGGBB")
            if act.map is not None:
                self._image(f"{loc.path}:map", act.map, strict=True)
                if act.map.text_in_image:
                    self.err(f"{loc.path}:map", "a map backdrop carries no text (the app labels the map)")
            for i, part in enumerate(act.parts):
                if self.d.bible and part.leaf not in {l.id for l in self.d.bible.leaves}:
                    self.err(loc.path, f"parts[{i}] leaf {part.leaf} not in the bible")
                if part.leaf in leaves_used:
                    self.err(loc.path, f"leaf {part.leaf} already ends {leaves_used[part.leaf]}")
                leaves_used[part.leaf] = f"{act_id} part {i + 1}"
                for unit_id in part.units:
                    if unit_id in units_seen:
                        self.err(loc.path, f"unit {unit_id} listed twice (also in {units_seen[unit_id]})")
                    units_seen[unit_id] = act_id
                    if unit_id not in self.d.units:
                        self.err(loc.path, f"unit {unit_id} listed but no unit.yaml")
                    elif self.d.unit_act.get(unit_id) != act_id:
                        self.err(loc.path, f"unit {unit_id} lives in acts/{self.d.unit_act.get(unit_id)}/")
        for act_id, loc in self.d.acts.items():
            if act_id not in c.acts:
                self.err(loc.path, f"act {act_id} is not in course.yaml")
        for unit_id, loc in self.d.units.items():
            if unit_id not in units_seen:
                self.err(loc.path, f"unit {unit_id} is not in any act's parts")

    # skills -------------------------------------------------------------------
    def skill_registry(self) -> None:
        for unit_id, loc in self.d.units.items():
            unit = loc.obj
            for s in unit.skills:
                if s.id in self.skills:
                    self.err(loc.path, f"skill {s.id} also defined in unit {self.skills[s.id]}")
                self.skills[s.id] = unit_id
                for ref in s.sutras:
                    self._sutra(f"{loc.path}:skills.{s.id}", ref)

    # units ---------------------------------------------------------------------
    def units(self) -> None:
        referenced: dict[str, str] = {}
        c = self.d.course
        if c is not None:
            referenced[c.prologue] = "course prologue"
        if self.d.bible:
            for leaf in self.d.bible.leaves:
                if leaf.tale:
                    referenced[leaf.tale] = f"leaf {leaf.id}"
                    tale = self.d.lesson(leaf.tale)
                    if tale is None:
                        self.err(self.d.bible_path, f"leaf {leaf.id} tale {leaf.tale} not found")
                    elif tale.template != "tale":
                        self.err(self.d.bible_path, f"leaf {leaf.id} tale must use template tale")
        for unit_id, loc in self.d.units.items():
            unit = loc.obj
            where = loc.path
            ready = unit.status == "ready"
            if ready:
                self.ready_units.add(unit_id)
            if unit.ghost and self.d.bible and unit.ghost not in {g.id for g in self.d.bible.ghosts}:
                self.err(where, f"ghost {unit.ghost} not in the bible")
            if ready and not unit.ghost:
                self.err(where, "a ready unit needs its ghost")
            for p, t in texts(unit, ""):
                self._text(f"{where}:{p}", t, ready)
            if ready:
                if not unit.lessons:
                    self.err(where, "a ready unit needs lessons")
                if not unit.revision:
                    self.err(where, "a ready unit needs its revision lesson")
                if not unit.check:
                    self.err(where, "a ready unit needs its check")
                if len(unit.episode.beats) < 3:
                    self.warn(where, "the episode should have at least 3 beats")
            roles = [(lid, "lesson") for lid in unit.lessons]
            if unit.revision:
                roles.append((unit.revision, "revision"))
            if unit.reading:
                roles.append((unit.reading, "reading"))
            if unit.check:
                roles.append((unit.check, "check"))
            for lid, role in roles:
                if lid in referenced:
                    self.err(where, f"lesson {lid} already used by {referenced[lid]}")
                referenced[lid] = f"unit {unit_id}"
                self.unit_of_lesson[lid] = unit_id
                lesson = self.d.lesson(lid)
                if lesson is None:
                    self.err(where, f"{role} {lid} has no file {lid}.yaml")
                    continue
                want = {"lesson": {"scene", "episode"}, "revision": {"revision"}, "reading": {"episode"}, "check": {"check"}}[role]
                if lesson.template not in want:
                    self.err(where, f"{role} {lid} uses template {lesson.template}, expected {'/'.join(sorted(want))}")
                lpath = self.d.lessons[lid].path
                if self.d.unit_act.get(unit_id) and not lpath.startswith(f"acts/{self.d.unit_act[unit_id]}/{unit_id}/"):
                    self.err(lpath, f"lesson file must live in acts/{self.d.unit_act[unit_id]}/{unit_id}/")
            planned_ids = {p.id for p in unit.planned}
            for p in unit.planned:
                if p.id in unit.lessons:
                    self.err(where, f"planned lesson {p.id} is also written; drop it from planned")
                for sid in p.teaches:
                    if sid not in self.skills:
                        self.err(where, f"planned {p.id} teaches unknown skill {sid}")
            if planned_ids & set(self.d.lessons) - set(unit.lessons):
                for pid in sorted(planned_ids & set(self.d.lessons)):
                    self.warn(where, f"{pid}.yaml exists but the lesson is still listed as planned")
        for lid, loc in self.d.lessons.items():
            if lid not in referenced:
                self.err(loc.path, f"lesson {lid} is not used by any unit, the prologue or a leaf")

    # lessons -------------------------------------------------------------------
    def lessons(self) -> None:
        for lid, loc in self.d.lessons.items():
            lesson: Lesson = loc.obj
            where = loc.path
            unit_id = self.unit_of_lesson.get(lid)
            strict = unit_id in self.ready_units or lesson.template in ("prologue", "tale")
            self._template(lesson, where)
            ids = [c.id for c in lesson.cards]
            for dup in sorted({i for i in ids if ids.count(i) > 1}):
                self.err(where, f"card id {dup} used twice")
            for sid in lesson.teaches + lesson.needs:
                if sid not in self.skills:
                    self.err(where, f"unknown skill {sid}")
            if unit_id and self.skills:
                for sid in lesson.teaches:
                    if sid in self.skills and self.skills[sid] != unit_id:
                        self.err(where, f"teaches {sid}, which belongs to unit {self.skills[sid]}")
            for src in lesson.sources:
                if src.licence not in ALLOWED_LICENCES:
                    self.err(where, f"source {src.title!r} has licence {src.licence!r}, not one we can use")
            if self.release and strict and lesson.review != "scholar_ok":
                self.err(where, f"review is {lesson.review}; a release needs scholar_ok")
            for p, t in texts(lesson, ""):
                self._text(f"{where}:{p}", t, strict)
            for p, s in sanskrit_strings(lesson, ""):
                self._sa(f"{where}:{p}", s)
            taught_here: set[str] = set()
            for i, card in enumerate(lesson.cards):
                cw = f"{where}:cards[{i}]({card.id})"
                for sid in card.skills:
                    if sid not in self.skills:
                        self.err(cw, f"unknown skill {sid}")
                    taught_here.add(sid)
                for ref in card.sutras:
                    self._sutra(cw, ref)
                if card.image is not None:
                    self._image(cw, card.image, strict)
                self._card(cw, card, lesson, strict)
            if lesson.template == "scene":
                for sid in lesson.teaches:
                    if sid not in taught_here:
                        self.warn(where, f"teaches {sid} but no card is tagged with it")

    def _template(self, lesson: Lesson, where: str) -> None:
        cards = lesson.cards
        kinds = [c.kind for c in cards]
        t = lesson.template
        if t == "prologue":
            if any(k != "story" for k in kinds) or len(cards) < 2:
                self.err(where, "a prologue is two or more story cards and nothing else")
        elif t == "scene":
            n = len(cards)
            if n < SCENE_CARDS_HARD[0] or n > SCENE_CARDS_HARD[1]:
                self.err(where, f"{n} cards; a scene has {SCENE_CARDS_HARD[0]}–{SCENE_CARDS_HARD[1]}")
            elif n < SCENE_CARDS[0] or n > SCENE_CARDS[1]:
                self.warn(where, f"{n} cards; aim for {SCENE_CARDS[0]}–{SCENE_CARDS[1]}")
            if not cards or cards[0].kind != "story":
                self.err(where, "a scene opens with a story card")
            if "teach" not in kinds:
                self.err(where, "a scene teaches at least one card")
            if not cards or cards[-1].kind != "summary":
                self.err(where, "a scene ends with its summary card")
            core = [c for c in cards if c.depth == "core"]
            active = sum(1 for c in core if c.kind in ("practice", "explore"))
            share = active / max(1, len(core))
            if active == 0:
                self.err(where, "a scene needs practice")
            elif share < PRACTICE_SHARE_MIN:
                self.err(where, f"practice is {share:.0%} of the cards; the floor is {PRACTICE_SHARE_MIN:.0%}")
            elif share < PRACTICE_SHARE_TARGET:
                self.warn(where, f"practice is {share:.0%} of the cards; aim for {PRACTICE_SHARE_TARGET:.0%}")
        elif t == "episode":
            if "reading" not in kinds or "practice" not in kinds:
                self.err(where, "an episode needs reading cards and practice")
        elif t == "revision":
            sections = [c.section for c in cards if isinstance(c, RevisionCard)]
            if any(k not in ("revision", "practice") for k in kinds):
                self.err(where, "a revision lesson holds revision sections and practice only")
            order = [REVISION_SECTIONS.index(s) for s in sections]
            if order != sorted(order):
                self.err(where, f"sections out of order; use {', '.join(REVISION_SECTIONS)}")
            for need in ("core", "quick_sheet"):
                if need not in sections:
                    self.err(where, f"a revision lesson needs the {need} section")
        elif t == "check":
            if any(k != "practice" for k in kinds):
                self.err(where, "a check is practice cards only")
            if len(cards) < CHECK_MIN_ITEMS:
                self.err(where, f"a check has at least {CHECK_MIN_ITEMS} items")
        elif t == "tale":
            if "reading" not in kinds:
                self.err(where, "a tale is read in Sanskrit: it needs reading cards")

    def _card(self, cw: str, card, lesson: Lesson, strict: bool = False) -> None:
        if isinstance(card, TeachCard) and _words(card.body.en) > TEACH_BODY_MAX_WORDS:
            self.warn(cw, f"body is {_words(card.body.en)} words; keep it to {TEACH_BODY_MAX_WORDS}")
        if isinstance(card, StoryCard) and _words(card.narration.en) > STORY_NARRATION_MAX_WORDS:
            self.warn(cw, f"narration is {_words(card.narration.en)} words; keep it to {STORY_NARRATION_MAX_WORDS}")
        if isinstance(card, StoryCard):
            for j, line in enumerate(card.lines):
                self._line(f"{cw}.lines[{j}]", line)
        if isinstance(card, SummaryCard) and not card.points:
            self.err(cw, "a summary needs points")
        if isinstance(card, ExploreCard):
            self._explore(cw, card, strict)
        if isinstance(card, PracticeCard):
            self._practice(cw, card, lesson)
        if isinstance(card, RevisionCard):
            for j, row in enumerate(card.rows):
                rw = f"{cw}.rows[{j}]"
                if row.skill and row.skill not in self.skills:
                    self.err(rw, f"unknown skill {row.skill}")
                for ref in row.sutras:
                    self._sutra(rw, ref)
                if bool(row.taught_in) == bool(row.new_here):
                    self.err(rw, "say where it was taught (taught_in) or mark it new_here, not both")
                if row.new_here and row.example is None:
                    self.err(rw, "a rule met first in revision needs an example")
                if row.taught_in:
                    self._taught_in(rw, row.taught_in, lesson)

    def _line(self, where: str, line: Line) -> None:
        if line.speaker not in self.characters:
            self.err(where, f"speaker {line.speaker} is not in the bible")
        if bool(line.sa) == bool(line.text):
            self.err(where, "a line is either Sanskrit (sa + gloss) or plain speech (text)")
        if line.sa and line.gloss is None:
            self.err(where, "a Sanskrit line needs its gloss")

    def _practice(self, cw: str, card: PracticeCard, lesson: Lesson) -> None:
        m = card.mode
        if m == "choice":
            right = sum(1 for o in card.options if o.correct)
            if len(card.options) < 2 or right != 1:
                self.err(cw, f"choice needs two or more options and exactly one correct (has {right})")
            for o in card.options:
                if bool(o.sa) == bool(o.text):
                    self.err(cw, "an option is Sanskrit (sa) or a label (text), not both")
        elif m == "type":
            if not card.answers:
                self.err(cw, "type needs answers")
            elif card.tiles and not buildable(card.answers[0], card.tiles):
                self.err(cw, f"the tiles cannot build the answer {card.answers[0]}")
            if card.tiles and len(card.tiles) < 3:
                self.warn(cw, "offer a decoy or two among the tiles")
        elif m == "order":
            if len(card.tokens) < 2:
                self.err(cw, "order needs two or more tokens")
        elif m == "match":
            if len(card.pairs) < 2:
                self.err(cw, "match needs two or more pairs")
            for j, pair in enumerate(card.pairs):
                for side in (pair.left, pair.right):
                    if bool(side.sa) == bool(side.text):
                        self.err(f"{cw}.pairs[{j}]", "each side is Sanskrit (sa) or a label (text), not both")
        elif m == "engine":
            if card.exercise is None:
                self.err(cw, "engine practice needs its exercise")
        if card.gate and card.story is None:
            self.err(cw, "a gate puzzle tells the story's result (story.success / story.failure)")
        if not card.skills and lesson.template in ("scene", "check", "episode"):
            self.warn(cw, "tag the practice with the skill it checks")

    def _explore(self, cw: str, card: ExploreCard, strict: bool = False) -> None:
        try:
            p = widget_params(card)
        except ValidationError as e:
            for er in e.errors():
                loc = ".".join(str(x) for x in er.get("loc", ()))
                self.err(f"{cw}.params.{loc}", f"{card.widget}: {er.get('msg', 'invalid')}")
            return
        for path, t in texts(p, "params"):
            self._text(f"{cw}.{path}", t, strict)
        for path, sa in sanskrit_strings(p, "params", PARAM_SA_FIELDS | SA_FIELDS):
            self._sa(f"{cw}.{path}", sa)
        w = card.widget
        if w == "letter_builder":
            if not p.bases:
                self.err(cw, "letter_builder needs bases")
            for sign in p.signs:
                if sign not in VOWEL_SIGNS:
                    self.err(cw, f"{sign!r} is not a vowel sign")
            for half in p.halves:
                if not half.endswith(VIRAMA):
                    self.err(cw, f"half letter {half} must end in ्")
            made = set(p.bases) | {b + g for b in p.bases for g in p.signs}
            made |= {h + b for h in p.halves for b in p.bases}
            made |= {h + b + g for h in p.halves for b in p.bases for g in p.signs}
            for t in p.targets:
                if t not in made:
                    self.err(cw, f"target {t} cannot be built from these bases, signs and halves")
        elif w == "mouth_map":
            if not p.letters:
                self.err(cw, "mouth_map needs letters")
            for x in p.letters:
                if x not in PLACES:
                    self.err(cw, f"no place of articulation known for {x}")
        elif w == "form_explorer":
            if bool(p.stems) == bool(p.roots):
                self.err(cw, "form_explorer takes stems or roots, not both")
            for v in p.vibhaktis:
                if v not in VIBHAKTIS:
                    self.err(cw, f"unknown vibhakti {v}")
            for v in p.vacanas:
                if v not in VACANAS:
                    self.err(cw, f"unknown vacana {v}")
        elif w == "role_arrows":
            if len(p.sentence) < 2 or not any(x.role == "kriya" for x in p.sentence):
                self.err(cw, "role_arrows needs a sentence with its verb (role kriya)")
        elif w == "time_slider":
            if len(p.forms) < 2:
                self.err(cw, "time_slider needs two or more forms")
        elif w == "word_shuffle":
            if len(p.words) < 3:
                self.err(cw, "word_shuffle needs three or more words")
            if len(p.words) > 6:
                self.err(cw, "word_shuffle takes at most six words")
            if len(set(p.words)) != len(p.words):
                self.err(cw, "word_shuffle words must all differ")
            for word in p.not_first:
                if word not in p.words:
                    self.err(cw, f"not_first word {word} is not among the words")
            if len(p.not_first) >= len(p.words):
                self.err(cw, "word_shuffle needs a word that can open the sentence")
        elif w == "sandhi_mixer":
            if not p.pairs:
                self.err(cw, "sandhi_mixer needs pairs")
            for pair in p.pairs:
                for ref in pair.sutras:
                    self._sutra(cw, ref)
        elif w == "compound_unpacker":
            if len(p.parts) < 2:
                self.err(cw, "a compound has two or more parts")
        elif w == "word_factory":
            if not p.roots or not p.suffixes:
                self.err(cw, "word_factory needs roots and suffixes")
        elif w == "mark_words":
            if not p.targets:
                self.err(cw, "mark_words needs targets")
            missing = [t for t in p.targets if t not in p.passage]
            if missing:
                self.err(cw, f"targets not in the passage: {', '.join(missing)}")
            if not set(p.passage) - set(p.targets):
                self.err(cw, "mark_words needs some words that are not targets")
        elif w == "rhythm_tapper":
            if not p.lines:
                self.err(cw, "rhythm_tapper needs lines")
        elif w == "derivation_stepper":
            if p.spec.type == "sandhi":
                self.err(cw, "derivation_stepper derives a word; a sandhi spec cannot be stepped")

    def _taught_in(self, rw: str, ref: str, lesson: Lesson) -> None:
        if "#" not in ref:
            self.err(rw, f"taught_in {ref!r} must be <lesson id>#<card id>")
            return
        lid, cid = ref.split("#", 1)
        src = self.d.lesson(lid)
        if src is None:
            self.err(rw, f"taught_in lesson {lid} not found")
            return
        if cid not in {c.id for c in src.cards}:
            self.err(rw, f"taught_in card {cid} not found in {lid}")
        here = self.unit_of_lesson.get(lesson.id)
        there = self.unit_of_lesson.get(lid)
        if here and there and here != there:
            self.warn(rw, f"taught in another unit ({there}); fine for a reminder, check it is intended")

    def _image(self, cw: str, img: ImageRef, strict: bool = False) -> None:
        if img.id in self.image_ids:
            self.err(cw, f"image id {img.id} also used at {self.image_ids[img.id]}")
        self.image_ids[img.id] = cw
        for ch in img.cast:
            if ch not in self.characters:
                self.err(cw, f"image cast {ch} is not in the bible")
        if img.place and img.place not in self.places:
            self.err(cw, f"image place {img.place} is not in the bible")
        if len(img.brief.split()) < 8:
            self.warn(cw, "image brief is very short; say who, what, where and what must be visible")
        self._text(f"{cw}.alt", img.alt, strict)
        for t in img.text_in_image:
            if not t.strip():
                self.err(cw, "text_in_image has an empty string")
        if self.release and strict:
            d = self.d.deliveries.get(img.id)
            if d is None:
                self.err(cw, f"image {img.id} not delivered")
            elif img.text_in_image and not getattr(d, "text_verified", False):
                self.err(cw, f"image {img.id} has text that was not verified")

    # text + Sanskrit -----------------------------------------------------------
    def _text(self, where: str, t: Text, strict: bool) -> None:
        if not t.en.strip():
            self.err(where, "English text is empty")
        hi = t.hi.strip()
        if not hi:
            (self.err if strict else self.warn)(where, "Hindi text is missing")
            return
        bare = INLINE_SA.sub("", hi)
        lat = len(LATIN.findall(bare))
        dev = len(DEVANAGARI.findall(bare))
        if lat + dev:
            share = lat / (lat + dev)
            if share > 0.5:
                self.err(where, "the Hindi is mostly Latin letters: write it in Hindi")
            elif share > 0.2:
                self.warn(where, f"the Hindi is {share:.0%} Latin letters")
        if hi == t.en.strip():
            self.err(where, "the Hindi is a copy of the English")

    def _sa(self, where: str, s: str) -> None:
        if not s.strip():
            self.err(where, "empty Sanskrit")
            return
        if LATIN.search(s):
            self.err(where, f"Sanskrit must be Devanagari: {s!r}")
        if unicodedata.normalize("NFC", s) != s:
            self.warn(where, "Sanskrit is not NFC-normalised")

    def _sutra(self, where: str, ref: str) -> None:
        if ref not in sutra_table():
            self.err(where, f"sūtra {ref} is not in the sūtrapāṭha (or SS.1–SS.14)")

    # course order: prerequisites, coverage ------------------------------------
    def order(self) -> None:
        taught: set[str] = set()
        c = self.d.course
        if c is None:
            return
        pro = self.d.lesson(c.prologue)
        if pro:
            taught |= set(pro.teaches)
        for act_id in c.acts:
            act = self.d.act(act_id)
            if act is None:
                continue
            for part in act.parts:
                for unit_id in part.units:
                    unit = self.d.unit(unit_id)
                    if unit is None:
                        continue
                    seq = list(unit.lessons) + [x for x in (unit.revision, unit.check) if x]
                    for lid in seq:
                        lesson = self.d.lesson(lid)
                        if lesson is None:
                            continue
                        for sid in lesson.needs:
                            if sid not in taught:
                                self.err(self.d.lessons[lid].path, f"needs {sid}, which is not taught before it")
                        taught |= set(lesson.teaches)
                    if unit.reading:
                        reading = self.d.lesson(unit.reading)
                        if reading:
                            for sid in reading.needs:
                                if sid not in taught:
                                    self.err(self.d.lessons[unit.reading].path, f"needs {sid}, which is not taught before it")
                            # Optional readings cannot supply required skills to later units.
                    for p in unit.planned:
                        taught |= set(p.teaches)
                    self._coverage(unit_id)

    def _coverage(self, unit_id: str) -> None:
        unit = self.d.unit(unit_id)
        loc = self.d.units[unit_id]
        if unit is None:
            return
        lessons = [self.d.lesson(l) for l in unit.lessons]
        lessons = [l for l in lessons if l]
        check = self.d.lesson(unit.check) if unit.check else None
        revision = self.d.lesson(unit.revision) if unit.revision else None
        taught = {s for l in lessons for s in l.teaches}
        practised = {s for l in lessons + ([check] if check else []) for c in l.cards
                     if isinstance(c, PracticeCard) for s in c.skills}
        checked = {s for c in (check.cards if check else []) if isinstance(c, PracticeCard) for s in c.skills}
        revised = {r.skill for c in (revision.cards if revision else []) if isinstance(c, RevisionCard)
                   for r in c.rows if r.skill}
        planned = {s for p in unit.planned for s in p.teaches}
        for s in unit.skills:
            if unit.status == "ready":
                if s.id not in taught:
                    self.err(loc.path, f"skill {s.id} is never taught (no lesson teaches it)")
                if s.id not in practised:
                    self.err(loc.path, f"skill {s.id} is never practised")
                if check and s.id not in checked:
                    self.err(loc.path, f"skill {s.id} is not in the unit check")
                if revision and s.id not in revised:
                    self.warn(loc.path, f"skill {s.id} has no row in the revision lesson")
            elif s.id not in taught and s.id not in planned:
                self.warn(loc.path, f"skill {s.id} is in no lesson, written or planned")

    def run(self) -> list[Issue]:
        self.skill_registry()
        self.bible()
        self.structure()
        self.units()
        self.lessons()
        self.order()
        return self.issues


def validate(data: CourseData, release: bool = False) -> list[Issue]:
    return Checker(data, release=release).run()


def errors(issues: list[Issue]) -> list[Issue]:
    return [i for i in issues if i.level == "error"]
