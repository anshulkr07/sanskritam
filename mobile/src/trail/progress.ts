// Trail progress: every lesson uses LearnV2 completion. Old grammar-note and
// tool marks are imported once, so upgrades preserve historical progress.
//   unit practice  → server feature mastery (GET /grammar/path)
// Lessons inside a stage open in order; stages are all open.

import { progressStorage as AsyncStorage } from "../services/progressStorage";
import { loadGrammarProgress } from "../services/grammarGuide";
import { loadLearnV2DoneMap, markLearnV2LessonDone } from "../learnv2/progress";

import type { TrailStage, TrailStop, TrailUnit } from "./course";
import { stageStops, TRAIL } from "./course";

const VISITED_KEY = "shabd.trail.v1.visited";
const STAGE_KEY = "shabd.trail.v1.stage";
const CARD_MIGRATION_KEY = "shabd.trail.v2.cardsMigrated";

/** Import old note/tool completion once. Subsequent decks have independent
 * completion: two lessons using the same topic must not finish each other. */
export async function loadTrailCardDoneMap(extraIds: string[] = []): Promise<Record<string, boolean>> {
  const stops = TRAIL.flatMap(stageStops);
  if (await AsyncStorage.getItem(CARD_MIGRATION_KEY) !== "1") {
    const [grammar, visited] = await Promise.all([loadGrammarProgress(), loadVisited()]);
    for (const { lesson } of stops) {
      if (!(lesson.cards.startsWith("trail:") || lesson.tool)) continue;
      if (visited.has(lesson.id) || (lesson.topics.length > 0 && lesson.topics.every(id => grammar.read.has(id)))) {
        await markLearnV2LessonDone(lesson.cards);
      }
    }
    await AsyncStorage.setItem(CARD_MIGRATION_KEY, "1").catch(() => {});
  }
  return loadLearnV2DoneMap([...stops.map(s => s.lesson.cards), ...extraIds]);
}

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
  return !!f.cardsDone[l.cards];
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
