"""Mux the shared Sarvam narration and verify all three 30-second deliveries."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"results/videos/prahlada"
OUT=BASE/"comparison-30"


def run(args):
    result=subprocess.run(args,check=True,capture_output=True,text=True)
    return result.stdout


def inspect(video,expected_seconds,prefix,frames):
    probe=json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(video)]))
    v=next(s for s in probe["streams"] if s["codec_type"]=="video")
    a=next(s for s in probe["streams"] if s["codec_type"]=="audio")
    assert abs(float(probe["format"]["duration"])-expected_seconds)<.08
    assert (v["width"],v["height"],v["avg_frame_rate"],int(v["nb_frames"]))==(720,1280,"15/1",450)
    decode=subprocess.run(["ffmpeg","-v","error","-i",str(video),"-f","null","-"],capture_output=True,text=True,check=True)
    assert not decode.stderr.strip(),decode.stderr
    sheet=Image.new("RGB",(270*4,510*((len(frames)+3)//4)),"#291e23")
    draw=ImageDraw.Draw(sheet)
    for i,t in enumerate(frames):
        image=OUT/f"{prefix}-qa-{i:02d}.jpg"
        run(["ffmpeg","-y","-v","error","-ss",str(t),"-i",str(video),"-frames:v","1",str(image)])
        sheet.paste(Image.open(image).resize((270,480)),((i%4)*270,(i//4)*510))
        draw.text(((i%4)*270+8,(i//4)*510+486),f"{t:.1f} sec",fill="#efd39d")
    sheet.save(OUT/f"{prefix}-contact-sheet.jpg",quality=92)
    evidence={"file":video.name,"duration":probe["format"]["duration"],"width":v["width"],"height":v["height"],
              "fps":v["avg_frame_rate"],"frames":v.get("nb_frames"),"video":v["codec_name"],"audio":a["codec_name"],
              "bytes":video.stat().st_size,"sha256":hashlib.sha256(video.read_bytes()).hexdigest(),"full_decode":"passed"}
    (OUT/f"{prefix}-delivery.json").write_text(json.dumps(evidence,indent=2),encoding="utf-8")
    print(json.dumps(evidence,indent=2))


def main():
    raw=OUT/"manim/videos/manim_3d/1280p15/manim-raw.mp4"
    final=OUT/"prahlada-manim-3d-30s.mp4"
    run(["ffmpeg","-y","-v","error","-i",str(raw),"-i",str(OUT/"narration.wav"),
         "-i",str(BASE/"score.wav"),"-filter_complex",
         "[0:v]tpad=stop_mode=clone:stop_duration=1[vout];[1:a]highpass=f=70,loudnorm=I=-16:TP=-2:LRA=7[v];[v][2:a]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=29:d=1,alimiter=limit=0.95,aresample=48000[a]",
         "-map","[vout]","-map","[a]","-c:v","libx264","-crf","18","-preset","fast","-pix_fmt","yuv420p",
         "-c:a","aac","-b:a","192k","-t","30","-movflags","+faststart",str(final)])
    timeline=json.loads((OUT/"timeline.json").read_text(encoding="utf-8"))
    frames=[s["start"]+s["duration"]*.65 for s in timeline["scenes"]]
    for name in ["manim-3d","threejs-3d","shadow-puppets"]:
        video=OUT/f"prahlada-{name}-30s.mp4"
        evidence=OUT/f"{name}-delivery.json"
        if name!="manim-3d" and evidence.exists():
            previous=json.loads(evidence.read_text(encoding="utf-8"))
            if previous.get("sha256")==hashlib.sha256(video.read_bytes()).hexdigest():
                print(f"Reusing completed decode and frame review artifacts: {name}")
                continue
        inspect(video,30,name,frames)


if __name__=="__main__":
    main()
