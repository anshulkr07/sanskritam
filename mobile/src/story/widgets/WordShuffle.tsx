import React,{useMemo,useState} from 'react';
import {View} from 'react-native';
import {useGuideLang} from '../../hooks/useGuide';
import {Bi,Sa} from '../text';
import {useStoryTheme} from '../theme';
import {Button,Label,Panel} from '../ui';
import {naturalOrder,naturalOrders,shuffled,swapWords} from './logic';
import type {WordShuffleBuilt} from '../types';
/** Swap words around and watch the meaning stay: the endings, not the order, say who does what. */
export default function WordShuffle({params,onInteracted}:{params:WordShuffleBuilt;onInteracted:()=>void}){
 const {lang}=useGuideLang(),hi=lang==='hi',c=useStoryTheme(),words=params.words,notFirst=params.not_first??[];
 const total=useMemo(()=>naturalOrders(words,notFirst).length,[words,notFirst]);
 const [order,setOrder]=useState(words),[selected,setSelected]=useState<number|null>(null),[seen,setSeen]=useState<string[]>([words.join('|')]);
 const natural=naturalOrder(order,notFirst),opener=notFirst.includes(order[0])?order[0]:null;
 const move=(next:string[])=>{setOrder(next);setSelected(null);if(naturalOrder(next,notFirst)&&!seen.includes(next.join('|')))setSeen(old=>[...old,next.join('|')]);onInteracted();};
 const tap=(i:number)=>{if(selected===null)setSelected(i);else if(selected===i)setSelected(null);else move(swapWords(order,selected,i));};
 return <View style={{gap:12}}>
  <Panel><Label>{hi?'अर्थ वही रहता है':'The meaning stays'}</Label><Bi value={params.meaning}/></Panel>
  <Label>{selected===null?(hi?'एक शब्द छुइए, फिर दूसरा: दोनों की जगह बदल जाएगी।':'Tap a word, then another: they swap places.'):(hi?'अब जिस शब्द से जगह बदलनी है उसे छुइए।':'Now tap the word to swap it with.')}</Label>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}} accessibilityLiveRegion="polite">{order.map((word,i)=>
   <Button key={word} label={word+(selected===i?(hi?', चुना हुआ':', selected'):'')} selected={selected===i} onPress={()=>tap(i)} style={selected===i?{borderWidth:2,backgroundColor:c.paper}:undefined}><Sa sa={word} iast={params.iast[word]} size={28}/></Button>)}</View>
  <Panel>{natural
   ?<Label>✓ {hi?'यह क्रम स्वाभाविक है और अर्थ वही है।':'This order is natural and the meaning is the same.'}</Label>
   :<><Label>× {hi?'यह क्रम स्वाभाविक नहीं है।':'This order is not natural.'}</Label><Bi value={{en:`{{${opener}}} follows the word it joins; it does not begin a sentence.`,hi:`{{${opener}}} अपने जुड़ने वाले शब्द के बाद आता है; वह वाक्य का आरम्भ नहीं करता।`}}/></>}
   <Label>{hi?'देखे गए स्वाभाविक क्रम: ':'Natural orders seen: '}{seen.length}/{total}</Label></Panel>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   <Button label={hi?'मिला दीजिए':'Shuffle'} onPress={()=>move(shuffled(order,Math.random))}/>
   <Button label={hi?'पहले जैसा':'Back to the sentence'} disabled={order.join('|')===words.join('|')} onPress={()=>{setOrder(words);setSelected(null);}}/></View>
  <Label>{hi?'हर शब्द का प्रत्यय बताता है कि कौन क्या करता है, इसलिए क्रम स्वतन्त्र है।':'Each word\'s ending says who does what, so the order is free.'}</Label>
 </View>;
}
