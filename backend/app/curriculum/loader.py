"""Read the content tree into blueprint objects, keeping each one's file.

Layout (``backend/app/curriculum/content/``)::

    course.yaml                       Course
    bible.yaml                        Bible (characters, places, ghosts, leaves)
    images/deliveries.yaml            list of ImageDelivery (optional)
    prologue/<lesson-id>.yaml         the prologue lesson
    tales/<lesson-id>.yaml            leaf tales (template "tale")
    acts/<act-id>/act.yaml            Act
    acts/<act-id>/<unit-id>/unit.yaml Unit
    acts/<act-id>/<unit-id>/<lesson-id>.yaml   Lesson (file name = lesson id)

Nothing here judges the content; ``validate`` does. Load problems (bad
YAML, a shape that does not fit its blueprint) become issues with the file
name, so one run reports every broken file instead of stopping at the first.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml
from pydantic import ValidationError

from .audio import load_deliveries as load_audio_deliveries
from .schema import Act, Bible, Course, ImageDelivery, Lesson, Unit

CONTENT_DIR = Path(__file__).with_name("content")


@dataclass
class Issue:
    level: str  # "error" | "warning"
    where: str  # file (and a path inside it)
    message: str

    def __str__(self) -> str:
        return f"{self.level.upper():7} {self.where}: {self.message}"


@dataclass
class Located:
    obj: object
    path: str


@dataclass
class CourseData:
    root: Path
    course: Optional[Course] = None
    course_path: str = ""
    bible: Optional[Bible] = None
    bible_path: str = ""
    acts: dict[str, Located] = field(default_factory=dict)
    units: dict[str, Located] = field(default_factory=dict)
    unit_act: dict[str, str] = field(default_factory=dict)
    lessons: dict[str, Located] = field(default_factory=dict)
    deliveries: dict[str, object] = field(default_factory=dict)
    audio: dict[str, dict] = field(default_factory=dict)  # clip key → delivery (content/audio/deliveries.json)
    issues: list[Issue] = field(default_factory=list)

    def lesson(self, lesson_id: str) -> Optional[Lesson]:
        hit = self.lessons.get(lesson_id)
        return hit.obj if hit else None  # type: ignore[return-value]

    def unit(self, unit_id: str) -> Optional[Unit]:
        hit = self.units.get(unit_id)
        return hit.obj if hit else None  # type: ignore[return-value]

    def act(self, act_id: str) -> Optional[Act]:
        hit = self.acts.get(act_id)
        return hit.obj if hit else None  # type: ignore[return-value]


def _rel(root: Path, p: Path) -> str:
    try:
        return p.relative_to(root).as_posix()
    except ValueError:
        return p.as_posix()


def _read(path: Path, data: CourseData) -> Optional[object]:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        data.issues.append(Issue("error", _rel(data.root, path), f"YAML: {e}"))
        return None


def _shape(model, raw, path: Path, data: CourseData):
    try:
        return model.model_validate(raw)
    except ValidationError as e:
        for err in e.errors():
            loc = ".".join(str(x) for x in err.get("loc", ()))
            data.issues.append(Issue("error", f"{_rel(data.root, path)}:{loc}", err.get("msg", "invalid")))
        return None


def load(root: Path = CONTENT_DIR) -> CourseData:
    data = CourseData(root=root)
    if not root.exists():
        data.issues.append(Issue("error", str(root), "content folder missing"))
        return data

    course_p = root / "course.yaml"
    raw = _read(course_p, data) if course_p.exists() else None
    if raw is None:
        data.issues.append(Issue("error", "course.yaml", "missing or unreadable"))
    else:
        data.course = _shape(Course, raw, course_p, data)
        data.course_path = _rel(root, course_p)

    bible_p = root / "bible.yaml"
    raw = _read(bible_p, data) if bible_p.exists() else None
    if raw is None:
        data.issues.append(Issue("error", "bible.yaml", "missing or unreadable"))
    else:
        data.bible = _shape(Bible, raw, bible_p, data)
        data.bible_path = _rel(root, bible_p)

    deliveries_p = root / "images" / "deliveries.yaml"
    if deliveries_p.exists():
        raw = _read(deliveries_p, data) or []
        for i, item in enumerate(raw if isinstance(raw, list) else []):
            d = _shape(ImageDelivery, item, deliveries_p, data)
            if d is not None:
                if d.id in data.deliveries:
                    data.issues.append(Issue("error", _rel(root, deliveries_p), f"image {d.id} delivered twice"))
                data.deliveries[d.id] = d

    data.audio = load_audio_deliveries(root / "audio" / "deliveries.json")

    for path in sorted(root.rglob("*.yaml")):
        rel = _rel(root, path)
        name = path.name
        if path in (course_p, bible_p, deliveries_p):
            continue
        raw = _read(path, data)
        if raw is None:
            continue
        if name == "act.yaml":
            act = _shape(Act, raw, path, data)
            if act is not None:
                if act.id in data.acts:
                    data.issues.append(Issue("error", rel, f"act id {act.id} also in {data.acts[act.id].path}"))
                data.acts[act.id] = Located(act, rel)
                if path.parent.name != act.id:
                    data.issues.append(Issue("error", rel, f"folder name must be the act id {act.id}"))
            continue
        if name == "unit.yaml":
            unit = _shape(Unit, raw, path, data)
            if unit is not None:
                if unit.id in data.units:
                    data.issues.append(Issue("error", rel, f"unit id {unit.id} also in {data.units[unit.id].path}"))
                data.units[unit.id] = Located(unit, rel)
                data.unit_act[unit.id] = path.parent.parent.name
                if path.parent.name != unit.id:
                    data.issues.append(Issue("error", rel, f"folder name must be the unit id {unit.id}"))
            continue
        lesson = _shape(Lesson, raw, path, data)
        if lesson is None:
            continue
        if lesson.id in data.lessons:
            data.issues.append(Issue("error", rel, f"lesson id {lesson.id} also in {data.lessons[lesson.id].path}"))
        if path.stem != lesson.id:
            data.issues.append(Issue("error", rel, f"file name must be the lesson id ({lesson.id}.yaml)"))
        data.lessons[lesson.id] = Located(lesson, rel)
    return data
