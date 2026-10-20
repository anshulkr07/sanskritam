"""Render the story course's Sanskrit audio with Sarvam Bulbul and store it in R2.

Walks the built lesson pack, collects every Sanskrit string a learner can hear
(``app.curriculum.audio.collect``: letters, dialogue, sentences, words, table
cells, best tier first), skips clips already listed in
``content/audio/deliveries.json`` and renders the rest: Bulbul v3, sa-IN, one
mp3 per string, uploaded to R2 under ``audio/learn/<hash>.mp3`` and recorded in
the deliveries file after every few clips, so an interrupted or rate-limited run
keeps what it finished and a rerun continues from there.

TTS bills ₹3 per 1,000 characters (sarvam.ai/api-pricing, read 2026-10-20). The
default is a dry run that spends nothing; ``--live`` renders.

Rate limits: Starter is 30 requests a minute on bulbul:v3 (docs.sarvam.ai), and
the grammar-guide run was once refused after a few hundred back-to-back requests
(2026-09-15). Requests are paced (2.2 s between request starts), a 429 or 5xx is retried with backoff,
and a limit that outlasts every retry stops the run instead of failing the rest
one by one.

Usage (from backend/, with PYTHONUTF8=1):
    python -m scripts.render_story_audio                       # plan + estimate, ₹0
    python -m scripts.render_story_audio --live                # render everything missing
    python -m scripts.render_story_audio --live --tier letter --limit 20   # a small sample
    python -m scripts.render_story_audio --live --pace 3       # slower, for a tight quota

Re-rendering in another voice or pace: change the constants in
``app/curriculum/audio.py`` (they are part of every clip's name), then run again;
the old clips stay where they are and are simply no longer attached.

Exit codes: 0 ok · 1 some clips failed or the run stopped on a rate limit ·
2 invalid plan (course errors, bad arguments, no keys)
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import sys
import time
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.curriculum import audio  # noqa: E402

COST_PER_CHAR = 0.003  # ₹3 per 1,000 characters
PACE_SECONDS = 2.2  # between request STARTS: 27 a minute, under the 30 a minute limit
RETRY_DELAYS = (5, 15, 30, 60, 120)  # seconds, after each failed attempt
SAVE_EVERY = 20

Sleep = Callable[[float], Awaitable[Any]]


class RateLimited(Exception):
    """Sarvam kept answering 429 through every retry: stop, keep what is done."""


def plan(items: list[dict], clips: dict[str, dict], *, tier: Optional[str] = None, limit: Optional[int] = None) -> list[dict]:
    """The clips still to render, best tier first."""
    todo = []
    for it in items:
        key = audio.clip_key(it["text"])
        if key in clips or (tier and it["tier"] != tier):
            continue
        todo.append({**it, "key": key})
        if limit and len(todo) >= limit:
            break
    return todo


def estimate(items: list[dict]) -> dict:
    chars = sum(len(it["speak"]) for it in items)
    by_tier: dict[str, list[int]] = {}
    for it in items:
        n, c = by_tier.setdefault(it["tier"], [0, 0])
        by_tier[it["tier"]] = [n + 1, c + len(it["speak"])]
    return {"clips": len(items), "chars": chars, "cost_rs": round(chars * COST_PER_CHAR, 2), "by_tier": by_tier}


def check_clip(data: bytes, speak: str) -> Optional[str]:
    """Why a rendered clip is not trusted, or None. Cheap sanity: it is an MP3, not
    a stub, not silence, not absurdly long for what it says."""
    seconds = audio.mp3_seconds(data)
    if seconds is None:
        return "not an MP3"
    if len(data) < 1200 or seconds < 0.25:
        return f"too short ({len(data)} bytes, {seconds:.2f}s)"
    if seconds > 1.0 + 0.45 * len(speak):
        return f"too long for {len(speak)} characters ({seconds:.1f}s)"
    return None


async def tts_with_retry(client, item: dict, *, delays: tuple[float, ...] = RETRY_DELAYS, sleep: Sleep = asyncio.sleep) -> str:
    """One clip's base64 mp3. 429 and 5xx are retried after ``delays``; a 429 that
    survives them raises RateLimited, any other error propagates."""
    from app.services.sarvam import SarvamError

    for attempt in range(len(delays) + 1):
        try:
            return await client.text_to_speech(
                text=item["speak"], language_code=audio.LANGUAGE, speaker=audio.VOICE, model=audio.MODEL,
                pace=audio.PACE, sample_rate=audio.SAMPLE_RATE, codec=audio.CODEC)
        except SarvamError as exc:
            retryable = exc.status_code == 429 or exc.status_code >= 500
            if retryable and attempt < len(delays):
                await sleep(delays[attempt])
                continue
            if exc.status_code == 429:
                raise RateLimited(str(exc)) from exc
            raise
    raise AssertionError("unreachable")


async def render(items: list[dict], clips: dict[str, dict], *, client, storage, pace: float = PACE_SECONDS,
                 sleep: Sleep = asyncio.sleep, save: Callable[[dict], None] = lambda c: None,
                 log: Callable[[str], None] = print) -> dict:
    """Render, check, upload and record each clip. Returns ``{rendered, failures, stopped, seconds}``."""
    summary: dict = {"rendered": 0, "failures": [], "stopped": None, "seconds": 0.0}
    started = time.time()
    last_start: Optional[float] = None
    try:
        for i, item in enumerate(items, 1):
            if last_start is not None and pace:  # pace the starts, so a slow answer does not stretch the gap
                wait = pace - (time.monotonic() - last_start)
                if wait > 0:
                    await sleep(wait)
            last_start = time.monotonic()
            try:
                data = base64.b64decode(await tts_with_retry(client, item, sleep=sleep))
                why = check_clip(data, item["speak"])
                if why:
                    summary["failures"].append((item, why))
                    continue
                url = await asyncio.to_thread(storage.store, data, audio.storage_path(item["key"]), "audio/mpeg")
            except RateLimited as exc:
                summary["stopped"] = f"{exc} — {len(items) - i + 1} clips left for a later run"
                break
            except Exception as exc:  # noqa: BLE001 - one clip never stops the run
                summary["failures"].append((item, f"{type(exc).__name__}: {exc}"))
                continue
            seconds = audio.mp3_seconds(data) or 0.0
            clips[item["key"]] = {"text": item["text"], "tier": item["tier"], "url": url, "bytes": len(data), "seconds": round(seconds, 2)}
            summary["rendered"] += 1
            summary["seconds"] += seconds
            if summary["rendered"] % SAVE_EVERY == 0:
                save(clips)
                elapsed = time.time() - started
                log(f"  … {i}/{len(items)} done, {summary['rendered']} stored, {elapsed / 60:.1f} min")
    finally:
        save(clips)
    return summary


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Story course audio: plan, estimate, render, store")
    p.add_argument("--live", action="store_true", help="render, upload and record (default: dry run)")
    p.add_argument("--tier", choices=audio.TIERS, default=None, help="only this tier")
    p.add_argument("--limit", type=int, default=None, help="render at most this many clips")
    p.add_argument("--pace", type=float, default=PACE_SECONDS, help="seconds between requests")
    args = p.parse_args(argv)

    from app.curriculum import pack as pack_mod
    from app.curriculum.loader import load

    data = load()
    errors = [i for i in data.issues if i.level == "error"]
    if errors:
        print("The course has errors; fix them before buying audio:", file=sys.stderr)
        for e in errors[:10]:
            print(f"  {e}", file=sys.stderr)
        return 2
    pk = pack_mod.build(data)
    items = audio.collect(pk.lessons)
    clips = dict(data.audio)
    todo = plan(items, clips, tier=args.tier, limit=args.limit)
    est = estimate(todo)

    print("=" * 60)
    print("  STORY COURSE AUDIO")
    print("=" * 60)
    print(f"  Sanskrit strings with a speaker: {len(items)}")
    print(f"  already rendered:                {sum(1 for it in items if audio.clip_key(it['text']) in clips)}")
    print(f"  clips to render:                 {est['clips']}   ({audio.VOICE}, {audio.LANGUAGE}, {audio.CODEC}, pace {audio.PACE:g})")
    for tier in audio.TIERS:
        if tier in est["by_tier"]:
            n, c = est["by_tier"][tier]
            print(f"    {tier:9} {n:5} clips {c:7} chars")
    print(f"  characters to speak:             {est['chars']}")
    print(f"  est cost:                        ₹{est['cost_rs']}  (₹3 per 1,000 characters)")
    print(f"  est time at {args.pace}s a request:     {est['clips'] * args.pace / 60:.0f} min")
    print("=" * 60)
    if not args.live:
        print("DRY RUN: no network calls, nothing changed. Add --live to render.")
        return 0
    if not todo:
        print("nothing to render.")
        return 0

    from app.config import settings

    if not settings.sarvam_api_key:
        print("SKIP: SARVAM_API_KEY not configured", file=sys.stderr)
        return 2
    if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key and settings.r2_bucket):
        print("SKIP: R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)", file=sys.stderr)
        return 2
    from app.services.sarvam import SarvamClient
    from app.services.storage import R2Storage

    storage = R2Storage(settings.r2_account_id, settings.r2_access_key_id, settings.r2_secret_access_key,
                        settings.r2_bucket, settings.r2_base_url)
    print(f"RENDERING {len(todo)} clips → R2 audio/{audio.STORAGE_PREFIX}/ + {audio.DELIVERIES_PATH.name} (pace {args.pace}s)", flush=True)

    async def go() -> dict:
        client = SarvamClient(api_key=settings.sarvam_api_key)
        try:
            return await render(todo, clips, client=client, storage=storage, pace=args.pace, save=audio.write_deliveries,
                                log=lambda m: print(m, flush=True))
        finally:
            await client.close()

    summary = asyncio.run(go())
    print(f"  rendered + stored: {summary['rendered']}  ({summary['seconds'] / 60:.1f} min of audio)")
    for item, err in summary["failures"][:25]:
        print(f"  ✗ {item['text']}: {err}")
    if summary["stopped"]:
        print(f"  STOPPED on a rate limit: {summary['stopped']}")
    return 1 if summary["failures"] or summary["stopped"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
