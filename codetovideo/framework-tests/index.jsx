import React,{useLayoutEffect,useMemo} from 'react';
import {registerRoot,Composition,AbsoluteFill,useCurrentFrame,useVideoConfig,Audio,staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {createSolidScene} from './solid-scene.mjs';
import {original,clock} from './shared.mjs';
function World(){const frame=useCurrentFrame(),{fps}=useVideoConfig();const bundle=useMemo(()=>createSolidScene(original),[]);const set=useThree(s=>s.set);const gl=useThree(s=>s.gl);
useLayoutEffect(()=>{set({camera:bundle.camera});gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;bundle.update(clock(frame/fps).old);},[frame,fps,bundle,set,gl]);return <primitive object={bundle.scene}/>;}
function Film(){const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();const t=frame/fps,{scene,local}=clock(t);return <AbsoluteFill style={{background:'#cb9c78',fontFamily:'Arial'}}>
<ThreeCanvas width={width} height={height} shadows camera={{position:[0,3,18],fov:38}} gl={{preserveDrawingBuffer:true,antialias:true}}><World/></ThreeCanvas>
<AbsoluteFill style={{background:'linear-gradient(#171a2866,transparent 30%,transparent 75%,#171a28bb)',pointerEvents:'none',color:'#fff0ce',textAlign:'center'}}>
<div style={{position:'absolute',top:55,width:'100%',fontSize:18}}>REMOTION + REACT THREE FIBER</div>
<div style={{position:'absolute',top:100,width:'100%',fontSize:48,fontFamily:'Georgia'}}>{t<4?'Prahlada':scene.heading}</div>
<div style={{position:'absolute',top:1100,left:36,width:648,boxSizing:'border-box',padding:'20px 18px',borderRadius:12,background:'#211b21dd',fontSize:25,lineHeight:'34px'}}>{scene.captions[local<scene.duration/2?0:1]}</div>
<div style={{position:'absolute',inset:20,border:'1px solid #e5bd7866'}}/>
<AbsoluteFill style={{background:'#19161e',opacity:Math.max(0,(t-29.5)*2)}}/>
</AbsoluteFill>
<Audio src={staticFile('sarvam.m4a')} premountFor={fps}/>
</AbsoluteFill>;}
const Root=()=> <Composition id="PrahladaR3F" component={Film} durationInFrames={900} fps={30} width={720} height={1280}/>;
registerRoot(Root);
