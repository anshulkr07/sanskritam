"""Reseed planning (torch-free so CPU tests can import it)."""

from __future__ import annotations

import json


def plan_reseeds(
    qc_path: str, reseeds: list[int], only_flags: set[str] | None = None
) -> dict[tuple, list[int]]:
    """Map (verse_uid, line_i, part_j) -> seeds still untried for flagged parts.

    Reads qc.jsonl rows {verse_uid, line_i, part_j, seed, flags}.
    A part is done when one take has no flags or every seed was tried.

    only_flags limits the plan to parts carrying one of those flags. A new seed
    changes what the model says (cer, repeats), not how long it takes or where
    it pauses: measured 2026-10-09 on 80 reseeded parts, a reseed made 32 of 49
    cer-flagged parts clean and 0 of 31 pause or length-flagged ones.
    """
    tried: dict[tuple, set[int]] = {}
    seen_flags: dict[tuple, set[str]] = {}
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
            seen_flags.setdefault(key, set()).update(r.get("flags") or [])
    plan: dict[tuple, list[int]] = {}
    for key, seeds in tried.items():
        if key in clean:
            continue
        if only_flags is not None and not (seen_flags.get(key, set()) & set(only_flags)):
            continue
        remaining = [s for s in reseeds if s not in seeds]
        if remaining:
            plan[key] = remaining
    return plan
