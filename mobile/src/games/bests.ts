// Bests: per game+mode bests in AsyncStorage shabd.games.best.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "shabd.games.best";

export async function getBest(game: string, mode: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, { value: number; at: string }>) : {};
    return all[`${game}:${mode}`]?.value ?? null;
  } catch {
    return null;
  }
}

export async function setBest(game: string, mode: string, value: number, higherIsBetter = true): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, { value: number; at: string }>) : {};
    const k = `${game}:${mode}`;
    const prev = all[k]?.value;
    const isBest = prev == null || (higherIsBetter ? value > prev : value < prev);
    if (isBest) {
      all[k] = { value, at: new Date().toISOString() };
      await AsyncStorage.setItem(KEY, JSON.stringify(all));
    }
    return isBest;
  } catch {
    return false;
  }
}
