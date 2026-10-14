"""Voice activity from the recording itself (handover_games_daily_multiplayer
§8: "Timing must come from recorded audio timestamps and measured voice
activity, not network arrival gaps or transcript punctuation").

The batch STT returns no timestamps, so rubric v2's continuity and rhythm
components read the decoded audio: 20 ms frames, an energy threshold set
from the recording's own noise floor, short dips bridged, clicks dropped.
The result is a list of voiced spans in seconds from the start of the file.
Deterministic: the same bytes always give the same spans.
"""

from __future__ import annotations

import array
import io
import math
import subprocess
import sys
import wave

RATE = 16000
FRAME_S = 0.02
BRIDGE_S = 0.25      # dips shorter than this are inside a word, not a pause
MIN_SPAN_S = 0.12    # voiced runs shorter than this are clicks or breaths
ABS_FLOOR = 250.0    # RMS below this (int16 scale) is never speech
MAX_SECONDS = 601


def _decode(audio: bytes) -> array.array | None:
    """16 kHz mono int16 samples, or None when the audio cannot be read."""
    if audio[:4] == b"RIFF":
        try:
            with wave.open(io.BytesIO(audio), "rb") as w:
                if w.getsampwidth() == 2 and w.getnchannels() == 1 and w.getframerate() == RATE:
                    samples = array.array("h")
                    samples.frombytes(w.readframes(w.getnframes()))
                    if sys.byteorder != "little":
                        samples.byteswap()
                    return samples
        except (wave.Error, EOFError):
            pass
    try:
        out = subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-i", "pipe:0", "-t", str(MAX_SECONDS),
             "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
            input=audio, capture_output=True, timeout=45, check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if out.returncode or not out.stdout:
        return None
    samples = array.array("h")
    samples.frombytes(out.stdout[: len(out.stdout) // 2 * 2])
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def frame_energies(samples: array.array) -> list[float]:
    n = int(RATE * FRAME_S)
    out = []
    for pos in range(0, len(samples) - n + 1, n):
        block = samples[pos:pos + n]
        out.append(math.sqrt(sum(v * v for v in block) / n))
    return out


def spans_from_energies(energies: list[float]) -> list[tuple[float, float]]:
    if not energies:
        return []
    ordered = sorted(energies)
    floor = ordered[int(0.1 * (len(ordered) - 1))]
    loud = ordered[int(0.95 * (len(ordered) - 1))]
    threshold = max(ABS_FLOOR, floor * 3.0, loud * 0.1)
    voiced = [e >= threshold for e in energies]
    spans: list[list[float]] = []
    start = None
    for i, v in enumerate(voiced + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            spans.append([start * FRAME_S, i * FRAME_S])
            start = None
    merged: list[list[float]] = []
    for s in spans:
        if merged and s[0] - merged[-1][1] < BRIDGE_S:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(round(a, 2), round(b, 2)) for a, b in merged if b - a >= MIN_SPAN_S]


def voiced_spans(audio: bytes) -> list[tuple[float, float]] | None:
    """Voiced spans of a recording; None when it cannot be decoded."""
    samples = _decode(audio)
    if samples is None:
        return None
    return spans_from_energies(frame_energies(samples))
