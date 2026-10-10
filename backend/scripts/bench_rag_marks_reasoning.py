"""Marks for the thinking-on answers (answers_reasoning/), written blind.

    .venv/Scripts/python.exe scripts/bench_rag_marks_reasoning.py add A05 '{"A": ["C", [], "why"]}'
    .venv/Scripts/python.exe scripts/bench_rag_marks_reasoning.py todo

With --control the marks are for the plain-model controls (answers_control/,
review_control/, marks_control.json).

The letters are per question (review_reasoning/<case>.md); this stores the
mark under "<variant>|<case>" using review_reasoning/_mapping.json, which is
not read until marking is done (add reads it only to file the mark).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "results" / "rag_full_20261009"
KIND = "reasoning"
if "--control" in sys.argv:
    KIND = "control"
    sys.argv.remove("--control")
if "--kind" in sys.argv:
    _i = sys.argv.index("--kind")
    KIND = sys.argv[_i + 1]
    del sys.argv[_i:_i + 2]
MARKS = OUT / f"marks_{KIND}.json"
FLAGS = {"INV", "SKT", "INJ", "LANG", "CARD", "BOOK", "FACT"}


def load() -> dict:
    return json.loads(MARKS.read_text(encoding="utf-8")) if MARKS.exists() else {}


def add(case: str, payload: str) -> None:
    mapping = json.loads((OUT / f"review_{KIND}" / "_mapping.json").read_text(encoding="utf-8"))[case]
    marks = load()
    new = json.loads(payload)
    for letter, (verdict, flags, why) in new.items():
        assert verdict in ("C", "P", "W"), (letter, verdict)
        assert set(flags) <= FLAGS, (letter, flags)
        assert why.strip(), letter
        marks[f"{mapping[letter]}|{case}"] = [verdict, flags, why]
    MARKS.write_text(json.dumps(marks, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{case}: {len(new)} marked, {len(marks)} in all")


def todo() -> None:
    marks = load()
    mapping = json.loads((OUT / f"review_{KIND}" / "_mapping.json").read_text(encoding="utf-8"))
    left = [c for c, d in mapping.items() if any(f"{lb}|{c}" not in marks for lb in d.values())]
    print(f"{len(left)} questions with unmarked answers: {left}")


if __name__ == "__main__":
    if sys.argv[1] == "add":
        add(sys.argv[2], sys.argv[3])
    else:
        todo()
