import {finishLesson,type FinishResult} from '../finish';
import {consumeTestOut} from '../session';
import type {PracticeProgress} from '../cards/Practice';
import {RomanContext} from '../text';
import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/types';
import {LessonPlayer} from '../../screens/LearnV2Lesson';
import {useGuideLang} from '../../hooks/useGuide';
import {useCourse,refreshCourse} from '../course';
import {getLesson,lessonSummaries} from '../api';
import {useStoryTheme} from '../theme';
import {usePanini} from '../preferences';
import {Button,Label} from '../ui';
import {Bi} from '../text';
import type {StoryLesson as Lesson} from '../types';
import StoryCardView from '../cards';
export const startCards=new Map<string,string>();
export default function StoryLessonScreen({route,navigation}:NativeStackScreenProps<RootStackParamList,'StoryLesson'>){
 const [testOut]=useState(()=>consumeTestOut(route.params.lessonId));
 const {index,state}=useCourse(),c=useStoryTheme(),{lang,setLang}=useGuideLang(); const [lesson,setLesson]=useState<Lesson|null>(null),[error,setError]=useState(false),[reload,setReload]=useState(0);
 const summary=index?lessonSummaries(index).find(l=>l.id===route.params.lessonId):null;
 useEffect(()=>{let alive=true;setLesson(null);setError(false); if(summary)void getLesson(summary.id,summary.hash).then(l=>{if(alive)setLesson(l);},()=>{if(alive)setError(true);});return()=>{alive=false;};},[summary?.id,summary?.hash,reload]);
 if(!lesson)return <View style={{flex:1,padding:16,gap:12,backgroundColor:c.paper}}><Label>{error?(lang==='hi'?'पाठ लोड नहीं हुआ।':'Could not load lesson.'):(lang==='hi'?'पाठ लोड हो रहा है…':'Loading lesson…')}</Label>{error?<Button label={lang==='hi'?'फिर कोशिश करें':'Try again'} onPress={()=>{void refreshCourse().then(()=>setReload(r=>r+1));}}/>:null}<Button label={lang==='hi'?'वापस':'Back'} onPress={()=>navigation.goBack()}/></View>;
 return <StoryLessonPlayer key={lesson.id} lesson={lesson} characters={index?.characters??[]} sceneNumber={id=>{const unit=index?.acts.flatMap(a=>a.parts.flatMap(p=>p.units)).find(u=>u.lessons.some(l=>l.id===id));const n=unit?.lessons.findIndex(l=>l.id===id);return n==null||n<0?null:n+1;}} testOutUnitId={testOut?state?.current?.unit_id??undefined:undefined} onFinished={result=>{if(result.unitId)navigation.replace('StoryUnitEnd',{unitId:result.unitId,leafId:result.leafId,lessonId:lesson.id});else if(lesson.template==='prologue'&&result.after?.current?.lesson_id)navigation.replace('StoryLesson',{lessonId:result.after.current.lesson_id});else navigation.goBack();}} onClose={()=>navigation.goBack()} onScene={(id,cardId)=>{startCards.set(id,cardId);navigation.push('StoryLesson',{lessonId:id});}}/>;
}
export function StoryLessonPlayer({lesson,characters=[],sceneNumber=()=>null,onClose,onScene=()=>{},onComplete,onFinished,testOutUnitId}:{lesson:Lesson;characters?:import('../types').Character[];sceneNumber?:(id:string)=>number|null;onClose:()=>void;onScene?:(id:string,cardId:string)=>void;onComplete?:(progress:Record<string,PracticeProgress>)=>Promise<void>;onFinished?:(result:FinishResult)=>void;testOutUnitId?:string}){
 const c=useStoryTheme(),panini=usePanini(),{lang,setLang}=useGuideLang(); const cards=lesson.cards.filter(c=>panini||c.depth!=='panini');
 const [progress,setProgress]=useState<Record<string,PracticeProgress>>({}),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState(false);
 const [index,setIndex]=useState(()=>Math.max(0,cards.findIndex(c=>c.id===startCards.get(lesson.id))));
 useEffect(()=>{startCards.delete(lesson.id);},[lesson.id]);
 const canAdvance=(i:number)=>{const card=cards[i];return card.kind!=='practice'||!!progress[card.id]&&(!card.gate||progress[card.id].solved||progress[card.id].latest==='unsure');};
 const complete=async()=>{if(busy||cards.some((_,i)=>!canAdvance(i)))return;setBusy(true);setSaveError(false);try{if(onComplete){await onComplete(progress);onClose();}else{const result=await finishLesson(lesson.id,progress,testOutUnitId);onFinished?onFinished(result):onClose();}}catch{setSaveError(true);setBusy(false);}};
 return <LessonPlayer busy={busy} title={lesson.title[lang]} index={Math.min(index,cards.length-1)} total={cards.length} onIndexChange={setIndex} onFinish={()=>{void complete();}} onClose={onClose} hi={lang==='hi'} palette={c} canAdvance={canAdvance}
 header={<View style={{gap:4}}><Button label={lang==='hi'?'English':'हिन्दी'} onPress={()=>setLang(lang==='hi'?'en':'hi')}/>{lesson.template==='scene' && index<cards.findIndex(c=>c.kind==='practice')?<Button label={lang==='hi'?'यह जानता हूँ':'I know this'} onPress={()=>setIndex(cards.findIndex(c=>c.kind==='practice'))}/>:null}</View>}
 renderCard={i=><><RomanContext.Provider value={cards[i].kind!=='practice'||cards[i].roman==='show'||!!progress[cards[i].id]}><StoryCardView key={cards[i].id} card={cards[i]} characters={characters} sceneNumber={sceneNumber} onScene={onScene} progress={progress[cards[i].id]} onAnswer={verdict=>setProgress(previous=>{const old=previous[cards[i].id];return {...previous,[cards[i].id]:{first:old?.first??verdict,latest:verdict,solved:old?.solved||verdict==='correct'}};})}/></RomanContext.Provider>{saveError?<Label>{lang==='hi'?'सहेजा नहीं गया। फिर कोशिश करें।':'Could not save. Please try again.'}</Label>:null}{i===cards.length-1?<View style={{gap:4,marginTop:16}}><Label>{lang==='hi'?'स्रोत':'Sources'}</Label>{lesson.sources.map((s,i)=><Label key={i}>{s.title} · {s.licence}</Label>)}</View>:null}</>}/>;
}
