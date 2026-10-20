// Recorded Sanskrit in story lessons. A lesson carries `audio` (Sanskrit text → clip URL); a line with a clip gets a speaker button,
// a table cell becomes tap-to-hear, a mouth-map letter sounds when chosen. No clip, no button.
import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { Pressable } from 'react-native';
import { playClip, type SpeakHandle } from '../services/speech';
import { useGuideLang } from '../hooks/useGuide';
import { SpeakerIcon } from './ui';
import { useStoryTheme } from './theme';
/** Text → clip URL for the lesson on screen (empty until the lesson has audio). */
export const ClipContext = createContext<Record<string, string>>({});
/** The text a clip is filed under: NFC, one space between words (the backend's `norm`). */
export const clipKey = (text: string) => text.normalize('NFC').split(/\s+/).filter(Boolean).join(' ');
export function useClip(text?: string | null): string | undefined {
  const clips = useContext(ClipContext);
  return text ? clips[clipKey(text)] : undefined;
}
let playing: string | null = null, handle: SpeakHandle | null = null;
const subscribers = new Set<() => void>();
const setPlaying = (url: string | null) => { playing = url; subscribers.forEach(fn => fn()); };
const useIsPlaying = (url: string) => useSyncExternalStore(fn => { subscribers.add(fn); return () => { subscribers.delete(fn); }; }, () => playing === url, () => false);
export async function stopClips(): Promise<void> {
  const old = handle;
  handle = null; setPlaying(null);
  try { await old?.stop(); } catch { /* already finished */ }
}
/** Play one clip from the start, stopping any other. */
export async function playStory(url: string): Promise<void> {
  await stopClips();
  setPlaying(url);
  try {
    const started = await playClip(url, () => { if (playing === url) { handle = null; setPlaying(null); } });
    if (playing !== url) { await started?.stop(); return; } // stopped or replaced while it loaded
    handle = started;
  } catch { if (playing === url) setPlaying(null); }
}
/** The speaker button: tap to play, tap again to stop. */
export function SpeakButton({ url, text }: { url: string; text: string }) {
  const c = useStoryTheme(), { lang } = useGuideLang(), on = useIsPlaying(url);
  return <Pressable accessibilityRole="button" accessibilityLabel={(lang === 'hi' ? 'सुनें: ' : 'Listen: ') + text} accessibilityState={{ selected: on }} hitSlop={8}
    onPress={() => { if (on) void stopClips(); else void playStory(url); }}
    style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 1, borderColor: on ? c.actionText : c.lineStrong, backgroundColor: on ? c.paper : c.surface }}>
    <SpeakerIcon color={on ? c.actionText : c.ink2} /></Pressable>;
}
/** For widgets: sound a text if the lesson has a clip for it. */
export function useSpeakText(): (text: string) => void {
  const clips = useContext(ClipContext);
  return text => { const url = clips[clipKey(text)]; if (url) void playStory(url); };
}
