import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Bi,Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {COMPOUND_KIND_LABELS,COMPOUND_KIND_ORDER} from './labels';
import {kindResult,nextStage,type UnpackStage} from './logic';
import type {CompoundUnpackerBuilt} from '../types';
/** Split a compound, say it in a full phrase, then name its kind. The kinds are authored, for the scholar to confirm. */
export default function CompoundUnpacker({params,onInteracted}:{params:CompoundUnpackerBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),[stage,setStage]=useState<UnpackStage>(0),[picked,setPicked]=useState<string|null>(null);
 const result=kindResult(params.kind,picked);
 return <View style={{gap:12}}>
  <Panel>
   <Sa sa={params.compound} iast={params.iast[params.compound]} size={40}/>
   {stage>=1?<View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}>{params.parts.map((part,i)=><React.Fragment key={i}>{i>0?<Label>+</Label>:null}<View style={{padding:8,borderWidth:1,borderColor:c.lineStrong,backgroundColor:c.paper}}><Sa sa={part} iast={params.iast[part]} size={26}/></View></React.Fragment>)}</View>:null}
   {stage>=2?<View><Label>{hi?'पूरे वाक्यांश में':'In a full phrase'}</Label><Sa sa={params.vigraha} iast={params.iast[params.vigraha]} size={26}/></View>:null}
  </Panel>
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
   <Button primary={stage<2} label={stage===0?(hi?'खोलिए':'Split it'):stage===1?(hi?'पूरे वाक्यांश में कहिए':'Say it in full'):(hi?'फिर से':'Start again')} onPress={()=>{if(stage>=2){setStage(0);setPicked(null);}else setStage(nextStage(stage));onInteracted();}}/></View>
  {stage>=1?<View style={{gap:8}}>
   <Label>{hi?'यह किस प्रकार का समास है?':'What kind of compound is it?'}</Label>
   {COMPOUND_KIND_ORDER.map(kind=>{const k=COMPOUND_KIND_LABELS[kind];const chosen=picked===kind;
    return <Button key={kind} label={k.sa+', '+k.label[lang]} selected={chosen} onPress={()=>{setPicked(kind);onInteracted();}} style={chosen?{borderWidth:2,borderColor:result==='correct'?c.done:c.wrongInk}:undefined}><Sa sa={k.sa} size={22} roman={false}/><Label>{k.label[lang]}</Label></Button>;})}
   {result==='correct'?<View accessibilityLiveRegion="polite" style={{gap:6}}><Label>✓ {hi?'सही':'Right'}</Label><Bi value={params.meaning}/></View>:null}
   {result==='wrong'?<View accessibilityLiveRegion="polite"><Label>× {hi?'फिर कोशिश कीजिए: खुला हुआ रूप देखिए।':'Try again: look at the unpacked form.'}</Label></View>:null}
  </View>:null}
 </View>;
}
