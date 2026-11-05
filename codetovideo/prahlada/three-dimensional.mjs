import * as T from '/vendor/three.module.js';

// Solid procedural meshes and articulated hierarchies. No flat character cards.
const data=await(await fetch('/timeline.json')).json();
const W=720,H=1280,PI=Math.PI,TAU=PI*2;
const canvas=document.querySelector('#stage'),film=document.querySelector('#film'),c=film.getContext('2d');
const r=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});r.setSize(W,H);r.setPixelRatio(1);
r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#cb9c78');scene.fog=new T.Fog('#cb9c78',24,52);
const camera=new T.PerspectiveCamera(38,W/H,.1,100);
scene.add(new T.HemisphereLight('#ffe3b6','#4b5965',1.8));
const sun=new T.DirectionalLight('#ffe0a7',2.8);sun.position.set(-5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-7;sun.shadow.bias=-.001;sun.shadow.normalBias=.035;scene.add(sun);
const rim=new T.DirectionalLight('#86c6ce',1.4);rim.position.set(4,4,-4);scene.add(rim);
const mat=(color,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,metalness,roughness});
const M={skin:mat('#c78b64'),boy:mat('#cd986e'),lion:mat('#e6b66b'),gold:mat('#d7a646',.65,.32),cream:mat('#ffe4a5'),red:mat('#9b313b'),saffron:mat('#df9b32'),jade:mat('#305d5a'),stone:mat('#d2a373'),dark:mat('#302622'),white:mat('#fff0cf'),eye:mat('#201d1b'),mane:mat('#9d602b'),mane2:mat('#c58932')};
function mesh(geo,material,parent,x=0,y=0,z=0){const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const sphere=new T.SphereGeometry(1,24,16),capsuleCache=new Map();
function ell(parent,x,y,z,sx,sy,sz,m){let o=mesh(sphere,m,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
function box(parent,x,y,z,w,h,d,m){return mesh(new T.BoxGeometry(w,h,d),m,parent,x,y,z)}
function cyl(parent,x,y,z,top,bottom,h,m,n=32){return mesh(new T.CylinderGeometry(top,bottom,h,n),m,parent,x,y,z)}
function torus(parent,x,y,z,rad,tube,m,rx=0){let o=mesh(new T.TorusGeometry(rad,tube,8,40),m,parent,x,y,z);o.rotation.x=rx;return o}
function rod(parent,a,b,radius,m){let av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);let o=mesh(new T.CylinderGeometry(radius,radius,delta.length(),10),m,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o}
const clamp=x=>Math.max(0,Math.min(1,x));const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const p=(t,a,b)=>ease((t-a)/(b-a));const mix=(a,b,x)=>a+(b-a)*x;

// Architectural set: volumetric columns, carved arches, carpet, stone tiles, dusk.
const hall=new T.Group();scene.add(hall);
box(hall,0,-.15,-2,26,.3,30,mat('#ad916c'));
for(let x=-9;x<=9;x+=1.5)for(let z=-13;z<=10;z+=1.5){box(hall,x,.005,z,1.48,.025,1.48,mat((Math.round(x/1.5+z/1.5)%2)?'#cfb58b':'#d7bd94'))}
box(hall,0,.035,.3,3.3,.025,16,mat('#843d3d'));
for(let x of [-1.57,1.57])box(hall,x,.055,.3,.045,.012,16,M.gold);
for(let z=-7;z<8;z+=.8)for(let x of [-1.37,1.37]){
    const motif=mesh(new T.OctahedronGeometry(.055),M.gold,hall,x,.075,z);motif.scale.y=.2;
}
function column(x,z){
    box(hall,x,.2,z,1.3,.4,1.3,M.stone);box(hall,x,.48,z,1.1,.17,1.1,M.gold);
    cyl(hall,x,3.65,z,.37,.47,6.2,M.stone);
    for(let y of [.65,.8,6.5,6.7])torus(hall,x,y,z,.47,.055,M.gold,PI/2);
    box(hall,x,7,z,1.4,.35,1.4,M.stone);
    for(let i=0;i<12;i++){let a=i*TAU/12;rod(hall,[x+.42*Math.cos(a),1,z+.42*Math.sin(a)],[x+.34*Math.cos(a),6.3,z+.34*Math.sin(a)],.018,M.cream)}
}
for(let z of [-9,-4,2,7])for(let x of [-4.7,4.7])column(x,z);
function arch(x,y,z,w,h){
    const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(-w/2,h-w/2);shape.absarc(0,h-w/2,w/2,PI,0,true);shape.lineTo(w/2,0);shape.lineTo(w/2+.2,0);shape.lineTo(w/2+.2,h-w/2);shape.absarc(0,h-w/2,w/2+.2,0,PI,false);shape.lineTo(-w/2-.2,0);shape.closePath();
    const o=mesh(new T.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:true,bevelSize:.035,bevelSegments:2,bevelThickness:.025,steps:1,curveSegments:32}),M.gold,hall,x,y,z);return o;
}
for(let x of [-5,0,5])arch(x,0,-7,4.1,6.4);
box(hall,0,7.1,-7,16,1,1,M.stone);
for(let x of [-7.4,7.4])box(hall,x,3.4,-4.8,.5,6.8,7.5,M.stone);
// A real back doorway exposes a sunset disk and layered distant mountains.
const disk=mesh(new T.SphereGeometry(2.3,40,24),new T.MeshBasicMaterial({color:'#f3c385'}),hall,0,4,-18);disk.scale.z=.15;
for(let i=0;i<9;i++){const mountain=mesh(new T.ConeGeometry(3.8,4+i%3,5),mat(i%2?'#8f8573':'#a18a73'),hall,(i-4)*3.5,-.2,-17-i%2*2);mountain.rotation.y=i*.6}
function lamp(x,z){cyl(hall,x,.08,z,.45,.55,.15,M.gold);cyl(hall,x,.65,z,.07,.13,1.1,M.gold);cyl(hall,x,1.2,z,.3,.18,.18,M.gold);let fire=ell(hall,x,1.48,z,.09,.25,.09,new T.MeshBasicMaterial({color:'#ffdb81'}));const light=new T.PointLight('#ffb75c',2.5,4);light.position.set(x,1.5,z);hall.add(light);return fire}
const fires=[lamp(-3.3,2),lamp(3.3,2),lamp(-3.4,-4),lamp(3.4,-4)];

// Segmented solid pillar, with a widening glowing fracture.
const pillar=new T.Group();pillar.position.set(0,0,-1.45);scene.add(pillar);
const pieces=[];
for(let side of [-1,1]){
    const part=new T.Group();pillar.add(part);part.userData.side=side;
    for(let i=0;i<5;i++){const segment=cyl(part,side*.27,.7+i*1.02,0,.62,.65,.99,M.stone,32);segment.scale.x=.5;}
    for(let y of [.13,.35,5.6,5.83])box(part,side*.36,y,0,.72,.2,1.55,M.gold);
    for(let y of [1,2,3,4,5])torus(part,side*.27,y,0,.32,.018,M.cream,PI/2);
    pieces.push(part);
}
const crackMat=new T.MeshBasicMaterial({color:'#fff0b5',transparent:true,opacity:0});
const crack=box(scene,0,2.9,-.74,.035,5.3,.025,crackMat);
const revelation=new T.PointLight('#ffcf76',0,11,1.5);revelation.position.set(0,3,.3);scene.add(revelation);
const halo=new T.Group();scene.add(halo);halo.position.set(0,3.5,-1.7);
for(let i=0;i<3;i++){let o=torus(halo,0,0,0,1.5+i*.32,.018,new T.MeshBasicMaterial({color:'#eac174',transparent:true,opacity:.45-i*.1}));o.rotation.z=i*.15}

function crown(parent,y,rad=.4){
    const g=new T.Group();g.position.y=y;parent.add(g);cyl(g,0,0,0,rad,rad*.92,.18,M.gold);
    for(let i=0;i<7;i++){let a=i*TAU/7;let o=mesh(new T.ConeGeometry(.12,.4,5),M.gold,g,Math.sin(a)*rad,.25,Math.cos(a)*rad);o.rotation.z=-Math.sin(a)*.18;o.rotation.x=Math.cos(a)*.18;ell(g,Math.sin(a)*rad,.12,Math.cos(a)*rad,.045,.07,.045,i%2?M.red:M.jade)}
    return g;
}
function hand(parent,skin,len=.58){
    const group=new T.Group();parent.add(group);ell(group,0,-len-.1,.025,.105,.15,.07,skin);
    for(let i=0;i<4;i++){
        const f=ell(group,-.065+i*.04,-len-.22-(i===0||i===3?-.02:0),.03,.021,.09,.024,skin);f.rotation.z=(i-1.5)*-.055;
    }
    let thumb=ell(group,.105,-len-.08,.05,.035,.09,.035,skin);thumb.rotation.z=-.6;return group;
}
function limb(parent,x,y,z,skin,arm=true){
    const joint=new T.Group();joint.position.set(x,y,z);parent.add(joint);let length=arm?.6:.55;
    ell(joint,0,0,0,arm?.135:.15,arm?.14:.17,arm?.13:.15,skin);
    const upper=cyl(joint,0,-length/2,0,arm?.12:.14,arm?.095:.115,length,skin,16);
    if(arm)torus(joint,0,-.15,0,.126,.035,M.gold,PI/2);
    const elbow=new T.Group();elbow.position.y=-length;joint.add(elbow);ell(elbow,0,0,0,.105,.105,.105,skin);
    cyl(elbow,0,-length/2,0,.096,.07,length,skin,16);
    if(arm){torus(elbow,0,-length+.04,0,.078,.025,M.gold,PI/2);hand(elbow,skin,length)}
    else{ell(elbow,0,-length+.02,.1,.13,.09,.28,skin);torus(elbow,0,-length+.16,0,.09,.025,M.gold,PI/2)}
    return{shoulder:joint,elbow,thigh:joint,knee:elbow};
}
function figure(kind){
    const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);
    const isLion=kind==='lion',isKing=kind==='king',skin=isLion?M.lion:isKing?M.skin:M.boy;
    const scale=isLion?1.38:isKing?1.1:.77;root.scale.setScalar(scale);
    const torso=ell(body,0,1.74,0,isLion?.51:.43,.67,isLion?.3:.25,skin);
    ell(body,0,2.33,0,.15,.22,.16,skin);
    const skirt=cyl(body,0,.94,0,.32,.59,.93,isKing||isLion?M.red:M.saffron,40);
    for(let i=0;i<20;i++){let a=i*TAU/20;rod(body,[Math.cos(a)*.335,1.38,Math.sin(a)*.335],[Math.cos(a)*.575,.49,Math.sin(a)*.575],.014,M.gold)}
    for(let y of [.52,.6,1.4])torus(body,0,y,0,y>1?.34:.58,.026,M.gold,PI/2);
    // Draped sash follows a curve around the body, with thin gold edging.
    const sashPath=new T.CatmullRomCurve3([new T.Vector3(-.34,2.16,.2),new T.Vector3(-.15,1.88,.29),new T.Vector3(.14,1.63,.27),new T.Vector3(.3,1.4,.14)]);
    if(!isLion)mesh(new T.TubeGeometry(sashPath,18,.075,6,false),isKing?M.red:M.cream,body);
    const head=new T.Group();head.position.set(0,2.81,0);body.add(head);
    if(!isLion){
        ell(head,0,0,0,.36,.45,.32,skin);
        // Hair cap sits behind the forehead and ears.
        const hair=ell(head,0,.13,-.065,.37,.36,.3,M.dark);hair.rotation.x=-.23;
        ell(head,0,-.015,.195,.315,.32,.18,skin);
        ell(head,0,-.035,.36,.075,.12,.115,skin);
        for(let s of [-1,1]){
            ell(head,s*.34,-.015,0,.075,.12,.08,skin);torus(head,s*.365,-.14,.025,.08,.018,M.gold);
            const eye=ell(head,s*.145,.055,.335,.085,.051,.038,M.white);ell(head,s*.14,.05,.37,.028,.037,.02,M.eye);ell(head,s*.132,.06,.386,.009,.013,.007,M.white);
            const brow=ell(head,s*.145,.145,.322,.105,.025,.026,M.dark);brow.rotation.z=s*(isKing?.25:-.08);
        }
        const mouth=ell(head,0,-.19,.346,.09,.018,.024,isKing?M.dark:M.red);
        if(isKing)for(let s of [-1,1]){let moustache=ell(head,s*.09,-.115,.365,.125,.03,.03,M.dark);moustache.rotation.z=s*.16;}
        rod(head,[-.032,.18,.344],[-.032,.29,.32],.012,M.cream);rod(head,[.032,.18,.344],[.032,.29,.32],.012,M.cream);ell(head,0,.18,.36,.016,.035,.014,M.red);
        if(isKing)crown(head,.45);else ell(head,0,.43,-.12,.17,.17,.16,M.dark);
    }else{
        // Volumetric lion mane: overlapping carved tufts, muzzle and fangs.
        for(let ring=0;ring<2;ring++)for(let i=0;i<20;i++){let a=i*TAU/20+ring*.1;let tuft=ell(head,Math.sin(a)*(.56-ring*.06),Math.cos(a)*(.61-ring*.06),-.04-ring*.08,.15,.29,.15,ring?M.mane:M.mane2);tuft.rotation.z=-a;}
        ell(head,0,0,.04,.47,.51,.35,M.lion);
        for(let s of [-1,1]){
            ell(head,s*.4,.35,.04,.13,.17,.1,M.mane2);ell(head,s*.4,.35,.13,.07,.1,.03,M.mane);
            ell(head,s*.19,.09,.33,.12,.072,.05,M.cream);ell(head,s*.18,.085,.375,.025,.05,.025,M.eye);
            const brow=ell(head,s*.2,.205,.34,.16,.038,.04,M.mane);brow.rotation.z=s*.22;
            ell(head,s*.13,-.15,.385,.18,.13,.13,M.cream);
            const tooth=mesh(new T.ConeGeometry(.04,.17,12),M.cream,head,s*.15,-.3,.4);tooth.rotation.z=PI;
            for(let j=0;j<3;j++)rod(head,[s*.2,-.14-j*.035,.45],[s*.43,-.1-j*.07,.44],.004,M.dark);
        }
        ell(head,0,-.05,.505,.085,.055,.06,M.dark);ell(head,0,-.26,.37,.13,.1,.035,M.mane);
        rod(head,[-.04,.27,.38],[-.04,.4,.31],.014,M.cream);rod(head,[.04,.27,.38],[.04,.4,.31],.014,M.cream);rod(head,[0,.28,.395],[0,.4,.32],.012,M.red);
    }
    const arms=[limb(body,-(isLion?.53:.43),2.13,0,skin),limb(body,isLion?.53:.43,2.13,0,skin)];
    const legs=[limb(body,-.22,1.05,0,skin,false),limb(body,.22,1.05,0,skin,false)];
    const extra=isLion?[limb(body,-.47,1.92,-.22,skin),limb(body,.47,1.92,-.22,skin)]:[];
    for(let i=0;i<19;i++){let a=i*PI/18;ell(body,Math.cos(a)*.31,2.07-Math.sin(a)*.43,.28+Math.sin(a)*.06,.028,.034,.028,M.cream)}
    ell(body,0,1.64,.35,.065,.09,.025,M.gold);ell(body,0,1.65,.38,.027,.04,.018,M.red);
    if(isLion)for(let i=0;i<23;i++){let a=i*PI/22;let x=Math.cos(a)*.39,y=2.03-Math.sin(a)*.58,z=.32+Math.sin(a)*.03;ell(body,x,y,z,.043,.045,.035,i%3?M.cream:M.red)}
    return{root,body,head,arms,legs,extra,scale,kind};
}
const king=figure('king'),boy=figure('boy'),lord=figure('lion'),actors=[king,boy,lord];
const fallenCrown=crown(scene,0,.38);
const particles=[];
for(let i=0;i<35;i++){let o=mesh(new T.OctahedronGeometry(.025),new T.MeshBasicMaterial({color:'#f4d692',transparent:true,opacity:.45}),scene);o.castShadow=false;particles.push(o)}
const petals=[];for(let i=0;i<28;i++){let o=ell(scene,0,0,0,.06,.025,.1,i%2?M.cream:M.red);o.castShadow=false;petals.push(o)}

// Batch static geometry within each joint. The joint hierarchy remains animated,
// while hundreds of beads, tiles and architectural details share draw calls.
function batchDirect(parent){
    const groups=new Map();
    for(const child of [...parent.children]){
        if(!child.isMesh||Array.isArray(child.material)||child.material.map)continue;
        const m=child.material;
        const key=[m.type,m.color.getHex(),m.metalness,m.roughness,m.opacity,m.transparent].join('|');
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push(child);
    }
    for(const items of groups.values()){
        if(items.length<2)continue;
        const attrs={position:[],normal:[],uv:[]};
        for(const item of items){
            item.updateMatrix();const geo=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone();geo.applyMatrix4(item.matrix);
            for(const name of Object.keys(attrs))attrs[name].push(geo.getAttribute(name).array);
            parent.remove(item);geo.dispose();
        }
        const geometry=new T.BufferGeometry();
        for(const [name,arrays]of Object.entries(attrs)){let length=arrays.reduce((sum,a)=>sum+a.length,0),values=new Float32Array(length),offset=0;for(const a of arrays){values.set(a,offset);offset+=a.length}geometry.setAttribute(name,new T.BufferAttribute(values,name==='uv'?2:3))}
        geometry.computeBoundingSphere();const merged=new T.Mesh(geometry,items[0].material);merged.castShadow=items.some(o=>o.castShadow);merged.receiveShadow=true;parent.add(merged);
    }
}
const batchGroups=[];scene.traverse(o=>{if(o.isGroup)batchGroups.push(o)});batchGroups.reverse().forEach(batchDirect);

function reset(a,t){a.body.position.set(0,.012*Math.sin(t*2),0);a.body.rotation.set(0,0,0);a.head.rotation.set(0,0,.025*Math.sin(t*1.3));a.root.rotation.set(0,0,0);a.arms.forEach(({shoulder,elbow},i)=>{shoulder.rotation.set(0,0,(i?1:-1)*.1);elbow.rotation.set(-.1,0,0)});a.legs.forEach(({thigh,knee})=>{thigh.rotation.set(0,0,0);knee.rotation.set(0,0,0)})}
function walk(a,t,amount=1){a.body.position.y+=Math.abs(Math.sin(t*6))*.05*amount;a.body.rotation.z=Math.sin(t*6)*.025*amount;a.legs.forEach(({thigh,knee},i)=>{let phase=t*6+i*PI;thigh.rotation.x=Math.sin(phase)*.43*amount;knee.rotation.x=Math.max(0,-Math.sin(phase))*.65*amount});a.arms.forEach(({shoulder,elbow},i)=>{shoulder.rotation.x=Math.sin(t*6+(1-i)*PI)*.4*amount;elbow.rotation.x=-.18*amount})}
function pray(a,weight=1){for(let i=0;i<2;i++){let arm=a.arms[i],sign=i?1:-1;arm.shoulder.rotation.z=sign*.23*weight;arm.shoulder.rotation.x=-.55*weight;arm.elbow.rotation.z=-sign*1.8*weight;arm.elbow.rotation.x=-1.25*weight}}
function point(a,t,weight=1){a.arms[1].shoulder.rotation.z=weight*(1.5+.06*Math.sin(t*2));a.arms[1].shoulder.rotation.x=-.2;a.arms[1].elbow.rotation.z=-.25*weight;}
function caption(text){c.font='25px Arial';c.textAlign='center';let lines=[],current='';for(let w of text.split(' ')){let next=current?current+' '+w:w;if(c.measureText(next).width>600){lines.push(current);current=w}else current=next}lines.push(current);c.fillStyle='#281e1ed9';c.beginPath();c.roundRect(36,1100,648,lines.length*34+34,12);c.fill();c.fillStyle='#fff0d8';lines.forEach((l,i)=>c.fillText(l,360,1132+i*34))}
function overlay(t,si,local){const s=data.scenes[si];let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#241b2a66');g.addColorStop(.2,'#241b2a00');g.addColorStop(.7,'#241b2a00');g.addColorStop(1,'#241b2a99');c.fillStyle=g;c.fillRect(0,0,W,H);caption(s.captions[local<s.duration*.5?0:1]);
    c.strokeStyle='#e5bd7877';c.lineWidth=1;c.strokeRect(19,19,W-38,H-38);
    if(t<5.5){c.globalAlpha=p(t,0,.6)*(1-p(t,4.8,5.5));c.fillStyle='#fff0c5';c.textAlign='center';c.font='18px Arial';c.fillText('BHAGAVATA PURANA',360,122);c.font='52px Georgia';c.fillText('Prahlada',360,190);c.font='26px Georgia';c.fillText('Faith without fear',360,235);c.globalAlpha=1}
    if(t>35.8&&t<39.5){c.globalAlpha=p(t,35.8,36.5)*(1-p(t,38.7,39.5));c.fillStyle='#fff0c5';c.textAlign='center';c.font='35px Georgia';c.fillText('NARASIMHA',360,145);c.globalAlpha=1}
    if(t>56){c.globalAlpha=p(t,56,57);c.fillStyle='#fff0c5';c.textAlign='center';c.font='28px Georgia';c.fillText('Devotion gives courage.',360,145);c.font='16px Arial';c.fillText('A reflection on Bhagavata Purana · Canto 7',360,184);c.globalAlpha=1}
    if(t>59.1){c.fillStyle=`rgba(30,23,27,${p(t,59.1,60)})`;c.fillRect(0,0,W,H)}
}
function renderAt(t,capture=false){
    let si=Math.max(0,data.scenes.findLastIndex(s=>t>=s.start)),s=data.scenes[si],local=t-s.start;
    actors.forEach(a=>reset(a,t));king.root.position.set(-2,0,.1);boy.root.position.set(1.75,0,1.25);lord.root.position.set(0,0,-1.5);king.root.rotation.y=.3;boy.root.rotation.y=-.65;lord.root.rotation.y=.05;
    let arrival=p(t,.5,5.5);boy.root.position.x=mix(3.7,1.75,arrival);boy.root.position.z=mix(4,1.25,arrival);if(t<5.5)walk(boy,t,Math.sin(arrival*PI));
    if(t>6.63&&t<14.83){point(king,t,p(t,7,8.3));king.arms[0].shoulder.rotation.z=-.55-.15*Math.sin(t);king.arms[0].elbow.rotation.x=-.8;pray(boy,.7);king.head.rotation.y=.25}
    let approach=p(t,15.2,19);king.root.position.x=mix(-2,-1.1,approach);king.root.position.z=mix(.1,-.3,approach);
    if(t>=14.83&&t<21.53){point(king,t,.9);walk(king,t,Math.sin(approach*PI)*.35);king.head.rotation.y=.4;pray(boy,.75)}
    if(t>=21.53&&t<28.57){boy.arms[0].shoulder.rotation.z=-1.05;boy.arms[0].shoulder.rotation.x=-.7;boy.arms[0].elbow.rotation.z=-.5;boy.arms[1].shoulder.rotation.x=-.7;boy.arms[1].elbow.rotation.x=-1.7;boy.head.rotation.x=.06*Math.sin(t*2);if(t>26)pray(boy,p(t,26,28));king.head.rotation.y=.5}
    let wind=p(t,28.8,29.9),hit=p(t,29.9,30.25),relax=p(t,30.5,31.2);
    if(t>=28.57&&t<35.4){king.arms[1].shoulder.rotation.z=.2-1.3*wind+2.9*hit-.8*relax;king.arms[1].shoulder.rotation.x=-.3;king.arms[1].elbow.rotation.z=-.9+.85*hit;king.body.rotation.z=-.13*wind+.22*hit-.1*relax;king.head.rotation.y=.5;pray(boy,.85)}
    const split=p(t,32.5,37.2);pieces.forEach((o,i)=>{let sign=i?1:-1;o.position.x=sign*split*1.55;o.position.y=-split*.55;o.rotation.z=-sign*split*.12;o.visible=t<43});crack.visible=t>30.15&&t<36.5;crackMat.opacity=p(t,30.1,31)*(1-p(t,35.5,36.5));revelation.intensity=6*p(t,31,35)*(1-.35*p(t,42,48));halo.visible=t>33;halo.scale.setScalar(1+.025*Math.sin(t));halo.rotation.z=t*.015;
    lord.root.visible=t>34.3;let emerge=p(t,34.4,40);lord.root.position.z=mix(-1.5,.1,emerge);lord.root.position.y=mix(-.8,0,emerge);lord.root.scale.setScalar(lord.scale*mix(.7,1,emerge));if(t>34.4&&t<40)walk(lord,t,.4*Math.sin(emerge*PI));
    lord.arms.forEach(({shoulder,elbow},i)=>{let sign=i?1:-1;shoulder.rotation.z=sign*(1.0+.1*Math.sin(t*1.5+i));shoulder.rotation.x=-.12;elbow.rotation.z=sign*.55;elbow.rotation.x=-.25});lord.extra.forEach(({shoulder,elbow},i)=>{let sign=i?1:-1;shoulder.rotation.z=sign*(.6+.08*Math.sin(t*1.7+i));shoulder.rotation.x=.3;elbow.rotation.x=-.35});
    if(t>35.4&&t<43){king.root.position.x=mix(-1.1,-2.4,p(t,36,41));king.body.rotation.z=.12;king.arms[0].shoulder.rotation.z=-1.2;king.arms[1].shoulder.rotation.z=1.25;king.arms[1].elbow.rotation.x=-.7;king.arms[1].elbow.rotation.z=-.6;king.head.rotation.y=.4;pray(boy,1);boy.head.rotation.x=-.3}
    king.root.visible=t<48;if(t>=43){let retreat=p(t,43.5,47.3);king.root.position.x=mix(-2.2,-5,retreat);king.root.position.z=mix(-.3,-2,retreat);king.body.rotation.z=.35*retreat;king.root.rotation.y=-.5;king.arms[1].shoulder.rotation.z=1.8;king.arms[0].shoulder.rotation.z=-1.4;walk(king,t,.4);}
    fallenCrown.visible=t>46;fallenCrown.position.set(mix(-1.8,-2.6,p(t,46,49)),mix(3.4,.15,p(t,46,47.2))+.12*Math.abs(Math.sin((t-47.2)*5))*(1-p(t,47.2,49)),.9);fallenCrown.rotation.z=mix(0,-2.8,p(t,46,49));fallenCrown.rotation.x=p(t,47,49)*.7;
    let devotion=p(t,49.7,54.5);boy.root.position.x=mix(1.75,.92,devotion);boy.root.position.z=mix(1.25,1.35,devotion);if(t>49.7&&t<53.3)walk(boy,t,.3*Math.sin(devotion*PI));if(t>43)pray(boy,1);
    let kneel=p(t,53.8,55.5);boy.body.position.y-=kneel*.35;boy.legs.forEach(({thigh,knee})=>{thigh.rotation.x=-kneel*.85;knee.rotation.x=kneel*1.4});boy.body.rotation.x=.23*kneel;boy.head.rotation.x=.35*kneel;boy.head.rotation.y=-.2;
    let bless=p(t,54.8,57);lord.arms[1].shoulder.rotation.z=mix(lord.arms[1].shoulder.rotation.z,.8,bless);lord.arms[1].shoulder.rotation.x=-.5*bless;lord.arms[1].elbow.rotation.z=mix(.55,.8,bless);lord.arms[1].elbow.rotation.x=-1.5*bless;lord.head.rotation.y=-.2*bless;lord.head.rotation.x=.1*bless;
    particles.forEach((o,i)=>{o.position.set(Math.sin(i*13.7+t*.1)*4,.3+((i*.61+t*.12)%7),Math.sin(i*5)*3);o.rotation.y=t+i});petals.forEach((o,i)=>{o.visible=t>51;o.position.set(Math.sin(i*8.2)*3.5+Math.sin(t+i)*.15,8-((t-51)*.7+i*.43)%9,i%5*.4);o.rotation.set(t+i,t*.5+i,t*.7)});fires.forEach((o,i)=>o.scale.y=.25*(1+.08*Math.sin(t*9+i)));
    const shots=[
        {a:[6.5,5.3,18.5],b:[3.8,4.5,17],q:[0,2.3,0]},
        {a:[3.8,3.8,14.5],b:[1.4,3.4,13.8],q:[0,2,0]},
        {a:[-3.5,3.2,11.8],b:[-1.8,3.4,12],q:[-.5,2.1,-.3]},
        {a:[4.1,2.6,7.4],b:[3.3,2.8,7.8],q:[1.55,1.7,1.25]},
        {a:[2.8,3.5,14.6],b:[.8,3.8,14],q:[0,2.5,-1]},
        {a:[-2.4,3.8,15.8],b:[1.8,4.1,14],q:[0,2.6,-.2]},
        {a:[4.3,4.3,17],b:[2.4,4.0,15.8],q:[0,2.1,.2]},
        {a:[3.3,3.6,14.3],b:[.5,3.5,12.8],q:[.35,2.15,.5]}
    ];let shot=shots[si],f=ease(local/s.duration);camera.position.set(...shot.a.map((v,i)=>mix(v,shot.b[i],f)));camera.lookAt(...shot.q);if(t>30.1&&t<30.65){let shake=1-p(t,30.1,30.65);camera.position.x+=Math.sin(t*67)*.04*shake;camera.position.y+=Math.sin(t*81)*.03*shake}
    r.render(scene,camera);c.clearRect(0,0,W,H);c.drawImage(canvas,0,0);overlay(t,si,local);if(capture)return film.toDataURL('image/jpeg',.94);
}
window.renderAt=renderAt;window.ready=true;renderAt(0);
const audio=new Audio('/narration.wav');let playing=false,started=0;document.querySelector('#play').onclick=async()=>{playing=!playing;if(playing){if(audio.currentTime>=59.9)audio.currentTime=0;await audio.play();started=performance.now()-audio.currentTime*1000;document.querySelector('#play').textContent='Pause'}else{audio.pause();document.querySelector('#play').textContent='Play with Sarvam narration'}};
if(!location.search.includes('capture')){const loop=()=>{if(playing){renderAt(Math.min(59.99,(performance.now()-started)/1000));if(audio.ended)playing=false}requestAnimationFrame(loop)};requestAnimationFrame(loop)}
