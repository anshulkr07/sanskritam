// listenBus — the chant session outlives its screen.
//
// One ChantController for the whole app, owned here instead of by whichever
// screen mounted last: the Listen screen (or Book's Chant mode) binds a
// session — its pages, title, where progress persists — and playback keeps
// running after that screen closes, so the Read shelf can float a mini
// player with a working transport (play/pause, previous, next).
//
// Screens subscribe with useListenBus (useSyncExternalStore). The snapshot
// object only changes identity when a field really changes, so the ~10 Hz
// player ticks cost nothing on screens whose rendered output didn't move.
// useMiniPlayerUp is a coarse read for the shelf: it flips only when the
// bar would appear or disappear, never per tick.
//
// Hiding the mini player is a preference about this session, not playback —
// the chant goes on, and binding a different session brings the bar back.

import { setAudioModeAsync } from "expo-audio";
import { createManagedAudioPlayer } from "./managedAudio";
import { useSyncExternalStore } from "react";

import type { Shloka } from "../api/client";
import { REPEAT_ORDER, type RepeatMode } from "../recite/chantClock";
import { ChantController, type PlayerLike } from "../recite/chantController";
import { getAutoplay, setAutoplay as persistAutoplay } from "./audioProgress";

const SPEEDS = [1, 1.25, 1.5, 0.75];

export interface ListenSession {
  /** A new id stops the previous session's audio (binding a different book). */
  id: string;
  /** Where the Listen screen lives for this session; "" when unknown. */
  bookKey: string;
  chapter: string | null;
  title: string;
  pages: Shloka[];
  /** Every verse change, while the session is live anywhere. */
  onAt?: (i: number) => void;
  /** The mounted verse list, when follow-scroll has somewhere to scroll. */
  scrollTo?: (idx: number) => void;
  /** Auto-follow may scroll (the screen passed scrollToList). */
  autoScroll?: boolean;
}

interface BusState {
  session: ListenSession | null;
  at: number;
  playingId: string | null;
  lineNow: number;
  wordNow: number;
  fillFrac: number;
  /** Position in the sounding verse and its length, ms (250 ms steps). */
  posMs: number;
  durMs: number;
  isPlaying: boolean;
  repeat: RepeatMode;
  speed: number;
  autoplay: boolean;
  follow: boolean;
  /** Session id whose mini player bar the user closed. */
  miniHiddenFor: string | null;
}

let state: BusState = {
  session: null,
  at: 0,
  playingId: null,
  lineNow: 0,
  wordNow: -1,
  fillFrac: 0,
  posMs: 0,
  durMs: 0,
  isPlaying: false,
  repeat: "off",
  speed: 1,
  autoplay: true,
  follow: true,
  miniHiddenFor: null,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => state;

/** Assigns only real changes, so snapshot identity is stable between them. */
function set(patch: Partial<BusState>): void {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof BusState)[]) {
    if (state[k] !== patch[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...patch };
  notify();
}

const baseUrl = { current: "" };

const chant = new ChantController({
  ready: async () => {
    if (!baseUrl.current) baseUrl.current = (await import("../config")).BASE_URL;
  },
  resolve: (u) => (u.startsWith("http") ? u : `${baseUrl.current}${u}`),
  createPlayer: (url) => createManagedAudioPlayer(url, { updateInterval: 100 }, state.session?.title || "Reading") as unknown as PlayerLike,
  prepareAudio: () =>
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }),
  pages: () => state.session?.pages ?? [],
  repeat: () => state.repeat,
  speed: () => state.speed,
  follow: () => state.follow,
  autoplay: () => state.autoplay,
  bookTitle: () => state.session?.title ?? "",
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  onVerse: (idx, id) => {
    set({ playingId: id, posMs: 0 });
    if (idx >= 0) setAt(idx);
  },
  onLine: (line) => set({ lineNow: line }),
  onWord: (word) => set({ wordNow: word }),
  onPlaying: (playing) => set({ isPlaying: playing }),
  onProgress: (_line, frac) => set({ fillFrac: frac }),
  onTime: (ms, durMs) => set({ posMs: ms, durMs: Math.round(durMs) }),
  scrollTo: (idx) => {
    if (!state.session?.autoScroll) return;
    try {
      state.session.scrollTo?.(idx);
    } catch {
      /* a card not drawn yet: onScrollToIndexFailed estimates */
    }
  },
});

function setAt(i: number): void {
  if (i !== state.at) set({ at: i });
  try {
    state.session?.onAt?.(i);
  } catch {
    /* keep */
  }
}

/** A screen claims the player for its book/chapter. A new id stops whatever
 *  was sounding; the same id just refreshes pages and callbacks. */
export function bindSession(session: ListenSession, initialIndex: number | null): void {
  const cur = state.session;
  if (cur?.id === session.id) {
    set({ session });
    if (initialIndex !== null && initialIndex !== state.at) set({ at: initialIndex });
    return;
  }
  chant.stop();
  set({
    session,
    at: initialIndex ?? 0,
    playingId: null,
    lineNow: 0,
    wordNow: -1,
    fillFrac: 0,
    posMs: 0,
    durMs: 0,
    miniHiddenFor: null,
  });
}

export const listenBus = {
  chant,
  setAt,
  startAt: (i: number) => {
    if (i >= 0) void chant.start(i);
  },
  pick: (v: Shloka) => {
    const pages = state.session?.pages ?? [];
    const i = pages.findIndex((p) => p.id === v.id);
    if (i >= 0) void chant.start(i);
  },
  pickLine: (v: Shloka, ln: number) => {
    const pages = state.session?.pages ?? [];
    const i = pages.findIndex((p) => p.id === v.id);
    const start = v.chant?.lines.find((l) => l.i === ln)?.start_ms ?? 0;
    if (i >= 0) void chant.start(i, start);
  },
  toggle: () => chant.toggle(state.at),
  step: (dir: 1 | -1) => chant.step(dir, state.at),
  stop: () => chant.stop(),
  cycleRepeat: () =>
    set({ repeat: REPEAT_ORDER[(REPEAT_ORDER.indexOf(state.repeat) + 1) % REPEAT_ORDER.length] }),
  cycleSpeed: () => {
    const next = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length] ?? 1;
    set({ speed: next });
    chant.setSpeed(next);
  },
  cycleAutoplay: () => {
    const next = !state.autoplay;
    set({ autoplay: next });
    persistAutoplay(next);
  },
  setFollow: (on: boolean) => set({ follow: on }),
  scrollToCurrent: () => {
    const cur = (state.session?.pages ?? []).findIndex((p) => p.id === state.playingId);
    if (cur >= 0) {
      try {
        state.session?.scrollTo?.(cur);
      } catch {
        /* keep */
      }
    }
  },
  /** Hide the floating bar for this session; the chant continues. */
  dismissMini: () => {
    if (state.session) set({ miniHiddenFor: state.session.id });
  },
};

export function useListenBus(): BusState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Coarse visibility for screens that only need "is the bar up" — the shelf
// adds bottom padding for it and must not re-render on every word tick.
let miniUpCache = { v: false };
const miniUpSnapshot = () => {
  const s = state.session;
  const v = !!s && s.pages.length > 0 && state.miniHiddenFor !== s.id;
  if (miniUpCache.v !== v) miniUpCache = { v };
  return miniUpCache;
};

export function useMiniPlayerUp(): boolean {
  return useSyncExternalStore(subscribe, miniUpSnapshot).v;
}

// A coarse summary for screens that only need which book is live and whether
// it is sounding (the Audio shelf's hero); it never changes per word tick.
export interface ListenSummary {
  bookKey: string;
  chapter: string | null;
  isPlaying: boolean;
  at: number;
}
let summaryCache: ListenSummary = { bookKey: "", chapter: null, isPlaying: false, at: 0 };
const summarySnapshot = () => {
  const bookKey = state.session?.bookKey ?? "";
  const chapter = state.session?.chapter ?? null;
  const c = summaryCache;
  if (c.bookKey !== bookKey || c.chapter !== chapter || c.isPlaying !== state.isPlaying || c.at !== state.at) {
    summaryCache = { bookKey, chapter, isPlaying: state.isPlaying, at: state.at };
  }
  return summaryCache;
};

export function useListenSummary(): ListenSummary {
  return useSyncExternalStore(subscribe, summarySnapshot);
}

// The saved autoplay preference lands whenever it arrives.
void getAutoplay()
  .then((v) => set({ autoplay: v }))
  .catch(() => {});
