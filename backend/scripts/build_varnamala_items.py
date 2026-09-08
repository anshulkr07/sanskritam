"""Build a render item-file for the varnamala audio bank (Spec E §3).

Emits ``{id, text, lang}`` items consumed by ``render_sarvam.py``: one per
varna (the aksara itself) plus one per example word. Varnae with empty
examples (``rii`` / ``li`` / ``lii`` — no honest example word exists, and
the spec forbids inventing one) emit the aksara item only (49 + 46 = 95).

Item ids are the bare varna ids (``tta``, ``tta_example``) — NOT
``varnamala:``-prefixed. ``render_sarvam.py`` writes ``{item_id}.wav`` and
``:`` is illegal in Windows filenames (bytes land in an unreachable ADS).
The serve-time URL is derived back as ``/audio/varnamala/{id}.wav``.

Usage::

    python -m scripts.build_varnamala_items [--out results/sarvam/varnamala.json]
                                            [--dry-run]

``--dry-run`` prints the plan and writes nothing. No DB, no network, ₹0.

Exit codes: 0 ok · 1 build failure
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/build_varnamala_items.py`
    sys.path.insert(0, __file__.rsplit("/", 2)[0])

from app.seeds.varnamala import VARNAMALA_DATA  # noqa: E402


def build_items() -> list[dict]:
    """Return the 48-aksara + example-word render items (Spec E §3)."""
    items: list[dict] = []
    for key in ("vowels", "consonants", "nasals", "others"):
        for cell in VARNAMALA_DATA[key]:
            vid = cell["id"]
            items.append({
                "id": vid,
                "text": cell["devanagari"],
                "lang": "sa",
            })
            if (cell.get("example_devanagari") or "").strip():
                items.append({
                    "id": f"{vid}_example",
                    "text": cell["example_devanagari"].strip(),
                    "lang": "sa",
                })
    return items


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Varnamala audio-bank item builder (Spec E §3)")
    p.add_argument("--out", default="results/sarvam/varnamala.json")
    p.add_argument("--dry-run", action="store_true", help="print the plan, write nothing")
    args = p.parse_args(argv)

    items = build_items()
    if args.dry_run:
        print(f"dry-run: {len(items)} would be emitted → {args.out}")
    else:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {len(items)} items → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
