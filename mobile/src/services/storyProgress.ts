// Story-deck progress — the reader's bookmark (Discover Sanskrit).
//
// The deck is read-only (reading writes no mastery, no review rows), so the
// only thing persisted is the last-seen card index. It lives in AsyncStorage
// on the device, never on the server — adaptive.py stays frozen.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORY_PROGRESS_KEY = "shabd.story.index";

export async function getStoryIndex(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(STORY_PROGRESS_KEY);
    if (v == null) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setStoryIndex(i: number): void {
  AsyncStorage.setItem(STORY_PROGRESS_KEY, String(i)).catch(() => {});
}
