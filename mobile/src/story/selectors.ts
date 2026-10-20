import type { StoryIndex, StoryState, UnitSummary, Act, Part, LeafInfo, LessonSummary } from './types';
export function unitContexts(index:StoryIndex) {
 return index.acts.flatMap(act=>act.parts.flatMap((part,partIndex)=>part.units.map((unit,unitIndex)=>({act,part,partIndex,unit,unitIndex,unitNumber:act.parts.flatMap(p=>p.units).findIndex(u=>u.id===unit.id)+1,unitTotal:act.parts.reduce((n,p)=>n+p.units.length,0)}))));
}
export function findUnit(index:StoryIndex,id?:string|null){return unitContexts(index).find(context=>context.unit.id===id);}
export function currentContext(index:StoryIndex,state:StoryState){return findUnit(index,state.current?.unit_id??state.coming_soon)??unitContexts(index)[0];}
export function unitStops(unit:UnitSummary):LessonSummary[]{return [...unit.lessons,...(unit.check?[unit.check]:[])];}
export function allLeaves(index:StoryIndex):LeafInfo[]{return [...new Map([...index.acts.flatMap(a=>a.parts.flatMap(p=>p.leaf?[p.leaf]:[])),...index.finale_leaves].map(leaf=>[leaf.id,leaf])).values()].sort((a,b)=>a.n-b.n);}
export function recovered(index:StoryIndex,state:StoryState,id:string){const leaf=state.leaves.find(l=>l.id===id);return leaf?.recovered??(index.finale_leaves.some(l=>l.id===id)&&Object.values(state.units).every(u=>u.done));}
export function unitAvailable(state:StoryState,unit:UnitSummary){return unit.status==='ready'&&(state.units[unit.id]?.done||state.current?.unit_id===unit.id);}
export function canTestOut(index:StoryIndex,state:StoryState,unit:UnitSummary){return unit.status==='ready'&&!!unit.check&&state.current?.unit_id===unit.id&&!state.units[unit.id]?.done;}
export function gained(before:StoryState,after:StoryState){return {ghosts:after.ghosts_freed.filter(id=>!before.ghosts_freed.includes(id)),leaves:after.leaves.filter(l=>l.recovered&&!before.leaves.some(old=>old.id===l.id&&old.recovered)).map(l=>l.id)};}
