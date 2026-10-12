"""Render the complete watercolor reel with shaped Sanskrit/English captions."""
import json
import argparse
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw

B = Path(__file__).resolve().parents[1]
OUT = B / 'results/ram_reel'
SONG = B / 'results/ram_song_full'
FF = 'C:/ffmpeg/bin/ffmpeg.exe'

MEANINGS = [
 ('Hail Rama, hail Rama!', 'Your name echoes in my heart.'),
 ('Rhythm by rhythm, step by step,', 'I sing your noble deeds.'),
 ('Rama is brave and steadfast,', 'ever firm on the path of truth.'),
 ('Free from greed and anger,', 'Rama is filled with compassion.'),
 ('He renounced the kingdom and kept his word;', 'even on the forest path, he smiled.'),
 ('A bow in his hand, courage in his mind;', 'Rama\u2019s radiance shines in my heart too.'),
 ('I have neither greed nor fear;', 'remembering Rama is my greatest strength.'),
 ('I rise and move forward;', 'I speak truth and do good.'),
 ('I abandon hatred and embrace love;', 'I act for the good of all.'),
 ('Hail Rama, hail Rama!', 'Your name lives in my life.')]
# Boundaries reviewed against independent Scribe transcript and forced alignment.
STARTS = [5.22,10.44,16.54,21.56,31.32,36.88,42.30,47.72,57.38,62.00]
ENDS = [10.10,15.52,21.12,27.20,36.60,41.74,47.62,53.16,61.92,67.84]

def run(args):
    subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*args],check=True)

def stamp(t):
    cs=round(t*100); return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'

def main():
    global OUT, SONG, STARTS, ENDS
    parser=argparse.ArgumentParser()
    parser.add_argument('--original-edit',action='store_true')
    args=parser.parse_args()
    duration=72
    audio_name='ram_pathe_full.mp3'
    art=OUT/'art'
    if args.original_edit:
        OUT=B/'results/ram_original_reel'
        SONG=B/'results/ram_original_completed'
        audio_name='ram_pathe_preserved.mp3'
        duration=65.13
        STARTS=[9.82,15.04,20.30,25.50,31.36,36.58,41.82,47.10,52.20,57.48]
        ENDS=[15.02,19.92,25.44,30.68,36.54,41.72,46.98,52.16,57.40,62.46]
    OUT.mkdir(exist_ok=True)
    lines=(B/'results/ram_rap_demo_20261012/lyrics.txt').read_text(encoding='utf-8').strip().splitlines()[2:]
    chars=json.loads((SONG/'alignment.json').read_text(encoding='utf-8'))['characters']
    text=''.join(c['text'] for c in chars)
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sanskrit,Nirmala UI,62,&H00C4E7FF,&H00FFFFFF,&H0020170B,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,90,120,0,1
Style: English,Arial,39,&H00FFFFFF,&H00FFFFFF,&H0020170B,&H80000000,0,0,0,0,100,100,0,0,1,1.4,1,8,100,130,0,1
Style: Title,Nirmala UI,100,&H00C4E7FF,&H00FFFFFF,&H0020170B,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,90,120,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events=[]; timeline=[]
    def event(start,end,style,value,pos):
        events.append(f'Dialogue: 0,{stamp(start)},{stamp(end)},{style},,0,0,0,,{{\\pos(520,{pos})\\fad(120,120)}}{value}')
    event(0,STARTS[0]-.3,'Title','रामपथे',1430)
    event(0,STARTS[0]-.3,'English','ON RAMA\u2019S PATH',1480)
    for i,line in enumerate(lines):
        parts=line.split('!',1)
        index=text.find(line)+len(parts[0])+1
        while chars[index]['text'].isspace(): index+=1
        mid=chars[index]['start']
        for j,(start,end) in enumerate([(STARTS[i],mid),(mid,ENDS[i])]):
            sa=parts[j].strip()+('!' if j==0 else '')
            en='\\N'.join(textwrap.wrap(MEANINGS[i][j],width=42))
            event(start,end,'Sanskrit',sa,1435)
            event(start,end,'English',en,1485)
            timeline.append({'scene':i+1,'start':start,'end':end,'sanskrit':sa,'english':MEANINGS[i][j]})
    event(ENDS[-1]+.26,duration,'Title','जय श्रीराम',1430)
    event(ENDS[-1]+.26,duration,'English','HAIL SHRI RAMA',1480)
    (OUT/'captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
    (OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
    # Separate caption wash; original watercolor assets remain intact.
    overlay=Image.new('RGBA',(1080,1920),(0,0,0,0)); d=ImageDraw.Draw(overlay)
    for y in range(1100,1920):
        alpha=int(215*min(1,(y-1100)/300))
        d.line([(0,y),(1079,y)],fill=(12,25,42,alpha))
    overlay.save(OUT/'caption_wash.png')
    boundaries=[0]+STARTS[1:]+[duration]
    concat=[]
    for i in range(10):
        frames=round((boundaries[i+1]-boundaries[i])*30)
        clip=OUT/f'clip_{i+1:02}.mp4'
        if not clip.exists():
            run(['-i',str(art/f'scene_{i+1:02}.png'),'-vf',
                 "scale=1120:1992:force_original_aspect_ratio=increase,crop=1120:1992,zoompan=z='min(zoom+0.00007,1.035)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d="+str(frames)+":s=1080x1920:fps=30",
                 '-frames:v',str(frames),'-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','2',str(clip)])
        concat.append("file '"+clip.as_posix()+"'")
    (OUT/'clips.txt').write_text('\n'.join(concat),encoding='utf-8')
    # Subtitle filename relative to cwd avoids Windows filter path escaping.
    subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(OUT/'clips.txt'),
       '-loop','1','-i',str(OUT/'caption_wash.png'),'-i',str(SONG/audio_name),
       '-filter_complex',"[0:v][1:v]overlay=0:0,ass=captions.ass[v];[2:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]",
       '-map','[v]','-map','[a]','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
       '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-threads','2',str(OUT/'ram_pathe_reel.mp4')],cwd=OUT,check=True)
    print(f'Saved {OUT / "ram_pathe_reel.mp4"}')

if __name__ == '__main__': main()
