import Picture from './Picture';
import Explore from '../widgets';
import Practice, {type PracticeProgress} from './Practice';
import type {Verdict} from '../grade';
import React,{useState,useContext} from 'react';
import { View } from 'react-native';
import type { Card, Character } from '../types';
import {Bi,Sa,RomanContext} from '../text';
import {Story,Teach,Table,Summary,Reading,Revision,Video} from './content';
import {Label} from '../ui';
export default function StoryCardView({card,characters=[],sceneNumber=()=>null,onScene=()=>{},progress,onAnswer=()=>{}}:{card:Card;characters?:Character[];sceneNumber?:(id:string)=>number|null;onScene?:(id:string,cardId:string)=>void;progress?:PracticeProgress;onAnswer?:(verdict:Verdict)=>void}) {
 const [explored,setExplored]=useState(false), inherited=useContext(RomanContext);
 const roman=inherited && !(card.kind==='explore'&&card.roman==='after'&&!explored);
 let content:React.ReactNode;
 switch(card.kind){
 case 'story':content=<Story card={card} characters={characters}/>;break;
 case 'teach':content=<Teach card={card}/>;break;
 case 'table':content=<Table card={card}/>;break;
 case 'summary':content=<Summary card={card}/>;break;
 case 'reading':content=<Reading card={card}/>;break;
 case 'revision':content=<Revision card={card} sceneNumber={sceneNumber} onScene={onScene}/>;break;
 case 'video':content=<Video card={card}/>;break;
 case 'practice':content=<Practice card={card} progress={progress} onAnswer={onAnswer}/>;break;
 case 'explore':content=<Explore card={card} onAnswered={()=>setExplored(true)}/>;break;
 }
 return <RomanContext.Provider value={roman}><View style={{gap:14}}>{card.title?<Bi value={card.title} size={24}/>:null}{card.kind!=='story'?<Picture picture={card.image}/>:null}{content}{card.sutras.map(s=><View key={s.ref}><Label>{s.ref}</Label><Sa sa={s.sa} iast={s.iast} size={21}/></View>)}</View></RomanContext.Provider>;
}
