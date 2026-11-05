// Derived from ../prahlada/illustrated.mjs; original project assets and blocking.
import * as THREE from 'three';
export function createPuppetScene(timeline){
const W=720,H=1280,PI=Math.PI,TAU=PI*2;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c99468');
const camera=new THREE.PerspectiveCamera(38,W/H,.1,100);
const C={ink:'#542f2b',gold:'#d9a640',cream:'#f4dca8',skin:'#d69662',red:'#a62f35',sage:'#496b54',blue:'#365567'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const lerp=(a,b,t)=>a+(b-a)*t;
function path(c,pts,fill,stroke=C.ink,width=2){c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(p.length===2)i?c.lineTo(...p):c.moveTo(...p);else c.bezierCurveTo(...p)}c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function oval(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
function line(c,pts,color=C.ink,lw=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';c.stroke()}
function flower(c,x,y,r,color=C.cream){for(let i=0;i<6;i++){let a=i*TAU/6;oval(c,x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55,r*.3,r*.3,color)}oval(c,x,y,r*.21,r*.21,C.gold)}
function texture(width,height,draw){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex}
function plane(tex,w,h,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.position.set(x,y,z);return mesh}
const layer=(w,h,x,y,z,draw,pw=1000,ph=1000)=>{let p=plane(texture(pw,ph,draw),w,h,x,y,z);scene.add(p);return p};

// Dusk, hills and a palace courtyard, each at a different camera depth.
layer(25,19,0,7,-7,(c,w,h)=>{let g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#66707e');g.addColorStop(.42,'#ce8e69');g.addColorStop(1,'#eed5a0');c.fillStyle=g;c.fillRect(0,0,w,h);oval(c,620,390,120,120,'#edc27c');for(let i=0;i<3;i++)path(c,[[0,620+i*75],[180,510+i*65,280,560+i*60,460,650+i*50],[660,500+i*50,800,620+i*50,1000,560+i*60],[1000,1000],[0,1000]],['#ab846f','#947b65','#7e7660'][i],null)},1200,1000);
layer(20,9.5,0,4.3,-4.5,(c,w,h)=>{c.fillStyle='#b9654d';c.fillRect(0,0,w,h);c.fillStyle='#dca778';c.fillRect(0,40,w,h-40);for(let x=0;x<w;x+=115){c.fillStyle='#c48b64';c.fillRect(x,0,3,h);for(let y=40;y<h;y+=70)line(c,[[x,y],[x+115,y]],'#c99870',1)}for(let x=60;x<w;x+=220){c.fillStyle='#a85c46';c.fillRect(x,230,130,330);c.beginPath();c.arc(x+65,230,65,Math.PI,0);c.fill();c.fillStyle='#445f5a';c.fillRect(x+10,240,110,310);c.beginPath();c.arc(x+65,240,55,Math.PI,0);c.fill();for(let k=0;k<5;k++)line(c,[[x+10+k*25,250],[x+10+k*25,545]],'#daa76c',2);for(let yy=260;yy<550;yy+=35)line(c,[[x+10,yy],[x+120,yy]],'#daa76c',2)}c.fillStyle=C.red;c.fillRect(0,650,w,55);for(let x=0;x<w;x+=35)flower(c,x+17,677,9);c.fillStyle='#774032';c.fillRect(0,710,w,22)},1800,900);
// Receding patterned floor, painted as a stage plane.
const floorTex=texture(1024,1024,(c,w,h)=>{c.fillStyle='#d9b27b';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=128)for(let y=0;y<h;y+=128){c.fillStyle=((x+y)/128)%2?'#dfbc87':'#d4ab76';c.fillRect(x,y,128,128);line(c,[[x,y],[x+128,y],[x+128,y+128]],'#b18c61',2);flower(c,x+64,y+64,7,'#b99567')}});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,26),new THREE.MeshBasicMaterial({map:floorTex}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.015,0);scene.add(floor);
layer(3.5,4.5,0,2.25,-3.8,(c,w,h)=>{c.fillStyle='#8f513e';c.fillRect(0,0,w,h);c.fillStyle='#edbd7b';c.fillRect(30,20,w-60,h-20);c.fillStyle='#4f5461';c.fillRect(100,130,w-200,h);c.beginPath();c.arc(w/2,140,400,Math.PI,0);c.fill();oval(c,540,380,180,180,'#da9870');for(let i=0;i<4;i++){c.strokeStyle=['#d2a064','#bd815b','#efcb90','#a86548'][i];c.lineWidth=15;c.strokeRect(35+i*13,22+i*17,w-70-i*26,h)}},900,1000);

function column(x,z,scale=1){return layer(1.35*scale,8.5*scale,x,4.25*scale,z,(c,w,h)=>{let g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#90583f');g.addColorStop(.4,'#deb780');g.addColorStop(.6,'#eed0a1');g.addColorStop(1,'#a86b48');c.fillStyle=g;c.fillRect(w*.25,h*.12,w*.5,h*.81);c.strokeStyle='#82452e';c.lineWidth=3;c.strokeRect(w*.25,h*.12,w*.5,h*.81);for(let x=w*.32;x<w*.73;x+=w*.13)line(c,[[x,h*.15],[x,h*.89]],'#c58d5c',3);for(let y of [.07,.1,.13,.89,.93,.97]){c.fillStyle=y>.88?'#a46242':'#c68c58';c.fillRect(w*.12,h*y,w*.76,h*.025);line(c,[[w*.12,h*y],[w*.88,h*y]],C.gold,5)}for(let y=220;y<800;y+=100)flower(c,w*.5,y,18,'#f6dc9d')},300,1400)}
for(let z of [-3,1,5])for(let x of [-5.6,5.6])column(x,z);
// Main pillar is two independently moving illustrated halves.
const pillarTexture=texture(512,1024,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#94785e');g.addColorStop(.48,'#e6d2a8');g.addColorStop(1,'#a98a68');c.fillStyle=g;c.fillRect(95,75,320,870);for(let x=130;x<400;x+=60)line(c,[[x,100],[x,920]],'#a88a66',4);for(let y of [35,70,925,960]){c.fillStyle='#b78a5c';c.fillRect(40,y,430,32);line(c,[[40,y],[470,y]],C.cream,5)}for(let y=180;y<900;y+=145){flower(c,256,y,18,'#d2ad70');line(c,[[100,y+50],[415,y+50]],'#c19d70',2)}});
const pillar=new THREE.Group();pillar.position.set(0,0,-1.25);scene.add(pillar);
const pillarParts=[];
for(let side of [-1,1]){const tex=pillarTexture.clone();tex.needsUpdate=true;tex.repeat.set(.5,1);tex.offset.x=side<0?0:.5;const p=plane(tex,.68,5.7,side*.34,2.85,0);pillar.add(p);pillarParts.push(p)}
const crack=layer(.32,5.5,0,2.8,-1.15,(c,w,h)=>{line(c,[[w*.4,0],[w*.8,h*.2],[w*.2,h*.38],[w*.75,h*.6],[w*.3,h*.8],[w*.5,h]],'#fff1ae',22)},80,1000);
const aura=layer(7,8,0,3,-1.3,(c,w,h)=>{let g=c.createRadialGradient(w/2,h/2,10,w/2,h/2,w/2);g.addColorStop(0,'#fff0ac');g.addColorStop(.22,'#efc476cc');g.addColorStop(.6,'#e4a55255');g.addColorStop(1,'#e8bd6100');c.fillStyle=g;c.fillRect(0,0,w,h)});

function headTexture(kind){return texture(600,700,(c)=>{
    if(kind==='lion'){
        // Layered mane, sculpted muzzle, brows, fangs and a Vaishnava tilak.
        for(let ring=0;ring<2;ring++)for(let i=0;i<19;i++){let a=i*TAU/19;let cx=286,cy=320;path(c,[[cx+Math.cos(a-.15)*(185-ring*30),cy+Math.sin(a-.15)*(210-ring*25)],[cx+Math.cos(a)*(280-ring*35),cy+Math.sin(a)*(300-ring*38)],[cx+Math.cos(a+.15)*(185-ring*30),cy+Math.sin(a+.15)*(210-ring*25)]],ring?'#d59c40':'#a7652c',C.ink,2)}
        oval(c,285,323,175,205,'#e2ae57',C.ink,3);for(let s of [-1,1]){oval(c,285+s*150,195,48,65,'#d7a34e',C.ink);oval(c,285+s*150,195,22,38,'#a86a38');}
        for(let s of [-1,1]){path(c,[[285+s*35,275],[285+s*135,250],[285+s*145,282],[285+s*40,303]],'#ffefaa',C.ink,3);oval(c,285+s*85,279,13,27,'#4c3324');line(c,[[285+s*40,244],[285+s*135,226]],C.ink,9)}
        oval(c,285,405,98,90,'#693b2b');for(let s of [-1,1]){oval(c,285+s*58,356,65,57,'#f8d896',C.ink);path(c,[[285+s*70,397],[285+s*45,460],[285+s*27,399]],C.cream,C.ink,1)}path(c,[[255,336],[315,336],[285,362]],C.ink,null);line(c,[[285,350],[285,395]],C.ink,4);
        line(c,[[260,150],[267,210],[285,225],[303,210],[310,150]],C.cream,12);line(c,[[285,160],[285,207]],C.red,8);
        for(let s of [-1,1])for(let i=0;i<3;i++)line(c,[[285+s*85,365+i*12],[285+s*175,350+i*22]],C.ink,2);
    }else{
        // A miniature-style three-quarter profile faces local +x.
        path(c,[[220,510],[235,410],[325,400],[342,505]],C.skin,C.ink,4);
        path(c,[[180,160],[275,103,402,143,410,245],[415,270],[465,319],[421,337],[417,392],[399,441,315,464,245,427],[191,385,170,270,180,160]],C.skin,C.ink,4);
        path(c,[[175,179],[150,80,295,30,400,140],[424,165],[401,212],[380,170,335,176,315,195],[290,245],[260,260],[240,345],[199,323],[170,255]],'#332b27',C.ink,3);
        oval(c,250,310,27,40,C.skin,C.ink,3);oval(c,250,357,19,28,null,C.gold,9);
        path(c,[[329,271],[352,247,383,250,401,270],[375,290,345,288,329,271]],'#fff0d0',C.ink,3);oval(c,378,270,8,15,C.ink);oval(c,382,265,3,4,'#fff9e0');
        line(c,[[326,242],[355,230],[393,239]],C.ink,6);
        line(c,[[398,359],[420,356]],C.ink,3);line(c,[[395,372],[418,372]],'#9b4436',3);
        line(c,[[350,193],[350,231]],C.cream,7);line(c,[[360,194],[360,228]],C.cream,7);oval(c,355,232,5,7,C.red);
        if(kind==='king'){
            path(c,[[338,345],[375,333,385,343,400,346],[419,336],[425,352],[406,372,374,355,347,360]],'#342921',C.ink,2);
            for(let i=0;i<5;i++){let x=195+i*43;path(c,[[x,165],[x-10,80],[x+18,36-i%2*25],[x+41,86],[x+40,168]],C.gold,C.ink,3);oval(c,x+19,113,9,15,i%2?C.red:'#387875',C.ink,1)}
            c.fillStyle='#dba94e';c.fillRect(187,150,224,42);for(let x=200;x<410;x+=19)oval(c,x,171,4,5,C.cream);
        }else{
            oval(c,215,97,40,47,'#332b27',C.ink,3);oval(c,215,84,24,23,'#48352b');
        }
    }
})}
function torsoTexture(kind){return texture(600,800,(c)=>{
    let deity=kind==='lion',king=kind==='king';let cloth=deity?'#b84234':king?'#a63239':'#e9b24a';
    path(c,[[210,50],[390,50],[440,147],[415,430],[500,755],[105,755],[185,430],[165,147]],deity?'#e1ac61':C.skin,C.ink,4);
    if(!deity)path(c,[[183,80],[255,75],[407,418],[365,465]],king?'#ad3e38':'#f3d98d',C.ink,3);
    path(c,[[185,425],[414,425],[505,745],[470,777],[125,777],[90,745]],cloth,C.ink,4);
    for(let i=0;i<9;i++){let x=120+i*42;line(c,[[300+(x-300)*.5,445],[x,745]],king?'#d37c53':'#b47b39',2)}
    for(let y of [445,724,751])line(c,[[113-(y<500?-70:0),y],[486-(y<500?70:0),y]],C.gold,9);
    for(let y=485;y<720;y+=50)for(let x=150;x<470;x+=65)flower(c,x,y,8,C.cream);
    path(c,[[210,435],[235,458],[190,640],[155,650]],C.cream,C.ink,2);
    // Pearl necklaces, pendant and armoured waist trim.
    for(let i=0;i<17;i++){let a=i*Math.PI/16;oval(c,300+110*Math.cos(a),170+110*Math.sin(a),6,7,C.cream,C.gold,1)}
    oval(c,300,285,20,27,C.gold,C.ink,2);oval(c,300,285,9,14,C.red);
    if(deity){for(let i=0;i<21;i++){let a=i*Math.PI/20;flower(c,300+145*Math.cos(a),185+225*Math.sin(a),13,i%2?'#f0ce81':'#e9e1bd')}}
})}
function limbTexture(length,kind,lower=false){return texture(160,600,(c,w,h)=>{
    const skin=kind==='lion'?'#e1ac61':C.skin;
    path(c,[[52,20],[108,20],[115,150],[100,540],[75,580],[51,545],[43,150]],skin,C.ink,3);
    for(let y of lower?[400,420]:[100,120]){c.fillStyle=C.gold;c.fillRect(46,y,66,17);line(c,[[46,y],[112,y]],C.cream,3)}
    if(lower){for(let i=0;i<4;i++)line(c,[[60+i*12,520],[62+i*12,567]],C.ink,1.5)}
})}
function footTexture(kind){return texture(300,180,(c)=>{path(c,[[55,30],[130,30],[160,95],[258,100],[280,130],[265,151],[55,150]],kind==='lion'?'#e1ac61':C.skin,C.ink,4);line(c,[[50,155],[270,155]],'#86603b',5);for(let i=0;i<4;i++)line(c,[[225+i*11,110],[230+i*11,143]],C.ink,2)})}
function actor(kind){
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);scene.add(root);
    const scale=kind==='king'?1.18:kind==='lion'?1.4:.86;root.scale.setScalar(scale);
    const torso=plane(torsoTexture(kind),1.3,1.8,0,1.55,.05);body.add(torso);
    const head=new THREE.Group();head.position.set(0,2.65,.15);head.add(plane(headTexture(kind),1.45,1.65));body.add(head);
    const arms=[];const legs=[];
    for(let s of [-1,1]){
        const thigh=new THREE.Group();thigh.position.set(s*.22,1.18,-.015);body.add(thigh);
        thigh.add(plane(limbTexture(.55,kind),.22,.55,0,-.275));
        const knee=new THREE.Group();knee.position.y=-.55;thigh.add(knee);knee.add(plane(limbTexture(.56,kind,true),.2,.56,0,-.28));knee.add(plane(footTexture(kind),.44,.25,.1,-.59,.025));legs.push({thigh,knee});
        const shoulder=new THREE.Group();shoulder.position.set(s*.42,2.18,s<0?-.06:.22);body.add(shoulder);
        shoulder.add(plane(limbTexture(.63,kind),.25,.65,0,-.30));
        const elbow=new THREE.Group();elbow.position.y=-.58;shoulder.add(elbow);elbow.add(plane(limbTexture(.63,kind,true),.24,.66,0,-.3));arms.push({shoulder,elbow});
    }
    const extra=[];
    if(kind==='lion')for(let s of [-1,1]){
        const joint=new THREE.Group();joint.position.set(s*.48,2.0,-.12);body.add(joint);
        joint.add(plane(limbTexture(.7,kind),.23,.75,0,-.35));const elbow=new THREE.Group();elbow.position.y=-.67;joint.add(elbow);elbow.add(plane(limbTexture(.65,kind,true),.24,.7,0,-.34));extra.push({shoulder:joint,elbow});
    }
    const shadow=plane(texture(256,100,(c,w,h)=>{let g=c.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'#462f2d66');g.addColorStop(1,'#462f2d00');c.fillStyle=g;c.fillRect(0,0,w,h)}),2.2,.7);
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.01;root.add(shadow);
    return{root,body,head,arms,legs,extra,scale};
}
const king=actor('king'),boy=actor('boy'),lord=actor('lion');
const actors=[king,boy,lord];
function reset(a,t){a.body.position.set(0,.015*Math.sin(t*2),0);a.body.rotation.set(0,0,0);a.head.rotation.set(0,0,.025*Math.sin(t*1.4));a.arms.forEach(({shoulder,elbow},i)=>{shoulder.rotation.z=(i?1:-1)*.14+.035*Math.sin(t*2+i);elbow.rotation.z=.06});a.legs.forEach(({thigh,knee})=>{thigh.rotation.z=0;knee.rotation.z=0});a.root.rotation.set(0,0,0)}
function walk(a,t,amount=1){a.body.position.y+=Math.abs(Math.sin(t*6))*.045*amount;a.body.rotation.z=Math.sin(t*6)*.025*amount;a.legs.forEach(({thigh,knee},i)=>{thigh.rotation.z=Math.sin(t*6+i*Math.PI)*.38*amount;knee.rotation.z=Math.max(0,Math.sin(t*6+i*Math.PI+1))*.38*amount});a.arms.forEach(({shoulder,elbow},i)=>{shoulder.rotation.z=Math.sin(t*6+(1-i)*Math.PI)*.4*amount;elbow.rotation.z=-.13*amount})}
function pray(a,amount=1){a.arms[0].shoulder.rotation.z=lerp(-.12,-.58,amount);a.arms[0].elbow.rotation.z=lerp(0,1.8,amount);a.arms[1].shoulder.rotation.z=lerp(.12,.6,amount);a.arms[1].elbow.rotation.z=lerp(0,-1.8,amount)}
function point(a,t,amount=1){a.arms[1].shoulder.rotation.z=lerp(.15,1.8+Math.sin(t*2)*.06,amount);a.arms[1].elbow.rotation.z=-.5*amount;a.body.rotation.z=-.045*amount}

const crown=layer(.9,.8,-2,.2,.9,(c,w,h)=>{path(c,[[120,800],[50,160],[280,450],[500,70],[700,450],[940,160],[850,800]],C.gold,C.ink,20);for(let x of [220,500,780])oval(c,x,630,45,70,C.red,C.ink,10)},1000,1000);
// Floating dust, falling flowers, lamps and foreground shrubs add continuous motion.
const dust=[];for(let i=0;i<35;i++){let d=plane(texture(32,32,(c)=>oval(c,16,16,6,6,'#fff0bd')), .045,.045);scene.add(d);dust.push(d)}
const petals=[];for(let i=0;i<28;i++){let p=plane(texture(100,100,(c)=>flower(c,50,50,32,i%2?'#ebc578':'#b94f43')),.14,.16);scene.add(p);petals.push(p)}
const lamps=[];for(let x of [-3.5,3.5]){lamps.push(layer(.7,1.5,x,.75,2,(c,w,h)=>{path(c,[[350,400],[650,400],[600,530],[530,550],[540,830],[700,890],[700,940],[300,940],[300,890],[460,830],[470,550],[400,530]],C.gold,C.ink,14);path(c,[[500,390],[340,250,420,180,510,40],[660,280,610,330,500,390]],'#edb84e',C.ink,6);path(c,[[500,340],[450,250,510,240,510,170],[560,280,550,310,500,340]],'#fff0ad',null)},400,800))}
for(let s of [-1,1])layer(3.5,2.8,s*4.5,1.1,6,(c,w,h)=>{for(let i=0;i<18;i++){let x=500+(i%5-2)*160,y=1000-Math.floor(i/5)*210;line(c,[[500,1000],[x,y]],'#375e48',14);c.save();c.translate(x,y);c.rotate((i-9)*.2);oval(c,0,-70,55,130,i%2?'#486c50':'#6a8155',C.ink,3);line(c,[[0,40],[0,-170]],'#a0a36a',3);c.restore()}},800,900);

function renderAt(t,capture=false){
    let si=Math.max(0,timeline.scenes.findLastIndex(s=>t>=s.start)),s=timeline.scenes[si],local=t-s.start;
    for(let a of actors)reset(a,t);
    // Blocking is continuous across shots: nobody teleports between title cards.
    king.root.position.set(-2.0,0,.2);boy.root.position.set(1.8,0,1.1);boy.root.scale.x=-boy.scale;
    lord.root.position.set(0,0,-1.55);lord.root.visible=t>34.1;
    crown.visible=t>46;
    // Opening: Prahlada walks into the hall and comes to rest before the king.
    let arrive=ramp(t,.5,5.4);boy.root.position.x=lerp(3.7,1.8,arrive);boy.root.position.z=lerp(3.7,1.1,arrive);if(t<5.4)walk(boy,t,Math.sin(arrive*Math.PI));
    // The king's proclamation, gesturing hands and a quietly attentive child.
    if(t>=6.63&&t<14.83){let q=t-6.63;point(king,t,ramp(q,.3,1.5));king.arms[0].shoulder.rotation.z=-.7-.35*Math.sin(q*1.2);king.arms[0].elbow.rotation.z=-.7;boy.head.rotation.z=-.05+.05*Math.sin(q*1.1);pray(boy,.65)}
    // Accusation: a step toward the pillar, then an emphatic pointing gesture.
    let approach=ramp(t,15.2,19);king.root.position.x=lerp(-2,-1.05,approach);king.root.position.z=lerp(.2,-.3,approach);
    if(t>=14.83&&t<21.53){walk(king,t,Math.sin(approach*Math.PI)*.6);point(king,t,.9);king.head.rotation.z=-.12+.035*Math.sin(t*3);pray(boy,.75)}
    // Prahlada answers, opens one palm, then brings his hands together.
    if(t>=21.53&&t<28.57){let q=t-21.53;boy.head.rotation.z=.08*Math.sin(q*1.4);boy.arms[0].shoulder.rotation.z=-1.15+.12*Math.sin(q*1.5);boy.arms[0].elbow.rotation.z=-1.0;boy.arms[1].shoulder.rotation.z=.65;boy.arms[1].elbow.rotation.z=1.7;pray(boy,ramp(q,4,6));point(king,t,.3)}
    // Visible fist strike, recoil, a crack and independent stone halves.
    let wind=ramp(t,28.8,29.9),hit=ramp(t,29.9,30.25),release=ramp(t,30.5,31.2);
    if(t>=28.57&&t<35.4){king.arms[1].shoulder.rotation.z=lerp(.2,-1.25,wind)+2.9*hit-.9*release;king.arms[1].elbow.rotation.z=-.9+.8*hit;king.body.rotation.z=-.17*wind+.3*hit-.12*release;boy.body.rotation.z=.07*Math.sin(t*4);pray(boy,.8)}
    const split=ramp(t,32.5,37.2);pillarParts.forEach((p,i)=>{let sign=i?1:-1;p.position.x=sign*(.34+split*1.25);p.position.y=2.85-split*.35;p.rotation.z=sign*split*.12;p.material.opacity=1-ramp(t,38,42)});
    crack.visible=t>30.1&&t<36.2;crack.material.opacity=ramp(t,30.1,31)*(1-ramp(t,35.5,36.2));
    aura.visible=t>31;aura.material.opacity=ramp(t,31,35)*(.8+.1*Math.sin(t*1.3));aura.scale.setScalar(1+.03*Math.sin(t));
    // Narasimha strides forward from the broken pillar with four moving arms.
    const emerge=ramp(t,34.4,40);lord.root.position.z=lerp(-1.55,.05,emerge);lord.root.position.y=-.4*(1-emerge);lord.root.scale.setScalar(lord.scale*lerp(.68,1,emerge));
    if(t>34.4&&t<40)walk(lord,t,.45*Math.sin(emerge*Math.PI));
    lord.arms.forEach(({shoulder,elbow},i)=>{let sign=i?1:-1;shoulder.rotation.z=sign*(1.05+.12*Math.sin(t*1.6+i));elbow.rotation.z=sign*.55});
    lord.extra.forEach(({shoulder,elbow},i)=>{let sign=i?1:-1;shoulder.rotation.z=sign*(.6+.10*Math.sin(t*1.4+i));elbow.rotation.z=sign*.25});
    if(t>35.4&&t<43){king.root.position.x=lerp(-1.05,-2.15,ramp(t,36,41));king.body.rotation.z=.15;king.arms[0].shoulder.rotation.z=-1.3;king.arms[1].shoulder.rotation.z=1.7;king.arms[1].elbow.rotation.z=.8;boy.head.rotation.z=-.22;pray(boy,1)}
    // The defeat stays symbolic: the king staggers out, his crown falls and rolls.
    if(t>=43){let retreat=ramp(t,43.5,47.3);king.root.position.x=lerp(-2.15,-5.2,retreat);king.root.position.y=-.35*retreat;king.body.rotation.z=.55*retreat;king.arms[1].shoulder.rotation.z=1.9;king.arms[0].shoulder.rotation.z=-1.5;walk(king,t,.5*(1-retreat));king.root.visible=t<48;
        crown.position.set(lerp(-1.8,-2.5,ramp(t,46,49)),lerp(3.4,.28,ramp(t,46,47.1))+.15*Math.abs(Math.sin((t-47.1)*5))*(1-ramp(t,47.1,49)),.8);crown.rotation.z=lerp(0,-2.8,ramp(t,46,49));
    }else king.root.visible=true;
    // The child approaches, kneels, bows; the Lord lowers a hand in blessing.
    const devotion=ramp(t,49.7,54.5);boy.root.position.x=lerp(1.8,.9,devotion);boy.root.position.z=lerp(1.1,1.3,devotion);if(t>49.7&&t<53.3)walk(boy,t,.35*Math.sin(devotion*Math.PI));
    if(t>43)pray(boy,1);
    let kneel=ramp(t,53.8,55.5);boy.body.position.y-=kneel*.48;boy.legs[0].thigh.rotation.z=-kneel*.85;boy.legs[1].thigh.rotation.z=kneel*.65;boy.legs.forEach(({knee})=>knee.rotation.z=-kneel*.65);boy.body.rotation.z=kneel*.25;boy.head.rotation.z=kneel*.32+.02*Math.sin(t*2);
    let bless=ramp(t,54.8,57);lord.arms[1].shoulder.rotation.z=lerp(lord.arms[1].shoulder.rotation.z,.62,bless);lord.arms[1].elbow.rotation.z=lerp(.55,1.45,bless);lord.head.rotation.z=-.07*bless;
    dust.forEach((d,i)=>{d.position.set(Math.sin(i*13.7+t*.13)*4.5,.3+((i*.61+t*.12)%7),Math.sin(i*5)*3);d.material.opacity=.3+.25*Math.sin(t+i)});
    petals.forEach((p,i)=>{p.visible=t>51;p.position.set(Math.sin(i*8.2)*3.6+Math.sin(t+i)*.15,8-((t-51)*.7+i*.43)%9,i%5*.4);p.rotation.z=t*.5+i;p.rotation.y=Math.sin(t+i)*.7});
    lamps.forEach((p,i)=>p.scale.x=1+.015*Math.sin(t*8+i));
    // Camera cuts give each action a readable shot; within every shot it dollies.
    const shots=[
        {p:[4.5,5.0,19],q:[0,2.3,0],e:[2.2,4.2,17]},
        {p:[1.2,3.3,14.2],q:[0,2,0],e:[-.7,3.2,13.5]},
        {p:[-1.8,3.0,11.6],q:[-.45,2.1,-.2],e:[-.7,3.25,12.2]},
        {p:[3.6,2.4,8.3],q:[1.45,1.65,1.1],e:[2.6,2.6,8.5]},
        {p:[1.2,3.5,14.8],q:[0,2.5,-1],e:[.25,3.8,14.0]},
        {p:[-1.8,3.4,15.4],q:[0,2.65,-.3],e:[.5,3.8,13.4]},
        {p:[2.5,3.7,17],q:[0,2.1,.1],e:[1.3,3.8,15.6]},
        {p:[1.8,3.3,14],q:[.4,2.2,.5],e:[-.4,3.4,12.5]}
    ];
    const shot=shots[si],f=clamp(local/s.duration);camera.position.set(...shot.p.map((v,i)=>lerp(v,shot.e[i],smooth(f))));camera.lookAt(...shot.q);
    if(t>30.08&&t<30.65){camera.position.x+=Math.sin(t*67)*.055*(1-ramp(t,30.1,30.65));camera.position.y+=Math.sin(t*81)*.035*(1-ramp(t,30.1,30.65))}
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
}
return {scene,camera,update:renderAt};
}
