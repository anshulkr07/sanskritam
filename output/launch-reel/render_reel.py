"""Render the 24-second launch edit; all speech/music comes from Flow clips."""
from pathlib import Path
import argparse
import json
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import VideoFileClip, VideoClip, concatenate_audioclips

ROOT = Path(__file__).parent
W, H, FPS = 1080, 1920, 30
INK = '#38291E'
CREAM = '#FFF7ED'
SAFFRON = '#D85A27'
FONTS = Path('C:/Windows/Fonts')


def font(size, bold=False, serif=False):
    return ImageFont.truetype(str(FONTS / ('georgiab.ttf' if serif and bold else 'georgia.ttf' if serif else 'segoeuib.ttf' if bold else 'segoeui.ttf')), size)


def smooth(x):
    x = min(1., max(0., x))
    return x*x*(3-2*x)


def text(im, value, xy, size=60, color=INK, bold=False, serif=False, anchor=None):
    ImageDraw.Draw(im).text(xy, value, fill=color, font=font(size, bold, serif), anchor=anchor, spacing=12)


def centre(im, value, y, size=60, **kw):
    text(im, value, (W//2, y), size=size, anchor='mt', **kw)


def eyebrow(im, value, y=165, color=INK):
    d = ImageDraw.Draw(im); f = font(26, True)
    spacing = 5
    widths = [d.textlength(c, font=f) for c in value]
    x = (W-sum(widths)-spacing*(len(value)-1))/2
    for c, cw in zip(value,widths):
        d.text((x,y),c,font=f,fill=color);x += cw+spacing


def fit(im, width, height):
    return im.resize((width,height),Image.Resampling.LANCZOS) if im.size == (width,height) else __import__('PIL.ImageOps',fromlist=['contain']).contain(im,(width,height),Image.Resampling.LANCZOS)


def phone(name):
    # The screenshot is kept proportional and unchanged inside a neutral device frame.
    sw, sh, bezel = 594, 1240, 19
    im = Image.new('RGBA',(sw+bezel*2+80, sh+bezel*2+80))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((41,46,sw+bezel*2+39,sh+bezel*2+44),radius=73,fill=(40,28,20,75))
    shadow=im.filter(ImageFilter.GaussianBlur(22))
    d=ImageDraw.Draw(shadow)
    box=(40,25,sw+bezel*2+40,sh+bezel*2+25)
    d.rounded_rectangle(box,radius=66,fill='#302A24',outline='#97816C',width=3)
    screen=Image.new('RGB',(sw,sh),CREAM)
    shot=Image.open(ROOT/'assets'/f'{name}.png').convert('RGB')
    shot=fit(shot,sw,sh)
    screen.paste(shot,((sw-shot.width)//2,(sh-shot.height)//2))
    mask=Image.new('L',(sw,sh));ImageDraw.Draw(mask).rounded_rectangle((0,0,sw,sh),radius=46,fill=255)
    shadow.paste(screen,(40+bezel,25+bezel),mask)
    return shadow


def caption(im, value, y=1655):
    f=font(34,True);d=ImageDraw.Draw(im)
    width=d.textlength(value,font=f)
    box=(int((W-width)/2-27),y-14,int((W+width)/2+27),y+65)
    d.rounded_rectangle(box,radius=20,fill=(24,20,17,220))
    d.text((W/2,y+3),value,font=f,fill='white',anchor='mt')


def build(clip_paths, preview_only=False):
    clips=[VideoFileClip(str(p)) for p in clip_paths]
    if any(c.audio is None for c in clips):
        raise RuntimeError('Every scene must contain Flow-native audio.')
    phones={k:phone(k) for k in ['reader','story','sounds','letters']}
    icon=Image.open(ROOT/'assets/icon.png').convert('RGBA')
    icon=icon.resize((238,238),Image.Resampling.LANCZOS)
    iconmask=Image.new('L',icon.size);ImageDraw.Draw(iconmask).rounded_rectangle((0,0,237,237),radius=55,fill=255)
    icon.putalpha(iconmask)
    yy=np.linspace(0,1,H)[:,None,None]
    paper=np.repeat(((1-yy)*np.array([255,249,239])+yy*np.array([241,222,198])),W,axis=1).astype('uint8')
    vignette=Image.new('RGBA',(W,H))
    va=np.zeros((H,W,4),dtype=np.uint8)
    va[:,:,3]=(np.maximum(0,(np.arange(H)[:,None]/H-.30)/.70)*205).astype('uint8')
    vignette=Image.fromarray(va)

    def background(t):
        ix=min(2,int(t//8)); local=min(7.96,t-ix*8)
        frame=Image.fromarray(clips[ix].get_frame(local)).convert('RGB')
        return frame.resize((W,H),Image.Resampling.LANCZOS)

    def make_frame(t):
        if t<8:
            im=background(t).convert('RGBA');im.alpha_composite(vignette)
            eyebrow(im,'S A N S K R I T A M',color=CREAM)
            y=1110-int(35*smooth(t/1.0))
            if t<3.2:
                text(im,'You know', (84,y),106,CREAM,serif=True)
                text(im,'the words.', (84,y+132),106,CREAM,serif=True)
                caption(im,'A familiar sound. A new discovery.')
            elif t<6.3:
                text(im,'Discover', (84,y),106,CREAM,serif=True)
                text(im,'their meaning.', (84,y+132),96,CREAM,serif=True)
                caption(im,'Let curiosity lead the way.')
            else:
                text(im,'Meet', (84,y),72,CREAM,serif=True)
                text(im,'Sanskritam.', (84,y+105),100,CREAM,serif=True)
                caption(im,'Your Sanskrit journey begins.')
        elif t<16:
            # Editorial demonstration: source screenshots remain independent of AI footage.
            im=Image.fromarray(paper).convert('RGBA')
            film=background(t).filter(ImageFilter.GaussianBlur(30)).convert('RGBA')
            film.putalpha(23);im.alpha_composite(film)
            phase=(t-8)
            if phase<3.0:
                key='reader'; head='Read timeless texts.'; tag='READ • REFLECT • RECITE'; cap='Illustrated reading. Living meaning.'; start=8
            elif phase<5.2:
                key='story'; head='Learn through stories.'; tag='A LANGUAGE THAT COMES ALIVE'; cap='Follow a story. Find your next step.';start=11
            else:
                key='sounds'; head='One sound at a time.';tag='LISTEN • LEARN • PRACTISE';cap='Start with the sounds of Sanskrit.';start=13.2
            eyebrow(im,tag,135)
            centre(im,head,205,62,serif=True)
            p=phones[key]
            sc=.96+.025*smooth((t-start)/2.5)
            p=p.resize((int(p.width*sc),int(p.height*sc)),Image.Resampling.LANCZOS)
            x=(W-p.width)//2+int(100*(1-smooth((t-start)/.5)))
            im.alpha_composite(p,(x,325))
            caption(im,cap,1695)
        else:
            im=background(t).convert('RGBA');im.alpha_composite(vignette)
            if t<19.6:
                eyebrow(im,'YOUR NEXT CHAPTER',color=CREAM)
                text(im,'From the', (84,1140),92,CREAM,serif=True)
                text(im,'first letter.',(84,1250),100,CREAM,serif=True)
                caption(im,'To the verses you love.')
            else:
                a=smooth((t-19.6)/.8)
                card=Image.fromarray(paper).convert('RGBA')
                eyebrow(card,'A LIVING LANGUAGE. A NEW BEGINNING.',220)
                card.alpha_composite(icon,((W-238)//2,470))
                centre(card,'Sanskritam',790,112,serif=True)
                centre(card,'Your Sanskrit journey starts here.',950,40)
                d=ImageDraw.Draw(card)
                d.rounded_rectangle((300,1120,780,1230),radius=55,fill=SAFFRON)
                centre(card,'COMING SOON',1154,34,color='white',bold=True)
                centre(card,'Follow for the launch.',1330,34,color='#806B59')
                centre(card,'VEDIC VALOR',1610,25,bold=True,color='#806B59')
                im=Image.blend(im,card,a)
        # Six small progress marks give the edit a cohesive, deliberate rhythm.
        d=ImageDraw.Draw(im)
        for i in range(6):
            x=84+i*155
            d.rounded_rectangle((x,1800,x+132,1804),radius=2,fill=(157,128,102,100))
            amount=min(1,max(0,t/4-i))
            if amount:d.rounded_rectangle((x,1800,x+int(132*amount),1804),radius=2,fill=SAFFRON)
        return np.asarray(im.convert('RGB'))

    for t in [1.5,4.5,8.8,11.8,14.1,17.5,22]:
        Image.fromarray(make_frame(t)).save(ROOT/f'preview-{t:04.1f}.jpg',quality=92)
    thumb=Image.fromarray(make_frame(22));thumb.save(ROOT/'cover.jpg',quality=95)
    if not preview_only:
        # No Sarvam voice, replacement music or added sound track: preserve native Flow audio.
        audio=concatenate_audioclips([c.audio.subclipped(0,8) for c in clips])
        edit=VideoClip(make_frame,duration=24).with_audio(audio)
        edit.write_videofile(str(ROOT/'Sanskritam-launch-24s-master.mp4'),fps=FPS,codec='libx264',audio_codec='aac',audio_bitrate='192k',preset='fast',threads=6,ffmpeg_params=['-crf','18','-pix_fmt','yuv420p','-movflags','+faststart'],logger='bar')
        edit.close()
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(ROOT/'Sanskritam-launch-24s-master.mp4'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(ROOT/'Sanskritam-launch-24s.mp4')],check=True)
    for c in clips:c.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('clips',nargs=3,type=Path);parser.add_argument('--stills',action='store_true')
    a=parser.parse_args();build(a.clips,a.stills)
