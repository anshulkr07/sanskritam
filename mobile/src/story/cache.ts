import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../api/client';
import type { StoryIndex, StoryLesson } from './types';
export const INDEX_KEY = 'story.index.v1';
export const FINISHED_KEY = 'story.finished.v1';
export const OUTBOX_KEY = 'story.outbox.v1';
export async function readJSON<T>(key: string): Promise<T | null> {
 const value = await AsyncStorage.getItem(key); if (!value) return null;
 try { return JSON.parse(value) as T; } catch { return null; }
}
export const cachedIndex = () => readJSON<StoryIndex>(INDEX_KEY);
export const saveIndex = (index: StoryIndex) => AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
const lessonKey = (id: string, hash: string) => 'story.lesson.' + id + '.' + hash;
export const cachedLesson = (id: string, hash: string) => readJSON<StoryLesson>(lessonKey(id, hash));
export async function saveLesson(lesson: StoryLesson) {
 await AsyncStorage.setItem(lessonKey(lesson.id, lesson.hash), JSON.stringify(lesson));
 const stale = (await AsyncStorage.getAllKeys()).filter(k => k.slice(0,k.lastIndexOf('.')) === 'story.lesson.' + lesson.id && k !== lessonKey(lesson.id, lesson.hash));
 if (stale.length) await AsyncStorage.multiRemove(stale);
}
// Serialize all read-modify-write operations, including queue acknowledgements.
let lock: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> { const next = lock.then(fn, fn); lock = next.catch(() => {}); return next; }
export const localFinishes = async () => (await readJSON<string[]>(FINISHED_KEY)) ?? [];
export function mergeFinishes(ids: string[]) { return serial(async () => { const merged = [...new Set([...(await localFinishes()), ...ids])]; await AsyncStorage.setItem(FINISHED_KEY, JSON.stringify(merged)); return merged; }); }
export interface LessonReceipt {xp?:number;first_time?:boolean;today_xp?:number;goal_xp?:number;goal_met?:boolean}
const receiptListeners=new Set<()=>void>();
export const receiptFor=async(id:string)=>(await readJSON<Record<string,LessonReceipt>>('story.receipts.v1'))?.[id]??null;
export function subscribeReceipts(fn:()=>void){receiptListeners.add(fn);return()=>{receiptListeners.delete(fn);};}
export interface QueuedWrite { id: string; path: string; body: unknown; created: number; tries: number; next: number }
export const readOutbox = async () => (await readJSON<QueuedWrite[]>(OUTBOX_KEY)) ?? [];
export function enqueueWrites(writes: {path: string; body: unknown}[]) { return serial(async () => {
 const now = Date.now(); const queue = await readOutbox();
 queue.push(...writes.map((w, i) => ({...w, id: now + ':' + Math.random() + ':' + i, created:now, tries:0, next:0})));
 await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
}); }
let flushing: Promise<void> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
export function flushOutbox(): Promise<void> {
 if (flushing) return flushing;
 if (retry) { clearTimeout(retry); retry = undefined; }
 return flushing = (async () => {
  while (true) {
   const head = await serial(async () => { const q = (await readOutbox()).filter(w => Date.now() - w.created < 7 * 86400000); await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(q)); return q[0]; });
   if (!head) return;
   if (head.next > Date.now()) { retry = setTimeout(() => { void flushOutbox(); }, head.next - Date.now()); return; }
   try {
    const response=await request<LessonReceipt>(head.path,{method:'POST',body:JSON.stringify(head.body)},true);
    const lessonId=(head.body as {lesson_id?:string})?.lesson_id;
    if(head.path==='/progress/card-lesson'&&lessonId){await serial(async()=>{const receipts=await readJSON<Record<string,LessonReceipt>>('story.receipts.v1')??{};receipts[lessonId]=response;await AsyncStorage.setItem('story.receipts.v1',JSON.stringify(receipts));});receiptListeners.forEach(fn=>fn());}
   }
   catch { await serial(async () => { const q = await readOutbox(); const item = q.find(w => w.id === head.id); if (item) { item.tries++; item.next = Date.now() + Math.min(300000, 1000 * 2 ** Math.min(item.tries, 9)); } await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(q)); }); retry = setTimeout(() => { void flushOutbox(); }, Math.min(300000, 1000 * 2 ** Math.min(head.tries + 1,9))); return; }
   await serial(async () => { await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify((await readOutbox()).filter(w => w.id !== head.id))); });
  }
 })().finally(() => { flushing = undefined; });
}
