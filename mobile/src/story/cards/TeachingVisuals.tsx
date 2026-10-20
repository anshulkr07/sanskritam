import React,{useState} from 'react';
import {ScrollView,View,useWindowDimensions} from 'react-native';
import {Bi,Sa} from '../text';
import {Button,Label,Panel,useCopy} from '../ui';
import {useStoryTheme} from '../theme';
import type {TeachingVisual,VisualItem} from '../types';
import Picture from './Picture';
import FormChange from './FormChange';
import TeachingDiagram from './TeachingDiagram';
import {useTypeScale} from '../../hooks/useTypeScale';

/** Figures are ordinary accessible app content. A matrix retains every source
 * cell, with a focused phone view as well as the complete reference table. */
export default function TeachingVisuals({visuals,placement}:{visuals?:TeachingVisual[];placement?:'before'|'after'}){
 const [at,setAt]=useState(0),hi=useCopy(),figures=(visuals??[]).filter(v=>!placement||v.placement===placement);
 if(!figures.length)return null;
 const selected=Math.min(at,figures.length-1);
 return <View style={{gap:10}}>{figures.length>1?<><Label>{hi?'व्याख्या ':'Explanation '}{selected+1} / {figures.length}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{figures.map((figure,i)=><Button key={figure.id} label={(i+1)+'. '+(figure.title[hi?'hi':'en']||figure.title.en)} selected={selected===i} onPress={()=>setAt(i)}><Label>{i+1}</Label><Bi value={figure.title} size={15}/></Button>)}</View></>:null}<TeachingFigure key={figures[selected].id} visual={figures[selected]}/></View>;
}

function Item({item,compact=false}:{item:VisualItem;compact?:boolean}){
 const [word,setWord]=useState<number|null>(null),[compare,setCompare]=useState(false),hi=useCopy();
 return <View style={{gap:8,minWidth:0}}>
  {item.label?<Bi value={item.label} size={compact?15:17}/>:null}
  {item.image?<Picture picture={item.image}/>:null}
  {item.diagram?<TeachingDiagram diagram={item.diagram}/>:null}
  {item.sa?<Sa sa={item.sa} iast={item.iast} size={compact?22:28} listen/>:null}
  {item.feature?<Panel><Bi value={item.feature} size={15}/></Panel>:null}
  {item.meaning?<Bi value={item.meaning} size={compact?15:17}/>:null}
  {item.weights?<BeatStrip weights={item.weights}/>:null}
  {item.duration?<Duration units={item.duration}/>:null}
  {item.compare_from&&item.sa?<><Button label={compare?(hi?'रूपों की तुलना बन्द करें':'Close spelling comparison'):(hi?'रूपों की तुलना करें':'Compare spellings')} onPress={()=>setCompare(v=>!v)}/>{compare?<Panel><Label>{hi?'लिखे हुए रूपों की तुलना; ये व्युत्पत्ति के सभी चरण नहीं हैं।':'Compare the written forms; this is not a complete derivation.'}</Label><Sa sa={item.compare_from} iast={item.compare_from_iast}/><Label>↓</Label><Sa sa={item.sa} iast={item.iast}/><FormChange before={item.compare_from} after={item.sa}/></Panel>:null}</>:null}
  {!!item.words?.length?<View style={{gap:8}}><View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{item.words.map((w,i)=><Button key={i} label={(hi?'अर्थ: ':'Meaning: ')+w.sa} selected={word===i} onPress={()=>setWord(word===i?null:i)}><Sa sa={w.sa} iast={w.iast} size={22}/></Button>)}</View>{word!==null&&item.words[word]?<View accessibilityLiveRegion="polite"><Sa sa={item.words[word].sa} iast={item.words[word].iast} listen/><Bi value={item.words[word].gloss}/></View>:null}</View>:null}
 </View>;
}

function Duration({units}:{units:1|2|3}){
 const c=useStoryTheme(),hi=useCopy();
 return <View style={{gap:6}}><Label>{units} {hi?'मात्रा — सांकेतिक अवधि':'mātrā units — schematic duration'}</Label><View style={{flexDirection:'row',gap:4}}>{Array.from({length:units},(_,i)=><View key={i} style={{width:44,height:18,backgroundColor:c.indigo,borderWidth:1,borderColor:c.ink3}}/>)}</View></View>;
}

function BeatStrip({weights}:{weights:string}){
 const c=useStoryTheme(),hi=useCopy();
 let total=0;
 return <View style={{gap:6}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{weights.split('').map((w,i)=>{
  const units=w==='G'?2:1;total+=units;
  return <View key={i} accessibilityLabel={(hi?'अक्षर ':'Syllable ')+(i+1)+', '+(w==='G'?(hi?'गुरु, दो मात्राएँ':'heavy, two mātrās'):(hi?'लघु, एक मात्रा':'light, one mātrā'))} style={{padding:8,minWidth:units*32,borderWidth:1,borderColor:c.lineStrong,backgroundColor:c.paper}}><Label>{i+1} · {w==='G'?'— गुरु':'◡ लघु'}</Label><View style={{flexDirection:'row',gap:3,marginTop:4}}>{Array.from({length:units},(_,n)=><View key={n} style={{width:24,height:10,backgroundColor:c.indigo}}/>)}</View></View>;
 })}</View><Label>{hi?'अक्षर: ':'Syllables: '}{weights.length} · {hi?'मात्राएँ: ':'Mātrās: '}{total}</Label></View>;
}

function StepSequence({visual}:{visual:TeachingVisual}){
 const [at,setAt]=useState(0),[all,setAll]=useState(false),[independent,setIndependent]=useState(false),hi=useCopy(),items=visual.items??[];
 if(!items.length)return null;
 return <View style={{gap:12}}>
  <Label>{hi?'चरण ':'Step '}{at+1} / {items.length}</Label>
  {independent?<Panel><Label>{hi?'पहले स्वयं समझाएँ, फिर सहायता देखें।':'Explain it yourself, then reopen the support.'}</Label><Sa sa={items[0].sa??items[items.length-1].sa} iast={items[0].iast??items[items.length-1].iast} listen/></Panel>:all?items.slice(0,at+1).map((item,i)=><Panel key={item.id}><Label>{i+1}</Label><Item item={item}/></Panel>):<Panel><Item item={items[at]}/></Panel>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   <Button label={hi?'← पिछला चरण':'← Previous step'} disabled={at===0} onPress={()=>setAt(n=>Math.max(0,n-1))}/>
   <Button primary label={hi?'अगला चरण →':'Next step →'} disabled={at===items.length-1} onPress={()=>setAt(n=>Math.min(items.length-1,n+1))}/>
  </View>
  <Button label={all?(hi?'एक चरण देखें':'Focus on one step'):(hi?'अब तक के चरण साथ देखें':'Compare steps so far')} onPress={()=>setAll(v=>!v)}/>
  {items[0].sa||items[items.length-1].sa?<Button label={independent?(hi?'व्याख्या फिर खोलें':'Reopen the explanation'):(hi?'व्याख्या के बिना कोशिश करें':'Try without the explanation')} onPress={()=>setIndependent(v=>!v)}/>:null}
 </View>;
}

export function TeachingMatrix({visual}:{visual:TeachingVisual}){
 const hi=useCopy(),c=useStoryTheme(),[column,setColumn]=useState(visual.columns.length>1?1:0),[full,setFull]=useState(false);
 const columns=visual.columns??[],rows=visual.rows??[];
 if(!columns.length||!rows.length)return null;
 return <View style={{gap:12}}>
  {columns.length>1?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{columns.slice(1).map((name,i)=><Button key={i} label={(name[hi?'hi':'en']||name.en).replace(/\{\{|\}\}/g,'')} selected={column===i+1} onPress={()=>setColumn(i+1)}><Bi value={name} size={16}/></Button>)}</View>:null}
  {full?<ScrollView horizontal accessibilityLabel={hi?'पूरी संदर्भ तालिका':'Complete reference table'}><View>
   <View style={{flexDirection:'row'}}>{columns.map((name,i)=><View key={i} style={{width:164,padding:10,borderBottomWidth:2,borderColor:c.lineStrong}}><Bi value={name} size={16}/></View>)}</View>
   {rows.map((row,i)=><View key={i} style={{flexDirection:'row'}}>{row.map((item,j)=><View key={item.id} style={{width:164,padding:10,borderBottomWidth:1,borderColor:c.line,backgroundColor:j===column?c.surface:c.paper}}><Item item={item} compact/></View>)}</View>)}
  </View></ScrollView>:rows.map((row,i)=><Panel key={i}>
   {column!==0&&row[0]?<><Bi value={columns[0]} size={14}/><Item item={row[0]} compact/></>:null}
   {row[column]?<><Bi value={columns[column]} size={14}/><Item item={row[column]}/></>:null}
  </Panel>)}
  <Button label={full?(hi?'एक स्तम्भ पर ध्यान दें':'Focus on one column'):(hi?'पूरी तालिका देखें':'Show complete table')} onPress={()=>setFull(v=>!v)}/>
 </View>;
}

function Relations({visual}:{visual:TeachingVisual}){
 const [selected,setSelected]=useState<string|null>(null),hi=useCopy(),c=useStoryTheme();
 const items=visual.items??[],edges=visual.edges??[];
 const chosen=selected?items.find(item=>item.id===selected):null;
 return <View style={{gap:12}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{items.map((item,i)=><Button key={item.id} label={item.sa??item.label?.en??String(i+1)} selected={item.id===selected} onPress={()=>setSelected(item.id===selected?null:item.id)}><Label>{i+1}</Label>{item.sa?<Sa sa={item.sa} iast={item.iast} size={24}/>:<Bi value={item.label}/>}</Button>)}</View>
  {chosen?<Panel><Item item={chosen}/></Panel>:null}
  {edges.filter(edge=>!selected||edge.source===selected||edge.target===selected).map((edge,i)=>{
   const from=items.find(item=>item.id===edge.source),to=items.find(item=>item.id===edge.target);
   if(!from||!to)return null;
   return <View key={i} style={{padding:12,borderLeftWidth:3,borderColor:c.indigo,gap:8,backgroundColor:c.surface}}>
    <Item item={from} compact/><View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Label>↓</Label><Bi value={edge.label} size={16}/></View><Item item={to} compact/>
   </View>;
  })}
  {selected?<Button label={hi?'सभी सम्बन्ध देखें':'Show all relationships'} onPress={()=>setSelected(null)}/>:null}
 </View>;
}

function SoundRange({visual}:{visual:TeachingVisual}){
 const [at,setAt]=useState(0),hi=useCopy(),c=useStoryTheme(),selections=visual.selections??[],selected=selections[Math.min(at,selections.length-1)];
 if(!selected)return null;
 const included=new Set(selected.words.map(word=>word.sa));
 return <View style={{gap:12}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{selections.map((choice,i)=><Button key={choice.id} label={choice.sa??choice.id} selected={at===i} onPress={()=>setAt(i)}><Sa sa={choice.sa} iast={choice.iast} size={28}/></Button>)}</View>
  <Bi value={selected.meaning}/>
  <Label>{hi?'चिह्नित ध्वनियाँ शामिल हैं। टूटी सीमा वाले अन्तिम संकेत शामिल नहीं हैं।':'Highlighted sounds are included. Final markers in dashed boxes are excluded.'}</Label>
  {visual.items.map((row,i)=><View key={row.id} style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6}}><Label>{i+1}</Label>{(row.sa??'').split(' ').filter(Boolean).map((sound,j)=><View key={j} accessibilityLabel={sound+', '+(included.has(sound)?(hi?'शामिल':'included'):(hi?'बाहर':'outside'))} style={{padding:7,minWidth:38,borderWidth:included.has(sound)?2:1,borderColor:included.has(sound)?c.actionText:c.lineStrong,backgroundColor:included.has(sound)?c.surface:c.paper}}><Sa sa={sound} roman={false} size={24}/>{included.has(sound)?<Label>✓</Label>:null}</View>)}<View style={{padding:7,borderWidth:1,borderStyle:'dashed',borderColor:c.ink3}}><Sa sa={row.marker} iast={row.marker_iast} size={22}/></View></View>)}
  <Panel><Sa sa={selected.sa} iast={selected.iast}/><Sa sa={selected.words.map(word=>word.sa).join(' ')} roman={false} size={24}/></Panel>
 </View>;
}

function AlignedReading({visual}:{visual:TeachingVisual}){
 const [help,setHelp]=useState(false),hi=useCopy();
 return <View style={{gap:12}}><Button label={help?(hi?'सहायता छिपाएँ और फिर पढ़ें':'Hide the help and reread'):(hi?'अर्थ और विश्लेषण खोलें':'Reveal meaning and analysis')} onPress={()=>setHelp(v=>!v)}/>{visual.items.map(item=><Panel key={item.id}>{help?<Item item={item}/>:<>{item.image?<Picture picture={item.image}/>:null}{item.diagram?<TeachingDiagram diagram={item.diagram}/>:null}<Sa sa={item.sa} iast={item.iast} listen/>{item.label?<Bi value={item.label}/>:null}</>}</Panel>)}</View>;
}

function TeachingFigure({visual}:{visual:TeachingVisual}){
 const c=useStoryTheme(),{fontScale}=useWindowDimensions(),{scale=1}=useTypeScale(),[width,setWidth]=useState(0);
 const grid=width>=600&&fontScale*scale<=1.25;
 return <View testID={'teaching-'+visual.id} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:12,paddingVertical:14,borderTopWidth:1,borderColor:c.lineStrong}}>
  <Bi value={visual.title} size={21}/>
  {visual.explanation?<Bi value={visual.explanation}/>:null}
  {visual.kind==='sound_range'?<SoundRange visual={visual}/>:visual.kind==='reading'?<AlignedReading visual={visual}/>:visual.kind==='matrix'?<TeachingMatrix visual={visual}/>:visual.kind==='worked'||visual.kind==='sequence'?<StepSequence visual={visual}/>:visual.kind==='relations'?<Relations visual={visual}/>:<View style={{flexDirection:grid?'row':'column',flexWrap:'wrap',gap:12}}>{(visual.items??[]).map(item=><View key={item.id} style={grid?{width:(width-12)/2}:{width:'100%'}}><Panel><Item item={item}/></Panel></View>)}</View>}
  {visual.source?<Label>{visual.source}</Label>:null}
 </View>;
}
