import type { StoryIndex, Stop, StoryState } from './types';
/** Port of curriculum/state.py. Keep ordering and completion semantics identical. */
export function courseOrder(index: StoryIndex): Stop[] {
 const out: Stop[] = [];
 const pro = index.course?.prologue;
 if (pro) out.push({lesson_id:pro.id, role:'prologue', unit_id:null, act_id:null});
 for (const act of index.acts) for (const part of act.parts) for (const unit of part.units) {
  const base = {unit_id:unit.id, act_id:act.id};
  if (unit.status !== 'ready') { out.push({...base, lesson_id:null, role:'coming_soon'}); continue; }
  for (const lesson of unit.lessons) out.push({...base, lesson_id:lesson.id, role:'lesson'});
  if (unit.revision) out.push({...base, lesson_id:unit.revision.id, role:'revision'});
  if (unit.check) out.push({...base, lesson_id:unit.check.id, role:'check'});
 }
 return out;
}
export function derive(index: StoryIndex, finished: Iterable<string>): StoryState {
 const done = new Set(finished);
 const units: StoryState['units'] = {}, ghosts: string[] = [], leaves: StoryState['leaves'] = [], acts: StoryState['acts'] = [];
 for (const act of index.acts) {
  let actUnitsDone = 0, actUnitsTotal = 0;
  for (const part of act.parts) {
   let partDone = true;
   for (const unit of part.units) {
    actUnitsTotal++;
    const ready = unit.status === 'ready';
    const required = unit.lessons.map(l => l.id);
    if (unit.check) required.push(unit.check.id);
    const finishedHere = required.filter(id => done.has(id));
    const unitDone = ready && required.length > 0 && finishedHere.length === required.length;
    units[unit.id] = {status:unit.status, done:unitDone, finished:finishedHere.length, total:required.length, ghost_freed:!!(unitDone && unit.ghost)};
    if (unitDone) { actUnitsDone++; if (unit.ghost) ghosts.push(unit.ghost.id); } else partDone = false;
   }
   if (part.leaf) leaves.push({id:part.leaf.id, n:part.leaf.n, recovered:partDone && part.units.length > 0});
  }
  acts.push({id:act.id, units_done:actUnitsDone, units_total:actUnitsTotal});
 }
 let current: Stop | null = null, comingSoon: string | null = null;
 for (const stop of courseOrder(index)) {
  if (stop.role === 'coming_soon') { comingSoon = stop.unit_id; break; }
  if (stop.role === 'revision') continue;
  if (!done.has(stop.lesson_id!)) { current = stop; break; }
 }
 const known = new Set(courseOrder(index).map(s=>s.lesson_id).filter(Boolean));
 return {version:index.version, finished:[...done].filter(id=>known.has(id)).sort(), current, coming_soon:current ? null : comingSoon, units, ghosts_freed:ghosts, leaves, acts};
}
