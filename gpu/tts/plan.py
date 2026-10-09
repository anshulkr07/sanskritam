"""Reseed planning (torch-free so CPU tests can import it)."""

from __future__ import annotations

import json


def plan_reseeds(qc_path: str, reseeds: list[int]) -> dict[tuple, list[int]]:
    """Map (verse_uid, line_i, part_j) -> seeds still untried for flagged parts.

    Reads qc.jsonl rows {verse_uid, line_i, part_j, seed, flags}.
    A part is done when one take has no flags or every seed was tried.
    """
    tried: dict[tuple, set[int]] = {}
    clean: set[tuple] = set()
    with open(qc_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            key = (r.get("verse_uid"), r.get("line_i"), r.get("part_j"))
            tried.setdefault(key, set()).add(int(r.get("seed", 0)))
            if not r.get("flags"):
                clean.add(key)
    plan: dict[tuple, list[int]] = {}
    for key, seeds in tried.items():
        if key in clean:
            continue
        remaining = [s for s in reseeds if s not in seeds]
        if remaining:
            plan[key] = remaining
    return plan
