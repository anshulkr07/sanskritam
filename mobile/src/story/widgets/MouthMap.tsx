import React,{useState} from 'react';
import {View} from 'react-native';
import Svg,{Path,Circle} from 'react-native-svg';
import {useGuideLang} from '../../hooks/useGuide';
import {useStoryTheme} from '../theme';
import {Sa} from '../text';
import {Button,Label} from '../ui';
import {useSpeakText} from '../audio';
import type {MouthMapBuilt,PlaceId} from '../types';
const regions:{id:PlaceId;x:number;y:number;en:string;hi:string}[]=[
 {id:'kantha',x:104,y:183,en:'throat',hi:'गला'}, {id:'talu',x:147,y:120,en:'palate',hi:'तालु'},
 {id:'murdha',x:174,y:107,en:'roof',hi:'मुँह की छत'}, {id:'danta',x:202,y:135,en:'teeth',hi:'दाँत'},
 {id:'oshtha',x:226,y:144,en:'lips',hi:'होंठ'}, {id:'nasika',x:207,y:86,en:'nose',hi:'नाक'},
];
export default function MouthMap({params,onInteracted}: {params:MouthMapBuilt;onInteracted:()=>void}) {
 const c=useStoryTheme(),{lang}=useGuideLang(),speak=useSpeakText(); const [letter,setLetter]=useState<string|null>(null),[place,setPlace]=useState<PlaceId|null>(null);
 const active=place?[place]:letter?params.places[letter]??[]:[];
 const pickPlace=(id:PlaceId)=>{setPlace(id);setLetter(null);onInteracted();};
 return <View style={{gap:12}}><View style={{width:'100%',aspectRatio:1.2,backgroundColor:c.surface}}><Svg width="100%" height="100%" viewBox="0 0 300 250" accessibilityLabel={lang==='hi'?'मुँह का पार्श्व चित्र':'Side view of the mouth'}>
 <Path d="M65 232 L66 164 C28 117 51 37 113 24 C169 11 209 40 209 76 L232 110 L217 119 L230 137 L220 149 L226 163 C220 182 197 186 175 183 L174 232" fill={c.paper} stroke={c.ink2} strokeWidth={3}/>
 <Path d="M80 208 L109 164 Q135 137 207 139 M99 188 Q135 160 204 153 M123 87 Q163 91 203 122" stroke={c.ink3} strokeWidth={2} fill="none"/>
 {regions.map(region=><Circle key={region.id} cx={region.x} cy={region.y} r={13} fill={active.includes(region.id)?c.action:c.surface} stroke={active.includes(region.id)?c.actionText:c.lineStrong} strokeWidth={3} onPress={()=>pickPlace(region.id)} accessibilityLabel={params.place_names[region.id]?.[lang]??region[lang]}/>)}
 </Svg></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{regions.map(region=><Button key={region.id} label={params.place_names[region.id]?.[lang]??region[lang]} selected={active.includes(region.id)} onPress={()=>pickPlace(region.id)}/>)}</View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.letters.map(sa=><Button key={sa} label={sa} selected={letter===sa||!!place&&params.places[sa]?.includes(place)} onPress={()=>{setLetter(sa);setPlace(null);onInteracted();speak(sa);}}><Sa sa={sa} iast={params.iast[sa]} size={30}/></Button>)}</View>
 {active.map(id=>{const name=params.place_names[id];return name?<View key={id}><Sa sa={name.sa} iast={name.iast} size={22}/><Label>{name[lang]}</Label></View>:null;})}</View>;
}
