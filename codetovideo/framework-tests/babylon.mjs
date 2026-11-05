import * as B from '@babylonjs/core';
import {createSolidScene} from './solid-scene.mjs';
import {original,clock,overlay} from './shared.mjs';
const canvas=document.querySelector('#stage'),film=document.querySelector('#film'),c=film.getContext('2d');
const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});engine.setSize(720,1280);
const scene=new B.Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=B.Color4.FromHexString('#cb9c78ff');
const camera=new B.FreeCamera('camera',new B.Vector3(0,3,18),scene);camera.minZ=.1;camera.maxZ=100;camera.fov=38*Math.PI/180;
const hemi=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);hemi.intensity=.85;hemi.diffuse=B.Color3.FromHexString('#ffe3b6');hemi.groundColor=B.Color3.FromHexString('#4b5965');
const sun=new B.DirectionalLight('sun',new B.Vector3(5,-9,-7),scene);sun.intensity=2.3;sun.diffuse=B.Color3.FromHexString('#ffe0a7');
const rim=new B.DirectionalLight('rim',new B.Vector3(-4,-4,4),scene);rim.intensity=.7;rim.diffuse=B.Color3.FromHexString('#86c6ce');
const rig=createSolidScene(original),nodes=[],materials=new Map();
function material(m){if(materials.has(m))return materials.get(m);const p=new B.PBRMaterial('material',scene);if(m.color)p.albedoColor=new B.Color3(m.color.r,m.color.g,m.color.b);p.metallic=m.metalness||0;p.roughness=m.roughness??.8;p.backFaceCulling=false;p.alpha=m.opacity??1;if(m.emissive)p.emissiveColor=new B.Color3(m.emissive.r,m.emissive.g,m.emissive.b).scale(m.emissiveIntensity||1);if(m.isMeshBasicMaterial){p.unlit=true;}materials.set(m,p);return p;}
function convert(o,parent){let n;if(o.isMesh){n=new B.Mesh(o.name||'mesh',scene);const d=new B.VertexData(),g=o.geometry;d.positions=Array.from(g.attributes.position.array);d.normals=g.attributes.normal?Array.from(g.attributes.normal.array):undefined;d.indices=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i);if(g.attributes.uv)d.uvs=Array.from(g.attributes.uv.array);d.applyToMesh(n);n.material=material(o.material);}else n=new B.TransformNode(o.name||'joint',scene);n.parent=parent;n.rotationQuaternion=B.Quaternion.Identity();nodes.push({o,n});for(const child of o.children)if(!child.isLight)convert(child,n);}
for(const child of rig.scene.children)if(!child.isLight)convert(child,null);
window.renderAt=t=>{rig.update(clock(t).old);for(const {o,n}of nodes){n.position.set(o.position.x,o.position.y,o.position.z);n.scaling.set(o.scale.x,o.scale.y,o.scale.z);n.rotationQuaternion.set(o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w);n.setEnabled(o.visible);if(o.isMesh)n.visibility=o.material.opacity??1;}
const p=rig.camera.position;camera.position.set(p.x,p.y,p.z);const forward=new B.Vector3(0,0,-1);const q=rig.camera.quaternion;const rot=new B.Quaternion(q.x,q.y,q.z,q.w);const dir=forward.applyRotationQuaternion(rot);camera.setTarget(camera.position.add(dir));scene.render();c.clearRect(0,0,720,1280);c.drawImage(canvas,0,0);overlay(c,t,'Babylon.js · solid 3D');return film.toDataURL('image/jpeg',.94)};
window.engineProof={renderer:'Babylon.js Engine',meshes:scene.meshes.length};window.renderAt(0);window.ready=true;
