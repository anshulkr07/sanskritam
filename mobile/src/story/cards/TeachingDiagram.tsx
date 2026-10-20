import React from 'react';
import {View} from 'react-native';
import Svg,{Circle,Path,Rect} from 'react-native-svg';
import type {VisualItem} from '../types';
import {useStoryTheme} from '../theme';
import {Label,useCopy} from '../ui';
import {Bi} from '../text';

/** Deterministic semantic cues. Labels remain real text; quantities and
 * conversational viewpoints must not depend on an artist's interpretation. */
export default function TeachingDiagram({diagram}:{diagram:NonNullable<VisualItem['diagram']>}){
 const c=useStoryTheme(),hi=useCopy();
 if(diagram.kind==='timeline')return <View style={{gap:8}}><Label>{hi?'समय का क्रम — पट्टियों की लम्बाई वास्तविक अवधि नहीं मापती।':'Event order — bar length does not measure actual duration.'}</Label>{diagram.anchor!==undefined?<Label>{hi?'टूटी रेखा: सन्दर्भ का समय':'Dashed line: reference time'}</Label>:null}{diagram.events.map((event,i)=><View key={i} style={{gap:4}}><Bi value={event.label}/><Svg width="100%" height={42} viewBox="0 0 300 42" accessibilityLabel={event.label[hi?'hi':'en']}><Path d="M15 32 L285 32 M277 27 L285 32 L277 37" stroke={c.ink3} strokeWidth={1.5} fill="none"/>{diagram.anchor!==undefined?<Path d={`M${25+diagram.anchor*25} 0 V40`} stroke={c.ink2} strokeDasharray="4 4" strokeWidth={2}/>:null}<Rect x={25+event.start*25} y={8} width={(event.end-event.start)*25} height={16} rx={3} fill={i%2?c.actionText:c.indigo}/></Svg></View>)}</View>;
 if(diagram.kind==='count'){
  const n=diagram.quantity,hundreds=Math.floor(n/100),tens=Math.floor(n%100/10),ones=n%10;
  const groups=Array.from({length:hundreds},()=>100).concat(Array.from({length:tens},()=>10),Array.from({length:ones},()=>1));
  return <View accessible accessibilityLabel={(hi?'कुल संख्या ':'Exact count ')+n} style={{gap:8}}><Label>{n} {hi?'— गिनती':'— exact count'}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{groups.map((value,i)=><View key={i} style={{padding:value>1?8:2,borderWidth:value>1?1:0,borderColor:c.lineStrong,gap:3}}>{value>1?<Label>{value}{value===100?' = 10 × 10':''}</Label>:null}<View style={{flexDirection:'row',flexWrap:'wrap',gap:3,maxWidth:value===100?78:value===10?62:18}}>{Array.from({length:value===100?100:value},(_,j)=><View key={j} style={{width:value===100?5:10,height:value===100?5:10,borderWidth:1,borderColor:c.ink2,backgroundColor:c.indigo,borderRadius:5}}/>)}</View></View>)}</View>{n===0?<Label>{hi?'कोई वस्तु नहीं':'No objects'}</Label>:null}</View>;
 }
 const person=(x:number,y:number,key:string,color:string)=> <React.Fragment key={key}><Circle cx={x} cy={y} r={10} stroke={color} strokeWidth={2} fill={c.paper}/><Path d={`M${x-14} ${y+38} Q${x-14} ${y+15} ${x} ${y+15} Q${x+14} ${y+15} ${x+14} ${y+38} M${x} ${y+39} L${x} ${y+54} M${x} ${y+46} L${x-11} ${y+60} M${x} ${y+46} L${x+11} ${y+60}`} stroke={color} strokeWidth={3} fill="none"/></React.Fragment>;
 if(diagram.kind==='conversation'){
  const label=diagram.role==='speaker'?(hi?'बोलने वाला शामिल':'The speaker is included'):diagram.role==='listener'?(hi?'जिनसे बात हो रही है':'The people being addressed'):(hi?'जिनके बारे में बात है':'The people being spoken about');
  return <View style={{gap:6}}><Label>{label}</Label><Svg width="100%" height={130} viewBox="0 0 300 130" accessibilityLabel={label}>
   {diagram.role!=='speaker'?<>{person(27,30,'speaker',c.ink2)}{diagram.role==='listener'?<Path d="M48 45 L90 45 M80 38 L90 45 L80 52" stroke={c.indigo} strokeWidth={3} fill="none"/>:<Path d="M48 22 Q110 0 170 22" stroke={c.indigo} strokeWidth={2} strokeDasharray="4 4" fill="none"/>}</>:null}
   <Rect x={diagram.role==='speaker'?30:108} y={12} width={diagram.role==='speaker'?245:178} height={112} rx={9} stroke={c.actionText} strokeWidth={2} fill="none"/>
   {Array.from({length:diagram.quantity},(_,i)=>person((diagram.role==='speaker'?65:140)+i*53,36,String(i),c.actionText))}
   {diagram.role==='speaker'?<Path d="M78 31 Q95 22 105 30 M80 38 Q100 32 109 39" stroke={c.indigo} strokeWidth={2} fill="none"/>:null}
  </Svg><Label>{diagram.quantity===1?(hi?'एक व्यक्ति':'One person'):diagram.quantity===2?(hi?'ठीक दो व्यक्ति':'Exactly two people'):diagram.plural?(hi?'बहुवचन समूह: तीन या अधिक':'Plural group: three or more'):(hi?'तीन व्यक्ति':'Three people')}</Label></View>;
 }
 const near=diagram.relation==='near',far=diagram.relation==='far',toward=diagram.relation==='toward',from=diagram.relation==='from';
 const label=near?(hi?'बोलने वाले के पास':'Near the speaker'):far?(hi?'बोलने वाले से दूर':'Far from the speaker'):toward?(hi?'स्थान की ओर':'Toward the place'):from?(hi?'स्थान से दूर':'Away from the place'):(hi?'उसी स्थान पर':'At the place');
 return <View style={{gap:6}}><Label>{label}</Label><Svg width="100%" height={130} viewBox="0 0 300 130" accessibilityLabel={label}>
  {person(28,30,'person',c.ink2)}{near||far?<Circle cx={near?90:255} cy={70} r={19} fill={c.indigo}/>:<><Path d="M195 54 L230 20 L265 54 L265 108 L195 108 Z M220 108 L220 77 L241 77 L241 108" stroke={c.ink2} strokeWidth={3} fill="none"/>{toward?<Path d="M60 75 L175 75 M160 65 L175 75 L160 85" stroke={c.actionText} strokeWidth={4} fill="none"/>:from?<Path d="M175 75 L60 75 M75 65 L60 75 L75 85" stroke={c.actionText} strokeWidth={4} fill="none"/>:<Circle cx={230} cy={64} r={8} fill={c.actionText}/>}</>}
 </Svg><Label>{hi?'सम्बन्ध का सांकेतिक चित्र':'Schematic relationship cue'}</Label></View>;
}
