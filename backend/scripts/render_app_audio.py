"""P17-2: render approved-scenario node audio and write audio_url to the DB.

Extends scripts/render_sarvam.py (which only writes WAVs + a manifest) by
wiring the render pass to the storage abstraction and the database:

  1. Build the render item file from APPROVED scenarios (P17-1 build_items —
     already-rendered and placeholder nodes are skipped and reported).
  2. Render each node through Sarvam Bulbul v3.
  3. Store each WAV via app.services.storage (local CDN-ready backend).
  4. Write the returned URL back to DialogueNode.audio_url.

Budget: TTS bills ₹30/10K chars (architecture.md §4.1). This is the P17
pre-render pass the owner approved inside the ~₹47 P7 envelope. A re-render
of already-rendered nodes is NOT approved — build_items skips them.

Usage:
    python -m scripts.render_app_audio --dry-run          # plan + estimate, ₹0
    python -m scripts.render_app_audio --live             # render + store + write DB
    python -m scripts.render_app_audio --live --sa-language sa-IN

Exit codes: 0 ok · 1 render/store failure · 2 invalid plan / no key
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models import Challenge, DialogueNode  # noqa: E402
from app.services.storage import get_storage  # noqa: E402
from app.services.sarvam import SarvamClient  # noqa: E402
from scripts.build_render_items import build_challenge_items, build_items  # noqa: E402

logger = logging.getLogger("shabd.render_app_audio")

DEFAULT_SPEAKER = "aditya"
MODEL = "bulbul:v3"
# What every file rendered so far actually is: Bulbul never received the old
# 24000 (wrong field name, fixed 2026-09-23 in services/sarvam.py) and
# answered with its 22050 default. Honoured now, so it must say 22050.
SAMPLE_RATE = 22050
COST_PER_CHAR = 0.003  # ₹30/10K chars (architecture.md §4.1)


def _lang_code(lang: str, sa_language: str) -> str:
    if lang == "en":
        return "en-IN"
    if lang == "sa":
        return sa_language
    return "hi-IN"


def estimate(items: list[dict]) -> dict:
    chars = sum(len(str(it.get("text", ""))) for it in items)
    return {
        "n_items": len(items),
        "chars": chars,
        "est_cost_rs": round(chars * COST_PER_CHAR, 2),
    }


async def render_one(client: SarvamClient, item: dict, sa_language: str):
    """Render one item via Sarvam → (wav_bytes, error). Never raises."""
    text = str(item.get("text", ""))
    lang = str(item.get("lang", "sa"))
    try:
        audio_b64 = await client.text_to_speech(
            text=text,
            language_code=_lang_code(lang, sa_language),
            speaker=DEFAULT_SPEAKER,
            model=MODEL,
            sample_rate=SAMPLE_RATE,
        )
        return base64.b64decode(audio_b64), None
    except Exception as exc:
        return None, f"{type(exc).__name__}: {exc}"


async def _run(items: list[dict], sa_language: str, model) -> list[tuple[dict, str | None]]:
    """Render each item, returning (item, url_or_error).

    ``model`` is the SQLAlchemy class whose row owns the ``audio_url`` we write
    back — DialogueNode for the graph pass, Challenge for the challenge pass
    (P17-4). The WAV filesystem prefix is ``dialogue/`` or ``challenge/`` so
    the two pools never collide.
    """
    client = SarvamClient(api_key=settings.sarvam_api_key)
    storage = get_storage()
    prefix = "challenge" if model is Challenge else "dialogue"
    outcomes: list[tuple[dict, str | None]] = []
    try:
        for item in items:
            node_id = str(item.get("id", "?"))
            wav, err = await render_one(client, item, sa_language)
            if err is not None:
                outcomes.append((item, err))
                continue
            # Store the WAV; keep the pool prefix so ids cannot collide.
            path = f"{prefix}/{node_id}.wav"
            storage.store(wav, path)
            # The SERVABLE URL is storage.url(path), not store()'s raw local
            # path — the client fetches /audio/<path> and must never receive a
            # server filesystem path (that is a §2.11 leak shape).
            url = storage.url(path)
            # Write the URL back to the row.
            db = SessionLocal()
            try:
                row = db.query(model).filter(model.id == node_id).first()
                if row is None:
                    outcomes.append((item, f"{model.__tablename__} {node_id} not found in DB"))
                    continue
                row.audio_url = url
                db.commit()
            finally:
                db.close()
            outcomes.append((item, url))
    finally:
        await client.close()
    return outcomes


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Approved-audio render + store + DB write (dialogue P17-2, challenges P17-4)"
    )
    p.add_argument("--challenges", action="store_true",
                   help="render APPROVED challenges instead of dialogue nodes")
    p.add_argument("--register", default=None, help="filter challenges by register (laukika|classical)")
    p.add_argument("--live", action="store_true", help="render, store, and write audio_url (default: dry-run)")
    p.add_argument("--dry-run", action="store_true", help="print plan + estimate, spend nothing")
    p.add_argument("--sa-language", default="hi-IN", help="language_code for sa items (hi-IN default, sa-IN beta)")
    args = p.parse_args(argv)

    if args.sa_language not in ("hi-IN", "sa-IN"):
        print(f"invalid --sa-language {args.sa_language!r} (expected hi-IN or sa-IN)", file=sys.stderr)
        return 2
    if args.register and not args.challenges:
        print("--register is only valid with --challenges", file=sys.stderr)
        return 2

    db = SessionLocal()
    try:
        if args.challenges:
            plan = build_challenge_items(db, register=args.register)
            model = Challenge
            title = "P17-4 APPROVED-CHALLENGE RENDER"
            pool = "challenges"
            empty_msg = "nothing to render (no approved, unrendered challenges)."
        else:
            plan = build_items(db)
            model = DialogueNode
            title = "P17-2 APPROVED-AUDIO RENDER"
            pool = "dialogue nodes"
            empty_msg = "nothing to render (no approved, unrendered nodes)."
    finally:
        db.close()

    items = plan["items"]
    est = estimate(items)

    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)
    print(f"  approved {pool} to render: {est['n_items']}")
    print(f"  TTS chars:        {est['chars']}")
    print(f"  est cost:         ₹{est['est_cost_rs']}")
    if plan.get("skipped_placeholder"):
        print(f"  skipped placeholders: {len(plan['skipped_placeholder'])}")
    if plan.get("skipped_rendered"):
        print(f"  skipped already-rendered: {len(plan['skipped_rendered'])}")
    if not items:
        print(f"  {empty_msg}")
    print("=" * 60)

    if not args.live or args.dry_run:
        print("DRY-RUN — no network calls, no changes.")
        return 0

    if est["chars"] == 0:
        print("nothing to render.", file=sys.stderr)
        return 2

    if not settings.sarvam_api_key:
        print("SKIP: SARVAM_API_KEY not configured", file=sys.stderr)
        return 0

    print(f"RENDERING {len(items)} items → storage + {model.__tablename__}.audio_url ...")
    outcomes = asyncio.run(_run(items, args.sa_language, model))
    oks = [o for o in outcomes if isinstance(o[1], str) and o[1].startswith("/")]
    fails = [o for o in outcomes if o[1] is None or not o[1].startswith("/")]
    print(f"  rendered + stored: {len(oks)}")
    for item, err in fails:
        print(f"  ✗ {item.get('id', '?')}: {err}")
    print(f"  total chars: {est['chars']} → ₹{est['est_cost_rs']} (est)")
    print(f"  audio_urls written to {len(oks)} {model.__tablename__} rows")
    return 1 if fails and not oks else 0


if __name__ == "__main__":
    sys.exit(main())