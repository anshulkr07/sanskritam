"""Export voice-forward copies using the cached project Sarvam narration."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

OUT = Path(__file__).resolve().parents[2] / "results/videos/prahlada/comparison-30"


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def main():
    narration = OUT / "narration.wav"
    voice = OUT / "sarvam-hindi-narration-30s.m4a"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(narration), "-af",
         "highpass=f=70,acompressor=threshold=0.12:ratio=3:attack=10:release=150,"
         "loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000,volume=2.5dB",
         "-ac", "2", "-c:a", "aac", "-b:a", "192k", "-t", "30", str(voice)])
    evidence = []
    for name in ["threejs-3d", "shadow-puppets", "manim-3d"]:
        source = OUT / f"prahlada-{name}-30s.mp4"
        target = OUT / f"prahlada-{name}-30s-sarvam-voice.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-i", str(source), "-i", str(voice),
             "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
             "-disposition:a:0", "default", "-metadata:s:a:0", "language=hin",
             "-metadata:s:a:0", "title=Sarvam Hindi narration", "-movflags", "+faststart", str(target)])
        probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                               "-of", "json", str(target)]).stdout)
        audio = next(s for s in probe["streams"] if s["codec_type"] == "audio")
        assert audio["channels"] == 2 and audio["disposition"]["default"] == 1
        assert abs(float(probe["format"]["duration"]) - 30) < .05
        decode = run(["ffmpeg", "-v", "error", "-i", str(target), "-f", "null", "-"])
        assert not decode.stderr.strip()
        level = run(["ffmpeg", "-hide_banner", "-i", str(target), "-vn", "-af",
                     "volumedetect", "-f", "null", "-"]).stderr
        mean = float(re.search(r"mean_volume: ([-\d.]+) dB", level)[1])
        peak = float(re.search(r"max_volume: ([-\d.]+) dB", level)[1])
        assert mean > -22 and -3 < peak < 0
        evidence.append(dict(file=target.name, duration=probe["format"]["duration"],
                             audio="AAC stereo, default Hindi track", mean_dbfs=mean,
                             peak_dbfs=peak, full_decode="passed",
                             sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (OUT / "voice-delivery.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
