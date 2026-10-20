import React,{useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Sa} from '../text';
import {Button,Label,Panel} from '../ui';
import {joinLetter} from './logic';
import type {LetterBuilderBuilt} from '../types';
export default function LetterBuilder({params,onInteracted}:{params:LetterBuilderBuilt;onInteracted:()=>void}){
 const [chip,setChip]=useState<string|null>(null),[join,setJoin]=useState(''),[found,setFound]=useState<string[]>([]),{lang}=useGuideLang(),hi=lang==='hi';
 return <View style={{gap:12}}><Label>{hi?'पहले मात्रा या आधा अक्षर चुनें, फिर मूल अक्षर छुएँ।':'Choose a sign or half letter, then tap a base.'}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[...params.signs,...params.halves].map((part,i)=><Button key={i} label={(hi?'चुनें: ':'Select: ')+part} selected={chip===part} onPress={()=>setChip(part)}><Sa sa={part} iast={params.iast[part]} size={28}/></Button>)}</View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.bases.map(base=><Button key={base} label={(hi?'जोड़ें: ':'Join onto: ')+base} disabled={chip===null} onPress={()=>{if(chip===null)return;const joined=joinLetter(base,chip,params.halves);setJoin(joined);setFound(old=>params.targets.includes(joined)&&!old.includes(joined)?[...old,joined]:old);onInteracted();}}><Sa sa={base} iast={params.iast[base]} size={36}/></Button>)}</View>{join?<Panel><Sa sa={join} iast={params.iast[join]} size={52}/></Panel>:null}<Label>{hi?'लक्ष्य':'Targets'} {found.length}/{params.targets.length}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.targets.map(target=><Panel key={target}><Sa sa={target} iast={params.iast[target]} size={24}/><Label>{found.includes(target)?'✓':'○'}</Label></Panel>)}</View></View>;
}
