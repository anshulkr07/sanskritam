"""Engine checks: every Sanskrit claim and every generated exercise.

Slower than ``validate`` (each claim runs vidyut), so it runs in tests and
in ``python -m app.curriculum check --engine``, never per request.

A claim passes only when the engine itself produces the Sanskrit the learner
sees (the Grammar guide's verifier, optional forms included). Content the
engine cannot derive is not written around: it is cut, or marked for the
scholar's review with no ``check``.
"""

from __future__ import annotations

from typing import Iterator, Optional

from pydantic import ValidationError

from .loader import CourseData, Issue
from .schema import (
    Check, DerivationStepperParams, ExploreCard, PracticeCard, SandhiMixerParams, widget_params,
)
from .validate import walk


def claims(data: CourseData) -> Iterator[tuple[str, str, Check]]:
    """(where, shown Sanskrit, check) for every engine claim in the course."""
    for lid, loc in data.lessons.items():
        lesson = loc.obj
        for path, node in walk(lesson, ""):
            check = getattr(node, "check", None)
            if not isinstance(check, Check):
                continue
            shown: Optional[str] = getattr(node, "sa", None)
            if isinstance(node, PracticeCard):
                shown = node.answers[0] if node.answers else None
            if shown:
                yield f"{loc.path}:{path}", shown, check
        for i, card in enumerate(lesson.cards):
            if not isinstance(card, ExploreCard):
                continue
            try:
                p = widget_params(card)
            except ValidationError:
                continue  # the structure check reports it
            base = f"{loc.path}:cards[{i}]({card.id}).params"
            for path, node in walk(p, base):
                check = getattr(node, "check", None)
                shown = getattr(node, "sa", None)
                if isinstance(check, Check) and shown:
                    yield path, shown, check
            if isinstance(p, SandhiMixerParams):
                for j, pair in enumerate(p.pairs):
                    yield (f"{base}.pairs[{j}]", pair.joined,
                           Check(type="sandhi", first=pair.first, second=pair.second, joined=pair.joined))
            if isinstance(p, DerivationStepperParams):
                yield f"{base}.target", p.target, p.spec
    if data.bible:
        for g in data.bible.ghosts:
            for name in ("freed_line", "clue"):
                line = getattr(g, name)
                if line is not None and line.check is not None:
                    yield f"{data.bible_path}:ghosts.{g.id}.{name}", line.sa, line.check


def check_claims(data: CourseData) -> list[Issue]:
    from app.services.grammar_guide.verify import verify

    issues: list[Issue] = []
    for where, shown, check in claims(data):
        spec = check.model_dump(exclude_none=True)
        try:
            why = verify(spec, shown)
        except Exception as e:  # noqa: BLE001 — a crash is a failed claim, reported
            why = f"engine error: {e}"
        if why:
            issues.append(Issue("error", where, f"{shown}: {why}"))
    return issues


def check_exercises(data: CourseData) -> list[Issue]:
    """Every engine practice must generate a real item (never an abstention)
    with an answer the server can grade."""
    from app.services import exercise_gen

    issues: list[Issue] = []
    for lid, loc in data.lessons.items():
        for i, card in enumerate(loc.obj.cards):
            if not isinstance(card, PracticeCard) or card.mode != "engine" or card.exercise is None:
                continue
            ex = card.exercise
            where = f"{loc.path}:cards[{i}]({card.id})"
            try:
                item = exercise_gen.generate(ex.kind, ex.params, ex.seed)
                answer = exercise_gen.correct_answer(ex.kind, ex.params, ex.seed)
            except Exception as e:  # noqa: BLE001
                issues.append(Issue("error", where, f"exercise {ex.kind} failed: {e}"))
                continue
            if item.get("abstained") or answer is None:
                issues.append(Issue("error", where, f"exercise {ex.kind} {ex.params} seed {ex.seed}: the engine made nothing"))
    return issues


def check_widgets(data: CourseData) -> list[Issue]:
    """Every explore card's engine inputs (grids, derivations, scans) must be
    makeable: what ships is exactly what the engine made."""
    from .widgets import compute

    issues: list[Issue] = []
    for lid, loc in data.lessons.items():
        for i, card in enumerate(loc.obj.cards):
            if not isinstance(card, ExploreCard):
                continue
            where = f"{loc.path}:cards[{i}]({card.id})"
            try:
                _, problems = compute(card)
            except ValidationError:
                continue  # the structure check reports it
            except Exception as e:  # noqa: BLE001
                issues.append(Issue("error", where, f"{card.widget} failed: {e}"))
                continue
            issues += [Issue("error", where, f"{card.widget}: {m}") for m in problems]
    return issues


def run(data: CourseData) -> list[Issue]:
    return check_claims(data) + check_exercises(data) + check_widgets(data)
