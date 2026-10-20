import type { StoryIndex, StoryState, UnitSummary, Act, Part, LeafInfo, LessonSummary } from './types';
import { courseOrder } from './state';
export function unitContexts(index:StoryIndex) {
 return index.acts.flatMap(act=>act.parts.flatMap((part,partIndex)=>part.units.map((unit,unitIndex)=>({act,part,partIndex,unit,unitIndex,unitNumber:act.parts.flatMap(p=>p.units).findIndex(u=>u.id===unit.id)+1,unitTotal:act.parts.reduce((n,p)=>n+p.units.length,0)}))));
}
export function findUnit(index:StoryIndex,id?:string|null){return unitContexts(index).find(context=>context.unit.id===id);}
/** Every unit is ready and finished: derive() then has no current stop and no planned unit to stop at. */
export function courseComplete(index:StoryIndex,state:StoryState){const units=unitContexts(index);return units.length>0&&!state.current&&!state.coming_soon&&units.every(c=>c.unit.status==='ready'&&!!state.units[c.unit.id]?.done);}
/** The unit the road is on; the first unit during the prologue, and none once the course is complete. */
export function currentContext(index:StoryIndex,state:StoryState){return findUnit(index,state.current?.unit_id??state.coming_soon)??(courseComplete(index,state)?undefined:unitContexts(index)[0]);}
/** The Home button that skips ahead to a unit's check; only Act I is about letters. */
export function testOutLabel(actNumber:number|undefined):{en:string;hi:string}{return actNumber===1?{en:'I know these letters: take the unit check',hi:'ये अक्षर आते हैं: इकाई की जाँच दें'}:{en:'I know this unit: take the unit check',hi:'यह इकाई आती है: इकाई की जाँच दें'};}
export function unitStops(unit:UnitSummary):LessonSummary[]{return [...unit.lessons,...(unit.check?[unit.check]:[])];}
export function allLeaves(index:StoryIndex):LeafInfo[]{return [...new Map([...index.acts.flatMap(a=>a.parts.flatMap(p=>p.leaf?[p.leaf]:[])),...index.finale_leaves].map(leaf=>[leaf.id,leaf])).values()].sort((a,b)=>a.n-b.n);}
export function recovered(index:StoryIndex,state:StoryState,id:string){const leaf=state.leaves.find(l=>l.id===id);return leaf?.recovered??(index.finale_leaves.some(l=>l.id===id)&&Object.values(state.units).every(u=>u.done));}
export function unitAvailable(state:StoryState,unit:UnitSummary){return unit.status==='ready'&&(state.units[unit.id]?.done||state.current?.unit_id===unit.id);}
export function canTestOut(index:StoryIndex,state:StoryState,unit:UnitSummary){return unit.status==='ready'&&!!unit.check&&state.current?.unit_id===unit.id&&!state.units[unit.id]?.done;}
export function gained(before:StoryState,after:StoryState){return {ghosts:after.ghosts_freed.filter(id=>!before.ghosts_freed.includes(id)),leaves:after.leaves.filter(l=>l.recovered&&!before.leaves.some(old=>old.id===l.id&&old.recovered)).map(l=>l.id)};}
/**
 * Simple mode (owner, 2026-10-20): what is finished stays open, and the road
 * opens the next lesson plus the three after it (unit checks count; a
 * revision or reading opens with its unit). Nothing past a planned unit opens.
 */
export const SIMPLE_AHEAD=3;
export function simpleOpen(index:StoryIndex,state:StoryState):Set<string>{
 const open=new Set(state.finished),road:string[]=[];
 for(const stop of courseOrder(index)){if(stop.role==='coming_soon')break;if(stop.role==='lesson'||stop.role==='check')road.push(stop.lesson_id!);}
 const at=road.findIndex(id=>!open.has(id));
 if(at>=0)road.slice(at,at+1+SIMPLE_AHEAD).forEach(id=>open.add(id));
 // A unit's revision and its optional reading open with its lessons.
 for(const {unit} of unitContexts(index))if(unitStops(unit).some(l=>open.has(l.id)))for(const extra of [unit.revision,unit.reading])if(extra)open.add(extra.id);
 return open;
}
