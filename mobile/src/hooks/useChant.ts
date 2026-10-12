// useChant: the Chant mode player wiring shared by Book and Listen.
// A thin screen-side adapter over the app-wide listenBus: it binds this
// screen's pages, title and persistence as the live session and returns the
// same API as always. The controller itself lives in the bus, so playback
// outlives the screen — leaving Listen (or Book's Chant mode) keeps the
// chant going, and the Read shelf's mini player stays in control.
//
// Reading-progress persistence stays with the caller via onAt.

import { useEffect, useMemo, useRef } from "react";
import type { FlatList } from "react-native";

import type { Shloka } from "../api/client";
import { REPEAT_ORDER, type RepeatMode } from "../recite/chantClock";
import { bindSession, listenBus, useListenBus } from "../services/listenBus";
import { useReducedMotion } from "./useReducedMotion";

export { REPEAT_ORDER };
export type { RepeatMode };

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
    /** Identifies the session across mounts; omit for Book's Chant mode,
     *  whose session is named after the book title. */
    sessionKey?: string;
    /** Names the session for the mini player's open action. */
    bookKey?: string;
    chapter?: string | null;
  },
) {
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList | null>(null);
  const navRef = useRef(opts.navigate);
  navRef.current = opts.navigate;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const onAtRef = useRef(opts.onAt);
  onAtRef.current = opts.onAt;

  const hasChant = useMemo(() => pages.some((p) => !!p.chant), [pages]);

  // The session object must be identity-stable across renders — the bus
  // refreshes the binding when it changes, and a fresh object every render
  // (with onAt as an inline closure) would notify in a loop. Callbacks are
  // read through refs, so they stay current without entering the deps.
  const session = useMemo(
    () => ({
      id: opts.sessionKey ?? `chant:${bookTitle}`,
      bookKey: opts.bookKey ?? "",
      chapter: opts.chapter ?? null,
      title: bookTitle,
      pages,
      onAt: (i: number) => onAtRef.current?.(i),
      scrollTo: (idx: number) => {
        try {
          listRef.current?.scrollToIndex({
            index: idx,
            viewPosition: 0.3,
            animated: !reducedRef.current,
          });
        } catch {
          /* a card not drawn yet: onScrollToIndexFailed estimates */
        }
      },
      autoScroll: opts.scrollToList !== false,
    }),
    [opts.sessionKey, opts.bookKey, opts.chapter, opts.scrollToList, bookTitle, pages],
  );
  const initialIndex = opts.initialIndex ?? null;
  useEffect(() => {
    bindSession(session, initialIndex);
  }, [session, initialIndex]);

  const bus = useListenBus();

  const verse: Shloka | undefined = pages[bus.at];
  const playingVerse = pages.find((p) => p.id === bus.playingId) ?? verse;
  const playingAt = playingVerse ? pages.findIndex((p) => p.id === playingVerse.id) : bus.at;

  return {
    at: bus.at,
    setAt: listenBus.setAt,
    verse,
    playingVerse,
    playingAt,
    playingId: bus.playingId,
    lineNow: bus.lineNow,
    wordNow: bus.wordNow,
    fillFrac: bus.fillFrac,
    isPlaying: bus.isPlaying,
    repeat: bus.repeat,
    cycleRepeat: listenBus.cycleRepeat,
    speed: bus.speed,
    cycleSpeed: listenBus.cycleSpeed,
    autoplay: bus.autoplay,
    cycleAutoplay: listenBus.cycleAutoplay,
    follow: bus.follow,
    setFollow: listenBus.setFollow,
    listRef,
    hasChant,
    chant: listenBus.chant,
    startAt: listenBus.startAt,
    pick: listenBus.pick,
    pickLine: listenBus.pickLine,
    toggle: listenBus.toggle,
    step: listenBus.step,
    stop: listenBus.stop,
    openLearn: () => {
      const v = playingVerse;
      if (!v) return;
      listenBus.stop();
      navRef.current("Recite", { verseUid: v.verse_uid ?? v.id, start: "listen" });
    },
    scrollToCurrent: listenBus.scrollToCurrent,
  };
}

export default useChant;
