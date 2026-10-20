import {finishLesson,type FinishResult} from '../finish';
import {consumeTestOut} from '../session';
import type {PracticeProgress} from '../cards/Practice';
import {RomanContext} from '../text';
import React,{useEffect,useState} from 'react';
import {View,Text,useWindowDimensions} from 'react-native';
import {cardPictures,resolvePicture} from '../artwork';
import {prefetchArtwork} from '../../services/artworkCache';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/types';
import {LessonPlayer} from '../../screens/LearnV2Lesson';
import {useGuideLang} from '../../hooks/useGuide';
import {useCourse,refreshCourse} from '../course';
import {getLesson,lessonSummaries} from '../api';
import {useStoryTheme} from '../theme';
import {usePanini} from '../preferences';
import {Button,Chip,Label,Panel,SkipIcon} from '../ui';
import {useTypeScale} from '../../hooks/useTypeScale';
import {Bi} from '../text';
import type {StoryLesson as Lesson} from '../types';
import StoryCardView from '../cards';
import {useAudioWindow} from '../useAudioWindow';
import {ClipContext,stopClips} from '../audio';
export const startCards=new Map<string,string>();
const NO_CLIPS:Record<string,string>={};
export default function StoryLessonScreen({route,navigation}:NativeStackScreenProps<RootStackParamList,'StoryLesson'>){
 const [testOut]=useState(()=>consumeTestOut(route.params.lessonId));
 const track=route.params.track??'story';
 const {index,state}=useCourse(track),c=useStoryTheme(),{lang,setLang}=useGuideLang(); const [lesson,setLesson]=useState<Lesson|null>(null),[error,setError]=useState(false),[reload,setReload]=useState(0);
 const summary=index?lessonSummaries(index).find(l=>l.id===route.params.lessonId):null;
 useEffect(()=>{let alive=true;setLesson(null);setError(false); if(summary)void getLesson(summary.id,summary.hash).then(l=>{if(alive)setLesson(l);},()=>{if(alive)setError(true);});return()=>{alive=false;};},[summary?.id,summary?.hash,reload]);
 if(!lesson)return <View style={{flex:1,padding:16,gap:12,backgroundColor:c.paper}}><Label>{error?(lang==='hi'?'पाठ लोड नहीं हुआ।':'Could not load lesson.'):(lang==='hi'?'पाठ लोड हो रहा है…':'Loading lesson…')}</Label>{error?<Button label={lang==='hi'?'फिर कोशिश करें':'Try again'} onPress={()=>{void refreshCourse().then(()=>setReload(r=>r+1));}}/>:null}<Button label={lang==='hi'?'वापस':'Back'} onPress={()=>navigation.goBack()}/></View>;
 return <StoryLessonPlayer key={lesson.id} lesson={lesson} characters={index?.characters??[]} sceneNumber={id=>{const unit=index?.acts.flatMap(a=>a.parts.flatMap(p=>p.units)).find(u=>u.lessons.some(l=>l.id===id));const n=unit?.lessons.findIndex(l=>l.id===id);return n==null||n<0?null:n+1;}} track={track} testOutUnitId={testOut?state?.current?.unit_id??undefined:undefined} onFinished={result=>{if(track==='simple')navigation.goBack();else if(result.unitId)navigation.replace('StoryUnitEnd',{unitId:result.unitId,leafId:result.leafId,lessonId:lesson.id});else if(lesson.template==='prologue'&&result.after?.current?.lesson_id)navigation.replace('StoryLesson',{lessonId:result.after.current.lesson_id});else navigation.goBack();}} onClose={()=>navigation.goBack()} onScene={(id,cardId)=>{startCards.set(id,cardId);navigation.push('StoryLesson',{lessonId:id,track});}}/>;
}
export function StoryLessonPlayer({lesson,characters=[],sceneNumber=()=>null,onClose,onScene=()=>{},onComplete,onFinished,testOutUnitId,track='story'}:{lesson:Lesson;characters?:import('../types').Character[];sceneNumber?:(id:string)=>number|null;onClose:()=>void;onScene?:(id:string,cardId:string)=>void;onComplete?:(progress:Record<string,PracticeProgress>)=>Promise<void>;onFinished?:(result:FinishResult)=>void;testOutUnitId?:string;track?:import('../mode').Track}){
 const c=useStoryTheme(),panini=usePanini(),{lang,setLang}=useGuideLang(),{sized}=useTypeScale();  // Simple mode: the same lesson without its story cards (a lesson that is
 // nothing but story keeps them, so it never opens empty).
 const deep=lesson.cards.filter(c=>panini||c.depth!=='panini'),plain=deep.filter(c=>c.kind!=='story'); const cards=track==='simple'&&plain.length>0?plain:deep;
 const [progress,setProgress]=useState<Record<string,PracticeProgress>>({}),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState(false);
 const course=useCourse(track);
 const skillTitles=new Map(course.index?.acts.flatMap(a=>a.parts.flatMap(p=>p.units.flatMap(u=>u.skills.map(s=>[s.id,s.title] as const))))??[]);
 const needs=lesson.needs.flatMap(id=>{const title=skillTitles.get(id);return title?[{id,title}]:[];}),teaches=lesson.teaches.flatMap(id=>{const title=skillTitles.get(id);return title?[{id,title}]:[];});
 const [index,setIndex]=useState(()=>Math.max(0,cards.findIndex(c=>c.id===startCards.get(lesson.id))));
 useEffect(()=>{startCards.delete(lesson.id);},[lesson.id]);

 useAudioWindow(cards,Math.min(index,cards.length-1));
 const window=useWindowDimensions(),tablet=Math.min(window.width,window.height)>=600;
 useEffect(()=>{
  const pictures=cards.slice(index,index+3).flatMap(card=>cardPictures(card)).slice(0,8);
  prefetchArtwork(pictures.map(resolvePicture).flatMap(p=>{const uri=p?.delivered?(tablet?p.tablet??p.phone:p.phone):undefined;return uri?[uri]:[];}));
 },[cards,index,tablet]);
 useEffect(()=>{void stopClips();},[index]);
 useEffect(()=>()=>{void stopClips();},[]);
 const firstPractice=cards.findIndex(c=>c.kind==='practice'),canSkip=lesson.template==='scene'&&firstPractice>=0&&index<firstPractice;
 const canAdvance=(i:number)=>{const card=cards[i];return card.kind!=='practice'||!!progress[card.id]&&(!card.gate||progress[card.id].solved||progress[card.id].latest==='unsure');};
 const complete=async()=>{if(busy||cards.some((_,i)=>!canAdvance(i)))return;setBusy(true);setSaveError(false);try{if(onComplete){await onComplete(progress);onClose();}else{const result=await finishLesson(lesson.id,progress,testOutUnitId,track);onFinished?onFinished(result):onClose();}}catch{setSaveError(true);setBusy(false);}};
 return <ClipContext.Provider value={lesson.audio??NO_CLIPS}><LessonPlayer controls={false} firstNote={canSkip?(lang==='hi'?'अगले कार्ड के लिए बाईं ओर स्वाइप करें  ›  ·  » सीधे अभ्यास पर ले जाता है':'Swipe left for the next card  ›  ·  » skips to the practice'):undefined} busy={busy} title={lesson.title[lang]} index={Math.min(index,cards.length-1)} total={cards.length} onIndexChange={setIndex} onFinish={()=>{void complete();}} onClose={onClose} hi={lang==='hi'} palette={c} canAdvance={canAdvance}
 header={<View style={{flexDirection:'row',gap:6,alignItems:'center'}}><Chip label={lang==='hi'?'English':'हिन्दी'} onPress={()=>setLang(lang==='hi'?'en':'hi')}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(13),color:c.ink}}>{lang==='hi'?'English':'हिन्दी'}</Text></Chip>{canSkip?<Chip label={lang==='hi'?'यह जानता हूँ: सीधे अभ्यास पर जाएँ':'I know this: skip to the practice'} onPress={()=>setIndex(firstPractice)}><SkipIcon color={c.ink}/></Chip>:null}</View>}
 renderCard={i=><>{i===0&&(needs.length>0||teaches.length>0)?<Panel>{needs.length>0?<><Label>{lang==='hi'?'पहले सीखा':'BUILDS ON'}</Label>{needs.map(s=><Bi key={s.id} value={s.title} size={15}/>)}</>:null}{teaches.length>0?<><Label>{lang==='hi'?'इस पाठ में सीखेंगे':'IN THIS LESSON'}</Label>{teaches.map(s=><Bi key={s.id} value={s.title} size={15}/>)}</>:null}</Panel>:null}<RomanContext.Provider value={cards[i].kind!=='practice'||cards[i].roman==='show'||!!progress[cards[i].id]}><StoryCardView key={cards[i].id} card={cards[i]} characters={characters} sceneNumber={sceneNumber} onScene={onScene} progress={progress[cards[i].id]} onAnswer={(verdict,hinted)=>setProgress(previous=>{const old=previous[cards[i].id];return {...previous,[cards[i].id]:{first:old?.first??verdict,latest:verdict,solved:old?.solved||verdict==='correct',hinted:old?.hinted||!!hinted}};})}/></RomanContext.Provider>{saveError?<Label>{lang==='hi'?'सहेजा नहीं गया। फिर कोशिश करें।':'Could not save. Please try again.'}</Label>:null}{i===cards.length-1?<View style={{gap:4,marginTop:16}}><Label>{lang==='hi'?'स्रोत':'Sources'}</Label>{lesson.sources.map((s,i)=><Label key={i}>{s.title} · {s.licence}</Label>)}</View>:null}</>}/></ClipContext.Provider>;
}
