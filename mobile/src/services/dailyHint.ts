// The daily hint: one per learner per day, spent on any exercise in the app, and it shows the answer.
// Kept on the phone per account (AsyncStorage); a new local day gives a new hint.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { AuthContext } from '../store/auth';
import { hintAvailable, hintDay, parseHintRecord, type HintRecord } from './dailyHintLogic';
const PREFIX = 'hint.daily.v1.';
let current: { key: string; record: HintRecord | null; ready: boolean } = { key: '', record: null, ready: false };
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(fn => fn()); };
async function load(key: string) {
  if (current.key === key && current.ready) return;
  current = { key, record: null, ready: false }; emit();
  let record: HintRecord | null = null;
  try { record = parseHintRecord(await AsyncStorage.getItem(PREFIX + key)); } catch { /* unreadable: treat the hint as unspent */ }
  if (current.key !== key) return;
  current = { key, record, ready: true }; emit();
}
export function useDailyHint() {
  const key = useContext(AuthContext)?.learner?.id ?? 'guest';
  useEffect(() => { void load(key); }, [key]);
  useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => version, () => 0);
  const ready = current.ready && current.key === key;
  const available = ready && hintAvailable(current.record, hintDay());
  const use = useCallback(async () => {
    if (!(current.ready && current.key === key) || !hintAvailable(current.record, hintDay())) return false;
    const record = { day: hintDay(), used: true };
    current = { ...current, record }; emit();
    try { await AsyncStorage.setItem(PREFIX + key, JSON.stringify(record)); } catch { /* spent for this session even if the write fails */ }
    return true;
  }, [key]);
  return { ready, available, use };
}
