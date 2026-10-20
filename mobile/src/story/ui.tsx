import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useGuideLang } from '../hooks/useGuide';
import { useTypeScale } from '../hooks/useTypeScale';
import { useStoryTheme } from './theme';
export function Button({label,onPress,disabled=false,selected=false,primary=false,children,style}: {label:string; onPress:()=>void; disabled?:boolean; selected?:boolean; primary?:boolean; children?:React.ReactNode; style?:StyleProp<ViewStyle>}) {
 const c=useStoryTheme(), {sized}=useTypeScale();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={[{minHeight:48,padding:12,borderWidth:1,borderColor:selected?c.actionText:c.lineStrong,backgroundColor:primary?c.action:c.surface,opacity:disabled?.45:1},style]}>{children??<Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),color:primary?c.white:c.ink}}>{label}</Text>}</Pressable>;
}
export function Panel({children}: {children:React.ReactNode}) { const c=useStoryTheme(); return <View style={{padding:14,gap:10,borderWidth:1,borderColor:c.line,backgroundColor:c.surface}}>{children}</View>; }
export function Label({children}: {children:React.ReactNode}) {const c=useStoryTheme(),{sized}=useTypeScale();return <Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(14),color:c.ink3}}>{children}</Text>;}
export function useCopy(){return useGuideLang().lang==='hi';}
