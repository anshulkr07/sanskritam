"""Render the writing guide catalogue beside shaped Devanagari for visual QA."""
import sys, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.seeds.writing_paths import BODIES, writing_paths
from PIL import Image, ImageDraw, ImageFont

def flatten(d):
    t = re.findall(r"[MLC]|-?\d+(?:\.\d+)?", d); points=[]; i=0; p=(0,0)
    while i < len(t):
        op=t[i]; i+=1
        if op in ("M","L"):
            p=(float(t[i]),float(t[i+1])); i+=2; points.append(p)
        else:
            c1=(float(t[i]),float(t[i+1])); c2=(float(t[i+2]),float(t[i+3])); end=(float(t[i+4]),float(t[i+5])); i+=6
            for step in range(1,25):
                a=step/24; b=1-a
                points.append(tuple(b**3*p[k]+3*b*b*a*c1[k]+3*b*a*a*c2[k]+a**3*end[k] for k in (0,1)))
            p=end
    return points

if __name__ == "__main__":
    words = list(BODIES) + ["का","कि","की","कु","कू","कृ","के","कै","को","कौ","कमल","बालकः"]
    cell=190; cols=6; image=Image.new("RGB", (cols*cell, ((len(words)+cols-1)//cols)*cell), "#FFF8EE"); draw=ImageDraw.Draw(image)
    fontpath=Path(__file__).resolve().parents[2]/"mobile/node_modules/@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf"
    font=ImageFont.truetype(str(fontpath),44)
    for n, word in enumerate(words):
        x=n%cols*cell; y=n//cols*cell
        draw.rectangle((x,y,x+cell-1,y+cell-1),outline="#D9C9AE")
        for stroke in writing_paths(word):
            points=[(x+16+p[0]*1.5,y+5+p[1]*1.5) for p in flatten(stroke["d"])]
            if len(points)>1: draw.line(points,fill="#3B2E25",width=4)
        draw.text((x+cell/2,y+135),word,font=font,fill="#CA4715",anchor="mt")
    image.save(sys.argv[1])
