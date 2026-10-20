import React,{useState} from 'react';
import {View,type LayoutChangeEvent} from 'react-native';
import Svg,{Path,Polygon} from 'react-native-svg';
import {useGuideLang} from '../../hooks/useGuide';
import {Bi,Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {PICKABLE_ROLES,ROLE_LABELS} from './labels';
import {roleResult} from './logic';
import type {RoleArrowsBuilt} from '../types';
type Box={y:number;h:number};
const ARROW_WIDTH=56;
/** Pick a noun, name its job in the action, and watch an arrow join it to the verb. */
export default function RoleArrows({params,onInteracted}:{params:RoleArrowsBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme();
 const verbIndex=params.sentence.findIndex(w=>w.role==='kriya');if(verbIndex<0)return null;
 const verb=params.sentence[verbIndex],nouns=params.sentence.map((word,i)=>({word,i})).filter(x=>x.i!==verbIndex);
 const [picks,setPicks]=useState<Record<number,string>>({}),[active,setActive]=useState<number|null>(nouns[0]?.i??null),[checked,setChecked]=useState(false);
 const [rowBoxes,setRowBoxes]=useState<Record<number,Box>>({}),[verbBox,setVerbBox]=useState<Box|null>(null),[height,setHeight]=useState(0);
 const status=roleResult(params.sentence,picks),roleName=(role:string)=>ROLE_LABELS[role]?.label[lang]??role;
 const assigned=nouns.filter(x=>picks[x.i]!==undefined).length,right=nouns.filter(x=>status[x.i]==='correct').length;
 const choose=(role:string)=>{if(active===null)return;const next={...picks,[active]:role};setPicks(next);setChecked(false);onInteracted();
  const following=nouns.find(x=>next[x.i]===undefined);setActive(following?following.i:active);};
 const onRow=(i:number)=>(e:LayoutChangeEvent)=>{const {y,height:h}=e.nativeEvent.layout;setRowBoxes(old=>old[i]?.y===y&&old[i]?.h===h?old:{...old,[i]:{y,h}});};
 const tone=(i:number)=>!checked?(picks[i]!==undefined?c.ink2:c.lineStrong):status[i]==='correct'?c.done:status[i]==='wrong'?c.wrongInk:c.lineStrong;
 const verbMid=verbBox?verbBox.y+verbBox.h/2:0;
 return <View style={{gap:12}}>
  <View style={{flexDirection:'row',alignItems:'stretch'}} onLayout={e=>setHeight(e.nativeEvent.layout.height)}>
   <View style={{flex:1,gap:8,minWidth:0}}>{nouns.map(({word,i})=><View key={i} onLayout={onRow(i)}>
    <Button label={word.sa+', '+word.gloss[lang]+(picks[i]?', '+roleName(picks[i]):'')} selected={active===i} onPress={()=>setActive(i)} style={checked&&status[i]!=='unset'?{borderColor:tone(i),borderWidth:2}:undefined}>
     <Sa sa={word.sa} iast={params.iast[word.sa]} size={24}/><Label>{word.gloss[lang]}</Label>
     <Label>{picks[i]?roleName(picks[i])+(checked?(status[i]==='correct'?' ✓':' ×'):''):(hi?'काम चुनें':'choose its job')}</Label>
    </Button></View>)}</View>
   <View style={{width:ARROW_WIDTH}} pointerEvents="none">{height>0&&verbBox?<Svg width={ARROW_WIDTH} height={height} style={{position:'absolute',left:0,top:0}}>
    {nouns.map(({i})=>{const box=rowBoxes[i];if(!box)return null;const y=box.y+box.h/2,end=ARROW_WIDTH-8;
     return <React.Fragment key={i}><Path d={`M 0 ${y} C ${ARROW_WIDTH*0.6} ${y}, ${ARROW_WIDTH*0.4} ${verbMid}, ${end} ${verbMid}`} stroke={tone(i)} strokeWidth={picks[i]!==undefined?3:2} strokeDasharray={picks[i]!==undefined?undefined:'4 4'} fill="none"/>
     <Polygon points={`${end},${verbMid-6} ${ARROW_WIDTH},${verbMid} ${end},${verbMid+6}`} fill={tone(i)}/></React.Fragment>;})}</Svg>:null}</View>
   <View style={{width:'34%',justifyContent:'center'}}><View onLayout={e=>{const {y,height:h}=e.nativeEvent.layout;setVerbBox(old=>old&&old.y===y&&old.h===h?old:{y,h});}}>
    <Panel><Sa sa={verb.sa} iast={params.iast[verb.sa]} size={24}/><Label>{verb.gloss[lang]}</Label><Label>{ROLE_LABELS.kriya.label[lang]}</Label></Panel></View></View>
  </View>
  {active!==null?<Panel><Label>{hi?'इस शब्द का काम क्या है?':'What is this word\'s job?'}</Label><Sa sa={params.sentence[active].sa} iast={params.iast[params.sentence[active].sa]} size={24}/>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{PICKABLE_ROLES.map(role=><Button key={role} label={ROLE_LABELS[role].sa+', '+roleName(role)} selected={picks[active]===role} onPress={()=>choose(role)}><Sa sa={ROLE_LABELS[role].sa} size={20} roman={false}/><Label>{roleName(role)}</Label></Button>)}</View></Panel>:null}
  <Button primary label={hi?'जाँचें':'Check'} disabled={assigned===0} onPress={()=>{setChecked(true);onInteracted();}}/>
  {checked?<View accessibilityLiveRegion="polite" style={{gap:6}}><Label>{right}/{nouns.length} {hi?'सही':'right'}</Label>
   {nouns.filter(x=>status[x.i]==='wrong').map(({word,i})=><Label key={i}>× {word.sa}: {roleName(picks[i])} → {roleName(word.role)}</Label>)}
   {nouns.some(x=>status[x.i]==='unset')?<Label>{hi?'कुछ शब्दों का काम अभी चुनना बाकी है।':'Some words still need a job.'}</Label>:null}
   {right===nouns.length?<Bi value={params.meaning}/>:null}</View>:null}
 </View>;
}
