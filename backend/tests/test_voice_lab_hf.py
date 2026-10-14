"""ZeroGPU adapter and Space helpers, without allocating a GPU or using HF."""
import asyncio
import base64
import importlib.util
import io
from pathlib import Path
import wave

import pytest

from app.config import settings
from app.voice_lab.config import LabConfig
from app.voice_lab.indic_parler import IndicParlerAdapter, decode_space_audio, validate_space_id

SPACE_DIR = Path(__file__).resolve().parents[2] / "deploy" / "hf-voice-lab"
spec = importlib.util.spec_from_file_location("voice_lab_audio_payload", SPACE_DIR / "audio_payload.py")
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)


def test_wav_payload_roundtrip():
    payload = helpers.wav_payload(b"\0\0" * 100, 44100)
    encoded, rate = decode_space_audio(payload)
    assert rate == 44100
    with wave.open(io.BytesIO(base64.b64decode(encoded))) as audio:
        assert audio.getnframes() == 100
        assert audio.getnchannels() == 1
        assert audio.getsampwidth() == 2


@pytest.mark.parametrize("payload", [None, {}, {"codec": "mp3"},
    {"codec": "wav", "sample_rate": 44100, "audio_base64": "invalid"},
    {"codec": "wav", "sample_rate": 44100, "audio_base64": base64.b64encode(b"not-a-wav").decode()}])
def test_rejects_invalid_space_audio(payload):
    with pytest.raises(RuntimeError):
        decode_space_audio(payload)


def test_validate_inputs_and_small_gpu_reservation():
    assert helpers.validate_inputs("  नमस्ते।  ", "Aryan speaks Sanskrit") == ("नमस्ते।", "Aryan speaks Sanskrit")
    for text in ("", "x" * 301):
        with pytest.raises(ValueError): helpers.validate_inputs(text, "voice")
    assert helpers.gpu_duration("नमस्ते।", "voice") == 10
    assert helpers.gpu_duration("x" * 300, "voice") == 30


@pytest.mark.parametrize("value", ["https://evil.example", "../private", "owner/space/path", "owner/a?token=secret"])
def test_space_id_is_not_an_arbitrary_url(value):
    with pytest.raises(RuntimeError): validate_space_id(value)


def test_authenticated_gradio_audio_and_no_file_download(monkeypatch):
    async def run():
        sent, calls = [], []
        class Job:
            def result(self, timeout):
                assert timeout == 120
                return helpers.wav_payload(b"\0\0" * 100, 44100)
        class Client:
            def __init__(self, space, **kwargs):
                assert space == "tester/sanskrit-voice-lab"
                assert kwargs["token"] == "test-token"
                assert kwargs["download_files"] is False
                assert kwargs["analytics_enabled"] is False
            def submit(self, text, description, api_name):
                calls.append((text, description, api_name))
                return Job()
            def close(self): calls.append("closed")
        monkeypatch.setattr("gradio_client.Client", Client)
        monkeypatch.setattr(settings, "hf_token", "test-token")
        monkeypatch.setattr(settings, "voice_lab_parler_space", "tester/sanskrit-voice-lab")
        async def send(message): sent.append(message)
        adapter = IndicParlerAdapter()
        await adapter.speak("रामः।", LabConfig(speaker="Aryan"), send)
        assert calls[0][0] == "रामः।"  # Native Sanskrit, no Telugu routing
        assert "Aryan speaks Sanskrit" in calls[0][1]
        assert calls[0][2] == "/synthesize"
        assert sent[0]["codec"] == "wav" and sent[0]["sample_rate"] == 44100
        await adapter.close()
        assert calls[-1] == "closed"
    asyncio.run(run())


def test_hf_quota_error_is_actionable(monkeypatch):
    async def run():
        class Job:
            def result(self, **kwargs): raise ValueError("ZeroGPU quota exceeded")
            def cancel(self): pass
        class Client:
            def __init__(self, *args, **kwargs): pass
            def submit(self, *args, **kwargs): return Job()
            def close(self): pass
        monkeypatch.setattr("gradio_client.Client", Client)
        monkeypatch.setattr(settings, "hf_token", "test-token")
        monkeypatch.setattr(settings, "voice_lab_parler_space", "tester/sanskrit-voice-lab")
        async def send(message): raise AssertionError("Must not send audio after quota failure")
        with pytest.raises(RuntimeError, match="allowance is exhausted"):
            await IndicParlerAdapter().speak("नमस्ते", LabConfig(), send)
    asyncio.run(run())


def test_cancellation_cancels_queued_job(monkeypatch):
    async def run():
        import threading
        started, finished = threading.Event(), threading.Event()
        class Job:
            cancelled = False
            def result(self, **kwargs):
                started.set()
                finished.wait(5)
                return helpers.wav_payload(b"\0\0", 44100)
            def cancel(self): self.cancelled = True; finished.set()
        job = Job()
        class Client:
            def __init__(self, *args, **kwargs): pass
            def submit(self, *args, **kwargs): return job
            def close(self): pass
        monkeypatch.setattr("gradio_client.Client", Client)
        monkeypatch.setattr(settings, "hf_token", "test-token")
        monkeypatch.setattr(settings, "voice_lab_parler_space", "tester/sanskrit-voice-lab")
        async def send(message): raise AssertionError("Cancelled synthesis must not send audio")
        adapter = IndicParlerAdapter()
        task = asyncio.create_task(adapter.speak("नमस्ते", LabConfig(), send))
        assert await asyncio.to_thread(started.wait, 3)
        task.cancel()
        with pytest.raises(asyncio.CancelledError): await task
        assert job.cancelled and adapter.client is None
    asyncio.run(run())


def test_cancelling_during_client_setup_releases_late_resource(monkeypatch):
    async def run():
        import threading
        started, released, closed = threading.Event(), threading.Event(), threading.Event()
        class Client:
            def __init__(self, *args, **kwargs): started.set(); released.wait(3)
            def close(self): closed.set()
        monkeypatch.setattr("gradio_client.Client", Client)
        monkeypatch.setattr(settings, "hf_token", "test-token")
        monkeypatch.setattr(settings, "voice_lab_parler_space", "tester/sanskrit-voice-lab")
        async def send(message): raise AssertionError("Must not send cancelled audio")
        task = asyncio.create_task(IndicParlerAdapter().speak("नमस्ते", LabConfig(), send))
        assert await asyncio.to_thread(started.wait, 2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError): await task
        released.set()
        assert await asyncio.to_thread(closed.wait, 2)
    asyncio.run(run())
