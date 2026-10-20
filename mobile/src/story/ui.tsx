import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useGuideLang } from '../hooks/useGuide';
import { useTypeScale } from '../hooks/useTypeScale';
import { useStoryTheme } from './theme';
export function Button({label,onPress,disabled=false,selected=false,primary=false,children,style}: {label:string; onPress:()=>void; disabled?:boolean; selected?:boolean; primary?:boolean; children?:React.ReactNode; style?:StyleProp<ViewStyle>}) {
 const c=useStoryTheme(), {sized}=useTypeScale();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={[{minHeight:48,padding:12,borderWidth:1,borderColor:selected?c.actionText:c.lineStrong,backgroundColor:primary?c.action:c.surface,opacity:disabled?.45:1},style]}>{children??<Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),color:primary?c.white:c.ink}}>{label}</Text>}</Pressable>;
}
export function Panel({children}: {children:React.ReactNode}) { const c=useStoryTheme(); return <View style={{padding:14,gap:10,borderWidth:1,borderColor:c.line,backgroundColor:c.surface}}>{children}</View>; }
export function Label({children}: {children:React.ReactNode}) {const c=useStoryTheme(),{sized}=useTypeScale();return <Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(14),color:c.ink3}}>{children}</Text>;}
/** A small control for the lesson header: 36 high, 48 to touch. */
export function Chip({label,onPress,children,disabled=false,selected=false}: {label:string; onPress:()=>void; children:React.ReactNode; disabled?:boolean; selected?:boolean}) {
 const c=useStoryTheme();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} hitSlop={6} style={{minWidth:36,height:36,paddingHorizontal:8,alignItems:'center',justifyContent:'center',borderWidth:selected?2:1,borderColor:selected?c.actionText:c.lineStrong,backgroundColor:c.surface,opacity:disabled?.5:1}}>{children}</Pressable>;
}
export function BulbIcon({color,size=20}: {color:string; size?:number}) {
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="square"><Path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/><Path d="M9.5 19h5M10.5 21.5h3"/></Svg>;
}
export function SkipIcon({color,size=20}: {color:string; size?:number}) {
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="miter"><Path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/></Svg>;
}
export function SpeakerIcon({color,size=20}: {color:string; size?:number}) {
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="miter"><Path d="M4 9.5v5h4l5 4v-13l-5 4z"/><Path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/></Svg>;
}
export function useCopy(){return useGuideLang().lang==='hi';}
