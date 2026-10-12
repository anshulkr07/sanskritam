"""Generate actual sung vocals with Eleven Music; separate from Sarvam TTS.

Set ELEVENLABS_API_KEY in the project .env (paid Music API access required).
Run: .venv/Scripts/python.exe scripts/render_ram_song.py [--dry-run]
Sanskrit accuracy is experimental and must be checked in the resulting audio.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import httpx
from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]


def request_body():
    lyrics = (BACKEND / "results/ram_rap_demo_20261012/lyrics.txt").read_text(encoding="utf-8")
    prompt = """Create an original Sanskrit devotional melodic rap song about Shri Ram.
Natural, expressive adult male singing voice, warm mid register, earnest and
uplifting delivery. Sing the opening and closing hook with a memorable melody,
held vowels, subtle vibrato and tasteful Indian melodic ornaments. Perform the
verses as melodic rap with natural breathing, connected phrasing and dynamic
emphasis. The performance should feel like a singer performing in a studio.
Use a relaxed 92 BPM groove, gentle tabla and hip-hop drums, warm bass,
acoustic plucked strings and restrained harmonium. Keep the singer prominent.
Avoid robotic narration, spoken voiceover, excessive autotune, metallic
vocals, choppy edits, EDM drops and rigid syllable timing. Compose the melody
around the words; leave space for breaths. Short instrumental introduction
and a resolved ending. Sing only the supplied Sanskrit lyrics, preserving
all words and their order. Do not sing the title, translate into Hindi,
add English lyrics or add extra verses. Pronounce final Sanskrit vowels,
visarga and consonant clusters carefully. The title is Ramapathe.

LYRICS (the first line is the title, not sung):
""" + lyrics
    return {"model_id": "music_v2_5", "music_length_ms": 55000,
            "force_instrumental": False, "prompt": prompt}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    out = BACKEND / "results/ram_song_demo"
    out.mkdir(parents=True, exist_ok=True)
    body = request_body()
    if len(body["prompt"]) > 4100:
        raise SystemExit("Prompt exceeds provider character limit")
    request_path = out / "request.json"
    request_path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.dry_run:
        print(f"Prepared {request_path}; no API call made.")
        return
    values = {}
    for path in (BACKEND.parent / ".env", BACKEND / ".env"):
        if path.exists():
            values.update(dotenv_values(path))
    key = os.environ.get("ELEVENLABS_API_KEY") or values.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is not configured. Add it to the project .env; do not paste it in chat.")
    # No automatic retries: avoid duplicating a paid generation after a timeout.
    with httpx.Client(timeout=300) as client:
        response = client.post("https://api.elevenlabs.io/v1/music",
                               headers={"xi-api-key": key}, json=body,
                               params={"output_format": "mp3_44100_128"})
    if response.status_code != 200:
        raise SystemExit(f"Music generation failed (HTTP {response.status_code}).")
    if "json" in response.headers.get("content-type", "") or len(response.content) < 1000:
        raise SystemExit("Provider returned an unexpected audio response")
    audio_path = out / "ram_pathe_sung.mp3"
    audio_path.write_bytes(response.content)
    print(f"Saved {audio_path}. Listen and check Sanskrit pronunciation before use.")


if __name__ == "__main__":
    main()
