"""Where a learner is in the story, derived from the lessons they finished.

Nothing here is stored: the only fact kept per learner is "lesson X was
finished" (GameResult rows written by POST /progress/card-lesson). From that
and the index, the story state follows:

* a unit is done when all its lessons and its check are finished (the
  revision lesson is reference: open any time, never required);
* its ghost is freed when the unit is done;
* a leaf is recovered when every unit of its part is done;
* the current stop is the first unfinished required lesson in course order
  (prologue → act → part → unit lessons → unit check). A planned unit stops
  the road: the state says ``coming_soon`` with that unit.

Everyone starts at the prologue. A learner who already knows a unit can
finish it faster (the app's "I know this" jumps to a lesson's practice; the
unit check can be taken first and, when passed, the app finishes the unit's
lessons for them), but there is no placement test.
"""

from __future__ import annotations

from typing import Iterable, Optional


def course_order(index: dict) -> list[dict]:
    """Every stop in order: {lesson_id, role, unit_id, act_id}. Planned units
    appear once as role "coming_soon"."""
    out: list[dict] = []
    course = index.get("course") or {}
    pro = course.get("prologue")
    if pro:
        out.append({"lesson_id": pro["id"], "role": "prologue", "unit_id": None, "act_id": None})
    for act in index.get("acts", []):
        for part in act.get("parts", []):
            for unit in part.get("units", []):
                if unit.get("status") != "ready":
                    out.append({"lesson_id": None, "role": "coming_soon", "unit_id": unit["id"], "act_id": act["id"]})
                    continue
                for lesson in unit.get("lessons", []):
                    out.append({"lesson_id": lesson["id"], "role": "lesson", "unit_id": unit["id"], "act_id": act["id"]})
                if unit.get("revision"):
                    out.append({"lesson_id": unit["revision"]["id"], "role": "revision", "unit_id": unit["id"], "act_id": act["id"]})
                if unit.get("check"):
                    out.append({"lesson_id": unit["check"]["id"], "role": "check", "unit_id": unit["id"], "act_id": act["id"]})
    return out


def derive(index: dict, finished: Iterable[str]) -> dict:
    done = set(finished)
    units: dict[str, dict] = {}
    ghosts: list[str] = []
    leaves: list[dict] = []
    acts: list[dict] = []
    for act in index.get("acts", []):
        act_units_done = 0
        act_units_total = 0
        for part in act.get("parts", []):
            part_done = True
            for unit in part.get("units", []):
                act_units_total += 1
                ready = unit.get("status") == "ready"
                required = [l["id"] for l in unit.get("lessons", [])]
                if unit.get("check"):
                    required.append(unit["check"]["id"])
                finished_here = [lid for lid in required if lid in done]
                unit_done = ready and bool(required) and len(finished_here) == len(required)
                units[unit["id"]] = {
                    "status": unit.get("status"),
                    "done": unit_done,
                    "finished": len(finished_here),
                    "total": len(required),
                    "ghost_freed": bool(unit_done and unit.get("ghost")),
                }
                if unit_done:
                    act_units_done += 1
                    if unit.get("ghost"):
                        ghosts.append(unit["ghost"]["id"])
                else:
                    part_done = False
            leaf = part.get("leaf")
            if leaf:
                leaves.append({"id": leaf["id"], "n": leaf["n"], "recovered": part_done and bool(part.get("units"))})
        acts.append({"id": act["id"], "units_done": act_units_done, "units_total": act_units_total})

    current: Optional[dict] = None
    coming_soon: Optional[str] = None
    for stop in course_order(index):
        if stop["role"] == "coming_soon":
            coming_soon = stop["unit_id"]
            break
        if stop["role"] == "revision":
            continue
        if stop["lesson_id"] not in done:
            current = stop
            break
    return {
        "finished": sorted(done & {s["lesson_id"] for s in course_order(index) if s["lesson_id"]}),
        "current": current,
        "coming_soon": coming_soon if current is None else None,
        "units": units,
        "ghosts_freed": ghosts,
        "leaves": leaves,
        "acts": acts,
    }
