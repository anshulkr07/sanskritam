// useChant: the Chant mode player wiring shared by Book and Listen.
// Owns the ChantController (src/recite/chantController.ts), the sounding
// verse/line/fill state, transport settings (repeat/speed/follow) and the
// list ref. Reading-progress persistence stays with the caller via onAt.

import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import type { Shloka } from "../api/client";
import { REPEAT_ORDER, type RepeatMode } from "../recite/chantClock";
import { ChantController, type PlayerLike } from "../recite/chantController";
import { useReducedMotion } from "./useReducedMotion";

export { REPEAT_ORDER };
export type { RepeatMode };

const SPEEDS = [1, 1.25, 1.5, 0.75];

export function useChant(
  pages: Shloka[],
  bookTitle: string,
  opts: {
    initialIndex?: number;
    onAt?: (i: number) => void;
    navigate: (r: string, p?: object) => void;
    /** False in the focused window view: the window recenters on `at` by
     *  itself, and list indices no longer match page indices. */
    scrollToList?: boolean;
  },
) {
  const reduced = useReducedMotion();
  const [at, setAtState] = useState(opts.initialIndex ?? 0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [lineNow, setLineNow] = useState(0);
  const [wordNow, setWordNow] = useState(-1);
  const [fillFrac, setFillFrac] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [speed, setSpeed] = useState(1);
  // Audiobook autoplay (persisted globally): false stops after the verse.
  const [autoplay, setAutoplay] = useState(true);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    let on = true;
    import("../services/audioProgress")
      .then((m) => m.getAutoplay())
      .then((v) => {
        if (on) setAutoplay(v);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  const listRef = useRef<FlatList | null>(null);
  const navRef = useRef(opts.navigate);
  navRef.current = opts.navigate;
  const onAtRef = useRef(opts.onAt);
  onAtRef.current = opts.onAt;

  const setAt = (i: number) => {
    setAtState(i);
    try {
      onAtRef.current?.(i);
    } catch {
      /* keep */
    }
  };

  const hasChant = useMemo(() => pages.some((p) => !!p.chant), [pages]);

  // The newest values for the player, which outlives any one render: a verse
  // that ends starts the next one, and must see the Repeat, speed and Follow
  // chosen since it began.
  const live = useRef({ repeat, speed, follow, reduced, pages, title: bookTitle, scroll: opts.scrollToList !== false, autoplay });
  live.current = { repeat, speed, follow, reduced, pages, title: bookTitle, scroll: opts.scrollToList !== false, autoplay };
  const baseUrl = useRef("");
  const chantRef = useRef<ChantController | null>(null);
  if (chantRef.current === null) {
    chantRef.current = new ChantController({
      ready: async () => {
        if (!baseUrl.current) baseUrl.current = (await import("../config")).BASE_URL;
      },
      resolve: (u) => (u.startsWith("http") ? u : `${baseUrl.current}${u}`),
      createPlayer: (url) => createAudioPlayer(url, { updateInterval: 100 }) as unknown as PlayerLike,
      prepareAudio: () =>
        setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }),
      pages: () => live.current.pages,
      repeat: () => live.current.repeat,
      speed: () => live.current.speed,
      follow: () => live.current.follow,
      autoplay: () => live.current.autoplay,
      bookTitle: () => live.current.title,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      onVerse: (idx, id) => {
        setPlayingId(id);
        if (idx >= 0) setAt(idx);
      },
      onLine: setLineNow,
      onWord: setWordNow,
      onPlaying: setIsPlaying,
      onProgress: (_line, frac) => setFillFrac(frac),
      scrollTo: (idx) => {
        if (!live.current.scroll) return;
        try {
          listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3, animated: !live.current.reduced });
        } catch {
          /* a card not drawn yet: onScrollToIndexFailed estimates */
        }
      },
    });
  }
  const chant = chantRef.current;
  useEffect(() => () => chant.dispose(), [chant]);

  const verse: Shloka | undefined = pages[at];
  const playingVerse = pages.find((p) => p.id === playingId) ?? verse;
  const playingAt = playingVerse ? pages.findIndex((p) => p.id === playingVerse.id) : at;

  return {
    at,
    setAt,
    verse,
    playingVerse,
    playingAt,
    playingId,
    lineNow,
    wordNow,
    fillFrac,
    isPlaying,
    repeat,
    cycleRepeat: () =>
      setRepeat((r) => REPEAT_ORDER[(REPEAT_ORDER.indexOf(r) + 1) % REPEAT_ORDER.length]),
    speed,
    cycleSpeed: () => {
      const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
      setSpeed(next);
      chant.setSpeed(next);
    },
    autoplay,
    cycleAutoplay: () => {
      const next = !autoplay;
      setAutoplay(next);
      void import("../services/audioProgress")
        .then((m) => m.setAutoplay(next))
        .catch(() => {});
    },
    follow,
    setFollow,
    listRef,
    hasChant,
    chant,
    startAt: (i: number) => {
      if (i >= 0) void chant.start(i);
    },
    pick: (v: Shloka) => {
      const i = pages.findIndex((p) => p.id === v.id);
      if (i >= 0) void chant.start(i);
    },
    pickLine: (v: Shloka, ln: number) => {
      const i = pages.findIndex((p) => p.id === v.id);
      const start = v.chant?.lines.find((l) => l.i === ln)?.start_ms ?? 0;
      if (i >= 0) void chant.start(i, start);
    },
    toggle: () => chant.toggle(at),
    step: (dir: 1 | -1) => chant.step(dir, at),
    stop: () => chant.stop(),
    openLearn: () => {
      const v = playingVerse;
      if (!v) return;
      chant.stop();
      navRef.current("Recite", { verseUid: v.verse_uid ?? v.id, start: "listen" });
    },
    scrollToCurrent: () => {
      const cur = pages.findIndex((p) => p.id === playingId);
      if (cur >= 0) {
        try {
          listRef.current?.scrollToIndex({ index: cur, viewPosition: 0.3, animated: !reduced });
        } catch {
          /* keep */
        }
      }
    },
  };
}

export default useChant;
