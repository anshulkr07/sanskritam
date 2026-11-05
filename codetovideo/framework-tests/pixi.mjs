import {Application,MeshSimple,Texture} from 'pixi.js';
import {Vector3} from 'three';
import {createPuppetScene} from './puppet-scene.mjs';
import {original,clock,overlay} from './shared.mjs';
const canvas=document.querySelector('#stage'),film=document.querySelector('#film'),c=film.getContext('2d');
const app=new Application();await app.init({canvas,width:720,height:1280,background:'#c99468',antialias:true,autoStart:false,preference:'webgl',preserveDrawingBuffer:true});app.stop();
const rig=createPuppetScene(original),parts=[];
rig.scene.traverse(o=>{if(!o.isMesh||!o.material.map)return;const img=o.material.map.image;const tex=Texture.from(img);const uv=o.geometry.attributes.uv.array;const uvs=new Float32Array(uv.length);for(let i=0;i<uv.length;i+=2){uvs[i]=uv[i];uvs[i+1]=1-uv[i+1]}
const m=new MeshSimple({texture:tex,vertices:new Float32Array(8),uvs,indices:new Uint32Array(o.geometry.index.array)});app.stage.addChild(m);parts.push({o,m});});
const v=new Vector3();
window.renderAt=t=>{rig.update(clock(t).old);for(const [partIndex,{o,m}] of parts.entries()){let visible=true;for(let a=o;a;a=a.parent)visible&&=a.visible;m.visible=visible;m.alpha=o.material.opacity;const p=o.geometry.attributes.position;for(let i=0;i<4;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(rig.camera);m.vertices[i*2]=(v.x+1)*360;m.vertices[i*2+1]=(1-v.y)*640;}v.setFromMatrixPosition(o.matrixWorld).applyMatrix4(rig.camera.matrixWorldInverse);m.zIndex=partIndex<3?-100000+partIndex:v.z; m.geometry.getBuffer('aPosition').update();}app.stage.sortableChildren=true;app.stage.sortChildren();app.render();c.clearRect(0,0,720,1280);c.drawImage(canvas,0,0);overlay(c,t,'PixiJS · illustrated puppets');return film.toDataURL('image/jpeg',.94)};
window.engineProof={renderer:'PixiJS WebGL',spine:false,parts:parts.length};window.renderAt(0);window.ready=true;
