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
const tongues:Partial<Record<PlaceId,string>>={
 kantha:'M107 178 Q112 131 145 130 Q163 142 196 157',
 talu:'M107 178 Q139 128 171 123 Q181 139 198 157',
 murdha:'M107 178 Q150 173 176 151 Q187 125 176 112 Q164 117 175 135 Q178 150 192 157',
 danta:'M107 178 Q147 177 180 153 L204 137 L200 155',
 oshtha:'M107 178 Q146 173 196 157',nasika:'M107 178 Q132 146 157 145 Q177 150 196 157',
};
const stopRows=['क ख ग घ ङ','च छ ज झ ञ','ट ठ ड ढ ण','त थ द ध न','प फ ब भ म'].map(row=>row.split(' '));
export default function MouthMap({params,onInteracted}: {params:MouthMapBuilt;onInteracted:()=>void}) {
 const c=useStoryTheme(),{lang}=useGuideLang(),speak=useSpeakText(); const [letter,setLetter]=useState<string|null>(null),[place,setPlace]=useState<PlaceId|null>(null);
 const active=place?[place]:letter?params.places[letter]??[]:[];
 const tongue=tongues[active[0]],stop=letter?stopRows.find(row=>row.includes(letter)):undefined,column=stop&&letter?stop.indexOf(letter):-1;
 const voiced=column>=2,aspirated=column===1||column===3,nasal=column===4||letter==='ं';
 const pickPlace=(id:PlaceId)=>{setPlace(id);setLetter(null);onInteracted();};
 return <View style={{gap:12}}><View style={{width:'100%',aspectRatio:1.2,backgroundColor:c.surface}}><Svg width="100%" height="100%" viewBox="0 0 300 250" accessibilityLabel={lang==='hi'?'मुँह का पार्श्व चित्र':'Side view of the mouth'}>
 <Path d="M65 232 L66 164 C28 117 51 37 113 24 C169 11 209 40 209 76 L232 110 L217 119 L230 137 L220 149 L226 163 C220 182 197 186 175 183 L174 232" fill={c.paper} stroke={c.ink2} strokeWidth={3}/>
 <Path d="M80 208 L109 164 Q135 137 207 139 M99 188 Q135 160 204 153 M123 87 Q163 91 203 122" stroke={c.ink3} strokeWidth={2} fill="none"/>
 {tongue?<Path testID="articulation-tongue" d={tongue} stroke={c.actionText} strokeWidth={6} fill="none" strokeLinecap="round"/>:null}
 {aspirated?<Path d="M233 145 L282 145 M270 137 L282 145 L270 153" stroke={c.indigo} strokeWidth={4} fill="none"/>:null}
 {voiced?<Path d="M72 190 Q80 180 88 190 Q96 200 104 190 M72 204 Q80 194 88 204 Q96 214 104 204" stroke={c.indigo} strokeWidth={3} fill="none"/>:null}
 {nasal?<Path d="M182 94 Q216 71 249 85 M239 77 L249 85 L237 90" stroke={c.indigo} strokeWidth={4} fill="none"/>:null}
 {regions.map(region=><Circle key={region.id} cx={region.x} cy={region.y} r={13} fill={active.includes(region.id)?c.action:c.surface} stroke={active.includes(region.id)?c.actionText:c.lineStrong} strokeWidth={3} onPress={()=>pickPlace(region.id)} accessibilityLabel={params.place_names[region.id]?.[lang]??region[lang]}/>)}
 </Svg></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{regions.map(region=><Button key={region.id} label={params.place_names[region.id]?.[lang]??region[lang]} selected={active.includes(region.id)} onPress={()=>pickPlace(region.id)}/>)}</View>
 <Label>{lang==='hi'?'स्थान और गति का सांकेतिक चित्र':'Schematic cue to place and movement'}</Label>
 {column>=0?<View accessibilityLiveRegion="polite" style={{gap:4}}><Label>{lang==='hi'?(voiced?'घोष: गले में कम्पन':'अघोष: गले में कम्पन नहीं'):(voiced?'Voiced: throat vibration':'Unvoiced: no throat vibration')}</Label><Label>{lang==='hi'?(aspirated?'महाप्राण: हवा का झोंका':'अल्पप्राण: अतिरिक्त झोंका नहीं'):(aspirated?'Aspirated: a puff of air':'Unaspirated: no extra puff')}</Label>{nasal?<Label>{lang==='hi'?'अनुनासिक: हवा नाक से भी':'Nasal: air also passes through the nose'}</Label>:null}</View>:null}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{params.letters.map(sa=><Button key={sa} label={sa} selected={letter===sa||!!place&&params.places[sa]?.includes(place)} onPress={()=>{setLetter(sa);setPlace(null);onInteracted();speak(sa);}}><Sa sa={sa} iast={params.iast[sa]} size={30}/></Button>)}</View>
 {active.map(id=>{const name=params.place_names[id];return name?<View key={id}><Sa sa={name.sa} iast={name.iast} size={22}/><Label>{name[lang]}</Label></View>:null;})}</View>;
}
