"""Verify the three exports and make frame sheets and an unmuted local player."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "outputs/framework-tests"
NAMES = [("pixi", "PixiJS puppets (without Spine)"),
         ("babylon", "Babylon.js 3D"), ("remotion-r3f", "Remotion + React Three Fiber")]


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def main():
    evidence = OUT / "verification.json"
    reports = json.loads(evidence.read_text()) if evidence.exists() else []
    for name, title in NAMES:
        if len(sys.argv) > 1 and name not in sys.argv[1:]:
            continue
        video = OUT / f"prahlada-{name}-30s.mp4"
        digest = hashlib.sha256(video.read_bytes()).hexdigest()
        if any(r["file"] == video.name and r["sha256"] == digest for r in reports):
            print(f"Previously verified, unchanged: {name}")
            continue
        info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                               "-of", "json", str(video)]).stdout)
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        a = next(s for s in info["streams"] if s["codec_type"] == "audio")
        assert (v["width"], v["height"], v["avg_frame_rate"], int(v["nb_frames"])) == (720, 1280, "30/1", 900)
        assert abs(float(info["format"]["duration"]) - 30) < .05
        result = run(["ffmpeg", "-v", "error", "-i", str(video), "-f", "null", "-"])
        assert not result.stderr.strip()
        levels = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vn", "-af",
                      "volumedetect", "-f", "null", "-"]).stderr
        mean = float(re.search(r"mean_volume: ([-\d.]+) dB", levels)[1])
        peak = float(re.search(r"max_volume: ([-\d.]+) dB", levels)[1])
        assert mean > -23 and -5 < peak < 0
        sheet = Image.new("RGB", (1080, 1020), "#172a36")
        draw = ImageDraw.Draw(sheet)
        for i, t in enumerate([2, 6, 10, 14, 17.5, 21, 25, 28.5]):
            still = OUT / f"{name}-qa-{i}.jpg"
            run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(video),
                 "-frames:v", "1", str(still)])
            with Image.open(still) as im:
                sheet.paste(im.resize((270, 480)), ((i % 4)*270, (i // 4)*510))
            draw.text(((i % 4)*270+8, (i // 4)*510+486), f"{t}s", fill="#f2d7a0")
        sheet.save(OUT / f"{name}-contact-sheet.jpg", quality=92)
        reports = [r for r in reports if r["file"] != video.name]
        reports.append(dict(file=video.name, duration=info["format"]["duration"],
                            frames=900, fps=30, width=720, height=1280, audio=a["codec_name"],
                            mean_dbfs=mean, peak_dbfs=peak, full_decode="passed",
                            bytes=video.stat().st_size, sha256=digest))
    (OUT / "verification.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    cards = "".join(f'<section><h2>{title}</h2><video controls playsinline preload="metadata" '
                    f'src="prahlada-{name}-30s.mp4"></video><button>Play with sound</button></section>'
                    for name, title in NAMES)
    html = '''<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Framework comparison</title><style>body{background:#172a36;color:#f2d7a0;font:18px system-ui;margin:24px}main{display:flex;gap:24px;flex-wrap:wrap}section{width:min(340px,100%)}video{width:100%;max-height:65vh;background:black}button{padding:14px;font:inherit;cursor:pointer}h2{font-size:21px}</style>
<h1>30-second framework comparison</h1><p>Same story, characters and Sarvam Hindi narration. Click Play with sound; computer output volume still applies.</p><main>'''+cards+'''</main><script>
for(const button of document.querySelectorAll('button'))button.onclick=async()=>{const video=button.parentElement.querySelector('video');for(const other of document.querySelectorAll('video'))if(other!==video)other.pause();video.muted=false;video.volume=1;await video.play()};</script></html>'''
    (OUT / "play-with-sound.html").write_text(html, encoding="utf-8")
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
