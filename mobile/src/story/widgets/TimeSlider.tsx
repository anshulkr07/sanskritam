import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Bi,Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {clampIndex} from './logic';
import type {TimeSliderBuilt} from '../types';
const MARK=18,MARK_ACTIVE=26;
/** One sentence slid from past to present to future: the verb changes, the rest stays. */
export default function TimeSlider({params,onInteracted}:{params:TimeSliderBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),forms=params.forms,[index,setIndex]=useState(0);
 const form=forms[index];if(!form)return null;
 const go=(i:number)=>{setIndex(clampIndex(i,forms.length));onInteracted();};
 return <View style={{gap:12}}>
  <View style={{paddingVertical:4}}>
   <View style={{position:'absolute',left:MARK_ACTIVE/2,right:MARK_ACTIVE/2,top:MARK_ACTIVE/2+4,height:3,backgroundColor:c.lineStrong}}/>
   <View style={{flexDirection:'row',justifyContent:'space-between'}}>{forms.map((f,i)=>
    <Pressable key={i} accessibilityRole="button" accessibilityLabel={f.label[lang]+', '+f.sa} accessibilityState={{selected:i===index}} onPress={()=>go(i)} style={{alignItems:i===0?'flex-start':i===forms.length-1?'flex-end':'center',minWidth:64,minHeight:48,gap:6}}>
     <View style={{width:MARK_ACTIVE,height:MARK_ACTIVE,alignItems:'center',justifyContent:'center'}}><View style={{width:i===index?MARK_ACTIVE:MARK,height:i===index?MARK_ACTIVE:MARK,backgroundColor:i===index?c.action:c.surface,borderWidth:2,borderColor:i===index?c.actionText:c.lineStrong}}/></View>
     <Label>{f.label[lang]}</Label></Pressable>)}</View>
  </View>
  <Panel><Sa sa={form.sa} iast={form.iast} size={32}/><Bi value={form.meaning}/></Panel>
  <View style={{flexDirection:'row',gap:8}}>
   <Button label={hi?'← पहले':'← Earlier'} disabled={index===0} onPress={()=>go(index-1)}/>
   <Button label={hi?'बाद में →':'Later →'} disabled={index===forms.length-1} onPress={()=>go(index+1)}/></View>
 </View>;
}
