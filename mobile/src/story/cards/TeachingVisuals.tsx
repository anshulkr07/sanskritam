import React,{useState} from 'react';
import {ScrollView,View,useWindowDimensions} from 'react-native';
import {Bi,Sa} from '../text';
import {Button,Label,Panel,useCopy} from '../ui';
import {useStoryTheme} from '../theme';
import type {TeachingVisual,VisualItem} from '../types';
import Picture from './Picture';

/** Figures are ordinary accessible app content. A matrix retains every source
 * cell, with a focused phone view as well as the complete reference table. */
export default function TeachingVisuals({visuals,placement}:{visuals?:TeachingVisual[];placement?:'before'|'after'}){
 const [at,setAt]=useState(0),hi=useCopy(),figures=(visuals??[]).filter(v=>!placement||v.placement===placement);
 if(!figures.length)return null;
 const selected=Math.min(at,figures.length-1);
 return <View style={{gap:10}}>{figures.length>1?<><Label>{hi?'व्याख्या ':'Explanation '}{selected+1} / {figures.length}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{figures.map((figure,i)=><Button key={figure.id} label={figure.title[hi?'hi':'en']||figure.title.en} selected={selected===i} onPress={()=>setAt(i)}><Label>{i+1}</Label><Bi value={figure.title} size={15}/></Button>)}</View></>:null}<TeachingFigure key={figures[selected].id} visual={figures[selected]}/></View>;
}

function Item({item,compact=false}:{item:VisualItem;compact?:boolean}){
 const [word,setWord]=useState<number|null>(null),hi=useCopy();
 return <View style={{gap:8,minWidth:0}}>
  {item.label?<Bi value={item.label} size={compact?15:17}/>:null}
  {item.image?<Picture picture={item.image}/>:null}
  {item.sa?<Sa sa={item.sa} iast={item.iast} size={compact?22:28} listen/>:null}
  {item.feature?<Panel><Bi value={item.feature} size={15}/></Panel>:null}
  {item.meaning?<Bi value={item.meaning} size={compact?15:17}/>:null}
  {item.weights?<BeatStrip weights={item.weights}/>:null}
  {!!item.words?.length?<View style={{gap:8}}><View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{item.words.map((w,i)=><Button key={i} label={(hi?'अर्थ: ':'Meaning: ')+w.sa} selected={word===i} onPress={()=>setWord(word===i?null:i)}><Sa sa={w.sa} iast={w.iast} size={22}/></Button>)}</View>{word!==null&&item.words[word]?<View accessibilityLiveRegion="polite"><Sa sa={item.words[word].sa} iast={item.words[word].iast} listen/><Bi value={item.words[word].gloss}/></View>:null}</View>:null}
 </View>;
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
 const [at,setAt]=useState(0),[all,setAll]=useState(false),hi=useCopy(),items=visual.items??[];
 if(!items.length)return null;
 return <View style={{gap:12}}>
  <Label>{hi?'चरण ':'Step '}{at+1} / {items.length}</Label>
  {all?items.slice(0,at+1).map((item,i)=><Panel key={item.id}><Label>{i+1}</Label><Item item={item}/></Panel>):<Panel><Item item={items[at]}/></Panel>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   <Button label={hi?'← पिछला चरण':'← Previous step'} disabled={at===0} onPress={()=>setAt(n=>Math.max(0,n-1))}/>
   <Button primary label={hi?'अगला चरण →':'Next step →'} disabled={at===items.length-1} onPress={()=>setAt(n=>Math.min(items.length-1,n+1))}/>
  </View>
  <Button label={all?(hi?'एक चरण देखें':'Focus on one step'):(hi?'अब तक के चरण साथ देखें':'Compare steps so far')} onPress={()=>setAll(v=>!v)}/>
 </View>;
}

export function TeachingMatrix({visual}:{visual:TeachingVisual}){
 const hi=useCopy(),c=useStoryTheme(),[column,setColumn]=useState(visual.columns.length>1?1:0),[full,setFull]=useState(false);
 const columns=visual.columns??[],rows=visual.rows??[];
 if(!columns.length||!rows.length)return null;
 return <View style={{gap:12}}>
  {columns.length>1?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{columns.slice(1).map((name,i)=><Button key={i} label={name[hi?'hi':'en']||name.en} selected={column===i+1} onPress={()=>setColumn(i+1)}/>)}</View>:null}
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

function TeachingFigure({visual}:{visual:TeachingVisual}){
 const c=useStoryTheme(),{fontScale}=useWindowDimensions(),[width,setWidth]=useState(0);
 const grid=width>=600&&fontScale<=1.25;
 return <View testID={'teaching-'+visual.id} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{gap:12,paddingVertical:14,borderTopWidth:1,borderColor:c.lineStrong}}>
  <Bi value={visual.title} size={21}/>
  {visual.explanation?<Bi value={visual.explanation}/>:null}
  {visual.kind==='matrix'?<TeachingMatrix visual={visual}/>:visual.kind==='worked'||visual.kind==='sequence'?<StepSequence visual={visual}/>:visual.kind==='relations'?<Relations visual={visual}/>:<View style={{flexDirection:grid?'row':'column',flexWrap:'wrap',gap:12}}>{(visual.items??[]).map(item=><View key={item.id} style={grid?{width:(width-12)/2}:{width:'100%'}}><Panel><Item item={item}/></Panel></View>)}</View>}
  {visual.source?<Label>{visual.source}</Label>:null}
 </View>;
}
