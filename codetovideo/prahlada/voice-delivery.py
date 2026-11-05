"""Export voice-forward copies using the cached project Sarvam narration."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

OUT = Path(__file__).resolve().parents[2] / "codetovideo/outputs/prahlada/comparison-30"


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def write_player():
    cards = "".join(
        f'<section><h2>{title}</h2><video controls playsinline preload="metadata" '
        f'src="prahlada-{name}-30s-sarvam-voice.mp4"></video>'
        '<button type="button">Play with sound</button></section>'
        for name, title in [("threejs-3d", "Three.js 3D"),
                            ("shadow-puppets", "Illustrated puppets")]
        if (OUT / f"prahlada-{name}-30s-sarvam-voice.mp4").exists())
    html = '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prahlada — play with sound</title>
<style>body{margin:24px;background:#172a36;color:#f2d7a0;font:18px system-ui}
main{display:flex;gap:24px;flex-wrap:wrap}section{width:min(340px,100%)}
video{display:block;width:100%;max-height:65vh;background:black}
button{padding:14px;margin-top:12px;cursor:pointer;font:inherit}
p{max-width:800px}audio{display:block;margin:20px 0}</style>
<h1>Prahlada · Sarvam Hindi narration</h1>
<p>Choose “Play with sound”. Each button unmutes its video and sets player volume to 100%.
Your computer's output volume and selected speaker still apply.</p>
<audio controls src="sarvam-hindi-narration-30s.m4a"></audio><main>''' + cards + '''</main>
<p id="status" role="status"></p><script>
for(const button of document.querySelectorAll('button'))button.onclick=async()=>{
 const video=button.parentElement.querySelector('video');
 for(const other of document.querySelectorAll('video,audio'))if(other!==video)other.pause();
 video.muted=false;video.defaultMuted=false;video.volume=1;
 try{await video.play();document.querySelector('#status').textContent='Playing with sound enabled.'}
 catch(error){document.querySelector('#status').textContent=error.message}
};</script></html>'''
    (OUT / "play-with-sound.html").write_text(html, encoding="utf-8")


def main():
    narration = OUT / "narration.wav"
    voice = OUT / "sarvam-hindi-narration-30s.m4a"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(narration), "-af",
         "highpass=f=70,acompressor=threshold=0.12:ratio=3:attack=10:release=150,"
         "loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000,volume=2.5dB",
         "-ac", "2", "-c:a", "aac", "-b:a", "192k", "-t", "30", str(voice)])
    evidence = []
    for name in ["threejs-3d", "shadow-puppets"]:
        source = OUT / f"prahlada-{name}-30s.mp4"
        if not source.exists():
            continue
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
    if not evidence:
        raise RuntimeError("Render a Three.js or puppet video before exporting narration")
    (OUT / "voice-delivery.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(json.dumps(evidence, indent=2))
    write_player()


if __name__ == "__main__":
    main()
