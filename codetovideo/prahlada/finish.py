"""Mux the Manim render, Sarvam voice, and a quiet code-synthesized score.

Run with the Manim Python environment (requires numpy and Pillow).
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"codetovideo/outputs/prahlada"


def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout


def main():
    data=json.loads((OUT/"timeline.json").read_text(encoding="utf-8"))
    video=OUT/"media/videos/scene/1280p30/animation.mp4"
    sr=48000
    t=np.arange(sr*60)/sr
    score=np.zeros(len(t))
    # Original, procedurally generated drone and bell overtones; no sampled music.
    for freq,amplitude in [(130.81,.006),(196,.004),(261.63,.003)]:
        score+=amplitude*np.sin(2*np.pi*freq*t)*(1+.15*np.sin(2*np.pi*.13*t))
    for scene in data["scenes"]:
        local=t-scene["start"]-.25
        env=np.where(local>=0,np.exp(-np.maximum(local,0)*2),0)
        score+=.018*env*(np.sin(2*np.pi*523.25*local)+.3*np.sin(2*np.pi*1046.5*local))
    # A short, low rumble accompanies the cracking pillar.
    local=t-data["scenes"][4]["start"]-1.2
    env=np.where(local>=0,np.exp(-np.maximum(local,0)*4),0)
    score+=.035*env*np.sin(2*np.pi*65*local)
    score*=np.minimum(t/2,1)*np.minimum((60-t)/2,1)
    with wave.open(str(OUT/"score.wav"),"wb") as f:
        f.setparams((1,2,sr,0,"NONE","not compressed"))
        f.writeframes((np.clip(score,-1,1)*32767).astype("<i2").tobytes())
    if "--score-only" in sys.argv:
        print(f"Procedural score ready: {OUT / 'score.wav'}")
        return
    if not video.exists():
        raise FileNotFoundError(f"Render scene.py at 720x1280, 30 fps first: {video}")
    final=OUT/"prahlada-narasimha-60s.mp4"
    run(["ffmpeg","-y","-v","error","-i",str(video),"-i",str(OUT/"narration.wav"),
         "-i",str(OUT/"score.wav"),"-filter_complex",
         "[0:v]fps=30,tpad=stop_mode=clone:stop_duration=0.2,trim=duration=60,setpts=PTS-STARTPTS[vout];[1:a]highpass=f=70,loudnorm=I=-16:TP=-2:LRA=7[v];[v][2:a]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=59:d=1,alimiter=limit=0.95,aresample=48000[a]",
         "-map","[vout]","-map","[a]","-c:v","libx264","-crf","19","-preset","fast","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k",
         "-t","60","-movflags","+faststart",str(final)])
    probe=json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(final)]))
    video_stream=next(s for s in probe["streams"] if s["codec_type"]=="video")
    audio_stream=next(s for s in probe["streams"] if s["codec_type"]=="audio")
    assert (video_stream["width"],video_stream["height"])==(720,1280)
    assert abs(float(probe["format"]["duration"])-60)<.08
    assert video_stream["codec_name"]=="h264" and audio_stream["codec_name"]=="aac"
    assert video_stream["avg_frame_rate"]=="30/1" and int(video_stream["nb_frames"])==1800
    # Full decode catches damaged frames and malformed audio packets.
    run(["ffmpeg","-v","error","-i",str(final),"-f","null","-"])
    evidence={"file":final.name,"sha256":hashlib.sha256(final.read_bytes()).hexdigest(),
              "bytes":final.stat().st_size,"duration":probe["format"]["duration"],
              "video":{"codec":video_stream["codec_name"],"width":720,"height":1280,
                       "fps":video_stream["avg_frame_rate"],"frames":video_stream.get("nb_frames")},
              "audio":{"codec":audio_stream["codec_name"],"sample_rate":audio_stream["sample_rate"]},
              "full_decode":"passed","voice_provider":"Sarvam via existing project client",
              "images_generated":False,"music":"Original procedural sine synthesis"}
    (OUT/"verification.json").write_text(json.dumps(evidence,indent=2),encoding="utf-8")
    def stamp(seconds):
        ms=round(seconds*1000)
        return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
    subtitles=[]
    for i,scene in enumerate(data["scenes"]):
        split=scene["start"]+scene["duration"]*.5
        for j,(begin,end) in enumerate([(scene["start"],split),(split,scene["start"]+scene["duration"])]):
            subtitles.append(f"{i*2+j+1}\n{stamp(begin)} --> {stamp(end)}\n{scene['captions'][j]}\n")
    (OUT/"subtitles-en.srt").write_text("\n".join(subtitles),encoding="utf-8")
    from PIL import Image,ImageDraw
    sheet=Image.new("RGB",(4*270,2*510),"#0D2028")
    draw=ImageDraw.Draw(sheet)
    for i,scene in enumerate(data["scenes"]):
        at=scene["start"]+scene["duration"]*.7
        path=OUT/f"qa-{i:02d}.jpg"
        run(["ffmpeg","-y","-v","error","-ss",str(at),"-i",str(final),"-frames:v","1",str(path)])
        im=Image.open(path).resize((270,480))
        x=(i%4)*270;y=(i//4)*510
        sheet.paste(im,(x,y))
        draw.text((x+8,y+486),f"{i+1:02d}  /  {at:.1f}s",fill="#DCAA55")
    sheet.save(OUT/"contact-sheet.jpg",quality=92)
    run(["ffmpeg","-y","-v","error","-ss",str(data["scenes"][5]["start"]+3),"-i",str(final),"-frames:v","1",str(OUT/"poster.jpg")])
    print(json.dumps(evidence,indent=2))


if __name__=="__main__":
    main()
