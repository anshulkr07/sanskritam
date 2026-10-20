import { usePanini, setPanini } from './preferences';
import React from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import { useGuideLang } from '../hooks/useGuide';
import { useStoryFlag, setStoryFlag } from './flags';
import { useStoryTheme, setStoryAppearance } from './theme';
export default function StorySettings() {
 const panini=usePanini(); const flag = useStoryFlag(), c=useStoryTheme(); const {lang}=useGuideLang(); const hi=lang==='hi';
 return <View style={{padding:16, backgroundColor:c.paper, gap:12}}>
 <Text style={{fontFamily:'Mukta_700Bold', color:c.ink,fontSize:20}}>{hi?'सीखें':'Learn'}</Text>
 <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontFamily:'Mukta_400Regular',color:c.ink,fontSize:17}}>{hi?'नया सीखें आज़माएँ (पूर्वावलोकन)':'Try the new Learn (preview)'}</Text><Switch trackColor={{false:c.lineStrong,true:c.action}} thumbColor={c.white} accessibilityLabel={hi?'नया सीखें आज़माएँ':'Try the new Learn (preview)'} value={flag} onValueChange={v => { void setStoryFlag(v); }}/></View>
 <Text style={{fontFamily:'Mukta_600SemiBold',color:c.ink}}>{hi?'रूप':'Appearance'}</Text>
 <View style={{flexDirection:'row',gap:8}}>{(['light','dark'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:c.dark===(value==='dark')}} accessibilityLabel={value==='light'?(hi?'हल्का':'Light'):(hi?'गहरा':'Dark')} onPress={()=>{void setStoryAppearance(value);}} style={{padding:12,minHeight:44,borderWidth:1,borderColor:c.dark===(value==='dark')?c.actionText:c.lineStrong}}><Text style={{fontFamily:'Mukta_600SemiBold',color:c.ink}}>{value==='light'?(hi?'हल्का':'Light'):(hi?'गहरा':'Dark')}</Text></Pressable>)}</View>
 <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontFamily:'Mukta_400Regular',color:c.ink,fontSize:17}}>{hi?'पाणिनि की गहराई':'Pāṇini depth'}</Text><Switch trackColor={{false:c.lineStrong,true:c.action}} thumbColor={c.white} accessibilityLabel={hi?'पाणिनि की गहराई':'Pāṇini depth'} value={panini} onValueChange={v=>{void setPanini(v);}}/></View>
 </View>;
}
