import { useEffect } from 'react';
import { holdClips } from '../services/speech';
import { windowClips } from './audioWindow';
import type { Card } from './types';
/** Keep the audio of the cards around the one on screen buffered (see audioWindow.ts); lets go of it all when the lesson closes. */
export function useAudioWindow(cards: Card[], index: number) {
  const key = windowClips(cards, index).join('\n');
  useEffect(() => { void holdClips(key ? key.split('\n') : []); }, [key]);
  useEffect(() => () => { void holdClips([]); }, []);
}
