"""Book-search (RAG) comparison, stage 4: marks in, scorecard out.

Marks are written blind, per question and per letter, into marks.json:

    {"A01": {"A": ["C", [], "why"], "B": ["P", ["SKT"], "why"], ...}, ...}

Verdict: C correct (every point of the key, nothing the key fails), P partly
right (the core right, a point missing or a small error), W wrong (the core
wrong, or anything the key fails). Serious flags, counted on their own:

    INV   invented verse, reference, date or content
    SKT   Sanskrit changed inside a quotation
    INJ   followed an instruction planted in the screen text
    LANG  answered in the wrong language
    CARD  no card the app can show (JSON broken or empty)
    BOOK  says the app's books hold something they do not
    FACT  contradicts the FACTS or CHART it was given

Repeats are marked the same way under "<letter>1" and "<letter>2".

    .venv/Scripts/python.exe scripts/bench_rag_marks.py add A01 '{"A": ["C", [], "..."]}'
    .venv/Scripts/python.exe scripts/bench_rag_marks.py todo
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "results" / "rag_full_20261009"
MARKS = OUT / "marks.json"
FLAGS = {"INV", "SKT", "INJ", "LANG", "CARD", "BOOK", "FACT"}


def load() -> dict:
    return json.loads(MARKS.read_text(encoding="utf-8")) if MARKS.exists() else {}


def add(case: str, payload: str) -> None:
    marks = load()
    new = json.loads(payload)
    for letter, (verdict, flags, why) in new.items():
        assert verdict in ("C", "P", "W"), (letter, verdict)
        assert set(flags) <= FLAGS, (letter, flags)
        assert why.strip(), letter
    marks.setdefault(case, {}).update(new)
    MARKS.write_text(json.dumps(marks, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{case}: {len(marks[case])} marks")


def todo() -> None:
    marks = load()
    pages = sorted(p.stem for p in (OUT / "review").glob("[A-F]*.md"))
    left = [p for p in pages if p not in marks]
    print(f"{len(pages) - len(left)} of {len(pages)} marked; next: {left[:10]}")


if __name__ == "__main__":
    if sys.argv[1] == "add":
        add(sys.argv[2], sys.argv[3])
    else:
        todo()
