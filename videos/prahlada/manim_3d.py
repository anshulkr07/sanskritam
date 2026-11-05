"""Short Manim ThreeDScene comparison: the pillar and the appearance.

The main 60-second character film is rendered separately by Three.js.
"""
from manim import *
import numpy as np
import json
from pathlib import Path

config.frame_width=9
config.frame_height=16
config.background_color="#172A36"
GOLD="#D5A95B"
CREAM="#F2D7A0"
STONE="#6F8A91"
TEAL="#62B5AF"


def ball(pos,size,color):
    # Eight planar faces keep this Cairo technique test inexpensive to render.
    vertices=[np.array(p,dtype=float) for p in [(1,0,0),(0,1,0),(-1,0,0),(0,-1,0),(0,0,1),(0,0,-1)]]
    faces=VGroup()
    for apex in [4,5]:
        for i in range(4):
            face=Polygon(vertices[apex],vertices[i],vertices[(i+1)%4],
                         fill_color=color,fill_opacity=1,stroke_width=0)
            face.set_shade_in_3d(True)
            faces.add(face)
    return faces.scale(np.array(size)).shift(np.array(pos))


def segment(a,b,color,width=.1):
    a,b=np.array(a,dtype=float),np.array(b,dtype=float)
    delta=b-a
    length=np.linalg.norm(delta)
    obj=Prism(dimensions=[width,width,length],fill_color=color,fill_opacity=1,stroke_width=0)
    direction=delta/length
    axis=np.cross(OUT,direction)
    if np.linalg.norm(axis)>1e-8:
        obj.rotate(np.arccos(np.clip(np.dot(OUT,direction),-1,1)),axis=axis)
    elif direction[2]<0:
        obj.rotate(PI,axis=RIGHT)
    return obj.move_to((a+b)/2)


def devotee():
    group=VGroup()
    group.add(ball([0,0,1.7],[.24,.24,.28],CREAM))
    group.add(ball([0,0,1.2],[.27,.18,.4],TEAL))
    group.add(Cone(base_radius=.34,height=.55,direction=OUT,resolution=(3,6),
                   fill_color=GOLD,fill_opacity=1,stroke_width=0).move_to([0,0,.75]))
    for side in [-1,1]:
        group.add(segment([side*.13,0,.55],[side*.13,0,.1],CREAM,.1))
        group.add(segment([side*.22,0,1.4],[side*.34,-.12,1.1],CREAM,.08))
        group.add(segment([side*.34,-.12,1.1],[side*.035,-.36,1.35],CREAM,.07))
        group.add(ball([side*.08,-.22,1.74],[.025,.025,.03],"#172A36"))
    return group


def narasimha():
    group=VGroup()
    group.add(ball([0,0,1.95],[.53,.3,.68],GOLD))
    skirt=Cone(base_radius=.62,height=1.1,direction=OUT,resolution=(3,8),
               fill_color="#B45D4A",fill_opacity=1,stroke_width=0).move_to([0,0,.9])
    group.add(skirt)
    for side in [-1,1]:
        group.add(segment([side*.23,0,.55],[side*.23,0,.1],CREAM,.15))
    mane=VGroup()
    for i in range(16):
        a=i*TAU/16
        tuft=ball([.57*np.cos(a),.01,3.0+.57*np.sin(a)],[.17,.17,.25],GOLD)
        tuft.rotate(PI/2-a,axis=UP)
        mane.add(tuft)
    group.add(mane,ball([0,-.02,3.0],[.47,.3,.5],"#C28C45"))
    group.add(ball([0,-.33,2.86],[.24,.15,.16],CREAM))
    group.add(ball([0,-.46,2.96],[.08,.045,.05],"#48342D"))
    for side in [-1,1]:
        group.add(ball([side*.18,-.29,3.12],[.1,.04,.06],CREAM))
        group.add(ball([side*.17,-.33,3.12],[.025,.02,.04],"#1C2730"))
    group.add(segment([0,-.29,3.25],[0,-.27,3.4],CREAM,.025))
    arms=VGroup()
    for side in [-1,1]:
        for z in [1.95,2.22]:
            arm=VGroup(segment([side*.43,0,z],[side*.86,-.04,z-.2],GOLD,.14),
                       segment([side*.86,-.04,z-.2],[side*1.15,-.2,z+.12],CREAM,.12),
                       ball([side*1.15,-.2,z+.12],[.12,.08,.12],GOLD))
            arms.add(arm)
    group.add(arms)
    return group,arms


class PillarReveal3D(ThreeDScene):
    def construct(self):
        self.set_camera_orientation(phi=72*DEGREES,theta=-65*DEGREES,
                                    zoom=1.12,frame_center=np.array([0,0,2.0]))
        floor=Square(side_length=12,fill_color="#243F49",fill_opacity=1,
                     stroke_color=GOLD,stroke_width=1)
        self.add(floor)
        for x in range(-5,6):
            self.add(Line([x,-5,.005],[x,5,.005],color=STONE,stroke_opacity=.25))
            self.add(Line([-5,x,.005],[5,x,.005],color=STONE,stroke_opacity=.25))
        ring=Circle(radius=2.6,color=GOLD,stroke_opacity=.35).shift(OUT*.02)
        self.add(ring)
        title=Text("THE PILLAR BREAKS",font="Georgia",font_size=30,color=CREAM).move_to([0,5.9,0])
        subtitle=Text("Manim 3D · camera, geometry and light",font="Arial",font_size=16,color=STONE).move_to([0,5.3,0])
        caption=Text("A tremendous sound fills the palace.",font="Arial",font_size=21,color=CREAM).move_to([0,-5.4,0])
        self.add_fixed_in_frame_mobjects(title,subtitle,caption)
        halves=VGroup()
        for side in [-1,1]:
            half=VGroup(Prism(dimensions=[.55,.85,4.2],fill_color=STONE,fill_opacity=1,
                               stroke_width=.4,stroke_color=GOLD).move_to([side*.275,0,2.3]))
            for z in [.16,.35,4.4,4.6]:
                half.add(Prism(dimensions=[.75,1.15,.16],fill_color=GOLD,fill_opacity=1,
                               stroke_width=0).move_to([side*.375,0,z]))
            halves.add(half)
        child=devotee().move_to([1.9,-.6,1.0])
        self.add(halves,child)
        self.begin_ambient_camera_rotation(rate=.045)
        crack=VGroup(*[segment(a,b,CREAM,.035) for a,b in zip(
            [[0,-.44,4.35],[.12,-.44,3.5],[-.13,-.44,2.8],[.15,-.44,2.0],[-.05,-.44,1.2]],
            [[.12,-.44,3.5],[-.13,-.44,2.8],[.15,-.44,2.0],[-.05,-.44,1.2],[.04,-.44,.4]])])
        self.wait(.9)
        self.play(Wiggle(halves,scale_value=1.015,rotation_angle=.025),Create(crack),run_time=1.2)
        self.play(halves[0].animate.shift(LEFT*.35),halves[1].animate.shift(RIGHT*.35),run_time=1.4)
        lord,arms=narasimha();lord.shift(UP*.25)
        self.play(halves[0].animate.shift(LEFT*.85).rotate(.08,axis=UP),
                  halves[1].animate.shift(RIGHT*.85).rotate(-.08,axis=UP),
                  FadeOut(crack),FadeIn(lord,shift=UP*.3),run_time=2.2)
        newtitle=Text("NARASIMHA",font="Georgia",font_size=33,color=GOLD).move_to(title)
        newcaption=Text("The Lord appears to protect His devotee.",font="Arial",font_size=20,color=CREAM).move_to(caption)
        self.remove_fixed_in_frame_mobjects(title,caption)
        self.remove(title,caption)
        self.add_fixed_in_frame_mobjects(newtitle,newcaption)
        self.play(lord.animate.shift(DOWN*.55),halves.animate.set_opacity(.35),run_time=1.4)
        self.play(Rotate(arms[1],angle=.2,axis=UP,about_point=[-.43,-.3,2.22]),
                  Rotate(arms[3],angle=-.2,axis=UP,about_point=[.43,-.3,2.22]),run_time=1.5)
        self.move_camera(phi=65*DEGREES,theta=-48*DEGREES,zoom=1.2,run_time=2.0)
        self.play(child.animate.rotate(.15,axis=RIGHT,about_point=[1.9,-.6,0]),run_time=1.2)
        self.wait(2.633333333333333)


class Prahlada30(ThreeDScene):
    """Complete 30-second geometric staging using the shared Sarvam timeline."""
    def construct(self):
        timeline=json.loads((Path(__file__).resolve().parents[2]/
            "results/videos/prahlada/comparison-30/timeline.json").read_text(encoding="utf-8"))
        durations=[s["duration"] for s in timeline["scenes"]]
        # Quantize scene boundaries to the chosen output frame rate.
        ends=[round((s["start"]+s["duration"])*15) for s in timeline["scenes"]]
        durations=[(b-a)/15 for a,b in zip([0]+ends[:-1],ends)]
        self.set_camera_orientation(phi=74*DEGREES,theta=-78*DEGREES,
                                    zoom=.95,frame_center=np.array([0,0,2.0]))
        floor=Square(side_length=14,fill_color="#253F49",fill_opacity=0,
                     stroke_color=GOLD,stroke_width=1).set_z_index(-100)
        self.add(floor)
        for x in range(-6,7,2):
            self.add(Line([x,-6,.01],[x,6,.01],color=STONE,stroke_opacity=.25).set_z_index(-99),
                     Line([-6,x,.01],[6,x,.01],color=STONE,stroke_opacity=.25).set_z_index(-99))
        for x in [-3.7,3.7]:
            self.add(Prism(dimensions=[.4,.5,6],fill_color=STONE,fill_opacity=1,
                           stroke_width=0).move_to([x,1.4,3]))
            for z in [.2,5.8]:
                self.add(Prism(dimensions=[.7,.8,.2],fill_color=GOLD,fill_opacity=1,
                               stroke_width=0).move_to([x,1.4,z]))
        self.add(Prism(dimensions=[8,.55,.3],fill_color=GOLD,fill_opacity=1,
                       stroke_width=0).move_to([0,1.4,6]))
        halves=VGroup(*[Prism(dimensions=[.48,.7,4.5],fill_color=STONE,fill_opacity=1,
                      stroke_color=GOLD,stroke_width=.5).move_to([s*.25,.5,2.3]) for s in [-1,1]])
        child=devotee().shift(RIGHT*2.1+DOWN*.7)
        king=devotee().scale(1.55,about_point=ORIGIN).shift(LEFT*2+UP*.05)
        king[1].set_color("#AD504A")
        crown=VGroup(*[Prism(dimensions=[.12,.2,.3+(i%2)*.15],fill_color=GOLD,
                            fill_opacity=1,stroke_width=0).move_to([-2+(i-2)*.12,0,3.13]) for i in range(5)])
        self.add(halves,child,king,crown)
        self.begin_ambient_camera_rotation(rate=.012)
        label=None
        def card(index):
            nonlocal label
            if label is not None:
                self.remove_fixed_in_frame_mobjects(label)
                self.remove(label)
            s=timeline["scenes"][index]
            label=VGroup(Text(s["heading"],font="Georgia",font_size=30,color=GOLD).move_to([0,5.9,0]),
                Text("PRAHLADA · MANIM 3D",font="Arial",font_size=14,color=STONE).move_to([0,5.35,0]),
                Text(s["captions"][0],font="Arial",font_size=20,color=CREAM).move_to([0,-5.4,0]))
            if label[2].width>7.6:label[2].scale_to_fit_width(7.6)
            self.add_fixed_in_frame_mobjects(label)
        card(0)
        self.play(child.animate.shift(LEFT*.5),run_time=durations[0],rate_func=smooth)
        card(1)
        self.play(Rotate(king,angle=-.10,axis=UP,about_point=[-2,0,0]),
                  crown.animate.shift(RIGHT*.12),run_time=durations[1])
        card(2)
        self.play(king.animate.shift(RIGHT*.45),crown.animate.shift(RIGHT*.45),
                  run_time=durations[2])
        card(3)
        self.play(Rotate(child,angle=.10,axis=RIGHT,about_point=[1.6,-.7,0]),run_time=durations[3])
        card(4)
        self.play(king.animate.shift(RIGHT*.2),crown.animate.shift(RIGHT*.2),
                  Wiggle(halves,scale_value=1.01,rotation_angle=.025),run_time=durations[4]*.45)
        self.play(halves[0].animate.shift(LEFT*1.15).rotate(.12,axis=UP),
                  halves[1].animate.shift(RIGHT*1.15).rotate(-.12,axis=UP),run_time=durations[4]*.55)
        card(5)
        lord,arms=narasimha()
        lord.shift(UP*.4)
        self.play(FadeIn(lord,shift=DOWN*.35),halves.animate.set_opacity(.22),
                  run_time=durations[5])
        card(6)
        self.play(king.animate.shift(LEFT*3).rotate(.35,axis=UP),
                  crown.animate.shift(DOWN*.6+RIGHT*.15+IN*2.9).rotate(PI/2,axis=UP),
                  lord.animate.shift(DOWN*.35),run_time=durations[6])
        self.remove(king)
        card(7)
        self.play(child.animate.shift(LEFT*.35).rotate(.28,axis=RIGHT,about_point=[1.6,-.7,0]),
                  Rotate(arms[3],angle=-.3,axis=UP,about_point=[.43,0,2.22]),run_time=durations[7]-1)
        self.wait(1)
