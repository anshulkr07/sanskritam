import React,{useRef,useState} from 'react';
import {View,Pressable,Text} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import {useStoryTheme} from '../theme';
import {Sa} from '../text';
import {Button,Label,Panel} from '../ui';
import {rhythmResult} from './logic';
import type {RhythmTapperBuilt} from '../types';
export default function RhythmTapper({params,onInteracted}:{params:RhythmTapperBuilt;onInteracted:()=>void}){
 const [line,setLine]=useState(0),[pattern,setPattern]=useState(''),held=useRef(false),{lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),{sized}=useTypeScale();
 const scan=params.scan[line];if(!scan)return null;const finished=pattern.length===scan.syllables.length;
 const add=(weight:string)=>{setPattern(old=>old.length<scan.syllables.length?old+weight:old);onInteracted();};
 return <View style={{gap:12}}><Label>{line+1}/{params.scan.length}</Label><Sa sa={scan.line} iast={params.iast[scan.line]} size={22}/><Panel>{!finished?<Sa sa={scan.syllables[pattern.length]} iast={params.iast[scan.syllables[pattern.length]]} size={48}/>:null}<Label>{pattern.split('').map(w=>w==='L'?'◡':'—').join(' ')}</Label></Panel>
 <Pressable accessibilityRole="button" accessibilityLabel={hi?'लघु के लिए छुएँ; गुरु के लिए 350 मिलीसेकंड से अधिक दबाएँ':'Tap for light; hold over 350 milliseconds for heavy'} disabled={finished} delayLongPress={351} onPressIn={()=>{held.current=false;}} onLongPress={()=>{held.current=true;add('G');}} onPress={()=>{if(!held.current)add('L');}} style={{padding:20,minHeight:80,backgroundColor:c.action,opacity:finished?.45:1}}><Text style={{color:c.white,fontFamily:'Mukta_600SemiBold',fontSize:sized(18)}}>{hi?'छुएँ / दबाकर रखें':'Tap / hold'}</Text></Pressable>
 <View style={{flexDirection:'row',gap:8}}><Button label={hi?'◡ लघु':'◡ Light'} disabled={finished} onPress={()=>add('L')}/><Button label={hi?'— गुरु':'— Heavy'} disabled={finished} onPress={()=>add('G')}/></View>
 <Button label={hi?'अंतिम हटाएँ':'Backspace'} disabled={!pattern} onPress={()=>setPattern(p=>p.slice(0,-1))}/>
 {finished?<View accessibilityLiveRegion="polite"><Label>{rhythmResult(scan.weights,pattern)?(hi?'✓ लय मिल गई':'✓ Pattern matched'):(hi?'फिर कोशिश करें':'Try again')}</Label><Label>{scan.weights.split('').map(w=>w==='L'?'◡':'—').join(' ')}</Label>{scan.metre?<Label>{scan.metre}</Label>:null}<Button label={hi?'फिर से':'Again'} onPress={()=>setPattern('')}/>{line+1<params.scan.length?<Button label={hi?'अगली पंक्ति':'Next line'} onPress={()=>{setLine(i=>i+1);setPattern('');}}/>:null}</View>:null}
 </View>;
}
