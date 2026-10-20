// Trail progress: every lesson uses LearnV2 completion. Old grammar-note and
// tool marks are imported once, so upgrades preserve historical progress.

import { progressStorage as AsyncStorage } from "../services/progressStorage";
import { loadGrammarProgress } from "../services/grammarGuide";
import { loadLearnV2DoneMap, markLearnV2LessonDone } from "../learnv2/progress";

import type { TrailStop } from "./course";
import { stageStops, TRAIL } from "./course";

const VISITED_KEY = "shabd.trail.v1.visited";
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

export interface TrailFacts {
  cardsDone: Record<string, boolean>;
  topicsRead: Set<string>;
  visited: Set<string>;
  mastery: Record<string, number>;
}

export function isStopDone(stop: TrailStop, f: TrailFacts): boolean {
  const l = stop.lesson;
  return !!f.cardsDone[l.cards];
}
