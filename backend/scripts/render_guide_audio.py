"""Pre-render audio for the grammar guide's Sanskrit (grammar-tab rebuild §4).

Walks the assembled guide, collects every unique Sanskrit string a learner can
hear — examples, quotes, table cells, formulas, topic terms and glossary terms —
skips strings already listed in ``app/services/grammar_guide/audio_manifest.json``
and renders the rest through Sarvam Bulbul v3. Each clip is stored through
``app.services.storage`` and recorded in the manifest, which the guide builder
reads to attach ``audio_url``: no manifest entry, no button.

Budget: TTS bills ₹30/10K chars (architecture.md §4.1). The default is a dry
run that spends nothing; ``--live`` is run only after the owner approves the
dry-run estimate. Before any spend the script re-runs every engine check, so
audio is never bought for content the engine disagrees with.

Rate limits: Sarvam answers 429 after a few hundred back-to-back requests
(measured 2026-09-15: 300 clips, then every call refused). Requests are paced,
a 429 or 5xx is retried with backoff, and a rate limit that outlasts every
retry stops the run instead of failing the remaining clips one by one.

Usage:
    python -m scripts.render_guide_audio                     # plan + estimate, ₹0
    python -m scripts.render_guide_audio --live              # render + store + manifest
    python -m scripts.render_guide_audio --live --sa-language sa-IN
    python -m scripts.render_guide_audio --live --limit 20   # a small sample first
    python -m scripts.render_guide_audio --live --pace 2     # slower, for a tight quota

Re-rendering with another voice: delete the manifest entries to redo, then run
``--live`` again. The manifest is written after every clip, so an interrupted
or rate-limited run keeps what it finished and a rerun continues from there.

Exit codes: 0 ok · 1 some clips failed or the run stopped on a rate limit ·
2 invalid plan (engine check failures, bad arguments, no key)
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import re
import sys
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import grammar_guide as gg  # noqa: E402
from app.services.grammar_guide.verify import verify  # noqa: E402

DEFAULT_SPEAKER = "aditya"
MODEL = "bulbul:v3"
SAMPLE_RATE = 24000
COST_PER_CHAR = 0.003  # ₹30/10K chars (architecture.md §4.1)
STORAGE_PREFIX = "grammar"
PACE_SECONDS = 1.0  # between requests
RETRY_DELAYS = (5, 15, 30, 60, 120)  # seconds, after each failed attempt
_DEVANAGARI_LETTER = re.compile(r"[ऄ-हक़-ॡॲ-ॿ]")

Sleep = Callable[[float], Awaitable[Any]]


class RateLimited(Exception):
    """Sarvam kept answering 429 through every retry: stop, keep what is done."""


def speakable(text: str) -> str:
    """What the voice reads: “हिम + आलयः” is spoken as two words with a pause."""
    spoken = text.replace(" + ", ", ").replace("+", ", ")
    return " ".join(spoken.split())


def plan(texts: list[str], manifest: dict[str, dict], limit: int | None = None) -> list[dict]:
    """Unrendered clips, in guide order: ``{key, text, speak}``."""
    items: list[dict] = []
    for text in texts:
        key = gg.audio_key(text)
        if key in manifest or not _DEVANAGARI_LETTER.search(text):
            continue
        items.append({"key": key, "text": text, "speak": speakable(text)})
        if limit and len(items) >= limit:
            break
    return items


def estimate(items: list[dict]) -> dict:
    chars = sum(len(it["speak"]) for it in items)
    return {"n_items": len(items), "chars": chars, "est_cost_rs": round(chars * COST_PER_CHAR, 2)}


def check_failures() -> list[str]:
    return [f"{tid}: {shown} — {why}" for tid, shown, check in gg.iter_checks()
            if (why := verify(check, shown))]


def write_manifest(manifest: dict[str, dict], path: Optional[Path] = None) -> None:
    path = path or gg.MANIFEST_PATH
    path.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=1) + "\n",
                    encoding="utf-8")


async def tts_with_retry(client, item: dict, sa_language: str, *,
                         delays: tuple[float, ...] = RETRY_DELAYS,
                         sleep: Sleep = asyncio.sleep) -> str:
    """One clip's base64 audio. 429 and 5xx are retried after ``delays``; a
    429 that survives them raises RateLimited, any other error propagates."""
    from app.services.sarvam import SarvamError

    for attempt in range(len(delays) + 1):
        try:
            return await client.text_to_speech(
                text=item["speak"], language_code=sa_language, speaker=DEFAULT_SPEAKER,
                model=MODEL, sample_rate=SAMPLE_RATE)
        except SarvamError as exc:
            retryable = exc.status_code == 429 or exc.status_code >= 500
            if retryable and attempt < len(delays):
                await sleep(delays[attempt])
                continue
            if exc.status_code == 429:
                raise RateLimited(str(exc)) from exc
            raise
    raise AssertionError("unreachable")


async def _run(items: list[dict], manifest: dict[str, dict], sa_language: str, *,
               pace: float = PACE_SECONDS, client=None, storage=None,
               sleep: Sleep = asyncio.sleep, manifest_path: Optional[Path] = None) -> dict:
    """Render, store and record each clip.

    Returns ``{rendered, failures: [(item, error)], stopped}`` where ``stopped``
    explains an early stop on a persistent rate limit (None otherwise)."""
    own_client = client is None
    if own_client:
        from app.config import settings
        from app.services.sarvam import SarvamClient

        client = SarvamClient(api_key=settings.sarvam_api_key)
    if storage is None:
        from app.services.storage import get_storage

        storage = get_storage()
    summary: dict = {"rendered": 0, "failures": [], "stopped": None}
    try:
        for i, item in enumerate(items, 1):
            if i > 1 and pace:
                await sleep(pace)
            try:
                audio_b64 = await tts_with_retry(client, item, sa_language, sleep=sleep)
                path = f"{STORAGE_PREFIX}/{item['key']}.wav"
                storage.store(base64.b64decode(audio_b64), path)
            except RateLimited as exc:
                summary["stopped"] = f"{exc} — {len(items) - i + 1} clips left for a later run"
                break
            except Exception as exc:  # noqa: BLE001 - one clip never stops the run
                summary["failures"].append((item, f"{type(exc).__name__}: {exc}"))
                continue
            manifest[item["key"]] = {"text": item["text"], "path": path, "voice": DEFAULT_SPEAKER,
                                     "model": MODEL, "language": sa_language}
            write_manifest(manifest, manifest_path)
            summary["rendered"] += 1
            if i % 50 == 0:
                print(f"  … {i}/{len(items)}", flush=True)
    finally:
        if own_client:
            await client.close()
    return summary


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Grammar guide audio: plan, estimate, render")
    p.add_argument("--live", action="store_true", help="render, store and write the manifest (default: dry run)")
    p.add_argument("--dry-run", action="store_true", help="print plan + estimate, spend nothing")
    p.add_argument("--sa-language", default="hi-IN", help="language_code for Sanskrit (hi-IN default, sa-IN beta)")
    p.add_argument("--limit", type=int, default=None, help="render at most this many clips")
    p.add_argument("--pace", type=float, default=PACE_SECONDS, help="seconds between requests")
    args = p.parse_args(argv)

    if args.sa_language not in ("hi-IN", "sa-IN"):
        print(f"invalid --sa-language {args.sa_language!r} (expected hi-IN or sa-IN)", file=sys.stderr)
        return 2

    failures = check_failures()
    manifest = gg.load_manifest()
    texts = gg.iter_sanskrit()
    items = plan(texts, manifest, args.limit)
    est = estimate(items)

    print("=" * 60)
    print("  GRAMMAR GUIDE AUDIO")
    print("=" * 60)
    print(f"  Sanskrit strings in guide: {len(texts)}")
    print(f"  already rendered:          {sum(1 for t in texts if gg.audio_key(t) in manifest)}")
    print(f"  clips to render:           {est['n_items']}")
    print(f"  TTS chars:                 {est['chars']}")
    print(f"  est cost:                  ₹{est['est_cost_rs']}")
    print(f"  engine check failures:     {len(failures)}")
    print("=" * 60)
    for line in failures[:20]:
        print(f"  ✗ {line}")

    if failures:
        print("Fix the failing engine checks before buying audio.", file=sys.stderr)
        return 2
    if not args.live or args.dry_run:
        print("DRY-RUN — no network calls, no changes.")
        return 0
    if not items:
        print("nothing to render.")
        return 0

    from app.config import settings

    if not settings.sarvam_api_key:
        print("SKIP: SARVAM_API_KEY not configured", file=sys.stderr)
        return 2

    print(f"RENDERING {len(items)} clips → storage/{STORAGE_PREFIX}/ + {gg.MANIFEST_PATH.name} "
          f"(pace {args.pace}s) ...", flush=True)
    summary = asyncio.run(_run(items, manifest, args.sa_language, pace=args.pace))
    print(f"  rendered + stored: {summary['rendered']}")
    for item, err in summary["failures"][:20]:
        print(f"  ✗ {item['text']}: {err}")
    if summary["stopped"]:
        print(f"  STOPPED on a rate limit: {summary['stopped']}")
    print("Restart the API (or call grammar_guide.reset_cache()) to serve the new audio_url fields.")
    return 1 if summary["failures"] or summary["stopped"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
