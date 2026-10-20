import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {clampSteps,stepChanged} from './logic';
import FormChange from '../cards/FormChange';
import type {DerivationStepperBuilt} from '../types';
/** A word built one sūtra at a time: every step, its number and the form after it come from the engine. */
export default function DerivationStepper({params,onInteracted}:{params:DerivationStepperBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),steps=params.steps,[shown,setShown]=useState(1),[all,setAll]=useState(false);
 if(!steps.length)return null;
 const at=clampSteps(shown,steps.length),step=steps[at-1],done=at===steps.length,changed=stepChanged(steps,at-1);
 const go=(n:number)=>{setShown(clampSteps(n,steps.length));onInteracted();};
 return <View style={{gap:12}}>
  <Label>{hi?'चरण ':'Step '}{at}/{steps.length}</Label>
  <Panel>
   <Sa sa={step.result} iast={params.iast[step.result]} size={40}/>
   {at>1?<><Label>{hi?'पिछला रूप':'Previous form'}</Label><Sa sa={steps[at-2].result} iast={params.iast[steps[at-2].result]} size={26}/><FormChange before={steps[at-2].result} after={step.result}/></>:null}
   <Label>{hi?'सूत्र ':'Sūtra '}{step.sutra}</Label>
   <Sa sa={step.sa} iast={step.iast} size={24}/>
   {!changed?<Label>{hi?'इस चरण में रूप नहीं बदलता: यह केवल संकेत या नाम तय करता है।':'The form does not change here: this step only marks or names something.'}</Label>:null}
   {done?<View accessibilityLiveRegion="polite"><Label>✓ {hi?'शब्द बन गया:':'The word is built:'}</Label><Sa sa={params.target} iast={params.iast[params.target]} size={32}/></View>:null}
  </Panel>
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
   <Button label={hi?'← पीछे':'← Back'} disabled={at<=1} onPress={()=>go(at-1)}/>
   <Button primary label={hi?'अगला नियम →':'Next rule →'} disabled={done} onPress={()=>go(at+1)}/>
   <Button label={hi?'फिर से':'Start again'} disabled={at<=1} onPress={()=>go(1)}/></View>
  <Button label={all?(hi?'सब चरण छिपाइए':'Hide all steps'):(hi?'सब चरण दिखाइए':'Show all steps')} onPress={()=>{setAll(v=>!v);onInteracted();}}/>
  {all?<View style={{gap:6}}>{steps.slice(0,at).map((s,i)=><View key={i} style={{flexDirection:'row',gap:10,alignItems:'baseline',borderTopWidth:1,borderTopColor:c.line,paddingTop:6}}>
   <View style={{width:52}}><Label>{s.sutra}</Label></View><View style={{flex:1}}><Sa sa={s.result} iast={params.iast[s.result]} size={20}/></View></View>)}</View>:null}
 </View>;
}
