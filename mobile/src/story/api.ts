import {resolvePicture} from './artwork';
import { ApiError, request } from '../api/client';
import { prefetchArtwork } from '../services/artworkCache';
import { cachedIndex, saveIndex, cachedLesson, saveLesson } from './cache';
import type { StoryIndex, StoryLesson, StoryState, PracticeCard, LessonSummary, Character } from './types';
export async function getIndex(): Promise<StoryIndex> {
 const cached = await cachedIndex();
 try { const index = await request<StoryIndex>('/learn/index', {headers: cached ? {'If-None-Match': '"' + cached.version + '"'} : {}}); await saveIndex(index); return index; }
 catch (error) { if (cached && (error instanceof ApiError && error.status === 304)) return cached; if (cached) return cached; throw error; }
}
export async function getLesson(id: string, hash: string): Promise<StoryLesson> {
 const cached = await cachedLesson(id, hash); if (cached) return cached;
 const lesson = await request<StoryLesson>('/learn/lessons/' + encodeURIComponent(id));
 if (lesson.hash !== hash) throw new Error('Lesson changed; refresh the course index');
 await saveLesson(lesson); return lesson;
}
export const getState = (track: 'story' | 'simple' = 'story') => request<StoryState>('/learn/state' + (track === 'simple' ? '?track=simple' : ''), {}, true);
// Attempts and test-out are sent by finish.ts through the ordered offline
// outbox. Keep a single write path so completion survives a lost connection.
export const getReview = () => request<{due_count:number; items:{item_key:string; lesson_id:string; lesson_title:StoryLesson['title']; due_at:string; card:PracticeCard}[]}>('/learn/review?limit=12', {}, true);
export function lessonSummaries(index: StoryIndex): LessonSummary[] {
 return [index.course?.prologue, ...index.acts.flatMap(a => a.parts.flatMap(p => p.units.flatMap(u => [...u.lessons, u.revision, u.reading, u.check]))), ...index.acts.flatMap(a=>a.parts.map(p=>p.leaf?.tale)), ...index.finale_leaves.map(l=>l.tale)].filter((l): l is LessonSummary => !!l);
}
export async function prefetchLessons(summaries: LessonSummary[], tablet: boolean, characters: Character[] = []) {
 await Promise.allSettled(summaries.slice(0,3).map(async summary => {
  const lesson = await getLesson(summary.id, summary.hash);
  const pictures = lesson.cards.flatMap(card => [card.image, ...(card.kind === 'story' ? card.lines.map(line => characters.find(ch => ch.id === line.speaker)?.portrait) : [])]);
  prefetchArtwork(pictures.map(resolvePicture).flatMap(p => { const uri = p?.delivered ? (tablet ? p.tablet ?? p.phone : p.phone) : undefined; return uri ? [uri] : []; }));
 }));
}
