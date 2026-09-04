"""Build a render item-file from APPROVED scenarios in the DB (P17-1).

Previously read the one hardcoded seed scenario (``app.seeds.dialogue.SCENARIO``,
30 nodes), so it could not see the 70 authored nodes in the DB and silently
covered a third of the graph — the §2.11 failure shape (a correct-looking run
that does less than you think).

This builder now queries ``DialogueNode`` joined to scenarios whose
``review_status == "approved"`` and emits every speakable, unrendered node.

Emitted shape (unchanged, consumed by ``render_sarvam.py``): ``{id, text,
lang}`` where ``id`` is the DB ``DialogueNode.id`` so the render pass can write
a WAV URL straight back to that row.

Usage::

    python -m scripts.build_render_items [--out results/sarvam/dialogue_nodes.json]
                                         [--dry-run]

``--dry-run`` prints the plan and writes nothing.

Exit codes: 0 ok · 1 build failure
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/build_render_items.py`
    sys.path.insert(0, __file__.rsplit("/", 2)[0])

from sqlalchemy.orm import Session  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import DialogueNode, DialogueScenario  # noqa: E402


def build_items(db: Session) -> dict:
    """Return {items, skipped_placeholder, skipped_rendered} for approved nodes.

    Nodes are pulled from the DB so the pass never silently covers only part
    of the authored graph (§2.11). Placeholder nodes (``nterm`` or empty
    Devanagari) and already-rendered nodes (non-empty ``audio_url``) are
    skipped and reported distinctly.
    """
    node_rows = (
        db.query(DialogueNode)
        .join(DialogueScenario, DialogueNode.scenario_id == DialogueScenario.id)
        .filter(DialogueScenario.review_status == "approved")
        .order_by(DialogueNode.scenario_id, DialogueNode.sort)
        .all()
    )

    items: list[dict] = []
    skipped_placeholder: list[str] = []
    skipped_rendered: list[str] = []

    seen: set[str] = set()
    for n in node_rows:
        if n.id in seen:  # defensive: a node should belong to one scenario
            continue
        seen.add(n.id)
        text = (n.devanagari or "").strip()
        is_placeholder = (
            (not text)
            or n.id.endswith("nterm")
            or text in ("...", "।।")   # terminal marker nodes
        )
        if is_placeholder:
            skipped_placeholder.append(n.id)
            continue
        if (n.audio_url or "").strip():
            skipped_rendered.append(n.id)  # re-rendering spends money for nothing
            continue
        items.append({"id": n.id, "text": text, "lang": n.lang})

    return {"items": items, "skipped_placeholder": skipped_placeholder,
            "skipped_rendered": skipped_rendered}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Dialogue-graph render item-file builder (P17-1)")
    p.add_argument("--out", default="results/sarvam/dialogue_nodes.json")
    p.add_argument("--dry-run", action="store_true", help="print the plan, write nothing")
    args = p.parse_args(argv)

    db = SessionLocal()
    try:
        plan = build_items(db)
    finally:
        db.close()

    items, ph, rendered = plan["items"], plan["skipped_placeholder"], plan["skipped_rendered"]

    if args.dry_run:
        print(f"dry-run: {len(items)} would be emitted → {args.out}")
    else:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {len(items)} items → {args.out}")
    if ph:
        print(f"skipped placeholders: {len(ph)}")
    if rendered:
        print(f"skipped already-rendered: {len(rendered)}")
    langs: dict[str, int] = {}
    for it in items:
        langs[it["lang"]] = langs.get(it["lang"], 0) + 1
    print("lang mix:", ", ".join(f"{k}={v}" for k, v in sorted(langs.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())