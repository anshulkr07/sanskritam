import React,{useRef,useState} from 'react';
import {View,Pressable,Text} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import {useStoryTheme} from '../theme';
import {Bi,Sa} from '../text';
import {Button,Label,Panel} from '../ui';
import {rhythmResult} from './logic';
import type {RhythmTapperBuilt} from '../types';
export default function RhythmTapper({params,onInteracted}:{params:RhythmTapperBuilt;onInteracted:()=>void}){
 const [line,setLine]=useState(0),[pattern,setPattern]=useState(''),held=useRef(false),{lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale();
 const scan=params.scan[line];if(!scan)return null;const finished=pattern.length===scan.syllables.length;
 const add=(weight:string)=>{setPattern(old=>old.length<scan.syllables.length?old+weight:old);onInteracted();};
 return <View style={{gap:12}}>{params.scan.length>1?<Label>{(hi?'पंक्ति ':'Line ')+(line+1)+' / '+params.scan.length}</Label>:null}<Sa sa={scan.line} iast={params.iast[scan.line]} size={22}/><Panel>{!finished?<Label>{(hi?'अक्षर ':'Syllable ')+(pattern.length+1)+' / '+scan.syllables.length}</Label>:null}{!finished?<Sa sa={scan.syllables[pattern.length]} iast={params.iast[scan.syllables[pattern.length]]} size={48}/>:null}<Label>{pattern.split('').map(w=>w==='L'?'◡':'—').join(' ')}</Label></Panel>
 <Pressable accessibilityRole="button" accessibilityLabel={hi?'लघु के लिए छुएँ; गुरु के लिए 350 मिलीसेकंड से अधिक दबाएँ':'Tap for light; hold over 350 milliseconds for heavy'} disabled={finished} delayLongPress={351} onPressIn={()=>{held.current=false;}} onLongPress={()=>{held.current=true;add('G');}} onPress={()=>{if(!held.current)add('L');}} style={{padding:20,minHeight:80,backgroundColor:c.action,opacity:finished?.45:1}}><Text style={{color:c.white,fontFamily:'Mukta_600SemiBold',fontSize:sized(18)}}>{hi?'छुएँ = लघु  ·  दबाकर रखें = गुरु':'Tap = light  ·  Hold = heavy'}</Text></Pressable>
 <Label>{hi?'या बटन दबाएँ:':'Or use the buttons:'}</Label>
 <View style={{flexDirection:'row',gap:8}}><Button label={hi?'◡ लघु':'◡ Light'} disabled={finished} onPress={()=>add('L')}/><Button label={hi?'— गुरु':'— Heavy'} disabled={finished} onPress={()=>add('G')}/></View>
 <Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={!pattern} onPress={()=>setPattern(p=>p.slice(0,-1))}/>
 {finished?<View accessibilityLiveRegion="polite" style={{gap:10}}><Label>{rhythmResult(scan.weights,pattern)?(hi?'✓ लय मिल गई':'✓ Pattern matched'):(hi?'फिर कोशिश करें':'Try again')}</Label><Label>{scan.weights.split('').map(w=>w==='L'?'◡':'—').join(' ')}</Label>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{scan.syllables.map((syllable,i)=><View key={i} style={{padding:10,borderWidth:1,borderColor:pattern[i]===scan.weights[i]?c.done:c.wrongInk,minWidth:64,width:140,maxWidth:'100%',gap:4}}><Label>{i+1} {pattern[i]===scan.weights[i]?'✓':'×'}</Label><Sa sa={syllable} iast={params.iast[syllable]} size={26} listen/><Label>{scan.weights[i]==='L'?(hi?'लघु · १ मात्रा':'Light · 1 mātrā'):(hi?'गुरु · २ मात्राएँ':'Heavy · 2 mātrās')}</Label>{scan.reasons?.[i]?<Bi value={scan.reasons[i]} size={14}/>:null}<View style={{flexDirection:'row',gap:3}}>{Array.from({length:scan.weights[i]==='L'?1:2},(_,j)=><View key={j} style={{width:22,height:10,backgroundColor:c.indigo}}/>)}</View>{pattern[i]!==scan.weights[i]?<Label>{hi?'आपने चुना: ':'You chose: '}{pattern[i]==='L'?'◡':'—'}</Label>:null}</View>)}</View>
 <Label>{hi?'अक्षर: ':'Syllables: '}{scan.syllables.length} · {hi?'मात्राएँ: ':'Mātrās: '}{[...scan.weights].reduce((n,w)=>n+(w==='G'?2:1),0)}</Label>{scan.metre_sa?<Panel><Label>{hi?'इंजन से मिला इस नमूने का लय-पैटर्न':'Engine pattern match for this sample'}</Label><Sa sa={scan.metre_sa} roman={false}/><Label>{hi?'केवल अंश का मेल पूरे श्लोक के छन्द की पुष्टि नहीं करता।':'A fragment match alone does not identify a whole verse’s metre.'}</Label></Panel>:null}<Button label={hi?'फिर से':'Again'} onPress={()=>setPattern('')}/>{line+1<params.scan.length?<Button label={hi?'अगली पंक्ति':'Next line'} onPress={()=>{setLine(i=>i+1);setPattern('');}}/>:null}</View>:null}
 </View>;
}
