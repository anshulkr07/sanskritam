import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Sa} from '../text';
import {Button,Label,Panel} from '../ui';
import {KRT_SUFFIX_SA} from './labels';
import {factoryKey,factoryResult} from './logic';
import type {WordFactoryBuilt} from '../types';
/** Snap a suffix onto a root and read the word the engine makes. */
export default function WordFactory({params,onInteracted}:{params:WordFactoryBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',[root,setRoot]=useState(0),[suffix,setSuffix]=useState(0),[made,setMade]=useState<string[]>([]);
 const r=params.roots[root],s=params.suffixes[suffix];if(!r||!s)return null;
 const word=factoryResult(params.results,r.dhatu,s.krt),total=params.roots.length*params.suffixes.length;
 const pick=(nextRoot:number,nextSuffix:number)=>{setRoot(nextRoot);setSuffix(nextSuffix);const made1=factoryResult(params.results,params.roots[nextRoot].dhatu,params.suffixes[nextSuffix].krt);
  const key=factoryKey(params.roots[nextRoot].dhatu,params.suffixes[nextSuffix].krt);if(made1&&!made.includes(key))setMade(old=>[...old,key]);onInteracted();};
 return <View style={{gap:12}}>
  <Label>{hi?'धातु':'Root'}</Label>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.roots.map((x,i)=><Button key={x.dhatu} label={x.dhatu+', '+x.gloss[lang]} selected={i===root} onPress={()=>pick(i,suffix)}><Sa sa={x.dhatu} iast={params.iast[x.dhatu]} size={26}/><Label>{x.gloss[lang]}</Label></Button>)}</View>
  <Label>{hi?'प्रत्यय':'Suffix'}</Label>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.suffixes.map((x,i)=><Button key={x.krt} label={(KRT_SUFFIX_SA[x.krt]??x.krt)+', '+x.label[lang]} selected={i===suffix} onPress={()=>pick(root,i)}><Sa sa={KRT_SUFFIX_SA[x.krt]??x.krt} size={24} roman={false}/><Label>{x.label[lang]}</Label></Button>)}</View>
  <Panel>
   <View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}>
    <Sa sa={r.dhatu} iast={params.iast[r.dhatu]} size={28}/><Label>+</Label><Sa sa={KRT_SUFFIX_SA[s.krt]??s.krt} size={28} roman={false}/><Label>→</Label></View>
   {word?<Sa sa={word} iast={params.iast[word]} size={42}/>:<Label>{hi?'इंजन इससे कोई शब्द नहीं बनाता।':'The engine makes no word from this.'}</Label>}
   <Label>{r.gloss[lang]} · {s.label[lang]}</Label>
  </Panel>
  <Label>{hi?'बने शब्द: ':'Words made: '}{made.length}/{total}</Label>
 </View>;
}
