import io
import subprocess
import wave
from unittest.mock import patch

import pytest

from app.services.audio_meta import audio_seconds
from app.services.recite_audio import AudioInputError, Recording, prepare


def recording(seconds):
    # Continuous non-silent PCM with a pause around 26 seconds.
    pcm = b"\xe8\x03" * (seconds * 16000)
    if seconds > 27:
        pcm = pcm[:26 * 32000] + b"\0\0" * 16000 + pcm[27 * 32000:]
    buf = io.BytesIO()
    with wave.open(buf, "wb") as stream:
        stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(16000)
        stream.writeframes(pcm)
    return buf.getvalue(), pcm


def test_short_recording_bypasses_decoder():
    audio, _ = recording(30)
    with patch("subprocess.run") as decode:
        result = prepare(audio)
    decode.assert_not_called()
    assert result == Recording([(audio, "rec.wav")], 30)


def test_pause_boundary_preserves_every_sample_without_overlap():
    audio, pcm = recording(63)
    result = prepare(audio)
    assert result.seconds == 63
    assert 26 <= audio_seconds(result.chunks[0][0]) < 27
    reconstructed = []
    for chunk, _ in result.chunks:
        assert audio_seconds(chunk) <= 28
        with wave.open(io.BytesIO(chunk), "rb") as stream:
            reconstructed.append(stream.readframes(stream.getnframes()))
    assert b"".join(reconstructed) == pcm


def test_m4a_long_recording_is_decoded_and_chunked():
    audio, _ = recording(35)
    encoded = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-c:a", "aac",
                              "-f", "mp4", "-movflags", "frag_keyframe+empty_moov", "pipe:1"],
                             input=audio, capture_output=True, check=True).stdout
    result = prepare(encoded)
    assert len(result.chunks) == 2
    assert result.seconds == pytest.approx(35, abs=0.15)
    assert all(audio_seconds(chunk) <= 28 for chunk, _ in result.chunks)


def test_split_does_not_leave_a_tiny_tail():
    audio, _ = recording(55)
    result = prepare(audio)
    assert all(2 <= audio_seconds(chunk) <= 28 for chunk, _ in result.chunks)
    assert sum(audio_seconds(chunk) for chunk, _ in result.chunks) == pytest.approx(55)


def test_bad_audio_and_missing_decoder_have_distinct_errors():
    with pytest.raises(AudioInputError, match="Could not read"):
        prepare(b"not audio")
    audio, _ = recording(31)
    with patch("subprocess.run", side_effect=FileNotFoundError):
        with pytest.raises(RuntimeError, match="FFmpeg"):
            prepare(audio)


def test_unknown_duration_cannot_bypass_decoded_duration_cap():
    fake_pcm = b"\0\0" * 601 * 16000
    with patch("subprocess.run", return_value=subprocess.CompletedProcess([], 0, fake_pcm, b"")):
        with pytest.raises(AudioInputError, match="10 minutes"):
            prepare(b"unknown format")
