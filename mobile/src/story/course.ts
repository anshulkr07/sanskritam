import { useEffect, useSyncExternalStore } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { cachedIndex, localFinishes, mergeFinishes, flushOutbox } from './cache';
import { getIndex, getState, lessonSummaries, prefetchLessons } from './api';
import { derive, courseOrder } from './state';
import type { Track } from './mode';
import type { StoryIndex, StoryState } from './types';
type Snapshot={index:StoryIndex|null;state:StoryState|null;error:boolean};
// One snapshot per Learn mode: Story and Simple share the index but never
// their progress (mode.ts).
const snapshots:Record<Track,Snapshot>={story:{index:null,state:null,error:false},simple:{index:null,state:null,error:false}};
const listeners:Record<Track,Set<()=>void>>={story:new Set(),simple:new Set()};
/** Simple mode has no prologue: it counts as read there. */
export function trackFinished(index:StoryIndex,finished:string[],track:Track){const pro=index.course?.prologue?.id;return track==='simple'&&pro?[...finished,pro]:finished;}
function publish(track:Track,index:StoryIndex,finished:string[]){snapshots[track]={index,state:derive(index,trackFinished(index,finished,track)),error:false};listeners[track].forEach(f=>f());}
const loading:Partial<Record<Track,Promise<void>>>={};
export function refreshCourse(tablet=false,track:Track='story'):Promise<void> {
 return loading[track]??=(async()=>{
  const cached=await cachedIndex(); if(cached) publish(track,cached,await localFinishes(track));
  try {
   const index=await getIndex(); publish(track,index,await localFinishes(track));
   await flushOutbox();
   const remote=await getState(track).catch(()=>null);
   if(remote) await mergeFinishes(remote.finished,track);
   publish(track,index,await localFinishes(track));
   const current=snapshots[track].state?.current?.lesson_id;
   const road=courseOrder(index).filter(s=>s.role!=='revision'); const at=road.findIndex(s=>s.lesson_id===current);
   const ids=at<0?[]:road.slice(at,at+3).flatMap(s=>s.lesson_id?[s.lesson_id]:[]);
   const summaries=lessonSummaries(index); await prefetchLessons(ids.flatMap(id=>{const s=summaries.find(l=>l.id===id);return s?[s]:[];}),tablet,index.characters);
  } catch { snapshots[track]={...snapshots[track],error:true}; listeners[track].forEach(f=>f()); }
 })().finally(()=>{loading[track]=undefined;});
}
export function getCourseSnapshot(track:Track='story'){return snapshots[track];}
export async function recordFinishes(ids:string[],track:Track='story'){const finished=await mergeFinishes(ids,track);const index=snapshots[track].index;if(index)publish(track,index,finished);}
export function useCourse(track:Track='story'){
 const window=useWindowDimensions(),tablet=Math.min(window.width,window.height)>=600;
 useEffect(()=>{void refreshCourse(tablet,track);const sub=AppState.addEventListener('change',state=>{if(state==='active')void refreshCourse(tablet,track);});return()=>sub.remove();},[tablet,track]);
 return useSyncExternalStore(fn=>{listeners[track].add(fn);return()=>{listeners[track].delete(fn);};},()=>snapshots[track],()=>snapshots[track]);
}
