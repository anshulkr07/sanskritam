"""Saaras codemix-mode bench — does ``mode=codemix`` keep a mixed sentence mixed?

Offline measurement tool, NOT request-path code. Modelled on
``scripts/bench_asr.py``.

Usage::

    ./.venv/Scripts/python.exe -m scripts.bench_codemix [--synthesize] [--out results/bench_codemix.json]

* Without flags it reads every ``tests/fixtures/codemix/*.wav`` (with a
  sidecar ``.txt`` holding the intended line) and, per file, calls Saaras
  four times: (unknown, transcribe), (unknown, codemix), (sa-IN, transcribe)
  on ``settings.sarvam_stt_model`` (saaras:v4), and (unknown, codemix) on
  saaras:v3. It prints the four transcripts plus detected languages.
* ``--synthesize`` first renders Bulbul-voiced stand-ins for the handover
  lines into that folder (the owner records real phone lines later; files
  whose name starts with ``synth-`` are synthetic). Existing files are kept.

The owner lines (handover 2026-10-01 section 3.1):

1. ``नमस्ते, आज का temperature कितना है?`` (Hindi + English)
2. ``मम नाम अंशुलः, and I live in Bengaluru.`` (Sanskrit + English)
3. ``ನನಗೆ ಸಂಸ್ಕೃತ ಕಲಿಯಬೇಕು, please help me.`` (Kannada + English)
4. ``आज का weather अच्छा है, ನೀವು ಹೇಳಿ.`` (Hindi + English + Kannada)
5. ``अहं गच्छामि, but कल नहीं.`` (Sanskrit + English + Hindi)
6. Pure Sanskrit control: ``अहं विद्यालयं गच्छामि।``
7. Pure Hindi control: ``मेरा नाम अंशु है। मैं संस्कृत सीख रहा हूँ।``

Exit codes: 0 ok - 1 no key / bench failure - 2 no fixtures
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

from app.config import settings
from app.services.sarvam import SarvamClient, SarvamError

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "codemix"

#: (stem, intended line, Bulbul language_code). Synthetic stand-ins only:
#: real phone recordings replace them. No Sanskrit is composed here: every
#: line is quoted verbatim from handover section 3.1 (lines 6-7 are standard
#: control lines already used in test_learner_stt.py).
LINES: list[tuple[str, str, str]] = [
    ("synth-01-hi-en", "नमस्ते, आज का temperature कितना है?", "hi-IN"),
    ("synth-02-sa-en", "मम नाम अंशुलः, and I live in Bengaluru.", "hi-IN"),
    ("synth-03-kn-en", "ನನಗೆ ಸಂಸ್ಕೃತ ಕಲಿಯಬೇಕು, please help me.", "kn-IN"),
    ("synth-04-hi-en-kn", "आज का weather अच्छा है, ನೀವು ಹೇಳಿ.", "hi-IN"),
    ("synth-05-sa-en-hi", "अहं गच्छामि, but कल नहीं.", "hi-IN"),
    ("synth-06-sa", "अहं विद्यालयं गच्छामि।", "hi-IN"),
    ("synth-07-hi", "मेरा नाम अंशु है। मैं संस्कृत सीख रहा हूँ।", "hi-IN"),
]

COMBOS: list[tuple[str, str, str]] = [
    ("unknown", "transcribe", settings.sarvam_stt_model),
    ("unknown", "codemix", settings.sarvam_stt_model),
    ("sa-IN", "transcribe", settings.sarvam_stt_model),
    ("unknown", "codemix", "saaras:v3"),
]


def _decode_tts(audio_b64: str) -> bytes:
    raw = base64.b64decode(audio_b64)
    if raw[:4] == b"RIFF":
        return raw
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(22050)
        w.writeframes(raw)
    return buf.getvalue()


async def synthesize(client: SarvamClient) -> list[Path]:
    """Render Bulbul stand-ins; return all wav paths present afterwards."""
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    made: list[Path] = []
    for stem, text, lang in LINES:
        wav = FIXTURE_DIR / f"{stem}.wav"
        txt = FIXTURE_DIR / f"{stem}.txt"
        txt.write_text(text, encoding="utf-8")
        if wav.exists():
            made.append(wav)
            continue
        try:
            audio_b64 = await client.text_to_speech(text, language_code=lang)
        except SarvamError as exc:
            print(f"  synth {stem}: TTS failed ({exc}); skipping", flush=True)
            continue
        wav.write_bytes(_decode_tts(audio_b64))
        print(f"  synth {stem}: wrote {wav.name} ({lang})", flush=True)
        made.append(wav)
    return made


async def transcribe_combo(
    client: SarvamClient, audio: bytes, language_code: str, mode: str, model: str
) -> dict:
    t0 = time.perf_counter()
    try:
        out = await client.speech_to_text(
            audio_data=audio,
            language_code=language_code,
            mode=mode,
            model=model,
            filename="codemix.wav",
        )
        return {
            "transcript": out.get("transcript") or "",
            "language_code": out.get("language_code") or "",
            "language_probability": out.get("language_probability"),
            "ms": round((time.perf_counter() - t0) * 1000.0, 1),
        }
    except SarvamError as exc:
        return {
            "error": f"{type(exc).__name__}: {exc}",
            "ms": round((time.perf_counter() - t0) * 1000.0, 1),
        }


async def run_all(client: SarvamClient, files: list[Path]) -> list[dict]:
    results: list[dict] = []
    for wav in files:
        intended = ""
        sidecar = wav.with_suffix(".txt")
        if sidecar.exists():
            intended = sidecar.read_text(encoding="utf-8").strip()
        audio = wav.read_bytes()
        entry: dict = {"file": wav.name, "intended": intended,
                       "bytes": len(audio), "combos": []}
        for language_code, mode, model in COMBOS:
            out = await transcribe_combo(client, audio, language_code, mode, model)
            entry["combos"].append(
                {"language_code": language_code, "mode": mode,
                 "model": model, **out}
            )
        results.append(entry)
    return results


def print_table(results: list[dict]) -> None:
    for entry in results:
        print(f"\n  == {entry['file']} ({entry['bytes']} bytes)")
        print(f"     intended: {entry['intended']}")
        for c in entry["combos"]:
            tag = f"({c['language_code']}, {c['mode']}) on {c['model']}"
            if "error" in c:
                print(f"     [{tag}] ERROR {c['error']}")
                continue
            lang = c["language_code"] or "-"
            p = c["language_probability"]
            ps = f" p={p}" if p is not None else ""
            print(f"     [{tag}] -> [{lang}{ps}] {c['transcript']}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Saaras codemix-mode bench")
    p.add_argument("--synthesize", action="store_true",
                   help="render Bulbul stand-in wavs first (keeps existing files)")
    p.add_argument("--out", default="results/bench_codemix.json",
                   help="JSON output path (default results/bench_codemix.json)")
    return p


def main(argv: Optional[list[str]] = None) -> int:
    # Devanagari on a Windows console: the default cp1252 codec cannot print
    # it and print_table would die after the vendor calls (which cost money).
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    args = build_parser().parse_args(argv)
    if not settings.sarvam_api_key:
        print("SARVAM_API_KEY not configured", file=sys.stderr)
        return 1
    client = SarvamClient(api_key=settings.sarvam_api_key)

    async def go() -> list[dict]:
        try:
            if args.synthesize:
                await synthesize(client)
            files = sorted(FIXTURE_DIR.glob("*.wav")) if FIXTURE_DIR.is_dir() else []
            if not files:
                return []
            return await run_all(client, files)
        finally:
            await client.close()

    try:
        results = asyncio.run(go())
    except (SarvamError, Exception) as exc:
        print(f"codemix bench failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    if not results:
        print(f"no fixtures in {FIXTURE_DIR} (run with --synthesize)", file=sys.stderr)
        return 2
    print_table(results)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "bench": "codemix",
        "model_v4": settings.sarvam_stt_model,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files": results,
    }
    out_path.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n  wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
