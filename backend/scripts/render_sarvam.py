"""Sarvam Bulbul v3 batch renderer CLI — API-based §12 pre-render pass.

Offline tool, NOT request-path code.  Pre-renders the dialogue graph's tutor
turns to WAV files so the conversation runtime can serve audio_url per node
(§12's pre-rendered-audio premise, now API-only per product constraint: no
local models — the app talks to Sarvam's cloud, nothing is self-hosted).

Usage::

    python scripts/render_sarvam.py [--item-file path.json] [--out results/sarvam]
                                    [--shard dialogue_nodes] [--sa-language hi-IN]
                                    [--dry-run]

* ``--item-file``: JSON list of ``{id,text,lang}`` (build via
  ``scripts/build_render_items.py``).  ``sa`` items render with
  ``--sa-language`` (default ``hi-IN`` — Bulbul has no ``sa-IN`` outside
  beta; pass ``sa-IN`` once the account's beta is enabled).  ``hi`` items
  render as ``hi-IN``; ``en`` items as ``en-IN``.
* Measures wall-clock per item, prints the throughput table, writes
  ``{out}/manifest.json``.
* No key → ``SKIP: SARVAM_API_KEY not configured`` and exit 0.
* ``--dry-run`` validates the shard plan without network calls (exit 2 on a
  broken plan).

Exit codes: 0 ok/skip · 1 render failure · 2 invalid plan
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import sys
import time
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.sarvam import SarvamClient  # noqa: E402

DEFAULT_SPEAKER = "aditya"
"""Persona speaker for bulbul:v3 (§4.1 analogue of Parler's Aryan card)."""

MODEL = "bulbul:v3"
SAMPLE_RATE = 24000
ACTUAL_SAMPLE_RATE = 22050
"""Bulbul v3 ignores the sample_rate param and always returns 22050 Hz mono
(probed 2026-08-29).  Recorded in the manifest so the CDN/serving layer and
§12 budgets use the real number, not the requested one."""


# ── plan ─────────────────────────────────────────────────────────────────────

def validate_plan(items: list[dict]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            problems.append(f"item[{idx}] is not an object: {item!r}")
            continue
        item_id = item.get("id")
        if not item_id:
            problems.append(f"item[{idx}] missing 'id'")
        elif str(item_id) in seen:
            problems.append(f"duplicate id {item_id!r}")
        else:
            seen.add(str(item_id))
        text = item.get("text")
        if not text or not str(text).strip():
            problems.append(f"item[{idx}] id={item_id!r} empty text")
        lang = item.get("lang")
        if lang not in ("sa", "hi", "en"):
            problems.append(f"item[{idx}] id={item_id!r} unexpected lang {lang!r} (expected sa/hi/en)")
    return problems


def load_item_file(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{path} must be a JSON list of {{id,text,lang}} items")
    return data


# ── render core (test seam: callers may inject a fake client) ────────────────

def _wav_duration(wav_bytes: bytes, fallback_rate: int = SAMPLE_RATE) -> float:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            if w.getframerate() > 0:
                return w.getnframes() / w.getframerate()
    except Exception:
        pass
    return len(wav_bytes) / max(1, fallback_rate * 2)


def _lang_code(lang: str, sa_language: str) -> str:
    """Map node lang → Bulbul language_code (sa → sa_language flag)."""
    if lang == "en":
        return "en-IN"
    if lang == "sa":
        return sa_language
    return "hi-IN"


async def render_item(
    client, item: dict, out_dir: Path, shard_id: str, sa_language: str = "hi-IN"
) -> dict:
    """Render one {id,text,lang} item via Bulbul → result dict.

    Never raises: failures are recorded in the result dict so one bad item
    cannot kill the shard.
    """
    item_id = str(item.get("id", "?"))
    text = str(item.get("text", ""))
    lang = str(item.get("lang", "sa"))
    lang_code = _lang_code(lang, sa_language)
    try:
        t0 = time.perf_counter()
        audio_b64 = await client.text_to_speech(
            text=text,
            language_code=lang_code,
            speaker=DEFAULT_SPEAKER,
            model=MODEL,
            sample_rate=SAMPLE_RATE,
        )
        raw = base64.b64decode(audio_b64)
        wall_ms = (time.perf_counter() - t0) * 1000.0
        shard_dir = Path(out_dir) / shard_id
        shard_dir.mkdir(parents=True, exist_ok=True)
        path = shard_dir / f"{item_id}.wav"
        path.write_bytes(raw)
        return {
            "id": item_id, "text": text, "lang": lang,
            "path": str(path), "seconds": round(_wav_duration(raw), 3),
            "bytes": len(raw), "wall_ms": round(wall_ms, 1),
            "ok": True, "error": None,
        }
    except Exception as exc:  # per-item isolation — never kill the shard
        return {
            "id": item_id, "text": text, "lang": lang, "path": None,
            "seconds": None, "wall_ms": None, "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
        }


async def render_items(
    client, items: list[dict], out_dir: Path, shard_id: str, sa_language: str = "hi-IN"
) -> list[dict]:
    """Render items sequentially (turn-taking pacing; no parallel bursts)."""
    out: list[dict] = []
    for item in items:
        out.append(await render_item(client, item, out_dir, shard_id, sa_language))
    return out


# ── CLI ──────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Sarvam Bulbul v3 batch renderer (§12 pre-render)")
    p.add_argument("--item-file", default=None, help="JSON list of {id,text,lang} items")
    p.add_argument("--out", default="results/sarvam", help="output dir (default results/sarvam)")
    p.add_argument("--shard", default="dialogue_nodes", help="shard id (default dialogue_nodes)")
    p.add_argument("--sa-language", default="hi-IN",
                   help="language_code used for sa items (hi-IN default; sa-IN once beta enabled)")
    p.add_argument("--dry-run", action="store_true", help="validate the shard plan without network calls")
    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    out = Path(args.out)

    if args.sa_language not in ("hi-IN", "sa-IN"):
        print(f"invalid --sa-language {args.sa_language!r} (expected hi-IN or sa-IN)", file=sys.stderr)
        return 2

    try:
        items = load_item_file(Path(args.item_file)) if args.item_file else []
    except Exception as exc:
        print(f"item-file failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    if not items and not args.dry_run:
        print("nothing to render: pass --item-file", file=sys.stderr)
        return 2
    problems = validate_plan(items)

    if args.dry_run:
        print(f"DRY-RUN: {len(items)} item(s) in shard {args.shard!r} (sa→{args.sa_language})")
        if problems:
            print("PLAN INVALID:")
            for prob in problems:
                print(f"  ✗ {prob}")
            return 2
        print("PLAN OK: ids unique, no empty text, langs in {sa,hi,en}")
        return 0

    if problems:
        print("PLAN INVALID — refusing to render:")
        for prob in problems:
            print(f"  ✗ {prob}")
        return 2

    if not settings.sarvam_api_key:
        print("SKIP: SARVAM_API_KEY not configured")
        return 0

    client = SarvamClient(api_key=settings.sarvam_api_key)

    async def _run():
        results: list[dict] = []
        print(f"\n  rendering {len(items)} item(s) → {out / args.shard}  [bulbul:v3 / {DEFAULT_SPEAKER}]")
        print(f"  {'id':<14} {'lang':<4} {'audio_s':>8} {'wall_ms':>8}  ok")
        t0 = time.perf_counter()
        for item in items:
            res = await render_item(client, item, out, args.shard, args.sa_language)
            results.append(res)
            print(f"  {res['id']:<14} {res['lang']:<4} "
                  f"{res['seconds'] if res['seconds'] is not None else '-':>8} "
                  f"{res['wall_ms'] if res['wall_ms'] is not None else '-':>8}  "
                  f"{'✓' if res['ok'] else '✗ ' + str(res['error'])[:60]}")
        total_s = time.perf_counter() - t0
        return results, total_s

    try:
        results, total_s = asyncio.run(_run())
    except Exception as exc:
        print(f"RENDER FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        # close the client's httpx session if it was opened
        try:
            if client._http is not None and not client._http.is_closed:
                asyncio.run(client.close())
        except Exception:
            pass

    oks = [r for r in results if r["ok"]]
    walls = sorted(r["wall_ms"] for r in oks)
    p50 = walls[len(walls) // 2] if walls else 0
    mean = sum(walls) / len(walls) if walls else 0

    print("\n  ── §12 API pre-render throughput ──")
    print(f"  rendered {len(oks)}/{len(results)} · failed {len(results) - len(oks)}")
    print(f"  wall:   mean {mean:.0f} ms/item · p50 {p50:.0f} ms/item")
    if oks:
        print(f"  audio:  {sum(r['seconds'] for r in oks):.1f} s total · "
              f"mean {sum(r['seconds'] for r in oks) / len(oks):.2f} s/turn")
    print(f"  total wall-clock: {total_s:.1f} s for {len(results)} turns "
          f"= {total_s / max(1, len(results)):.2f} s/turn")

    manifest = {
        "kind": "sarvam-batch",
        "model": MODEL,
        "speaker": DEFAULT_SPEAKER,
        "sa_language": args.sa_language,
        "sample_rate_requested": SAMPLE_RATE,
        "sample_rate_actual": ACTUAL_SAMPLE_RATE,
        "shard": args.shard,
        "n_items": len(results),
        "items": results,
        "wall_clock_total_s": round(total_s, 2),
        "wall_clock_mean_ms_per_item": round(mean, 1),
        "wall_clock_p50_ms_per_item": round(p50, 1),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n  wrote {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
