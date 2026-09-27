"""Saaras ASR latency bench — p50/p95 vs the §12 live-conversation budget.

Offline measurement tool, NOT request-path code.  Sizes the single live model
call in a conversation turn (architecture.md §12: the entire live budget is
600–900 ms/turn, so ASR must be ≲500–800 ms).

Usage::

    python scripts/bench_asr.py [--n 10] [--seconds 4] [--out results/bench_asr.json] [--synthetic]
                                [--model saaras:v4] [--language sa-IN|unknown]

``--model`` defaults to ``settings.sarvam_stt_model``. ``--language unknown``
times what Talk actually waits for: the auto-detect and Sanskrit passes run
together by ``services/learner_stt.py``, so the slower of two calls.

What it does
    * Builds test audio: ``--synthetic`` (default-ish) synthesizes 16 kHz mono
      WAVs offline with numpy (stdlib fallback — the bench ALWAYS runs, even
      with no numpy); without ``--synthetic``, any ``results/audio/*.wav``
      files are used if present, else synthetic.
    * For each of ``n`` iterations, times a FULL round trip of
      ``SarvamClient.speech_to_text`` (bytes → transcript) and records the
      per-call latency ms + transcript length.
    * Reports p50/p95/mean/min/max ms, prints a table, writes JSON to ``--out``,
      and prints the verdict vs the 800 ms budget.

Concurrency note: calls run SEQUENTIALLY — that matches real turn-taking
(one user utterance per turn).  A concurrent-mode bench is future work.

Exit codes: 0 ok · 1 no key / bench failure · 2 (unused)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Make ``app`` importable when run as ``python scripts/bench_asr.py`` from any cwd.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.services.learner_stt import transcribe_learner  # noqa: E402
from app.services.sarvam import SarvamClient, SarvamError  # noqa: E402 (import only — never modified)

BUDGET_MS = 800
"""§12 budget: p50 must be ≤ 800 ms for ASR in the live conversation."""
SAMPLE_RATE = 16000
SYNTH_SECONDS = 4.0


# ── offline audio synthesis (numpy preferred, stdlib fallback) ──────────────

def _pcm_to_wav_bytes(pcm, sample_rate: int) -> bytes:
    import array
    import io
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(array.array("h", pcm).tobytes())
    return buf.getvalue()


def synthesize_wav(seconds: float = SYNTH_SECONDS, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Synthesize a shaped 16 kHz mono WAV (sine + low noise) — no network.

    numpy is used when installed; a pure-stdlib (math/random/wave) path keeps
    the bench runnable in the CI venv, where numpy is not in requirements.txt.
    """
    n = max(1, int(seconds * sample_rate))
    try:
        import numpy as np

        rng = np.random.default_rng(7)
        t = np.arange(n) / sample_rate
        sig = 0.6 * np.sin(2 * np.pi * 220.0 * t) + 0.05 * rng.standard_normal(t.size)
        pcm = np.clip(sig * 32767.0, -32768.0, 32767.0).astype(np.int16)
    except ImportError:
        import math
        import random

        rng = random.Random(7)
        pcm = []
        for i in range(n):
            tone = 0.6 * math.sin(2 * math.pi * 220.0 * (i / sample_rate))
            noise = 0.05 * rng.uniform(-1.0, 1.0)
            pcm.append(int(max(-32768.0, min(32767.0, (tone + noise) * 32767.0))))
    return _pcm_to_wav_bytes(pcm, sample_rate)


# ── percentile / stats ──────────────────────────────────────────────────────

def percentile(sorted_values: list[float], p: float) -> float:
    """Linear-interpolated percentile (numpy-consistent) on sorted data."""
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return float(sorted_values[0])
    pos = (len(sorted_values) - 1) * p
    lo = int(pos)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = pos - lo
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * frac


def summarize(latencies_ms: list[float]) -> dict:
    s = sorted(latencies_ms)
    n = len(s)
    return {
        "n": n,
        "mean_ms": round(sum(s) / n, 1) if n else None,
        "p50_ms": round(percentile(s, 0.50), 1),
        "p95_ms": round(percentile(s, 0.95), 1),
        "min_ms": round(s[0], 1) if n else None,
        "max_ms": round(s[-1], 1) if n else None,
    }


# ── the bench ────────────────────────────────────────────────────────────────

def load_audio(args: argparse.Namespace) -> tuple[list[bytes], str]:
    """Return (byte-clips, source_label).  Synthetic by default; uses
    ``results/audio/*.wav`` when present and ``--synthetic`` not passed."""
    if not args.synthetic:
        audio_dir = Path(args.out).parent / "audio"
        if audio_dir.is_dir():
            files = sorted(audio_dir.glob("*.wav"))
            if files:
                return [f.read_bytes() for f in files], f"files ({len(files)} in results/audio)"
    return [synthesize_wav(args.seconds)], "synthetic"


async def _run_bench(
    client: SarvamClient,
    audio_clips: list[bytes],
    n: int,
    out_path: Path,
    source: str,
    model: str,
    language_code: str = "sa-IN",
) -> dict:
    """Sequential round-trip timing; returns the full result document."""
    latencies: list[float] = []
    lengths: list[int] = []
    for i in range(n):
        audio = audio_clips[i % len(audio_clips)]
        t0 = time.perf_counter()
        if language_code == "unknown":
            # Talk's path: both passes, concurrently.
            resp = await transcribe_learner(client, audio, model=model)
        else:
            resp = await client.speech_to_text(audio_data=audio, model=model, language_code=language_code)
        lat_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(round(lat_ms, 1))
        lengths.append(len(str(resp.get("transcript", ""))))
    stats = summarize(latencies)
    verdict = "PASS" if stats["p50_ms"] <= BUDGET_MS else "FAIL"
    if verdict == "PASS":
        verdict_line = f"PASS: p50 {stats['p50_ms']}ms ≤ {BUDGET_MS}ms fits §12 turn budget"
    else:
        verdict_line = f"FAIL: p50 {stats['p50_ms']}ms exceeds {BUDGET_MS}ms budget — live conversation at risk"
    doc = {
        "bench": "asr-" + model.replace(":", "-"),
        "model": model,
        "language_code": language_code,
        "mode": "transcribe",
        "budget_ms": BUDGET_MS,
        "n": n,
        "audio_source": source,
        "latencies_ms": latencies,
        "transcript_lengths": lengths,
        "stats": stats,
        "verdict": verdict,
        "verdict_line": verdict_line,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return doc


def run_bench(args: argparse.Namespace) -> dict:
    """Synchronous driver — builds the client, runs, returns the JSON doc.

    Assumes the caller has already verified ``settings.sarvam_api_key``.
    """
    audio_clips, source = load_audio(args)
    client = SarvamClient(api_key=settings.sarvam_api_key)
    return asyncio.run(_run_bench(
        client, audio_clips, args.n, Path(args.out), source, args.model, args.language,
    ))


def print_table(doc: dict) -> None:
    n = doc["stats"]["n"]
    rows = doc["latencies_ms"]
    print("\n  #  latency_ms  transcript_len")
    for i, (lat, ln) in enumerate(zip(rows, doc["transcript_lengths"]), start=1):
        print(f"  {i:>2}  {lat:>10.1f}  {ln:>14}")
    stats = doc["stats"]
    print(
        f"\n  p50  {stats['p50_ms']:>7.1f} ms   p95 {stats['p95_ms']:>7.1f} ms   "
        f"mean {stats['mean_ms']:>7.1f} ms   min {stats['min_ms']:>7.1f} ms   max {stats['max_ms']:>7.1f} ms   (n={n})"
    )


# ── CLI ──────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Saaras ASR latency bench vs 800 ms §12 budget")
    p.add_argument("--n", type=int, default=10, help="iterations (default 10)")
    p.add_argument("--model", default=settings.sarvam_stt_model,
                   help=f"Saaras model (default {settings.sarvam_stt_model}, from settings)")
    p.add_argument("--language", default="sa-IN",
                   help="language_code (default sa-IN; 'unknown' times Talk's two-pass path)")
    p.add_argument("--seconds", type=float, default=SYNTH_SECONDS, help="synthetic clip length (default 4)")
    p.add_argument("--out", default="results/bench_asr.json", help="JSON output path (default results/bench_asr.json)")
    p.add_argument(
        "--synthetic",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="synthesize WAVs offline (default: --synthetic; opt out with --no-synthetic to use results/audio/*.wav when present)",
    )
    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    if not settings.sarvam_api_key:
        print("SARVAM_API_KEY not configured", file=sys.stderr)
        return 1
    try:
        doc = run_bench(args)
    except (SarvamError, Exception) as exc:  # SarvamError / network / anything
        print(f"ASR bench failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print_table(doc)
    print(f"\n  wrote {args.out}")
    print(f"\n  {doc['verdict_line']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())