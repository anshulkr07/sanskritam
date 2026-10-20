import {resolvePicture,actPicture} from '../artwork';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ScrollView,View,Text,Pressable,useWindowDimensions} from 'react-native';
import Svg,{Line,Rect} from 'react-native-svg';
import {useFocusEffect,useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {RootStackParamList} from '../../navigation/types';
import {useGuideLang} from '../../hooks/useGuide';
import {useTypeScale} from '../../hooks/useTypeScale';
import {useCourse,refreshCourse} from '../course';
import {useStoryTheme} from '../theme';
import {Bi,Sa} from '../text';
import {Button,Label,Panel,useCopy} from '../ui';
import {lessonSummaries,getReview} from '../api';
import {currentContext,courseComplete,testOutLabel,unitStops,allLeaves,recovered} from '../selectors';
import {useStoryLesson} from '../useLesson';
import {startTestOut} from '../session';
import Picture from '../cards/Picture';
import type {StoryIndex,StoryState,StoryLesson,LessonSummary} from '../types';
export default function StoryHome({autoStart=true}:{autoStart?:boolean}={}){
 const {index,state,error}=useCourse(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),c=useStoryTheme(),hi=useCopy();
 const summary=index?lessonSummaries(index).find(l=>l.id===state?.current?.lesson_id):null;
 const {lesson}=useStoryLesson(summary);const [due,setDue]=useState<number|null>(null),autoStarted=useRef(false);
 useFocusEffect(useCallback(()=>{let active=true;void getReview().then(review=>{if(active)setDue(review.due_count);}).catch(()=>{});return()=>{active=false;};},[state?.finished.join('|')]));
 useEffect(()=>{if(autoStart&&state?.current?.role==='prologue'&&!autoStarted.current){autoStarted.current=true;nav.navigate('StoryLesson',{lessonId:state.current.lesson_id!});}},[autoStart,state?.current?.role,nav]);
 if(!index||!state)return <SafeAreaView style={{flex:1,padding:16,backgroundColor:c.paper}}><Label>{hi?'कहानी लोड हो रही है…':'Loading the story…'}</Label>{error?<Button label={hi?'फिर कोशिश करें':'Try again'} onPress={()=>{void refreshCourse();}}/>:null}</SafeAreaView>;
 const open=(lessonId:string,testOut=false)=>{if(testOut)startTestOut(lessonId);nav.navigate('StoryLesson',{lessonId});};
 return <StoryHomeView index={index} state={state} lesson={lesson} summary={summary} due={due} onLesson={open} onMap={()=>nav.navigate('StoryMap')} onLeaves={()=>nav.navigate('StoryLeaves')} onGhosts={()=>nav.navigate('StoryGhosts')} onReview={()=>nav.navigate('StoryReview')} onCast={()=>nav.navigate('StoryCast')} onLibrary={()=>nav.navigate('LearnLibrary')}/>;
}
export function StoryHomeView({index,state,lesson,summary,due=null,onLesson,onMap,onLeaves,onGhosts,onReview,onCast,onLibrary}:{index:StoryIndex;state:StoryState;lesson?:StoryLesson|null;summary?:LessonSummary|null;due?:number|null;onLesson:(id:string,testOut?:boolean)=>void;onMap:()=>void;onLeaves:()=>void;onGhosts:()=>void;onReview:()=>void;onCast:()=>void;onLibrary:()=>void}){
 const c=useStoryTheme(),hi=useCopy(),{lang}=useGuideLang(),{sized}=useTypeScale(),{width}=useWindowDimensions();
 const context=currentContext(index,state),unit=context?.unit,act=context?.act,complete=courseComplete(index,state),lastAct=index.acts.at(-1);
 const previous=index.acts.flatMap(a=>a.parts.flatMap(p=>p.units)).filter(u=>state.units[u.id]?.ghost_freed).at(-1);
 const story=lesson?.cards.find(card=>card.kind==='story'),spoken=lesson?.cards.find(card=>card.kind==='story'&&card.lines.some(l=>l.sa||l.text));
 const line=spoken?.kind==='story'?spoken.lines[0]:null,speaker=index.characters.find(ch=>ch.id===line?.speaker);
 const hero=complete?previous?.ghost?.freed_image??(lastAct?actPicture(lastAct):null):state.coming_soon?previous?.ghost?.freed_image:story?.image??(act?actPicture(act):null);
 const stops=unit?unitStops(unit):[],at=stops.findIndex(l=>l.id===state.current?.lesson_id),scene=unit?.lessons.findIndex(l=>l.id===summary?.id)??-1;
 const count=allLeaves(index).filter(l=>recovered(index,state,l.id)).length;
 return <SafeAreaView style={{flex:1,backgroundColor:c.paper}} edges={['top']}><ScrollView contentContainerStyle={{paddingBottom:24}}>
 <View style={{backgroundColor:c.paper}}><Picture picture={hero}/>{!hero?<View style={{height:width*3/4,padding:24,justifyContent:'center'}}><Sa sa={index.course?.title_sa} iast={index.course?.title_iast}/><Bi value={index.course?.title} size={25}/></View>:null}
 <View style={{position:'absolute',top:10,left:12,right:12,flexDirection:'row',justifyContent:'space-between',gap:8}}><View style={{flex:1,alignSelf:'flex-start',padding:8,backgroundColor:c.surface}}>{complete?<><Label>{hi?'✓ कथा पूरी':'✓ COMPLETE'}</Label><Bi value={index.course?.title} size={15}/></>:<><Label>{hi?'अंक ':'ACT '}{act?.n??1}</Label>{act?<Bi value={act.title} size={15}/>:null}</>}</View><Button label={hi?'मानचित्र':'Map'} onPress={onMap}/></View>
 </View>
 {line?<View style={{marginHorizontal:16,marginTop:-22,padding:12,borderWidth:1,borderColor:c.line,backgroundColor:c.surface,gap:4}}>{speaker?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}>{resolvePicture(speaker.portrait)?.delivered?<View style={{width:42}}><Picture picture={speaker.portrait} compact/></View>:null}<View style={{flex:1}}><Sa sa={speaker.name_sa} iast={speaker.name_iast} size={18}/></View></View>:null}<Sa sa={line.sa} iast={line.iast} size={23}/><Bi value={line.gloss??line.text} size={15}/></View>:null}
 {unit?<Pressable accessibilityRole="button" accessibilityLabel={hi?'इकाई का मार्ग; मानचित्र खोलें':'Unit road; open journey map'} onPress={onMap} style={{padding:16,backgroundColor:c.surface,borderBottomWidth:1,borderColor:c.line,gap:6}}><Label>{hi?'इकाई ':'UNIT '}{context.unitNumber}/{context.unitTotal} · {unit.title[lang]}</Label><Sa sa={unit.title_sa} roman={false} size={18}/><Svg width="100%" height={54} viewBox={'0 0 '+Math.max(width-32,1)+' 54'} accessibilityElementsHidden><Line x1={12} y1={24} x2={width-64} y2={24} stroke={c.lineStrong} strokeWidth={3}/>{stops.map((stop,i)=>{const x=12+i*(width-76)/Math.max(stops.length,1),done=state.finished.includes(stop.id),current=stop.id===state.current?.lesson_id;return <Rect key={stop.id} x={x-(current?9:5)} y={24-(current?9:5)} width={current?18:10} height={current?18:10} rotation={45} originX={x} originY={24} fill={done?c.done:current?c.action:c.surface} stroke={done?c.done:c.lineStrong} strokeWidth={2}/>;})}<Rect x={width-60} y={15} width={18} height={18} fill={state.units[unit.id]?.ghost_freed?c.indigo:c.surface} stroke={c.indigo} strokeWidth={2}/></Svg><View style={{flexDirection:'row',gap:3}}>{stops.map((stop,i)=><View key={stop.id} style={{flex:1}}><Label>{state.finished.includes(stop.id)?'✓ ':''}{i<unit.lessons.length?String(i+1):(hi?'जाँच':'Check')}</Label></View>)}</View></Pressable>:null}
 <View style={{padding:16,gap:8}}>{state.coming_soon?<><Bi value={{en:'The next part of the story is being written.',hi:'कहानी का अगला भाग लिखा जा रहा है।'}} size={24}/>{previous?.ghost?<Sa sa={previous.ghost.name_sa} iast={previous.ghost.name_iast}/>:null}<Button primary label={hi?'दोहराएँ':'Review what you learned'} onPress={onReview}/></>:complete?<><Sa sa={index.course?.title_sa} iast={index.course?.title_iast} size={28}/><Bi value={{en:'The story is complete. Every ghost is free and every leaf is recovered.',hi:'कहानी पूरी हुई। हर भूत मुक्त है और हर पत्र मिल गया है।'}} size={20}/><Bi value={{en:'Read any tale again, revisit the prologue, or review what you learned.',hi:'कोई भी कथा फिर पढ़ें, कथा का आरम्भ देखें, या जो सीखा उसे दोहराएँ।'}} size={16}/><Button primary label={hi?'दोहराएँ':'Review what you learned'} onPress={onReview}/>{index.course?.prologue?<Button label={hi?'कथा फिर पढ़ें':'Read the prologue again'} onPress={()=>onLesson(index.course!.prologue!.id)}/>:null}</>:summary?<><Label>{summary.template==='prologue'?(hi?'कथा का आरम्भ':'PROLOGUE'):summary.template==='check'?(hi?'इकाई की जाँच':'UNIT CHECK'):hi?'दृश्य '+(scene+1)+' / '+unit?.lessons.length:'SCENE '+(scene+1)+' OF '+unit?.lessons.length} · {summary.minutes} {hi?'मिनट':'MIN'}</Label><Sa sa={summary.title_sa} iast={summary.title_iast} size={28}/><Bi value={summary.title} size={20}/>{unit?<Bi value={unit.episode.summary} size={16}/>:null}<Button primary label={hi?'कहानी आगे बढ़ाएँ':'Continue the story'} onPress={()=>onLesson(summary.id)}/>{unit?.check&&state.current?.unit_id===unit.id?<Button label={testOutLabel(act?.n)[hi?'hi':'en']} onPress={()=>onLesson(unit.check!.id,true)}/>:null}</>:null}</View>
 <View style={{paddingHorizontal:16,flexDirection:'row',gap:8}}>{[{label:(hi?'पत्र ':'Leaves ')+count+'/7',sub:hi?'खोई हुई पुस्तक':'the lost book',press:onLeaves},{label:(hi?'मुक्त ':'Freed ')+state.ghosts_freed.length,sub:hi?'भूत':'ghosts',press:onGhosts},{label:(hi?'दोहराएँ ':'Review ')+(due??'—'),sub:hi?'आज के लिए':'due today',press:onReview}].map(tile=><Button key={tile.sub} label={tile.label} onPress={tile.press} style={{flex:1,padding:10}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(16),color:c.ink}}>{tile.label}</Text><Label>{tile.sub}</Label></Button>)}</View>
 <View style={{paddingHorizontal:16,paddingTop:12,flexDirection:'row',gap:8}}><Button label={hi?'पात्र':'Meet the cast'} onPress={onCast} style={{flex:1}}/><Button label={hi?'पुस्तकालय':'Library'} onPress={onLibrary} style={{flex:1}}/></View>
 </ScrollView></SafeAreaView>;
}
export {default as JourneyMap} from './JourneyMap';
