// LearnV2 reading progress — versioned, persisted through progressStorage.
//
// Keys live under `shabd.learnv2.*` and never touch Path/Grammar/Story keys.
// Swipes only save reading position. Finishing is recorded by the player,
// which separately posts completion XP and streak activity to the server.

import { progressStorage as AsyncStorage } from "../services/progressStorage";

const LAST_LESSON_KEY = "shabd.learnv2.lastLesson";
const LAST_CARD_PREFIX = "shabd.learnv2.lastCard.";
const VISITED_PREFIX = "shabd.learnv2.visited.";
const DONE_PREFIX = "shabd.learnv2.done.";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a dead listener never blocks the others */
    }
  }
}

export function subscribeLearnV2Progress(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function getNumber(key: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setLearnV2LastLesson(lessonId: string): void {
  AsyncStorage.setItem(LAST_LESSON_KEY, lessonId).catch(() => {});
  notify();
}

export async function getLearnV2LastLesson(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_LESSON_KEY);
  } catch {
    return null;
  }
}

export function setLearnV2LastCard(lessonId: string, index: number): void {
  AsyncStorage.setItem(LAST_CARD_PREFIX + lessonId, String(index)).catch(() => {});
}

export async function getLearnV2LastCard(lessonId: string): Promise<number> {
  return getNumber(LAST_CARD_PREFIX + lessonId);
}

export function markLearnV2CardVisited(lessonId: string, cardId: string): void {
  AsyncStorage.setItem(VISITED_PREFIX + lessonId + "." + cardId, "1").catch(() => {});
  notify();
}

export async function getLearnV2VisitedCount(lessonId: string, cardIds: string[]): Promise<number> {
  try {
    const vals = await AsyncStorage.multiGet(cardIds.map((c) => VISITED_PREFIX + lessonId + "." + c));
    return vals.filter(([, v]) => v === "1").length;
  } catch {
    return 0;
  }
}

export async function loadLearnV2Visited(lessonId: string, cardIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const vals = await AsyncStorage.multiGet(cardIds.map((c) => VISITED_PREFIX + lessonId + "." + c));
    vals.forEach(([k, v]) => {
      if (v === "1") {
        const cardId = k.slice((VISITED_PREFIX + lessonId + ".").length);
        out.add(cardId);
      }
    });
  } catch {
    /* storage unavailable — empty set stands */
  }
  return out;
}

export async function markLearnV2LessonDone(lessonId: string): Promise<void> {
  await AsyncStorage.setItem(DONE_PREFIX + lessonId, "1").catch(() => {});
  notify();
}

export async function isLearnV2LessonDone(lessonId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DONE_PREFIX + lessonId)) === "1";
  } catch {
    return false;
  }
}

export async function loadLearnV2DoneMap(lessonIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  try {
    const vals = await AsyncStorage.multiGet(lessonIds.map((id) => DONE_PREFIX + id));
    vals.forEach(([k, v]) => {
      out[k.slice(DONE_PREFIX.length)] = v === "1";
    });
  } catch {
    /* defaults stand */
  }
  return out;
}
