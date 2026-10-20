import {useEffect,useState} from 'react';
import {getLesson} from './api';
import type {LessonSummary,StoryLesson} from './types';
export function useStoryLesson(summary?:LessonSummary|null){
 const [result,setResult]=useState<{lesson:StoryLesson|null;failed:boolean}>({lesson:null,failed:false});
 useEffect(()=>{let alive=true;setResult({lesson:null,failed:false});if(summary)void getLesson(summary.id,summary.hash).then(lesson=>{if(alive)setResult({lesson,failed:false});},()=>{if(alive)setResult({lesson:null,failed:true});});return()=>{alive=false;};},[summary?.id,summary?.hash]);
 return result;
}
