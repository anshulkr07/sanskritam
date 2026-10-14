"""One short live Sanskrit synthesis, using the configured HF account quota.

Writes a verification WAV under results/voice_lab; production adapters never
write audio files. Run explicitly, not as part of the offline test suite.
"""
import asyncio
import base64
import io
import json
from pathlib import Path
import sys
import time
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.voice_lab.config import LabConfig
from app.voice_lab.indic_parler import IndicParlerAdapter


async def check():
    from huggingface_hub import HfApi
    api = HfApi(token=settings.hf_token)
    before = await asyncio.to_thread(api.get_zero_gpu_quota)
    output = []
    async def send(message): output.append(message)
    adapter = IndicParlerAdapter()
    started = time.monotonic()
    try:
        await adapter.speak("नमस्ते।", LabConfig(pipeline=2, open_provider="ai4bharat_indic_parler", speaker="Aryan"), send)
    finally:
        await adapter.close()
    elapsed = time.monotonic() - started
    audio = base64.b64decode(output[0]["data"])
    with wave.open(io.BytesIO(audio)) as wav:
        duration = wav.getnframes() / wav.getframerate()
        rate = wav.getframerate()
    target = Path(__file__).resolve().parents[2] / "results" / "voice_lab" / "hf-smoke.wav"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(audio)
    after = await asyncio.to_thread(api.get_zero_gpu_quota)
    return {"space": settings.voice_lab_parler_space, "audio_path": str(target), "sample_rate": rate,
            "speech_seconds": round(duration, 2), "request_seconds": round(elapsed, 2),
            "quota_before_seconds": before.remaining, "quota_after_seconds": after.remaining}


if __name__ == "__main__":
    print(json.dumps(asyncio.run(check())))
