"""Product-only, 24-second Sanskritam launch advertisement."""
from pathlib import Path
import argparse, math, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import VideoClip, AudioFileClip, concatenate_audioclips
from render_reel import phone

ROOT=Path(__file__).parent
REPO=ROOT.parent.parent
W,H,FPS=1080,1920,30
CREAM='#FFF6E9'; INK='#2D2019'; ORANGE='#E8642B'; GOLD='#DFB887'
NUNITO=REPO/'mobile/node_modules/@expo-google-fonts/nunito'

def font(n,bold=False):
    weight='800ExtraBold' if bold else '600SemiBold'
    return ImageFont.truetype(str(NUNITO/weight/f'Nunito_{weight}.ttf'),n)

def ease(x):
    x=max(0,min(1,x));return 1-(1-x)**3

def mix(a,b,u):return a+(b-a)*u

def label(im,s,y=150,color=INK,size=25):
    d=ImageDraw.Draw(im); f=font(size,True); gap=4
    widths=[d.textlength(c,font=f) for c in s];x=(W-sum(widths)-gap*(len(s)-1))/2
    for c,ww in zip(s,widths):d.text((x,y),c,font=f,fill=color);x+=ww+gap

def words(im,lines,y=220,size=98,color=INK,align='center',progress=1):
    d=ImageDraw.Draw(im)
    for i,line in enumerate(lines):
        yy=y+i*int(size*1.06)+int(35*(1-ease(progress-i*.13)))
        x=W//2 if align=='center' else 85
        d.text((x,yy),line,font=font(size,True),fill=color,anchor='mt' if align=='center' else None,stroke_width=0)

def badge(im,s,y,color=INK,bg=None):
    f=font(29,True);d=ImageDraw.Draw(im);width=d.textlength(s,font=f)
    if bg:d.rounded_rectangle(((W-width)/2-26,y-16,(W+width)/2+26,y+58),radius=35,fill=bg)
    d.text((W/2,y),s,font=f,fill=color,anchor='mt')

def main(paths,stills=False,visuals_only=False):
    stage=Image.open(ROOT/'references/ui-stage-tablet.webp').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
    dark=Image.new('RGB',(W,H),INK)
    # Restrained oversized rings provide depth on the dark product stages.
    ring=Image.new('RGBA',(W,H));rd=ImageDraw.Draw(ring)
    for x,y,r in [(950,480,690),(-50,1460,790)]:
        rd.ellipse((x-r,y-r,x+r,y+r),outline=(223,184,135,26),width=2)
        rd.ellipse((x-r+40,y-r+40,x+r-40,y+r-40),outline=(223,184,135,13),width=1)
    dark=dark.convert('RGBA');dark.alpha_composite(ring)
    phones={k:phone(k) for k in ['reader','story','letters','sounds']}
    icon=Image.open(ROOT/'assets/icon.png').convert('RGBA').resize((220,220),Image.Resampling.LANCZOS)
    m=Image.new('L',icon.size);ImageDraw.Draw(m).rounded_rectangle((0,0,219,219),radius=49,fill=255);icon.putalpha(m)

    def add_phone(im,key,cx,y,scale=1,angle=0,opacity=1):
        p=phones[key]
        p=p.resize((int(p.width*scale),int(p.height*scale)),Image.Resampling.BICUBIC)
        if angle:p=p.rotate(angle,Image.Resampling.BICUBIC,expand=True)
        if opacity<1:p.putalpha(p.getchannel('A').point(lambda a:int(a*opacity)))
        im.alpha_composite(p,(int(cx-p.width/2),int(y)))

    def frame(t):
        paper=stage.copy().convert('RGBA')
        if t<2.65:
            im=dark.copy()
            label(im,'INTRODUCING SANSKRITAM',color=GOLD)
            u=ease(t/.8)
            words(im,['You know','the words.'],y=300,size=128,color=CREAM,progress=t/0.7)
            # A moving fan of real product screens makes the app visible immediately.
            add_phone(im,'story',mix(60,135,u),mix(1190,850,u),.57,12)
            add_phone(im,'reader',540,mix(1170,780,u),.68,-2+2*ease(t/2.65))
            add_phone(im,'letters',mix(1060,960,u),mix(1210,850,u),.57,-12)
        elif t<6.0:
            s=t-2.65;u=ease(s/.65);im=paper
            label(im,'A FAMILIAR VERSE. A NEW PERSPECTIVE.')
            words(im,['Discover','their meaning.'],y=225,size=100,progress=s/.5)
            add_phone(im,'reader',mix(1020,540,u),mix(520,515,u),.87,mix(-9,-1,u))
            badge(im,'READ • REFLECT • RECITE',1710,color=INK)
        elif t<8:
            s=t-6;u=ease(s/.6);im=dark.copy()
            label(im,'YOUR NEXT CHAPTER',color=GOLD)
            words(im,['Meet','Sanskritam.'],y=245,size=112,color=CREAM,progress=s/.4)
            add_phone(im,'story',mix(-250,300,u),730,.67,10)
            add_phone(im,'reader',mix(1300,770,u),695,.71,-7)
        elif t<11.0:
            s=t-8;u=ease(s/.55);im=paper
            label(im,'READ',color=ORANGE)
            words(im,['Timeless texts.','Real meaning.'],y=230,size=88,progress=s/.5)
            add_phone(im,'reader',540,510-int(22*math.sin(s*.8)),.88,mix(3,0,u))
            badge(im,'Sanskrit + English + Hindi',1720)
        elif t<13.7:
            s=t-11;u=ease(s/.55);im=paper
            label(im,'LEARN',color=ORANGE)
            words(im,['Follow the story.','Find your rhythm.'],y=230,size=87,progress=s/.45)
            add_phone(im,'story',mix(1150,540,u),510,.88,mix(-6,0,u))
            badge(im,'A guided path into Sanskrit',1720)
        elif t<16:
            s=t-13.7;u=ease(s/.55);im=dark.copy()
            label(im,'PRACTISE',color=GOLD)
            words(im,['One sound.','One small step.'],y=230,size=100,color=CREAM,progress=s/.4)
            add_phone(im,'sounds',mix(-250,180,u),660,.64,10)
            add_phone(im,'letters',mix(1250,710,u),560,.79,-5)
        elif t<19.1:
            s=t-16;u=ease(s/.7);im=paper
            label(im,'READ. LEARN. PRACTISE.',color=ORANGE)
            words(im,['Your pace.','Your next chapter.'],y=225,size=89,progress=s/.4)
            add_phone(im,'story',mix(-220,120,u),700,.60,12)
            add_phone(im,'letters',mix(1300,990,u),700,.60,-12)
            add_phone(im,'reader',540,mix(1200,650,u),.73,0)
        else:
            s=t-19.1;u=ease(s/.65);im=paper
            # The product moves away as the actual brand mark resolves into place.
            if s<.65:
                add_phone(im,'reader',540,mix(650,2100,u),.73*(1-.15*u))
            mark=icon.resize((int(220*(.8+.2*u)),)*2,Image.Resampling.LANCZOS)
            im.alpha_composite(mark,((W-mark.width)//2,int(mix(650,470,u))))
            label(im,'A LANGUAGE TO MAKE YOUR OWN',y=255,color=ORANGE,size=23)
            words(im,['Sanskritam'],y=int(mix(900,785,u)),size=112,progress=s/.5)
            badge(im,'A little practice. A deeper connection.',970)
            d=ImageDraw.Draw(im)
            d.rounded_rectangle((294,1165,786,1280),radius=58,fill=ORANGE)
            badge(im,'COMING SOON',1198,color='white')
            badge(im,'Follow for the launch.',1370,color='#7C6553')
            label(im,'VEDIC VALOR',y=1630,color='#7C6553',size=22)
        # Discrete footer wordmark, away from all app copy and video controls.
        if t<19.1:
            color=GOLD if (t<2.65 or 6<=t<8 or 13.7<=t<16) else '#8C725D'
            label(im,'SANSKRITAM',y=1810,color=color,size=19)
        return np.asarray(im.convert('RGB'))

    previews=[.9,3.8,6.8,9.2,12.0,14.7,17.2,22]
    for t in previews:Image.fromarray(frame(t)).save(ROOT/f'product-preview-{t:04.1f}.jpg',quality=94)
    sheet=Image.new('RGB',(1080,960),'#201813')
    for i,t in enumerate([.9,3.8,9.2,12,14.7,22]):
        f=Image.fromarray(frame(t));f.thumbnail((270,480),Image.Resampling.LANCZOS)
        sheet.paste(f,((i%3)*360+45,(i//3)*480))
    sheet.save(ROOT/'product-direction.jpg',quality=95)
    Image.fromarray(frame(22)).save(ROOT/'cover-product.jpg',quality=95)
    if stills:return
    if visuals_only:
        edit=VideoClip(frame,duration=24)
        edit.write_videofile(str(ROOT/'product-picture-24s.mp4'),fps=FPS,codec='libx264',audio=False,preset='fast',threads=6,ffmpeg_params=['-crf','18','-pix_fmt','yuv420p','-movflags','+faststart'],logger='bar')
        edit.close()
        return
    audios=[]
    for i,p in enumerate(paths):
        dest=ROOT/f'native-scene-{i}.wav'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(p),'-vn','-t','8','-af','loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=in:st=0:d=0.008,afade=t=out:st=7.99:d=0.01','-ar','48000',str(dest)],check=True)
        audios.append(AudioFileClip(str(dest)).subclipped(0,8))
    audio=concatenate_audioclips(audios)
    edit=VideoClip(frame,duration=24).with_audio(audio)
    edit.write_videofile(str(ROOT/'Sanskritam-product-ad-24s.mp4'),fps=FPS,codec='libx264',audio_codec='aac',audio_bitrate='192k',preset='fast',threads=6,ffmpeg_params=['-crf','18','-pix_fmt','yuv420p','-movflags','+faststart'],logger='bar')
    edit.close()
    for a in audios:a.close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('clips',nargs='*',type=Path);p.add_argument('--stills',action='store_true');p.add_argument('--visuals-only',action='store_true');a=p.parse_args()
    if not a.stills and not a.visuals_only and len(a.clips)!=3:p.error('Exactly three native-audio scenes are required.')
    main(a.clips,a.stills,a.visuals_only)
