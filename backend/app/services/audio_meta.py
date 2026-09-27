"""How long is an uploaded recording? Read it from the container header.

The STT quota is metered in seconds of speech, and both upload routes guessed
them as ``bytes / 32000`` — right only for 16 kHz 16-bit WAV. Talk records
32 kbps AAC in an .m4a (`Conversation.tsx`), eight times denser, so a
20-second turn was metered as 2.5 s. The container already records its own
duration; this reads it for the two formats the app uploads, and returns None
for anything else so callers keep the old estimate.

The same number enforces Saaras' REST ceiling: past 30 s it answers 400
"Audio duration exceeds the maximum limit of 30 seconds", which the app used
to show as a network failure.
"""

from __future__ import annotations

import struct
from typing import Optional

#: Saaras REST refuses longer audio (probed 2026-09-23 on saaras:v4).
REST_MAX_SECONDS = 30.0

# A header claiming a day of audio is corrupt or a streaming placeholder, not
# a recording — trusting it would refuse a valid upload.
_SANE_MAX_SECONDS = 24 * 3600.0


def audio_seconds(data: bytes) -> Optional[float]:
    """Duration from a WAV or MP4/M4A header, or None when neither parses."""
    secs: Optional[float] = None
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        secs = _wav_seconds(data)
    elif len(data) >= 8 and data[4:8] == b"ftyp":
        secs = _mp4_seconds(data)
    if secs is None or not 0.0 <= secs < _SANE_MAX_SECONDS:
        return None
    return secs


def estimate_seconds(data: bytes) -> float:
    """Seconds to meter: the header's answer, else the old 16 kHz PCM guess."""
    secs = audio_seconds(data)
    return secs if secs is not None else len(data) / (16000 * 2)


def _wav_seconds(data: bytes) -> Optional[float]:
    byte_rate = 0
    pos = 12
    while pos + 8 <= len(data):
        chunk = data[pos:pos + 4]
        size = struct.unpack_from("<I", data, pos + 4)[0]
        body = pos + 8
        if chunk == b"fmt " and size >= 16 and body + 16 <= len(data):
            byte_rate = struct.unpack_from("<I", data, body + 8)[0]
        elif chunk == b"data":
            if not byte_rate:
                return None
            # A streaming writer leaves 0 or 0xFFFFFFFF here; the bytes that
            # actually arrived are the truth either way.
            present = len(data) - body
            if size == 0 or size > present:
                size = present
            return size / byte_rate
        pos = body + size + (size & 1)
    return None


def _mp4_seconds(data: bytes) -> Optional[float]:
    moov = _find_box(data, 0, len(data), b"moov")
    if moov is None:
        return None
    mvhd = _find_box(data, moov[0], moov[1], b"mvhd")
    if mvhd is None:
        return None
    start, end = mvhd
    if data[start] == 1:            # version 1: 64-bit times and duration
        if start + 32 > end:
            return None
        timescale = struct.unpack_from(">I", data, start + 20)[0]
        duration = struct.unpack_from(">Q", data, start + 24)[0]
        unknown = 0xFFFFFFFFFFFFFFFF
    else:                           # version 0: 32-bit
        if start + 20 > end:
            return None
        timescale = struct.unpack_from(">I", data, start + 12)[0]
        duration = struct.unpack_from(">I", data, start + 16)[0]
        unknown = 0xFFFFFFFF
    if not timescale or duration == unknown:
        return None
    return duration / timescale


def _find_box(data: bytes, start: int, end: int, kind: bytes) -> Optional[tuple[int, int]]:
    """``(payload_start, payload_end)`` of the first ``kind`` box in a span."""
    pos = start
    while pos + 8 <= end:
        size = struct.unpack_from(">I", data, pos)[0]
        header = 8
        if size == 1:               # 64-bit "largesize" follows the type
            if pos + 16 > end:
                return None
            size = struct.unpack_from(">Q", data, pos + 8)[0]
            header = 16
        elif size == 0:             # box runs to the end of its parent
            size = end - pos
        if size < header:
            return None
        if data[pos + 4:pos + 8] == kind:
            return pos + header, min(pos + size, end)
        pos += size
    return None
