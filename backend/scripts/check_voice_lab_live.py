"""Small live provider checks using synthetic prompts; never record a microphone.

Run from backend/: .venv/Scripts/python.exe scripts/check_voice_lab_live.py
Add --search to exercise Friend's grounded lookup, --stt for a synthetic voice
turn (requires ffmpeg). Provider requests use the configured accounts/billing.
No audio, transcripts, credentials or provider error bodies are saved/printed.
"""
import argparse
import asyncio
import base64
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.voice_lab.config import LabConfig
from app.voice_lab.providers import SpeechOutput, provider_error
from app.voice_lab.session import STRATEGIES, PureSarvamSession


CONFIGS = {
    "Guru": LabConfig(),
    "Mother": LabConfig(pipeline=2, persona="mother", speaker="te-IN-ShrutiNeural", pace=0.95, pitch=1),
    "Friend": LabConfig(pipeline=3, persona="friend", speaker="Puck", pitch=0, web_search=True),
    "Scholar": LabConfig(pipeline=4, persona="scholar", tts_model="bulbul:v4-flash", speaker="shubh_hi_devotional", language="kn-IN", thinking_budget=1024, web_search=True),
}


async def meter(*args):
    # No learner session exists for these synthetic diagnostics.
    pass


async def reply(name, config, search=False):
    done = asyncio.Event()
    audio = text = 0
    grounded = False
    errors = []

    async def send(message):
        nonlocal audio, text, grounded
        kind = message["type"]
        if kind == "audio":
            data = base64.b64decode(message["data"])
            if message["codec"] == "pcm":
                assert len(data) % 2 == 0 and not data.startswith(b"RIFF")
            audio += len(data)
        elif kind == "transcript" and message["role"] == "assistant":
            text += len(message["text"])
        elif kind == "notice" and "source pages" in message["message"]:
            grounded = True
        elif kind in ("error", "fatal"):
            errors.append(message["message"]); done.set()
        elif kind == "turn_complete" and (not search or grounded):
            done.set()

    session = STRATEGIES[config.pipeline](config, send, meter)
    try:
        await asyncio.wait_for(session.start(), 30)
        prompt = "Search the web for the latest official Python release. Use web_search to verify it, then answer briefly in Sanskrit." if search else "नमस्ते। भवतः नाम किम्?"
        await session.text(prompt)
        await asyncio.wait_for(done.wait(), 55)
        if errors:
            raise RuntimeError(errors[-1])
        assert audio > 0 and text > 0, "The reply must include playable audio and a caption"
        print(f"{name}: PASS ({audio} audio bytes, {text} caption characters" + (", grounded search verified)" if search else ")"), flush=True)
    finally:
        await session.close()


async def stt():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("The synthetic STT check requires ffmpeg.")
    audio = bytearray()
    output = SpeechOutput()
    async def collect(message): audio.extend(base64.b64decode(message["data"]))
    try:
        await output.speak("नमस्ते। मम नाम रामः अस्ति।", LabConfig(), collect)
    finally:
        await output.close()
    converted = await asyncio.to_thread(subprocess.run, [ffmpeg, "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-f", "s16le", "-ar", "16000", "pipe:1"], input=bytes(audio), capture_output=True, check=True)
    pcm = converted.stdout + b"\0" * 32000
    heard = asyncio.Event()
    async def send(message):
        if message["type"] == "transcript" and message["role"] == "user" and message["text"]:
            heard.set()
    session = PureSarvamSession(LabConfig(), send, meter)
    async def no_reply(text): pass
    session.text = no_reply
    try:
        await session.start()
        for offset in range(0, len(pcm), 3200):
            await session.audio(pcm[offset:offset + 3200])
            await asyncio.sleep(0.1)
        await session.end_audio()
        await asyncio.wait_for(heard.wait(), 10)
        print("Guru STT: PASS (synthetic PCM received a Sanskrit caption)", flush=True)
    finally:
        await session.close()


async def main(args):
    failed = False
    checks = [(name, lambda name=name, config=CONFIGS[name]: reply(name, config)) for name in args.companion]
    if args.search: checks.append(("Friend search", lambda: reply("Friend search", CONFIGS["Friend"], search=True)))
    if args.stt: checks.append(("Guru STT", stt))
    for name, check in checks:
        try:
            await asyncio.wait_for(check(), 75)
        except Exception as exc:
            failed = True
            print(f"{name}: FAIL ({type(exc).__name__}: {provider_error(exc)})", flush=True)
    return int(failed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--search", action="store_true")
    parser.add_argument("--stt", action="store_true")
    parser.add_argument("--companion", nargs="+", choices=list(CONFIGS), default=list(CONFIGS))
    sys.exit(asyncio.run(main(parser.parse_args())))
