// Trail progress, derived from stores that already exist — nothing migrated:
//   card lessons   → LearnV2 read-through marks (learnv2/progress.ts)
//   grammar notes  → Grammar guide read marks, or opened from the trail
//   tool stops     → opened from the trail (shabd.trail.v1.visited)
//   unit practice  → server feature mastery (GET /grammar/path)
// Lessons inside a stage open in order; stages are all open.

import { progressStorage as AsyncStorage } from "../services/progressStorage";

import type { TrailStage, TrailStop, TrailUnit } from "./course";
import { stageStops } from "./course";

const VISITED_KEY = "shabd.trail.v1.visited";
const STAGE_KEY = "shabd.trail.v1.stage";

export async function loadVisited(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(VISITED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function markVisited(lessonId: string): Promise<void> {
  const seen = await loadVisited();
  if (seen.has(lessonId)) return;
  seen.add(lessonId);
  await AsyncStorage.setItem(VISITED_KEY, JSON.stringify([...seen])).catch(() => {});
}

export async function loadStageId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStageId(id: string): void {
  AsyncStorage.setItem(STAGE_KEY, id).catch(() => {});
}

export interface TrailFacts {
  cardsDone: Record<string, boolean>;
  topicsRead: Set<string>;
  visited: Set<string>;
  mastery: Record<string, number>;
}

export type StopStatus = "done" | "current" | "upcoming";

export function isStopDone(stop: TrailStop, f: TrailFacts): boolean {
  const l = stop.lesson;
  if (l.cards) return !!f.cardsDone[l.cards];
  if (f.visited.has(l.id)) return true;
  return l.topics.length > 0 && l.topics.every((t) => f.topicsRead.has(t));
}

/** Done stops stay done; the first stop not done is current; the rest wait. */
export function stageStatuses(stage: TrailStage, f: TrailFacts): Map<string, StopStatus> {
  const out = new Map<string, StopStatus>();
  let currentGiven = false;
  for (const stop of stageStops(stage)) {
    if (isStopDone(stop, f)) out.set(stop.lesson.id, "done");
    else if (!currentGiven) {
      out.set(stop.lesson.id, "current");
      currentGiven = true;
    } else out.set(stop.lesson.id, "upcoming");
  }
  return out;
}

export function stageDoneCount(stage: TrailStage, f: TrailFacts): number {
  return stageStops(stage).filter((s) => isStopDone(s, f)).length;
}

/** Mean server mastery (0–1) over a unit's graded features; null if none. */
export function unitMastery(unit: TrailUnit, mastery: Record<string, number>): number | null {
  if (!unit.graded.length) return null;
  const vals = unit.graded.map((id) => mastery[id] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Practice counts as passed at 80% mean mastery. */
export const PRACTICE_PASS = 0.8;
