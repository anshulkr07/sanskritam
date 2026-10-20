import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import type {SandhiMixerBuilt} from '../types';
/** Pick a pair, join it, and read the new word and the sūtra behind the change; pull it apart again. */
export default function SandhiMixer({params,onInteracted}:{params:SandhiMixerBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),[index,setIndex]=useState(0),[joined,setJoined]=useState(false),[tried,setTried]=useState<string[]>([]);
 const pair=params.pairs[index];if(!pair)return null;
 const choose=(i:number)=>{setIndex(i);setJoined(false);onInteracted();};
 const toggle=()=>{const next=!joined;setJoined(next);if(next&&!tried.includes(pair.joined))setTried(old=>[...old,pair.joined]);onInteracted();};
 return <View style={{gap:12}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.pairs.map((p,i)=><Button key={i} label={p.first+' + '+p.second} selected={i===index} onPress={()=>choose(i)}><Sa sa={p.first+' + '+p.second} size={20} roman={false}/></Button>)}</View>
  <Panel>
   {!joined
    ?<View style={{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <View style={{padding:10,borderWidth:1,borderColor:c.lineStrong,backgroundColor:c.paper}}><Sa sa={pair.first} iast={params.iast[pair.first]} size={30}/></View><Label>+</Label>
      <View style={{padding:10,borderWidth:1,borderColor:c.lineStrong,backgroundColor:c.paper}}><Sa sa={pair.second} iast={params.iast[pair.second]} size={30}/></View></View>
    :<View accessibilityLiveRegion="polite" style={{gap:8}}>
      <Label>{pair.first} + {pair.second} →</Label>
      <Sa sa={pair.joined} iast={params.iast[pair.joined]} size={44}/>
      {pair.sutras.map(s=><View key={s.ref}><Label>{hi?'सूत्र ':'Sūtra '}{s.ref}</Label><Sa sa={s.sa} iast={s.iast} size={22}/></View>)}</View>}
  </Panel>
  <Button primary label={joined?(hi?'फिर अलग करें':'Pull apart'):(hi?'जोड़ें':'Join them')} onPress={toggle}/>
  <Label>{hi?'जोड़े गए: ':'Joined: '}{tried.length}/{params.pairs.length}</Label>
 </View>;
}
