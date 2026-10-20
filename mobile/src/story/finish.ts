import {enqueueWrites,flushOutbox} from './cache';
import {recordFinishes,getCourseSnapshot} from './course';
import {derive} from './state';
import {findUnit,gained,canTestOut} from './selectors';
import type {PracticeProgress} from './cards/Practice';
import type {StoryState} from './types';
import type {Track} from './mode';
export interface FinishResult {checksRight:number;checksTotal:number;passed:boolean;unitId?:string;leafId?:string;after?:StoryState}
export async function finishLesson(lessonId:string,progress:Record<string,PracticeProgress>,testOutUnitId?:string,track:Track='story'):Promise<FinishResult>{
 const results=Object.entries(progress).map(([card_id,p])=>({card_id,verdict:p.first}));
 const scored=results.filter(r=>r.verdict!=='unsure'),checksRight=scored.filter(r=>r.verdict==='correct').length,checksTotal=scored.length;
 const {index,state:before}=getCourseSnapshot(track);
 // Simple mode's finishes are kept apart on the server too (track).
 const tag=track==='simple'?{track}:{};
 const unit=index&&testOutUnitId?findUnit(index,testOutUnitId)?.unit:undefined;
 const passed=!!(unit&&before&&canTestOut(index!,before,unit)&&unit.check?.id===lessonId&&checksTotal>0&&checksRight/checksTotal>=.8);
 const writes:{path:string;body:unknown}[]=[{path:'/progress/card-lesson',body:{lesson_id:lessonId,checks_right:checksRight,checks_total:checksTotal,...tag}}, {path:'/learn/attempts',body:{lesson_id:lessonId,results}}];
 if(passed&&unit)writes.push({path:'/learn/test-out',body:{unit_id:unit.id,checks_right:checksRight,checks_total:checksTotal,...tag}});
 await enqueueWrites(writes);
 const ids=[lessonId,...(passed&&unit?unit.lessons.map(l=>l.id):[])];await recordFinishes(ids,track);
 void flushOutbox();
 const after=index&&before?derive(index,[...before.finished,...ids]):undefined;
 const gains=after&&before?gained(before,after):undefined;
 const newlyDone=index&&after&&before?index.acts.flatMap(a=>a.parts.flatMap(p=>p.units)).find(u=>after.units[u.id]?.done&&!before.units[u.id]?.done):undefined;
 return {checksRight,checksTotal,passed,unitId:newlyDone?.id,leafId:gains?.leaves[0],after};
}
