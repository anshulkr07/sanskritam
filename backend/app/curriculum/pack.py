"""Build what the app downloads: one small index and one payload per lesson.

* IAST is added beside every Sanskrit string from lipi (never typed).
* Sūtra numbers become ``{ref, sa, iast}`` from the engine's sūtrapāṭha.
* Engine claims (``check``) are server-only and are removed.
* Engine exercises are generated here, once, with their answers, so a card
  works offline and every shipped item is one the engine could make.
* Explore cards ship their widget's params plus what the engine supplies
  (``widgets.compute``): places, grids, derivations, scans and an IAST map.
* Typed answers gain their pause variants (final ं ↔ म्, ः ↔ स्/र्), so the
  app can grade locally without second-guessing Sanskrit.
* Pictures resolve to delivered files when the image agent has delivered
  them; until then the card says ``delivered: false`` and the app shows the
  plain paper placeholder.

Only shippable lessons are served: the prologue, leaf tales, and lessons of
units whose status is ``ready``. A planned unit appears in the index (title,
skills, planned lesson titles) so the map can show the road ahead.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Optional

from .loader import CourseData
from .schema import ExploreCard, ImageRef, Lesson, PracticeCard
from .validate import sutra_table

#: Sanskrit key → the key its IAST is shipped under.
SA_KEYS = {"sa": "iast", "title_sa": "title_iast", "name_sa": "name_iast", "formula": "formula_iast"}
SA_LIST_KEYS = ("answers", "tokens", "tiles")


def _iast(s: str) -> str:
    from app.services.iast import to_iast

    return to_iast(s)


def _variants(answer: str) -> list[str]:
    from app.services.grammar_guide.model import pause_form, visarga_form

    out = [answer]
    for f in (pause_form(answer), visarga_form(answer)):
        if f and f not in out:
            out.append(f)
    if answer.endswith("म्"):
        alt = answer[:-2] + "ं"
        if alt not in out:
            out.append(alt)
    return out


def _sutras(refs: list[str]) -> list[dict]:
    table = sutra_table()
    out = []
    for ref in refs:
        sa = table.get(ref, "")
        out.append({"ref": ref, "sa": sa, "iast": _iast(sa) if sa else ""})
    return out


def _decorate(node: Any) -> Any:
    """Add IAST, resolve sūtras, drop engine claims — recursively."""
    if isinstance(node, list):
        return [_decorate(v) for v in node]
    if not isinstance(node, dict):
        return node
    out: dict[str, Any] = {}
    for k, v in node.items():
        if k == "check" and isinstance(v, dict) and "type" in v:
            continue  # an engine claim; a unit's check lesson (or its null) is kept
        if k == "sutras" and isinstance(v, list) and all(isinstance(x, str) for x in v):
            out[k] = _sutras(v)
            continue
        out[k] = _decorate(v)
    for key, iast_key in SA_KEYS.items():
        if isinstance(out.get(key), str) and out[key] and iast_key not in out:
            out[iast_key] = _iast(out[key])
    for key in SA_LIST_KEYS:
        if isinstance(out.get(key), list) and out[key] and all(isinstance(x, str) for x in out[key]):
            out[f"{key}_iast"] = [_iast(x) for x in out[key]]
    return out


def _image(img: Optional[dict], data: CourseData) -> Optional[dict]:
    """What the app needs to show a picture: never the brief or the prompt."""
    if isinstance(img, ImageRef):
        img = img.model_dump()
    if not img:
        return None
    d = data.deliveries.get(img["id"])
    shown = {"id": img["id"], "alt": img["alt"], "ratio": img.get("ratio", "4:3"), "delivered": d is not None}
    if d is not None:
        shown.update({"phone": d.phone, "tablet": d.tablet, "width": d.width, "height": d.height})
    return shown


def _exercise(card: PracticeCard) -> Optional[dict]:
    from app.services import exercise_gen

    ex = card.exercise
    if ex is None:
        return None
    item = exercise_gen.generate(ex.kind, ex.params, ex.seed)
    answer = exercise_gen.correct_answer(ex.kind, ex.params, ex.seed)
    return {"kind": ex.kind, "params": ex.params, "seed": ex.seed, "item": item, "answer": answer}


def lesson_payload(lesson: Lesson, data: CourseData) -> dict:
    cards = []
    for card in lesson.cards:
        raw = card.model_dump(exclude_none=True, exclude_defaults=False)
        raw["image"] = _image(raw.get("image"), data)
        if raw["image"] is None:
            raw.pop("image")
        if isinstance(card, ExploreCard):
            from .widgets import compute

            raw["params"], _problems = compute(card)  # problems: engine.check_widgets
        if isinstance(card, PracticeCard):
            if card.mode == "engine":
                raw["exercise"] = _exercise(card)
            if card.mode == "type":
                raw["accept"] = sorted({v for a in card.answers for v in _variants(a)})
        cards.append(_decorate(raw))
    body = {
        "id": lesson.id,
        "template": lesson.template,
        "title": lesson.title.model_dump(),
        "title_sa": lesson.title_sa,
        "minutes": lesson.minutes,
        "teaches": lesson.teaches,
        "needs": lesson.needs,
        "review": lesson.review,
        "sources": [s.model_dump(exclude_none=True) for s in lesson.sources],
    }
    body = _decorate(body)
    body["cards"] = cards
    body["hash"] = _hash(body)
    return body


def _hash(obj: Any) -> str:
    raw = json.dumps(obj, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def _summary(lesson: Optional[Lesson], payload: Optional[dict]) -> Optional[dict]:
    if lesson is None or payload is None:
        return None
    practice = sum(1 for c in lesson.cards if c.kind in ("practice", "explore") and c.depth == "core")
    return {
        "id": lesson.id,
        "template": lesson.template,
        "title": lesson.title.model_dump(),
        "title_sa": lesson.title_sa,
        "title_iast": _iast(lesson.title_sa) if lesson.title_sa else None,
        "minutes": lesson.minutes,
        "cards": len(lesson.cards),
        "practice": practice,
        "hash": payload["hash"],
    }


@dataclass
class Pack:
    version: str
    index: dict
    lessons: dict[str, dict] = field(default_factory=dict)


def build(data: CourseData) -> Pack:
    """The index plus every shippable lesson. Never raises on a missing
    reference: validation reports those; the pack simply leaves them out."""
    c = data.course
    b = data.bible
    lessons: dict[str, dict] = {}

    def ship(lesson_id: Optional[str]) -> Optional[dict]:
        if not lesson_id:
            return None
        lesson = data.lesson(lesson_id)
        if lesson is None:
            return None
        if lesson_id not in lessons:
            lessons[lesson_id] = lesson_payload(lesson, data)
        return _summary(lesson, lessons[lesson_id])

    ghosts = {g.id: g for g in (b.ghosts if b else [])}
    characters = {ch.id: ch for ch in (b.characters if b else [])}
    places = {p.id: p for p in (b.places if b else [])}
    leaves = {leaf.id: leaf for leaf in (b.leaves if b else [])}

    def ghost(gid: Optional[str]) -> Optional[dict]:
        g = ghosts.get(gid or "")
        ch = characters.get(gid or "")
        if g is None or ch is None:
            return None
        return _decorate({
            "id": g.id, "name_sa": ch.name_sa, "name": ch.name.model_dump(),
            "waits_for": g.waits_for.model_dump(),
            "freed_line": g.freed_line.model_dump(exclude_none=True),
            "clue": g.clue.model_dump(exclude_none=True) if g.clue else None,
            "portrait": _image(ch.portrait, data),
            "freed_image": _image(g.freed_image, data),
        })

    def unit_summary(unit_id: str) -> Optional[dict]:
        unit = data.unit(unit_id)
        if unit is None:
            return None
        ready = unit.status == "ready"
        return _decorate({
            "id": unit.id,
            "title": unit.title.model_dump(),
            "title_sa": unit.title_sa,
            "status": unit.status,
            # The story so far, for learners; the beats are the authors' plot
            # outline (spoilers) and stay on the server.
            "episode": {"summary": unit.episode.summary.model_dump()},
            "ghost": ghost(unit.ghost),
            "skills": [{"id": s.id, "title": s.title.model_dump(), "sutras": s.sutras} for s in unit.skills],
            "lessons": [x for x in (ship(l) if ready else None for l in unit.lessons) if x],
            "planned": [{"id": p.id, "title": p.title.model_dump()} for p in unit.planned]
                       + ([] if ready else [{"id": l, "title": data.lesson(l).title.model_dump()}
                                            for l in unit.lessons if data.lesson(l)]),
            "revision": ship(unit.revision) if ready else None,
            "check": ship(unit.check) if ready else None,
            "video": unit.video.model_dump(exclude_none=True) if unit.video else None,
        })

    acts = []
    for act_id in (c.acts if c else []):
        act = data.act(act_id)
        if act is None:
            continue
        place = places.get(act.place)
        parts = []
        for part in act.parts:
            leaf = leaves.get(part.leaf)
            parts.append({
                "leaf": _decorate({
                    "id": leaf.id, "n": leaf.n, "title": leaf.title.model_dump(), "title_sa": leaf.title_sa,
                    "about": leaf.about.model_dump(), "tale": ship(leaf.tale),
                    "image": _image(leaf.image, data),
                }) if leaf else None,
                "units": [u for u in (unit_summary(uid) for uid in part.units) if u],
            })
        acts.append(_decorate({
            "id": act.id, "n": act.n, "title": act.title.model_dump(), "title_sa": act.title_sa,
            "goal": act.goal.model_dump(), "color": act.color,
            "place": {"id": place.id, "name_sa": place.name_sa, "name": place.name.model_dump()} if place else None,
            "map": _image(act.map, data),
            "parts": parts,
        }))

    surviving = [leaf for leaf in leaves.values() if not any(
        p.leaf == leaf.id for a in (data.act(x) for x in (c.acts if c else [])) if a for p in a.parts)]
    index = {
        "course": _decorate({
            "id": c.id, "title": c.title.model_dump(), "title_sa": c.title_sa,
            "prologue": ship(c.prologue),
        }) if c else None,
        "acts": acts,
        "finale_leaves": [_decorate({
            "id": leaf.id, "n": leaf.n, "title": leaf.title.model_dump(), "title_sa": leaf.title_sa,
            "about": leaf.about.model_dump(), "tale": ship(leaf.tale),
            "image": _image(leaf.image, data),
        }) for leaf in sorted(surviving, key=lambda x: x.n)],
        "characters": [_decorate({"id": ch.id, "name_sa": ch.name_sa, "name": ch.name.model_dump(),
                                  "kind": ch.kind, "role": ch.role.model_dump(),
                                  "portrait": _image(ch.portrait, data)})
                       for ch in characters.values()],
    }
    version = "learn-" + _hash({"index": index, "lessons": sorted((k, v["hash"]) for k, v in lessons.items())})
    index["version"] = version
    return Pack(version=version, index=index, lessons=lessons)
