"""A fully vector-native Manim film; no generated images or video clips."""
from pathlib import Path
import json
import math
import textwrap
import numpy as np
from manim import *

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "results/videos/prahlada"
BG = "#0D2028"
INK = "#F6EAD4"
GOLD = "#DCAA55"
TEAL = "#69BCB3"
RED = "#AE5A4B"
STONE = "#29454C"
SKIN = "#BC8864"
config.frame_width = 9
config.frame_height = 16
config.background_color = BG


def label(words, size=26, color=INK, serif=False):
    obj = Text(words, font="Georgia" if serif else "Arial", font_size=size,
               color=color, line_spacing=1.0)
    if obj.width > 7.7:
        obj.scale_to_fit_width(7.7)
    return obj


def caption_label(words):
    return label("\n".join(textwrap.wrap(words, width=44)),20).move_to([0,-5.25,0])


def polygon(points, color, stroke=0):
    return Polygon(*[np.array([x, y, 0]) for x, y in points],
                   fill_color=color, fill_opacity=1, stroke_color=color, stroke_width=stroke)


def arch():
    return VGroup(Arc(radius=3.35, start_angle=0, angle=PI, color=GOLD, stroke_opacity=.22),
                  Line([-3.35, 0, 0], [-3.35, -3.3, 0], color=GOLD, stroke_opacity=.22),
                  Line([3.35, 0, 0], [3.35, -3.3, 0], color=GOLD, stroke_opacity=.22),
                  Line([-3.6, -3.3, 0], [3.6, -3.3, 0], color=GOLD, stroke_opacity=.35))


def lotus():
    petals = VGroup()
    for angle in np.linspace(-PI / 2, PI / 2, 7):
        petal = Ellipse(.38, 1.05, stroke_color=GOLD, stroke_width=1.6,
                        fill_color=GOLD, fill_opacity=.08).shift(UP * .32)
        petal.rotate(angle, about_point=ORIGIN)
        petals.add(petal)
    petals.add(Line(LEFT * 1.0, RIGHT * 1.0, color=GOLD, stroke_width=1.5))
    return petals


def child():
    g = VGroup()
    g.add(Ellipse(.85, .16, fill_color=BLACK, fill_opacity=.2, stroke_width=0).shift(DOWN * 1.4))
    g.add(polygon([(-.35, -.1), (.35, -.1), (.47, -1.15), (-.47, -1.15)], GOLD))
    g.add(Line([0, -.28, 0], [.06, -1.1, 0], color="#8B6339", stroke_width=2))
    g.add(RoundedRectangle(width=.6, height=.77, corner_radius=.18,
                           fill_color=SKIN, fill_opacity=1, stroke_width=0).shift(UP * .18))
    for x in [-.25, .25]:
        g.add(Ellipse(.32, .14, fill_color=SKIN, fill_opacity=1, stroke_width=0).move_to([x, -1.23, 0]))
    g.add(Circle(.36, fill_color="#19282D", fill_opacity=1, stroke_width=0).shift(UP * 1.0))
    g.add(Ellipse(.63, .72, fill_color=SKIN, fill_opacity=1, stroke_width=0).shift(UP * .84))
    g.add(Arc(radius=.34, start_angle=.05, angle=PI-.1, color="#18272B", stroke_width=9).shift(UP * .96))
    for x in [-.12, .12]:
        g.add(Line([x-.045, .88, 0], [x+.045, .88, 0], color=BG, stroke_width=2.4))
    g.add(Line([0, 1.06, 0], [0, .96, 0], color=INK, stroke_width=2))
    g.add(Arc(radius=.1, start_angle=PI, angle=PI, color=BG, stroke_width=1.5).shift(UP * .71))
    for s in [-1, 1]:
        g.add(Line([s*.28, .36, 0], [s*.38, .02, 0], color=SKIN, stroke_width=10))
        g.add(Line([s*.38, .02, 0], [s*.055, .45, 0], color=SKIN, stroke_width=8))
    g.add(Line([0, .22, 0], [0, .55, 0], color=INK, stroke_width=2))
    return g


def king():
    g = VGroup()
    g.add(polygon([(-.5,.3),(.5,.3),(.85,-1.35),(-.85,-1.35)], RED))
    g.add(polygon([(-.45,.6),(.45,.6),(.48,-.35),(-.48,-.35)], "#5B3E39"))
    g.add(Line([-.43,-.3,0],[.43,-.3,0],color=GOLD,stroke_width=9))
    g.add(Ellipse(.72,.85,fill_color=SKIN,fill_opacity=1,stroke_width=0).shift(UP*1.02))
    g.add(polygon([(-.43,1.35),(-.47,1.95),(-.2,1.7),(0,2.08),(.2,1.7),(.47,1.95),(.43,1.35)],GOLD))
    for s in [-1,1]:
        g.add(Line([s*.1,1.08,0],[s*.27,1.14,0],color=BG,stroke_width=3))
        g.add(Line([s*.46,.4,0],[s*.73,-.35,0],color=SKIN,stroke_width=13))
    g.add(Arc(radius=.19,start_angle=0,angle=PI,color=BG,stroke_width=3).shift(UP*.83))
    g.add(Circle(.07,fill_color=RED,fill_opacity=1,stroke_width=0).shift(UP*1.64))
    return g


def pillar():
    parts=VGroup()
    for y in [-1.75,-.75,.25,1.25]:
        parts.add(Rectangle(width=1.35,height=.98,fill_color=STONE,fill_opacity=1,
                           stroke_color="#668083",stroke_width=1).move_to([0,y,0]))
    for y in [-2.4,1.9]:
        parts.add(Rectangle(width=1.85,height=.3,fill_color="#52676A",fill_opacity=1,
                           stroke_color=GOLD,stroke_width=1).move_to([0,y,0]))
    for x in [-.4,0,.4]:
        parts.add(Line([x,-2.2,0],[x,1.7,0],color="#88A4A4",stroke_opacity=.35,stroke_width=1))
    return parts


def narasimha():
    g=VGroup()
    # Stylised devotional icon: lion face, human torso and four arms.
    for radius,opacity in [(2.3,.055),(1.95,.07),(1.65,.11)]:
        g.add(Circle(radius,fill_color=GOLD,fill_opacity=opacity,stroke_width=0).shift(UP*.8))
    for s in [-1,1]:
        g.add(Line([s*.6,.25,0],[s*1.45,.9,0],color=GOLD,stroke_width=15))
        g.add(Line([s*.55,-.05,0],[s*1.45,-.55,0],color=GOLD,stroke_width=15))
        g.add(Circle(.16,fill_color=GOLD,fill_opacity=1,stroke_width=0).move_to([s*1.5,.95,0]))
        g.add(Circle(.15,fill_color=GOLD,fill_opacity=1,stroke_width=0).move_to([s*1.5,-.6,0]))
    g.add(polygon([(-.7,.5),(.7,.5),(.5,-.65),(-.5,-.65)],"#E6BA6A"))
    g.add(polygon([(-.52,-.6),(.52,-.6),(.8,-1.7),(-.8,-1.7)],"#D17C43"))
    for a in np.linspace(0,TAU,18,endpoint=False):
        g.add(polygon([(.82*math.cos(a-.17),1.12+.82*math.sin(a-.17)),
                       (1.24*math.cos(a),1.12+1.24*math.sin(a)),
                       (.82*math.cos(a+.17),1.12+.82*math.sin(a+.17))],GOLD))
    g.add(Circle(.86,fill_color="#AD713C",fill_opacity=1,stroke_color=GOLD,stroke_width=2).shift(UP*1.12))
    for s in [-1,1]:
        g.add(Circle(.23,fill_color=GOLD,fill_opacity=1,stroke_width=0).move_to([s*.76,1.7,0]))
        g.add(Ellipse(.33,.12,fill_color=INK,fill_opacity=1,stroke_width=0).move_to([s*.33,1.28,0]))
        g.add(Dot([s*.3,1.28,0],radius=.045,color=BG))
        g.add(Ellipse(.39,.3,fill_color="#EED3A2",fill_opacity=1,stroke_width=0).move_to([s*.18,.89,0]))
    g.add(Triangle(fill_color=BG,fill_opacity=1,stroke_width=0).scale(.12).rotate(PI).move_to([0,1.02,0]))
    g.add(Line([0,1.04,0],[0,.74,0],color=BG,stroke_width=2))
    g.add(Line([0,1.64,0],[0,1.42,0],color=INK,stroke_width=3))
    for y in [.25,-.05,-.35]:
        g.add(Circle(.07,fill_color=INK,fill_opacity=1,stroke_width=0).move_to([0,y,0]))
    return g


class Prahlada(Scene):
    def construct(self):
        data=json.loads((OUT/"timeline.json").read_text(encoding="utf-8"))
        rng=np.random.default_rng(17)
        stars=VGroup(*[Dot([rng.uniform(-4,4),rng.uniform(-3.3,4),0],radius=rng.uniform(.009,.025),
                           color=GOLD,fill_opacity=.3) for _ in range(40)])
        self.add(stars,arch())
        self.add(label("PURANA  /  01",14,GOLD).move_to([0,7.05,0]))
        self.add(Line([-3.8,6.6,0],[3.8,6.6,0],color=GOLD,stroke_opacity=.45,stroke_width=1))
        self.add(label("BHAGAVATA PURANA  ·  CANTO 7",12,"#9FAEAB").move_to([0,-7.12,0]))
        self.add(label("A brief retelling  /  Manim + Sarvam",11,"#79908F").move_to([0,-7.48,0]))
        progress=VGroup(*[Line([-3.8+i*.96,-6.65,0],[-3.03+i*.96,-6.65,0],
                              color=STONE,stroke_width=3) for i in range(8)])
        self.add(progress)
        for i,s in enumerate(data["scenes"]):
            start=self.time
            heading=label(s["heading"],28,GOLD).move_to([0,5.82,0])
            sub=label(s["subheading"],22,INK,True).move_to([0,5.06,0])
            caption=caption_label(s["captions"][0])
            rule=Line([-.38,-4.55,0],[.38,-4.55,0],color=GOLD,stroke_width=2)
            art=VGroup()
            action1=[];action2=[]
            if i==0:
                medallion=Circle(2.7,stroke_color=GOLD,stroke_width=1.4).shift(UP*.4)
                p=pillar().scale(.8).move_to([.75,.2,0])
                c=child().scale(.9).move_to([-1.4,-.8,0])
                lo=lotus().scale(.5).move_to([0,3.65,0])
                art.add(medallion,p,c,lo)
                action1=[Create(medallion),c.animate.shift(UP*.12)]
                action2=[Indicate(lo,color=GOLD,scale_factor=1.15)]
            elif i==1:
                k=king().scale(1.05).move_to([-1.9,-.15,0])
                c=child().move_to([1.9,-.7,0])
                halo=Circle(1.15,color=TEAL,stroke_opacity=.6).move_to([1.9,-.3,0])
                divider=Line([0,2.5,0],[0,-2.8,0],color=GOLD,stroke_opacity=.2)
                art.add(halo,k,c,divider,label("POWER",16,RED).move_to([-1.9,-2.7,0]),
                        label("DEVOTION",16,TEAL).move_to([1.9,-2.7,0]))
                action1=[k.animate.shift(UP*.12)]
                action2=[Indicate(halo,color=TEAL,scale_factor=1.12)]
            elif i==2:
                p=pillar().move_to([.6,.2,0]);k=king().scale(.85).move_to([-2.45,-.5,0])
                c=child().scale(.7).move_to([2.7,-1.3,0])
                ray=Arrow([-1.6,.7,0],[-.3,.7,0],color=RED,stroke_width=4,buff=.05)
                art.add(p,k,c,ray)
                action1=[GrowArrow(ray)]
                action2=[Indicate(p,color=RED,scale_factor=1.04)]
            elif i==3:
                c=child().scale(1.2).move_to([0,-.6,0]);lo=lotus().scale(1.15).move_to([0,-2.65,0])
                rings=VGroup(*[Circle(r,color=TEAL,stroke_width=1.3,stroke_opacity=.7).move_to([0,.2,0]) for r in [1.5,2.1,2.7]])
                art.add(rings,c,lo)
                action1=[LaggedStart(*[Create(r) for r in rings],lag_ratio=.3)]
                action2=[rings.animate.scale(1.12).set_stroke(opacity=.3)]
            elif i==4:
                p=pillar().move_to([0,.2,0])
                crack=VMobject().set_points_as_corners([[-.1,1.9,0],[.2,1.1,0],[-.2,.55,0],[.25,-.2,0],[-.12,-1.0,0],[.1,-2.1,0]]).set_stroke(GOLD,5)
                rings=VGroup(*[Circle(r,color=GOLD,stroke_width=2,stroke_opacity=.7) for r in [1.1,1.9,2.7]])
                art.add(p,crack,rings)
                action1=[Create(crack),Wiggle(p,scale_value=1.02,rotation_angle=.035)]
                action2=[LaggedStart(*[GrowFromCenter(r) for r in rings],lag_ratio=.15),p.animate.set_opacity(.35)]
            elif i==5:
                n=narasimha().scale(1.05).move_to([0,.35,0])
                left=VGroup(*[Rectangle(width=.5,height=.55,fill_color=STONE,fill_opacity=1,stroke_color=GOLD,stroke_width=1).rotate(a).move_to([x,y,0]) for x,y,a in [(-2.2,1.1,.3),(-2.65,-.3,-.2),(-1.9,-1.7,.5)]])
                right=left.copy().flip(UP)
                art.add(n,left,right)
                action1=[n.animate.scale(1.06),left.animate.shift(LEFT*.25),right.animate.shift(RIGHT*.25)]
                action2=[Indicate(n[0],color=GOLD,scale_factor=1.12)]
            elif i==6:
                door=VGroup(Rectangle(width=3.7,height=5.4,fill_color="#382D40",fill_opacity=1,stroke_color=GOLD,stroke_width=2),
                            Circle(.8,fill_color="#CE8253",fill_opacity=1,stroke_width=0).move_to([0,.9,0]),
                            Rectangle(width=3.6,height=1.7,fill_color=BG,fill_opacity=1,stroke_width=0).move_to([0,-.6,0]))
                n=narasimha().scale(.67).move_to([0,-.1,0])
                crown=polygon([(-.4,0),(-.5,.55),(-.18,.35),(0,.7),(.18,.35),(.5,.55),(.4,0)],GOLD).move_to([2.5,-1.65,0])
                c=child().scale(.65).move_to([-2.5,-1.65,0])
                art.add(door,n,c,crown)
                action1=[crown.animate.rotate(-.65).shift(DOWN*.8)]
                action2=[Indicate(c,color=TEAL,scale_factor=1.08)]
            else:
                n=narasimha().scale(.82).move_to([.9,.6,0])
                c=child().scale(.87).move_to([-1.6,-1.25,0])
                lo=lotus().scale(.75).move_to([0,-2.7,0])
                petals=VGroup(*[Ellipse(.1,.2,fill_color=GOLD,fill_opacity=.8,stroke_width=0).rotate(a).move_to([x,y,0]) for x,y,a in [(-2.5,2.4,.3),(-1,3.3,.8),(1.8,3.1,-.5),(2.9,1.6,.7),(-2.8,.3,-.4)]])
                art.add(n,c,lo,petals)
                action1=[c.animate.rotate(-.12),petals.animate.shift(DOWN*.55)]
                action2=[petals.animate.shift(DOWN*.7),Indicate(lo,color=GOLD,scale_factor=1.1)]
            self.play(FadeIn(heading,shift=UP*.1),FadeIn(sub),FadeIn(caption),FadeIn(rule),FadeIn(art),
                      progress[i].animate.set_color(GOLD),run_time=.65)
            self.play(*action1,run_time=1.6)
            half=start+s["duration"]*.5
            if self.time<half:self.wait(half-self.time)
            newcaption=caption_label(s["captions"][1])
            self.play(ReplacementTransform(caption,newcaption),run_time=.35)
            self.play(*action2,run_time=1.3)
            remaining=start+s["duration"]-.45-self.time
            if remaining>0:self.wait(remaining)
            self.play(*[FadeOut(o) for o in [heading,sub,newcaption,rule,art]],run_time=.45)
