"""Standalone Sarvam rap experiment; never modifies application speech settings.

Run from backend: .venv/Scripts/python.exe scripts/render_ram_rap.py
Requires numpy, the existing backend dependencies, and ffmpeg with rubberband.
Bulbul produces speech, not singing. Beat alignment/pitch are local DSP effects.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.services.sarvam import SarvamClient

LINES = [
    "जय जय राम, जय जय राम! हृदये गुञ्जति तव नाम।",
    "तालं तालं, पदं पदं! गायामि ते चरितं शुभम्।",
    "रामो वीरः, रामो धीरः! सत्यपथे सदा स्थिरः।",
    "लोभात् दूरः, क्रोधात् दूरः! करुणापूर्णो रघुवीरः।",
    "राज्यं त्यक्तं, वचनं रक्षितं! वनपथेऽपि नृपेण हसितम्।",
    "धनुर्हस्ते, धैर्यं चित्ते! रामस्य तेजो ममापि चित्ते।",
    "न मे लोभः, न मे भयम्! रामस्मरणं मम बलं परम्।",
    "उत्तिष्ठामि, प्रचलामि! सत्यं वदामि, शुभं चरामि।",
    "द्वेषं त्यजामि, प्रेम भजामि! सर्वेषां हितमाचरामि।",
    "जय जय राम, जय जय राम! मम जीवने तव नाम!",
]
RATE = 44100
PROFILES = [
    (1.08, .78, .5), (1.14, .74, .2), (1.16, .78, -.4),
    (1.12, .72, -.6), (1.14, .70, -.3), (1.18, .76, -.4),
    (1.12, .75, -.2), (1.20, .80, .2), (1.14, .74, .1),
    (1.06, .80, .7),
]


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        if w.getsampwidth() != 2:
            raise ValueError("Expected 16-bit PCM")
        rate, channels = w.getframerate(), w.getnchannels()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")
    return a.reshape(-1, channels).mean(axis=1).astype(np.float64) / 32768, rate


def write_wav(path, a):
    a = np.asarray(a)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1 if a.ndim == 1 else a.shape[1])
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype("<i2").tobytes())


def run_ffmpeg(*args):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *map(str, args)], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode(errors="replace")[:800])


def trim(a, rate):
    # Retain consonant attacks and final releases around the audible region.
    idx = np.flatnonzero(np.abs(a) > .006)
    if not len(idx):
        raise ValueError("Silent TTS output")
    return a[max(0, idx[0] - int(.055 * rate)):min(len(a), idx[-1] + int(.12 * rate))]


async def synthesize(out):
    client = SarvamClient(settings.sarvam_api_key)
    rows = []
    try:
        http = await client._client()
        http.timeout = 90
        for i, (text, (pace, temperature, semitones)) in enumerate(zip(LINES, PROFILES)):
            payload = dict(text=text, language_code=settings.tts_sanskrit_code,
                           speaker="shubh", model="bulbul:v3", pace=pace,
                           temperature=temperature, speech_sample_rate=RATE,
                           output_audio_codec="wav")
            raw = out / f"line_{i+1:02d}_raw.wav"
            request_path = raw.with_suffix(".request.json")
            if not (raw.exists() and request_path.exists() and json.loads(request_path.read_text(encoding="utf-8")) == payload):
                response = await http.post("/text-to-speech", json=payload)
                if response.status_code != 200:
                    raise RuntimeError(f"Sarvam returned {response.status_code}: {response.text[:400]}")
                audios = response.json().get("audios", [])
                if not audios:
                    raise RuntimeError("Sarvam returned no audio")
                raw.write_bytes(base64.b64decode(audios[0]))
                request_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            # Convert explicitly before decoding, for robust WAV codec handling.
            pcm = out / f"line_{i+1:02d}_pcm.wav"
            run_ffmpeg("-i", raw, "-ar", RATE, "-ac", 1, "-c:a", "pcm_s16le", pcm)
            samples, rate = read_wav(pcm)
            samples = trim(samples, rate)
            write_wav(pcm, samples)
            rows.append(dict(line=i+1, text=text, pace=pace, temperature=temperature,
                             pitch_semitones=semitones, raw_seconds=len(samples)/RATE))
            print(f"Rendered line {i+1}/10: {len(samples)/RATE:.2f}s", flush=True)
    finally:
        await client.close()
    return rows


def arrange(out, rows):
    # Two 4/4 bars per line, with a short rest before the next line.
    longest = max(r["raw_seconds"] for r in rows)
    bpm = min(128, max(96, int(480 / (longest / 1.22 + .18))))
    beat = 60 / bpm
    slot = 8 * beat
    intro = 4 * beat
    total = intro + len(rows) * slot + 4 * beat
    n = int(total * RATE)
    vocal = np.zeros(n)
    for i, row in enumerate(rows):
        target = slot - .18
        tempo = row["raw_seconds"] / target
        pitch = 2 ** (row["pitch_semitones"] / 12)
        rendered = out / f"line_{i+1:02d}_performed.wav"
        run_ffmpeg("-i", out / f"line_{i+1:02d}_pcm.wav", "-af",
                   f"rubberband=tempo={tempo:.6f}:pitch={pitch:.6f}:formant=preserved",
                   "-ar", RATE, "-ac", 1, "-c:a", "pcm_s16le", rendered)
        a, _ = read_wav(rendered)
        a = a[:int(target * RATE)]
        a *= min(2.5, .65 / max(.01, np.max(np.abs(a))))
        edge = min(int(.008 * RATE), len(a)//2)
        a[:edge] *= np.linspace(0, 1, edge)
        a[-edge:] *= np.linspace(1, 0, edge)
        start = int((intro + i * slot) * RATE)
        vocal[start:start+len(a)] += a
        row.update(start_seconds=round(start/RATE, 3), time_stretch_ratio=round(tempo, 4))
    write_wav(out / "ram_pathe_vocal.wav", vocal)

    rng = np.random.default_rng(108)
    music = np.zeros(n)

    def add(at, sound, gain=1):
        start = int(at * RATE)
        end = min(n, start + len(sound))
        if start < n:
            music[start:end] += gain * sound[:end-start]

    t = np.arange(int(.30*RATE))/RATE
    frequency = 48 + 85*np.exp(-t*30)
    kick = np.sin(2*np.pi*np.cumsum(frequency)/RATE)*np.exp(-t*14)
    t = np.arange(int(.16*RATE))/RATE
    noise = rng.normal(0, 1, len(t))
    snare = (.65*(noise-np.r_[0, noise[:-1]]) + .35*np.sin(2*np.pi*185*t))*np.exp(-t*28)
    t = np.arange(int(.045*RATE))/RATE
    noise = rng.normal(0, 1, len(t))
    hat = (noise-np.r_[0, noise[:-1]])*np.exp(-t*100)
    for b in range(int(total/beat)):
        at = b*beat
        if b % 4 in (0, 2):
            add(at, kick, .34)
        if b % 4 in (1, 3):
            add(at, snare, .075)
        add(at, hat, .035)
        add(at+beat*.52, hat, .023)
        if b % 8 == 6:
            add(at+beat*.75, kick, .20)
        # Original E-minor bass sequence with a gentle plucked overtone.
        freq = [82.4069, 82.4069, 65.4064, 73.4162][(b//4)%4]
        t = np.arange(int(beat*.72*RATE))/RATE
        bass = (np.sin(2*np.pi*freq*t) + .15*np.sin(2*np.pi*2*freq*t))
        bass *= (1-np.exp(-t*100))*np.exp(-t*5)
        add(at, bass, .105)
        if b%2 == 0:
            f = [329.6276, 391.9954, 493.8833, 293.6648][(b//2)%4]
            t = np.arange(int(beat*1.4*RATE))/RATE
            pluck = (np.sin(2*np.pi*f*t)+.25*np.sin(2*np.pi*2*f*t))*np.exp(-t*9)
            add(at, pluck, .030)
    write_wav(out / "ram_pathe_beat.wav", music)
    stereo = np.column_stack([.87*vocal + music, .87*vocal + music])
    # Small vocal room echo; stronger doubling on the opening/final hook.
    for delay, gain in ((.11, .075), (.23, .04)):
        d = int(delay*RATE)
        stereo[d:, 0] += vocal[:-d]*gain
        stereo[d+int(.013*RATE):, 1] += vocal[:-d-int(.013*RATE)]*gain
    fade = int(beat*2*RATE)
    stereo[-fade:] *= np.linspace(1, 0, fade)[:, None]
    stereo *= .93/max(.93, np.max(np.abs(stereo)))
    write_wav(out / "ram_pathe_mix.wav", stereo)
    run_ffmpeg("-i", out / "ram_pathe_mix.wav", "-af", "loudnorm=I=-16:TP=-1.5:LRA=9",
               "-ar", RATE, "-c:a", "libmp3lame", "-b:a", "192k", out / "ram_pathe_rap.mp3")
    manifest = dict(title="रामपथे", speaker="shubh", model="bulbul:v3",
                    language_code=settings.tts_sanskrit_code, bpm=bpm,
                    seconds=round(total, 3), sample_rate=RATE, lines=rows,
                    notes="Speech-based rap experiment. Pitch and beat alignment are postprocessing; no singing/emotion prompt was sent. Sanskrit uses configured Hindi fallback unless beta enabled.")
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "lyrics.txt").write_text("रामपथे\n\n" + "\n".join(LINES)+"\n", encoding="utf-8")
    print(f"Saved {out / 'ram_pathe_rap.mp3'} ({total:.1f}s, {bpm} BPM)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1]/"results"/"ram_rap_demo_20261012")
    args = parser.parse_args()
    if not settings.sarvam_api_key:
        raise SystemExit("SARVAM_API_KEY is not configured")
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required")
    args.out.mkdir(parents=True, exist_ok=True)
    rows = asyncio.run(synthesize(args.out))
    arrange(args.out, rows)


if __name__ == "__main__":
    main()
