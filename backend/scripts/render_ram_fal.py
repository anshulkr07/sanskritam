"""One Sanskrit singing comparison per fal model, with resumable queue jobs.

Run from backend: .venv/Scripts/python.exe scripts/render_ram_fal.py
Requires FAL_KEY in the environment or project .env. No automatic resubmission.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx
from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND / "results/ram_fal_comparison"
MODELS = {"ace_step": "fal-ai/ace-step", "minimax": "fal-ai/minimax-music/v2.6"}


def payloads():
    text = (BACKEND / "results/ram_rap_demo_20261012/lyrics.txt").read_text(encoding="utf-8")
    lines = [line.strip() for line in text.splitlines()[1:] if line.strip()]
    if len(lines) != 10:
        raise ValueError("Expected the original ten Sanskrit lines")
    lyrics = "[Chorus]\n" + "\n".join(lines[:2]) + "\n[Verse]\n" + "\n".join(lines[2:9]) + "\n[Chorus]\n" + lines[9]
    return {
        "ace_step": {"tags": "Sanskrit, Indian devotional melodic rap, warm expressive male singing, melodic chorus, natural breathing, tabla, hip hop drums, harmonium, acoustic plucked strings, warm bass, uplifting, intimate studio vocals, 92 BPM",
                     "lyrics": lyrics, "duration": 55, "number_of_steps": 27, "seed": 108},
        "minimax": {"prompt": "Original Sanskrit devotional melodic rap about Shri Ram, 92 BPM. Warm expressive adult male singer. Memorable sung chorus with held vowels and subtle vibrato, flowing melodic rap verses, natural breaths, connected phrasing. Gentle tabla, hip hop drums, warm bass, acoustic plucked strings and restrained harmonium. Intimate human studio performance, singer prominent. Preserve supplied Sanskrit lyrics in order, careful vowel lengths, visarga and consonant clusters. No translation or extra verses. Short instrumental intro and resolved ending. Avoid robotic narration and excessive autotune.",
                    "lyrics": lyrics, "lyrics_optimizer": False, "is_instrumental": False,
                    "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3"}},
    }


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def queue_url(url):
    parts = urlparse(url)
    if parts.scheme != "https" or parts.hostname != "queue.fal.run":
        raise ValueError("Unexpected queue URL; refusing to send credentials")
    return url


def checked(response):
    if response.status_code >= 400:
        raise RuntimeError(f"fal HTTP {response.status_code}: {response.text[:450]}")
    return response.json()


def generate(name, body, key):
    state_path = OUT / f"{name}_queue.json"
    request_path = OUT / f"{name}_request.json"
    result_path = OUT / f"{name}_result.json"
    existing = list(OUT.glob(f"ram_pathe_{name}.*"))
    if existing:
        print(f"{name}: already saved {existing[0]}", flush=True)
        return
    with httpx.Client(headers={"Authorization": f"Key {key}"}, timeout=60) as client:
        if state_path.exists():
            if json.loads(request_path.read_text(encoding="utf-8")) != body:
                raise RuntimeError("Saved job uses different inputs; use a new output folder")
            state = json.loads(state_path.read_text(encoding="utf-8"))
            print(f"{name}: resuming saved request", flush=True)
        else:
            write_json(request_path, body)
            # One submission only. If its response is lost, inspect fal history before retrying.
            state = checked(client.post(f"https://queue.fal.run/{MODELS[name]}", json=body))
            write_json(state_path, state)
            print(f"{name}: submitted {state['request_id']}", flush=True)
        deadline = time.monotonic() + 900
        previous = None
        while True:
            status = checked(client.get(queue_url(state["status_url"])))
            current = status.get("status")
            if current != previous:
                print(f"{name}: {current}", flush=True)
                previous = current
            if current == "COMPLETED":
                if status.get("error"):
                    raise RuntimeError(f"{name}: {status['error']}")
                break
            if time.monotonic() >= deadline:
                raise RuntimeError("Wait timed out; rerun to resume the saved request")
            time.sleep(5)
        result = checked(client.get(queue_url(state["response_url"])))
        write_json(result_path, result)
    audio = result.get("audio", {})
    url = audio.get("url")
    if not url or urlparse(url).scheme != "https":
        raise RuntimeError("No valid generated audio URL")
    # Separate client: never send API credentials to the media host.
    with httpx.Client(timeout=120, follow_redirects=True) as media:
        response = media.get(url)
        response.raise_for_status()
    codec = audio.get("content_type", "") + response.headers.get("content-type", "")
    suffix = ".mp3" if "mpeg" in codec or urlparse(url).path.lower().endswith(".mp3") else ".wav"
    path = OUT / f"ram_pathe_{name}{suffix}"
    path.write_bytes(response.content)
    print(f"{name}: saved {path} ({len(response.content)} bytes)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=[*MODELS, "all"], default="all")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    bodies = payloads()
    names = list(MODELS) if args.model == "all" else [args.model]
    if args.dry_run:
        for name in names:
            write_json(OUT / f"{name}_preview.json", bodies[name])
        print("Prepared inputs; no API calls made.")
        return
    values = {}
    for path in (BACKEND.parent / ".env", BACKEND / ".env"):
        if path.exists():
            values.update(dotenv_values(path))
    key = os.environ.get("FAL_KEY") or values.get("FAL_KEY")
    if not key:
        raise SystemExit("FAL_KEY is not configured")
    errors = []
    for name in names:
        try:
            generate(name, bodies[name], key)
        except Exception as exc:
            print(f"{name}: {exc}", flush=True)
            errors.append(name)
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
