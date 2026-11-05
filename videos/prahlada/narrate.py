"""Generate cached Sarvam narration using the application's existing client.

Run with backend/.venv/Scripts/python.exe; makes eight paid TTS calls on first run.
No credentials, application data or remote storage are written.
"""
import asyncio
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "results/videos/prahlada"
SHORT = "--short" in sys.argv
if SHORT:
    OUT = OUT / "comparison-30"
sys.path.insert(0, str(ROOT / "backend"))
from app.config import settings
from app.services.sarvam import SarvamClient


async def main():
    story = json.loads(Path(__file__).with_name("story-30.json" if SHORT else "story.json").read_text(encoding="utf-8"))
    length = 30 if SHORT else 60
    OUT.mkdir(parents=True, exist_ok=True)
    client = SarvamClient(settings.sarvam_api_key)
    clips = []
    try:
        for index, scene in enumerate(story["scenes"]):
            request = dict(text=scene["voice"], language_code=story["language"],
                           speaker=story["speaker"], model=story["model"], pace=1.0, sample_rate=24000)
            digest = hashlib.sha256(json.dumps(request, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
            clip = OUT / f"voice-{index:02d}-{digest}.wav"
            if not clip.exists():
                if not settings.sarvam_api_key:
                    raise RuntimeError("SARVAM_API_KEY is not configured in the project")
                raw = base64.b64decode(await client.text_to_speech(**request))
                with wave.open(__import__('io').BytesIO(raw)) as wav:
                    if wav.getnframes() < wav.getframerate() // 4:
                        raise RuntimeError("Sarvam returned an unexpectedly short clip")
                clip.write_bytes(raw)
                await asyncio.sleep(2.2)
            with wave.open(str(clip)) as wav:
                seconds = wav.getnframes() / wav.getframerate()
            clips.append((clip, seconds))
            print(f"Scene {index + 1}: {seconds:.2f}s", flush=True)
    finally:
        await client.close()

    # Keep natural delivery when possible; gently accelerate only if needed.
    speed = max(1.0, sum(d for _, d in clips) / (26.0 if SHORT else 53.6))
    if speed > 1.3:
        raise RuntimeError(f"Narration requires excessive acceleration ({speed:.2f}); shorten script")
    spare = length - sum(d / speed for _, d in clips)
    timeline = []
    total_frames = 0
    for index, ((clip, seconds), scene) in enumerate(zip(clips, story["scenes"])):
        frames = round((seconds / speed + spare / len(clips)) * 30)
        if index == len(clips) - 1:
            frames = length * 30 - total_frames
        duration = frames / 30
        final = OUT / f"scene-audio-{index:02d}.wav"
        stretched = OUT / f"stretched-{index:02d}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(clip), "-af",
                        f"atempo={speed:.8f}", "-ar", "48000", "-ac", "1",
                        "-c:a", "pcm_s16le", str(stretched)], check=True)
        # Pad by sample count, independently of FFmpeg filter timestamps.
        with wave.open(str(stretched)) as wav:
            speech = wav.readframes(wav.getnframes())
        target_bytes = frames * 1600 * 2
        pcm = bytes(round(.35 * 48000) * 2) + speech
        if len(pcm) > target_bytes:
            raise RuntimeError(f"Scene {index+1} speech exceeds its allotted duration")
        with wave.open(str(final), "wb") as wav:
            wav.setparams((1, 2, 48000, 0, "NONE", "not compressed"))
            wav.writeframes(pcm + bytes(target_bytes-len(pcm)))
        stretched.unlink()
        timeline.append({**scene, "start": total_frames / 30, "frames": frames,
                         "duration": duration, "audio": final.name, "speech_seconds": seconds / speed,
                         "raw_audio": clip.name})
        total_frames += frames
    manifest = {**story, "fps": 30, "width": 720, "height": 1280, "frames": 1800,
                "speed": speed, "scenes": timeline}
    manifest["frames"] = length * 30
    (OUT / "timeline.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "audio-concat.txt").write_text("\n".join(f"file '{s['audio']}'" for s in timeline), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i",
                    str(OUT / "audio-concat.txt"), "-c:a", "pcm_s16le", str(OUT / "narration.wav")], check=True)
    with wave.open(str(OUT / "narration.wav")) as wav:
        assert wav.getnframes() == length * 48000
    print(f"Narration ready: {length} seconds; pace multiplier {speed:.3f}")


if __name__ == "__main__":
    asyncio.run(main())
