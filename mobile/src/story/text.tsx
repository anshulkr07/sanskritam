import React, { createContext, useContext } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useGuideLang } from '../hooks/useGuide';
import { useTypeScale } from '../hooks/useTypeScale';
import type { Bi as Bilingual } from './types';
import { useStoryTheme } from './theme';
import { parseMarkup } from './markup';
import { SpeakButton, useClip } from './audio';
export const RomanContext = createContext(true);
export function Bi({value, size=17, style}: {value?: Bilingual | null; size?:number; style?:StyleProp<TextStyle>}) {
 const {lang}=useGuideLang(), c=useStoryTheme(), {sized}=useTypeScale();
 return <Text selectable style={[{fontFamily:'Mukta_400Regular',fontSize:sized(size),lineHeight:sized(size*1.55),color:c.ink},style]}>{parseMarkup(value?.[lang] ?? value?.en ?? '').map((run,i)=><Text key={i} style={{fontFamily:run.sanskrit?'TiroDevanagariSanskrit_400Regular':run.bold?'Mukta_700Bold':'Mukta_400Regular',fontWeight:run.bold?'bold':undefined}}>{run.text}</Text>)}</Text>;
}
export function Sa({sa, iast, size=26, roman=true, listen=false}: {sa?:string|null; iast?:string|null; size?:number; roman?:boolean; listen?:boolean}) {
 const c=useStoryTheme(), visible=useContext(RomanContext), {sized}=useTypeScale(), clip=useClip(listen?sa:undefined);
 if(!sa) return null;
 const text=<View style={clip?{flex:1}:undefined}><Text selectable style={{fontFamily:'TiroDevanagariSanskrit_400Regular',fontSize:sized(size),lineHeight:sized(size*1.75),color:c.ink}}>{sa}</Text>{roman && visible && iast?<Text selectable style={{fontFamily:'Mukta_400Regular',fontSize:sized(Math.max(12,size*.57)),lineHeight:sized(Math.max(18,size*.9)),color:c.ink3}}>{iast}</Text>:null}</View>;
 return clip?<View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}>{text}<SpeakButton url={clip} text={sa}/></View>:text;
}
