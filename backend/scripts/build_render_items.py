"""Build a render item-file from the seeded dialogue graph (§12 pre-render pass).

Writes a JSON list of {id, text, lang} for every speakable node in
``app.seeds.dialogue.SCENARIO`` — the node's devanagari line, tagged with the
node language (sa/hi). Bridge turns are pre-rendered with the same engine per
§12, so hi nodes go through Bulbul too.

Placeholder nodes (no speakable content — currently only ``nterm`` "...") are
excluded and reported.

Usage::

    python scripts/build_render_items.py [--out results/sarvam/dialogue_nodes.json]

Exit codes: 0 ok · 1 build failure
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.seeds.dialogue import SCENARIO  # noqa: E402

PLACEHOLDER_IDS = {"nterm"}  # "..." — no speakable content


def build_items() -> tuple[list[dict], list[str]]:
    items: list[dict] = []
    skipped: list[str] = []
    for node in SCENARIO["nodes"]:
        nid = node["id"]
        text = (node.get("devanagari") or "").strip()
        if nid in PLACEHOLDER_IDS or not text:
            skipped.append(nid)
            continue
        items.append({"id": nid, "text": text, "lang": node["lang"]})
    return items, skipped


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Dialogue-graph render item-file builder")
    p.add_argument("--out", default="results/sarvam/dialogue_nodes.json")
    args = p.parse_args(argv)

    items, skipped = build_items()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"wrote {len(items)} items → {out}")
    if skipped:
        print(f"skipped placeholders: {', '.join(skipped)}")
    langs: dict[str, int] = {}
    for it in items:
        langs[it["lang"]] = langs.get(it["lang"], 0) + 1
    print("lang mix:", ", ".join(f"{k}={v}" for k, v in sorted(langs.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
