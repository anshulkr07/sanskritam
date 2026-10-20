import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import {Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {LAKARA_LABELS,PURUSHA_LABELS,VACANA_LABELS,VIBHAKTI_LABELS,pick} from './labels';
import {splitEnding} from './logic';
import type {FormExplorerBuilt} from '../types';
type Paradigm=FormExplorerBuilt['paradigms'][number];
const isNoun=(p:Paradigm):p is Extract<Paradigm,{stem:string}>=>'stem' in p;
/** Pick a case or person and a number in the engine's grid and read the form it gives. */
export default function FormExplorer({params,onInteracted}:{params:FormExplorerBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale();
 const [paradigmIndex,setParadigmIndex]=useState(0),[rowIndex,setRowIndex]=useState(0),[columnIndex,setColumnIndex]=useState(0);
 const paradigm=params.paradigms[paradigmIndex];if(!paradigm||!paradigm.rows.length)return null;
 const noun=isNoun(paradigm),rows=paradigm.rows,row=rows[Math.min(rowIndex,rows.length-1)],cell=row[Math.min(columnIndex,row.length-1)];
 const rowName=(r:typeof rows[number])=>{const first=r[0] as {vibhakti?:string;purusha?:string};return noun?pick(VIBHAKTI_LABELS[first.vibhakti??''],first.vibhakti??'',lang):pick(PURUSHA_LABELS[first.purusha??''],first.purusha??'',lang);};
 const columns=row.map(x=>pick(VACANA_LABELS[x.vacana],x.vacana,lang));
 const base=noun?paradigm.stem:paradigm.dhatu,split=noun&&cell.form?splitEnding(paradigm.stem,cell.form):null;
 const name=(p:Paradigm)=>isNoun(p)?p.stem:p.dhatu;
 const select=(r:number,col:number)=>{setRowIndex(r);setColumnIndex(col);onInteracted();};
 return <View style={{gap:12}}>
  {params.paradigms.length>1?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.paradigms.map((p,i)=>{const dupe=!isNoun(p)&&params.paradigms.filter(q=>!isNoun(q)&&q.dhatu===p.dhatu).length>1;
   return <Button key={i} label={name(p)+(dupe&&!isNoun(p)?' · '+pick(LAKARA_LABELS[p.lakara],p.lakara,lang):'')} selected={i===paradigmIndex} onPress={()=>{setParadigmIndex(i);onInteracted();}}><Sa sa={name(p)} iast={params.iast[name(p)]} size={26}/>{dupe&&!isNoun(p)?<Label>{pick(LAKARA_LABELS[p.lakara],p.lakara,lang)}</Label>:null}</Button>;})}</View>:null}
  <Panel>
   <Label>{rowName(row)} · {columns[Math.min(columnIndex,columns.length-1)]}</Label>
   {cell.form?<Sa sa={cell.form} iast={params.iast[cell.form]} size={40}/>:<Label>{hi?'यह रूप उपलब्ध नहीं है':'No form available'}</Label>}
   {split&&split.tail?<View style={{flexDirection:'row',alignItems:'baseline',gap:6}} accessibilityLabel={(hi?'मूल ':'stem ')+base+(hi?', प्रत्यय ':', ending ')+split.tail}>
    <Text style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(24),color:c.ink2}}>{base}</Text>
    <Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(18),color:c.ink3}}>+</Text>
    <Text style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(24),color:c.actionText}}>{split.shown}</Text>
    <Label>{hi?'प्रत्यय':'ending'}</Label></View>:null}
  </Panel>
  <View style={{gap:6}} accessibilityRole="summary">
   <View style={{flexDirection:'row',gap:6}}><View style={{width:76}}/>{columns.map((heading,i)=><View key={i} style={{flex:1,minWidth:0}}><Label>{heading}</Label></View>)}</View>
   {rows.map((r,ri)=><View key={ri} style={{flexDirection:'row',gap:6,alignItems:'stretch'}}>
    <View style={{width:76,justifyContent:'center'}}><Label>{rowName(r)}</Label></View>
    {r.map((x,ci)=>{const chosen=ri===Math.min(rowIndex,rows.length-1)&&ci===Math.min(columnIndex,row.length-1);
     return <View key={ci} style={{flex:1,minWidth:0}}><Button label={(x.form??'—')+', '+rowName(r)+', '+columns[ci]} selected={chosen} onPress={()=>select(ri,ci)} style={[{padding:6,alignItems:'center'},chosen?{backgroundColor:c.paper,borderWidth:2}:null]}>{x.form?<Sa sa={x.form} size={17} roman={false}/>:<Label>—</Label>}</Button></View>;})}
   </View>)}
  </View>
 </View>;
}
