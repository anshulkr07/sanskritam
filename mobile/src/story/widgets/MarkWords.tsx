import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label} from '../ui';
import {markResult} from './logic';
import type {MarkWordsBuilt} from '../types';
export default function MarkWords({params,onInteracted}:{params:MarkWordsBuilt;onInteracted:()=>void}){
 const [selected,setSelected]=useState<number[]>([]),[checked,setChecked]=useState(false),{lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme();const statuses=markResult(params,selected);
 return <View style={{gap:12}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.passage.map((word,i)=><Button key={i} label={word+(checked?' · '+(statuses[i]==='found'?(hi?'मिला':'Found'):statuses[i]==='missed'?(hi?'छूट गया':'Missed'):statuses[i]==='wrong'?(hi?'गलत चुना':'Wrong'):''):'')} selected={selected.includes(i)} onPress={()=>{setSelected(old=>old.includes(i)?old.filter(j=>j!==i):[...old,i]);setChecked(false);}} style={checked?{borderColor:statuses[i]==='found'?c.done:statuses[i]==='wrong'?c.wrongInk:statuses[i]==='missed'?c.ochre:c.line}:undefined}><Sa sa={word} iast={params.iast[word]} size={25}/>{checked&&statuses[i]!=='neutral'?<Label>{statuses[i]==='found'?(hi?'✓ मिला':'✓ Found'):statuses[i]==='missed'?(hi?'○ छूट गया':'○ Missed'):(hi?'× गलत चुना':'× Wrong')}</Label>:null}</Button>)}</View><Button primary label={hi?'जाँचें':'Check'} onPress={()=>{setChecked(true);onInteracted();}}/>{checked?<View accessibilityLiveRegion="polite"><Label>{hi?'मिले: ':'Found: '}{statuses.filter(s=>s==='found').length} · {hi?'छूटे: ':'Missed: '}{statuses.filter(s=>s==='missed').length} · {hi?'गलत: ':'Wrong: '}{statuses.filter(s=>s==='wrong').length}</Label></View>:null}</View>;
}
