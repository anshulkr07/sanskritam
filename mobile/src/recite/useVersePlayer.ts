// useVersePlayer: React face of VersePlayer (one expo-audio player for the
// Learn screen). Exposes the sounding line, whether audio is playing, the
// speed, and play/stop actions. Released when the screen goes away.

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChantLine } from "../api/client";
import { BASE_URL } from "../config";
import { VersePlayer, type PlayerLike } from "./versePlayer";

export function useVersePlayer(url: string | undefined, lines: ChantLine[]) {
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const vpRef = useRef<VersePlayer | null>(null);
  if (!vpRef.current) {
    vpRef.current = new VersePlayer({
      create: (u) => createAudioPlayer(u) as unknown as PlayerLike,
      onLine: setLine,
      onPlaying: setPlaying,
    }, lines);
  }
  const vp = vpRef.current;
  useEffect(() => { vp.setLines(lines); }, [vp, lines]);
  useEffect(() => () => vp.release(), [vp]);

  const src = useMemo(() => (url ? (url.startsWith("http") || url.startsWith("file:") ? url : `${BASE_URL}${url}`) : ""), [url]);

  const prepare = useCallback(async () => {
    try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch { /* keep */ }
  }, []);

  const playLine = useCallback(async (i: number) => {
    if (!src) return false;
    await prepare();
    return vp.playLine(src, i);
  }, [prepare, src, vp]);

  const playVerse = useCallback(async (repeats = 1) => {
    if (!src) return false;
    await prepare();
    return vp.playVerse(src, repeats);
  }, [prepare, src, vp]);

  const setSpeed = useCallback((s: number) => {
    vp.speed = s;
    setSpeedState(s);
  }, [vp]);

  const stop = useCallback(() => vp.stop(), [vp]);

  return { line, playing, speed, setSpeed, playLine, playVerse, stop, available: !!src };
}
