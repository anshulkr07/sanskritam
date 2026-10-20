import {resolvePicture} from '../artwork';
import React, {useContext,useEffect,useState} from 'react';
import { View, ScrollView, Text, Linking, Pressable } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Bi, Sa } from '../text';
import { Button, Panel, Label, useCopy } from '../ui';
import { useStoryTheme } from '../theme';
import type { StoryCard, TeachCard, TableCard, SummaryCard, ReadingCard, RevisionCard, VideoCard, Character, Example } from '../types';
import Picture from './Picture';
import TeachingVisuals,{TeachingMatrix} from './TeachingVisuals';
import { ClipContext, clipKey, playStory, useClip } from '../audio';
export function ExampleView({example:e}: {example:Example}) {return <Panel><Sa sa={e.sa} iast={e.iast} listen/><Bi value={e.meaning}/>{e.words.map((w,i)=><View key={i}><Sa sa={w.sa} iast={w.iast} size={20} listen/><Bi value={w.gloss} size={15}/></View>)}{e.source?<Label>{e.source}</Label>:null}</Panel>;}
export function Story({card,characters}: {card:StoryCard;characters:Character[]}) {return <><Picture picture={card.image}/><Bi value={card.narration}/>{card.lines.map((line,i)=>{const speaker=characters.find(ch=>ch.id===line.speaker);return <Panel key={i}><View style={{flexDirection:'row',gap:8,alignItems:'center'}}>{resolvePicture(speaker?.portrait)?.delivered?<View style={{width:44}}><Picture picture={speaker?.portrait} compact/></View>:null}<View style={{flex:1}}>{speaker?<><Sa sa={speaker.name_sa} iast={speaker.name_iast} size={18}/><Bi value={speaker.name} size={14}/></>:<Label>{line.speaker}</Label>}</View></View>{line.sa?<Sa sa={line.sa} iast={line.iast} listen/>:null}<Bi value={line.gloss??line.text}/></Panel>;})}{card.quote?<Panel><Sa sa={card.quote.sa} iast={card.quote.iast} listen/><Bi value={card.quote.gloss}/><Label>{card.quote.source}</Label></Panel>:null}</>;}
export function Teach({card}: {card:TeachCard}) {return <><Bi value={card.body}/>{card.term?<Panel><Sa sa={card.term.sa} iast={card.term.iast} listen/><Bi value={card.term.meaning}/></Panel>:null}{card.formula?<Sa sa={card.formula} iast={card.formula_iast}/>:null}{card.rows.map((r,i)=><Panel key={i}><Sa sa={r.sa} iast={r.iast} listen/><Bi value={r.gloss}/></Panel>)}{card.steps.map((r,i)=><Panel key={i}><Label>{i+1} →</Label><Sa sa={r.sa} iast={r.iast} listen/><Bi value={r.label}/></Panel>)}{card.examples.map((e,i)=><ExampleView key={i} example={e}/>)}</>;}
/** A table cell with a recording is tap-to-hear. */
function TapSa({sa,iast}: {sa:string;iast?:string}) {const url=useClip(sa),hi=useCopy(),body=<Sa sa={sa} iast={iast} size={22}/>;return url?<Pressable accessibilityRole="button" accessibilityLabel={(hi?'सुनें: ':'Listen: ')+sa} onPress={()=>{void playStory(url);}}>{body}</Pressable>:body;}
export function Table({card}: {card:TableCard}) {const hi=useCopy();return <><Bi value={card.caption}/><Label>{hi?'स्तम्भ चुनकर रूपों की तुलना करें।':'Choose a column to compare its forms.'}</Label><TeachingMatrix visual={{id:card.id+'-matrix',kind:'matrix',title:card.title??card.caption,columns:card.columns,rows:card.rows.map((row,i)=>row.map((cell,j)=>({id:'r'+i+'-c'+j,sa:cell.sa,iast:cell.iast,label:cell.text,words:[],feature:cell.highlight?{en:'Highlighted form',hi:'चिह्नित रूप'}:undefined}))),items:[],edges:[],placement:'after'}}/><Bi value={card.note}/></>;}
export function Summary({card}: {card:SummaryCard}) {return <>{card.points.map((point,i)=><Panel key={i}><Sa sa={point.sa} iast={point.iast} listen/><Bi value={point.text}/></Panel>)}</>;}
export function Reading({card}: {card:ReadingCard}) {
 const [word,setWord]=useState<{sa:string;iast:string;gloss:import('../types').Bi;line:number;at:number}|null>(null),hi=useCopy();
 return <>{card.passage.map((line,i)=><Panel key={i}>
  <Sa sa={line.sa} iast={line.iast} listen/><Bi value={line.meaning}/>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{line.words.map((w,j)=><Button key={j} label={(hi?'अर्थ: ':'Gloss: ')+w.sa} selected={word?.line===i&&word.at===j} onPress={()=>setWord({...w,line:i,at:j})}><Sa sa={w.sa} iast={w.iast} size={22}/></Button>)}</View>
  {word?.line===i?<View style={{gap:6}}><View accessibilityLiveRegion="polite"><Sa sa={word.sa} iast={word.iast} listen/><Bi value={word.gloss}/></View><Button label={hi?'शब्दार्थ बंद करें':'Close word meaning'} onPress={()=>setWord(null)}/></View>:null}
 </Panel>)}</>;
}
export function Revision({card,sceneNumber,onScene}: {card:RevisionCard;sceneNumber:(id:string)=>number|null;onScene:(id:string,cardId:string)=>void}) {
 const [page,setPage]=useState(0),hi=useCopy(); const rows=card.rows.slice(page*6,page*6+6);
 const sections={core:['Core','मुख्य नियम'],conditions:['Conditions','शर्तें'],exceptions:['Exceptions','अपवाद'],optional:['Optional','विकल्प'],blocked:['Blocked','निषेध'],splitting:['Splitting','विच्छेद'],mistakes:['Common mistakes','सामान्य भूलें'],panini:['Pāṇini','पाणिनि'],quick_sheet:['Quick sheet','झटपट सार']} as const;
 return <><Label>{sections[card.section][hi?1:0]}</Label>{rows.map((row,i)=>{const [id,cardId]=row.taught_in?.split('#')??[];const n=id?sceneNumber(id):null;return <Panel key={i}><Label>{row.tag==='core'?(hi?'मुख्य':'Core'):row.tag==='good'?(hi?'जानने योग्य':'Good to know'):(hi?'दुर्लभ':'Rare')}{row.new_here?(hi?' · यहाँ नया':' · New here'):''}</Label><Sa sa={row.formula} iast={row.formula_iast}/><Bi value={row.rule}/>{row.example?<ExampleView example={row.example}/>:null}<TeachingVisuals visuals={row.visuals}/>{row.sutras.map(s=><View key={s.ref}><Label>{s.ref}</Label><Sa sa={s.sa} iast={s.iast} size={21}/></View>)}{id?<Button label={n?(hi?'दृश्य '+n+' में देखा':'Seen in scene '+n):(hi?'पाठ में देखा':'Seen in lesson')} onPress={()=>onScene(id,cardId)}/>:null}</Panel>;})}<View style={{flexDirection:'row',gap:8}}>{page>0?<Button label={hi?'पिछले नियम':'Previous rows'} onPress={()=>setPage(p=>p-1)}/>:null}{(page+1)*6<card.rows.length?<Button label={hi?'अगले नियम':'Next rows'} onPress={()=>setPage(p=>p+1)}/>:null}</View></>;
}
export function Video({card}: {card:VideoCard}) {
 const [width,setWidth]=useState(0),[failed,setFailed]=useState(false),[openFailed,setOpenFailed]=useState(false),hi=useCopy();
 useEffect(()=>{setFailed(false);setOpenFailed(false);},[card.youtube_id]);
 const open=()=>{setOpenFailed(false);void Linking.openURL('https://www.youtube.com/watch?v='+encodeURIComponent(card.youtube_id)+(card.start?'&t='+card.start+'s':'')).catch(()=>setOpenFailed(true));};
 return <View style={{gap:10}} onLayout={e=>setWidth(e.nativeEvent.layout.width)}><Label>{card.channel}</Label>{width>=200&&!failed?<YoutubePlayer height={Math.max(200,width*9/16)} width={width} videoId={card.youtube_id} play={false} onError={()=>setFailed(true)} initialPlayerParams={{start:card.start,end:card.end,rel:false,playsinline:true}}/>:null}{failed?<View accessibilityLiveRegion="polite"><Label>{hi?'वीडियो यहाँ नहीं चल सका। YouTube में खोलें।':'This video could not play here. Open it in YouTube.'}</Label></View>:null}<Button label={hi?'YouTube में वीडियो खोलें':'Open video in YouTube'} onPress={open}/>{openFailed?<Label>{hi?'लिंक नहीं खुल सका। फिर कोशिश करें।':'Could not open the link. Please try again.'}</Label>:null}</View>;
}
