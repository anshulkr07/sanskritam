import { useEffect, useSyncExternalStore } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { cachedIndex, localFinishes, mergeFinishes, flushOutbox } from './cache';
import { getIndex, getState, lessonSummaries, prefetchLessons } from './api';
import { derive, courseOrder } from './state';
import type { StoryIndex, StoryState } from './types';
type Snapshot={index:StoryIndex|null;state:StoryState|null;error:boolean};
let snapshot:Snapshot={index:null,state:null,error:false}; const listeners=new Set<()=>void>();
function publish(index:StoryIndex,finished:string[]){snapshot={index,state:derive(index,finished),error:false};listeners.forEach(f=>f());}
let loading:Promise<void>|undefined;
export function refreshCourse(tablet=false):Promise<void> {
 return loading??=(async()=>{
  const cached=await cachedIndex(); if(cached) publish(cached,await localFinishes());
  try {
   const index=await getIndex(); publish(index,await localFinishes());
   await flushOutbox();
   const remote=await getState().catch(()=>null);
   if(remote) await mergeFinishes(remote.finished);
   publish(index,await localFinishes());
   const current=snapshot.state?.current?.lesson_id;
   const road=courseOrder(index).filter(s=>s.role!=='revision'&&s.role!=='reading'); const at=road.findIndex(s=>s.lesson_id===current);
   const ids=at<0?[]:road.slice(at,at+3).flatMap(s=>s.lesson_id?[s.lesson_id]:[]);
   const summaries=lessonSummaries(index); await prefetchLessons(ids.flatMap(id=>{const s=summaries.find(l=>l.id===id);return s?[s]:[];}),tablet,index.characters);
  } catch { snapshot={...snapshot,error:true}; listeners.forEach(f=>f()); }
 })().finally(()=>{loading=undefined;});
}
export function getCourseSnapshot(){return snapshot;}
export async function recordFinishes(ids:string[]){const finished=await mergeFinishes(ids);if(snapshot.index)publish(snapshot.index,finished);}
export function useCourse(){
 const window=useWindowDimensions(),tablet=Math.min(window.width,window.height)>=600;
 useEffect(()=>{void refreshCourse(tablet);const sub=AppState.addEventListener('change',state=>{if(state==='active')void refreshCourse(tablet);});return()=>sub.remove();},[tablet]);
 return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>snapshot,()=>snapshot);
}
