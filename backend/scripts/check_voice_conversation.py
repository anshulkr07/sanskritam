"""Synthetic multi-turn voice diagnostics. Never print credentials or transcripts."""
import argparse
import asyncio
import base64
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def production_settings(project):
    from app.config import settings
    cli = shutil.which("gcloud")
    def read(*args):
        result = subprocess.run([cli, *args, f"--project={project}"], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError("Could not read production diagnostic configuration")
        return result.stdout.strip()
    service = json.loads(read("run", "services", "describe", "shabd-api", "--region=asia-south1", "--format=json"))
    names = {"SARVAM_API_KEY", "SARVAM_STT_MODEL", "GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY", "VERTEX_CREDENTIALS_JSON", "VERTEX_PROJECT", "VERTEX_LOCATION", "DATABASE_URL"}
    for item in service["spec"]["template"]["spec"]["containers"][0].get("env", []):
        if item["name"] not in names:
            continue
        ref = item.get("valueFrom", {}).get("secretKeyRef")
        value = read("secrets", "versions", "access", ref["key"], "--secret=" + ref["name"]) if ref else item.get("value", "")
        setattr(settings, item["name"].lower(), value)
    print("Loaded production provider configuration in memory", flush=True)


async def stt_probe():
    from app.voice_lab.config import LabConfig
    from app.voice_lab.session import VoicePipelineSession
    from app.voice_lab.providers import SpeechOutput
    async def meter(*args): pass
    async def discard(message): pass
    session = VoicePipelineSession(LabConfig(), discard, meter)
    output = SpeechOutput()
    pcm = bytearray()
    async def collect(message): pcm.extend(base64.b64decode(message["data"]))
    await output.speak("नमस्ते। मम नाम रामः अस्ति।", LabConfig(), collect)
    await output.close()
    converted = subprocess.run([shutil.which("ffmpeg"), "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-f", "s16le", "-ar", "16000", "pipe:1"], input=bytes(pcm), capture_output=True, check=True).stdout
    await session.start()
    session.receiver.cancel()
    try: await session.receiver
    except asyncio.CancelledError: pass
    ids = []
    async def receive():
        async for raw in session.upstream:
            m = json.loads(raw); data = m.get("data") or {}
            if m.get("type") == "data":
                rid = data.get("request_id")
                print(f"STT result: characters={len(data.get('transcript', ''))}, repeated_request_id={rid in ids}, fields={sorted(data)}", flush=True)
                ids.append(rid)
            elif m.get("type") == "events":
                print("STT event: " + str(data.get("signal_type")), flush=True)
    receiver = asyncio.create_task(receive())
    try:
        for turn in range(2):
            print(f"Synthetic utterance {turn + 1}", flush=True)
            data = converted + b"\0" * 32000
            for offset in range(0, len(data), 3200):
                await session.audio(data[offset:offset + 3200])
                await asyncio.sleep(.1)
            await session.end_audio()
            await asyncio.sleep(2)
    finally:
        receiver.cancel()
        try: await receiver
        except asyncio.CancelledError: pass
        await session.close()


def quota_probe():
    from app.config import settings
    from sqlalchemy import create_engine, text
    engine = create_engine(settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1))
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT kind, sum(amount) AS used FROM usage_events WHERE learner_id=(SELECT learner_id FROM usage_events WHERE surface='voice-lab' ORDER BY ts DESC LIMIT 1) AND ts > now() - interval '24 hours' GROUP BY kind"))
        print("Most recent voice learner's 24-hour usage: " + json.dumps([dict(row._mapping) for row in rows], default=str), flush=True)
    engine.dispose()


async def conversations():
    from check_voice_lab_live import CONFIGS
    from app.voice_lab.session import STRATEGIES
    from app.voice_lab.providers import SpeechOutput, provider_error
    from app.voice_lab.config import LabConfig
    output = SpeechOutput(); audio = bytearray()
    async def collect(message): audio.extend(base64.b64decode(message["data"]))
    await output.speak("मम नाम रामः अस्ति।", LabConfig(), collect)
    await output.close()
    pcm = subprocess.run([shutil.which("ffmpeg"), "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-f", "s16le", "-ar", "16000", "pipe:1"], input=bytes(audio), capture_output=True, check=True).stdout
    async def meter(*args): pass
    failures = []
    for name, config in CONFIGS.items():
        done = asyncio.Event(); first_audio = asyncio.Event()
        stats = {}; errors = []
        async def send(message):
            kind = message["type"]
            stats[kind] = stats.get(kind, 0) + 1
            if kind == "audio": first_audio.set()
            if kind in ("error", "fatal"): errors.append(message["message"]); done.set()
            if kind == "turn_complete": done.set()
        session = STRATEGIES[config.pipeline](config, send, meter)
        session.playback_feedback = session.barge_enabled = session.client_endpointing = True
        try:
            await asyncio.wait_for(session.start(), 40)
            for turn in range(2):
                done.clear(); first_audio.clear(); stats.clear(); errors.clear()
                data = pcm + b"\0" * 16000
                for offset in range(0, len(data), 3200):
                    await session.audio(data[offset:offset + 3200])
                    await asyncio.sleep(.1)
                await session.end_audio()
                await asyncio.wait_for(done.wait(), 90)
                if errors: raise RuntimeError(errors[0])
                assert stats.get("audio", 0) and stats.get("transcript", 0), "Missing reply audio or transcript"
                await session.playback(False)
                print(f"{name} spoken turn {turn + 1}: PASS ({stats.get('audio')} audio packets)", flush=True)
            done.clear(); first_audio.clear(); errors.clear()
            await session.text("कृपया संस्कृतभाषायाः महत्त्वं दशवाक्येषु विस्तरेण वर्णयतु।")
            await asyncio.wait_for(first_audio.wait(), 45)
            await asyncio.wait_for(session.barge_in(), 5)
            await session.playback(False)
            done.clear(); stats.clear(); errors.clear()
            await session.text("धन्यवादः। केवलं एकं लघु वाक्यं वदतु।")
            await asyncio.wait_for(done.wait(), 90)
            if errors: raise RuntimeError(errors[0])
            assert stats.get("audio", 0), "No audio after interruption"
            print(f"{name} interrupt and next reply: PASS", flush=True)
        except Exception as exc:
            failures.append(name)
            print(f"{name}: FAIL {type(exc).__name__}: {provider_error(exc)}", flush=True)
        finally:
            await session.close()
    if failures: raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cloud-project")
    parser.add_argument("--stt", action="store_true")
    parser.add_argument("--quota", action="store_true")
    parser.add_argument("--conversations", action="store_true")
    args = parser.parse_args()
    if args.cloud_project: production_settings(args.cloud_project)
    if args.quota: quota_probe()
    if args.stt: asyncio.run(stt_probe())
    if args.conversations: asyncio.run(conversations())
