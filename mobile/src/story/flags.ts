import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore, useEffect } from 'react';
export const STORY_COURSE_DEFAULT = false;
let enabled = STORY_COURSE_DEFAULT;
const listeners = new Set<() => void>();
let loaded: Promise<void> | undefined;
export function loadStoryFlag(): Promise<void> {
  return loaded ??= AsyncStorage.getItem('story.flag.v1').then(value => {
    enabled = value === null ? STORY_COURSE_DEFAULT : value === 'true';
    listeners.forEach(fn => fn());
  }).catch(() => {});
}
export async function setStoryFlag(value: boolean) {
  await loadStoryFlag();
  await AsyncStorage.setItem('story.flag.v1', String(value));
  enabled = value; listeners.forEach(fn => fn());
}
export function useStoryFlag() {
  useEffect(() => { void loadStoryFlag(); }, []);
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => enabled, () => false);
}
