"""Prepare long recitations as ordered, non-overlapping short WAV uploads."""

from __future__ import annotations

import array
import io
import subprocess
import sys
import wave
from dataclasses import dataclass

from app.services.audio_meta import REST_MAX_SECONDS, audio_seconds

MAX_BYTES = 20 * 1024 * 1024
MAX_SECONDS = 600
RATE = 16000
CHUNK_SECONDS = 28  # Margin below Sarvam's 30-second limit.


class AudioInputError(ValueError):
    pass


@dataclass
class Recording:
    chunks: list[tuple[bytes, str]]
    seconds: float


def validate(audio: bytes) -> None:
    if not audio:
        raise AudioInputError("Empty recording. Record your recitation first.")
    if len(audio) > MAX_BYTES:
        raise AudioInputError("Recording is too large. Use a recording smaller than 20 MB.")
    measured = audio_seconds(audio)
    if measured is not None and measured > MAX_SECONDS:
        raise AudioInputError("Recordings can be up to 10 minutes long. Try a shorter passage.")


def prepare(audio: bytes) -> Recording:
    validate(audio)
    measured = audio_seconds(audio)
    if measured is not None and 0 < measured <= REST_MAX_SECONDS:
        return Recording([(audio, "rec.wav" if audio[:4] == b"RIFF" else "rec.m4a")], measured)
    # Decode compressed formats too. Cap the decoded output so a forged or
    # missing container duration cannot allocate unbounded PCM in memory.
    try:
        decoded = subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-i", "pipe:0", "-t", str(MAX_SECONDS + 1),
             "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
            input=audio, capture_output=True, timeout=45, check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("FFmpeg is required for long recitations") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioInputError("Could not process the recording. Try recording again.") from exc
    if decoded.returncode or not decoded.stdout:
        raise AudioInputError("Could not read the recording. Try recording again.")
    pcm = decoded.stdout
    seconds = len(pcm) / (RATE * 2)
    if seconds > MAX_SECONDS:
        raise AudioInputError("Recordings can be up to 10 minutes long. Try a shorter passage.")
    samples = array.array("h")
    samples.frombytes(pcm)
    if sys.byteorder != "little":
        samples.byteswap()
    chunks = []
    start = 0
    while start < len(samples):
        end = min(start + CHUNK_SECONDS * RATE, len(samples))
        if end < len(samples):
            # Prefer a quiet 25 ms window in the final six seconds. When
            # speech is continuous, use the fixed boundary. No overlapping
            # audio means no duplicate words or extra billed seconds.
            block = RATE // 40
            quiet = []
            for pos in range(start + 22 * RATE, end - block + 1, block):
                energy = sum(int(v) ** 2 for v in samples[pos:pos + block]) / block
                if energy <= 400 ** 2:
                    quiet.append((energy, pos + block // 2))
            if quiet:
                end = min(quiet)[1]
            # Do not leave a tiny final request that STT cannot recognize.
            if len(samples) - end < 2 * RATE:
                end = len(samples) - 2 * RATE
        payload = pcm[start * 2:end * 2]
        output = io.BytesIO()
        with wave.open(output, "wb") as stream:
            stream.setnchannels(1)
            stream.setsampwidth(2)
            stream.setframerate(RATE)
            stream.writeframes(payload)
        chunks.append((output.getvalue(), f"rec-{len(chunks) + 1}.wav"))
        start = end
    return Recording(chunks, seconds)
