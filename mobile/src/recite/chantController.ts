// ChantController: the Chant mode player, apart from React and from expo-audio
// so the way it behaves can be run in Node (scripts/check-recite.mjs) with a
// fake player and fake timers.
//
// What it does, per handover_recite.md 7.4:
//  - plays one verse at a time and reports which line is sounding;
//  - at 70% of a verse builds the next verse's player and hands it over when
//    that verse starts, so there is no wait for a download;
//  - when a verse ends: Repeat plays it again, otherwise the next verse with a
//    chant after a 0.8 s pause, and at the last one it stops;
//  - Repeat, speed and Follow are read when they are needed, never captured,
//    so a change made while a verse is playing counts;
//  - a start that is still loading when another begins (or the screen closes)
//    stands down and frees what it made.

import type { ChantLine } from "../api/client";
import { afterFinish, lineAt, lineFill, lineWords, nextChantIndex, wordAt, type RepeatMode, type WordSpan } from "./chantClock";

export interface ChantVerse {
  id: string;
  source_ref: string;
  chant?: { url: string; duration_ms?: number; lines: ChantLine[] } | null;
}

export interface PlayerStatus {
  isLoaded: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  didJustFinish: boolean;
}

export interface PlayerLike {
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void> | void;
  setPlaybackRate?(rate: number, quality?: string): void;
  addListener(event: "playbackStatusUpdate", cb: (st: PlayerStatus) => void): { remove(): void };
  setActiveForLockScreen?(active: boolean, metadata?: { title: string; artist: string }): void;
  remove?(): void;
  release?(): void;
}

export interface ChantHost {
  /** Resolves once resolve() can build a full URL. */
  ready(): Promise<void>;
  resolve(url: string): string;
  createPlayer(url: string): PlayerLike;
  prepareAudio(): Promise<void>;
  pages(): ChantVerse[];
  repeat(): RepeatMode;
  speed(): number;
  follow(): boolean;
  /** Audiobook autoplay: when false (and Repeat off) the queue stops after
   *  the current verse. Absent on older hosts = true. */
  autoplay?(): boolean;
  bookTitle(): string;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** The verse now playing (idx -1, id null: none). */
  onVerse(idx: number, id: string | null): void;
  onLine(line: number): void;
  /** Fluid fill: how far through `line` (0..1) playback is. Throttled to
   *  ~5% steps so screens redraw cheaply; optional (older hosts omit it). */
  onProgress?(line: number, frac: number): void;
  /** The word of the line now sounding (-1 none). Emitted on change only. */
  onWord?(word: number): void;
  onPlaying(playing: boolean): void;
  scrollTo(idx: number): void;
}

export const GAP_MS = 800;
export const PREFETCH_AT = 0.7;

export class ChantController {
  private player: PlayerLike | null = null;
  private ahead: { idx: number; player: PlayerLike } | null = null;
  private sub: { remove(): void } | null = null;
  private timer: unknown = null;
  private pending: number | null = null; // the verse waiting out the pause
  private ended = false; // the last verse played to its end
  private token = 0; // bumped by every start and release
  private idx = -1;
  private playing = false;
  private wordLine: number | null = null; // the line whose word spans are cached

  constructor(private host: ChantHost) {}

  get current(): number {
    return this.idx;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async start(idx: number, fromMs = 0): Promise<void> {
    const pages = this.host.pages();
    const v = pages[idx];
    if (!v?.chant?.url) {
      const n = nextChantIndex(pages, idx, 1);
      if (n >= 0) void this.start(n);
      else this.setPlaying(false);
      return;
    }
    // The next verse's player was built at 70% of this one: use it if this is that verse.
    const pre = this.ahead && this.ahead.idx === idx ? this.ahead.player : null;
    this.release(pre);
    if (pre) this.player = pre;
    const token = this.token;
    this.idx = idx;
    this.host.onVerse(idx, v.id);
    this.host.onLine(-1);
    this.wordLine = null;

    await this.host.ready();
    if (token !== this.token) return;
    const p = pre ?? this.host.createPlayer(this.host.resolve(v.chant.url));
    this.player = p;
    try {
      await this.host.prepareAudio();
    } catch { /* keep */ }
    if (token !== this.token) return;
    try { p.setPlaybackRate?.(this.host.speed(), "high"); } catch { /* keep */ }
    if (fromMs) {
      try { await p.seekTo(fromMs / 1000); } catch { /* keep */ }
      if (token !== this.token) return;
    }

    let prefetched = false;
    let finished = false;
    let lastLine = -2;
    let lastFrac = 0;
    let words: WordSpan[] = [];
    let lastWord = -2;
    this.sub = p.addListener("playbackStatusUpdate", (st) => {
      if (token !== this.token || !st.isLoaded) return;
      const tMs = st.currentTime * 1000;
      const line = lineAt(v.chant?.lines ?? [], tMs);
      this.host.onLine(line);
      // The fill for the karaoke bar: emitted on line changes and ~5% steps.
      const ln = (v.chant?.lines ?? []).find((l) => l.i === line);
      const frac = lineFill(ln, tMs);
      if (line !== lastLine || Math.abs(frac - lastFrac) >= 0.05 || frac >= 1) {
        lastLine = line;
        lastFrac = frac;
        try { this.host.onProgress?.(line, frac); } catch { /* keep */ }
      }
      // The word-level karaoke: spans follow the line, the index emits on change.
      if (line !== (this.wordLine ?? -2)) {
        this.wordLine = line;
        words = ln ? lineWords(ln) : [];
        lastWord = -2;
      }
      const w = line >= 0 ? wordAt(words, tMs) : -1;
      if (w !== lastWord) {
        lastWord = w;
        try { this.host.onWord?.(w); } catch { /* keep */ }
      }
      const durMs = (st.duration || (v.chant?.duration_ms ?? 0) / 1000) * 1000;
      if (!prefetched && durMs && tMs / durMs >= PREFETCH_AT && this.willContinue()) {
        prefetched = true;
        this.buildAhead(idx);
      }
      if (st.didJustFinish && !finished) {
        finished = true;
        this.finish(idx);
      }
    });
    p.play();
    this.setPlaying(true);
    try {
      p.setActiveForLockScreen?.(true, { title: v.source_ref, artist: this.host.bookTitle() });
    } catch { /* keep */ }
    if (this.host.follow()) {
      try { this.host.scrollTo(idx); } catch { /* keep */ }
    }
  }

  pause(): void {
    // Pausing in the pause between verses keeps the next verse waiting.
    this.clearTimer();
    try { this.player?.pause(); } catch { /* keep */ }
    this.setPlaying(false);
  }

  /** Play after a pause, or from nothing. `from` is the verse the page is on. */
  resume(from: number): void {
    if (this.playing) return;
    if (this.pending !== null) {
      const n = this.pending;
      this.pending = null;
      void this.start(n);
      return;
    }
    if (this.ended && this.idx >= 0) {
      // The last verse ended: play it again with a fresh player.
      void this.start(this.idx);
      return;
    }
    if (!this.player) {
      const n = nextChantIndex(this.host.pages(), from - 1, 1);
      if (n >= 0) void this.start(n);
      return;
    }
    try {
      this.player.play();
      this.setPlaying(true);
    } catch { /* keep */ }
  }

  toggle(from: number): void {
    if (this.playing) this.pause();
    else this.resume(from);
  }

  step(dir: 1 | -1, from: number): void {
    const cur = this.idx >= 0 ? this.idx : from;
    const n = nextChantIndex(this.host.pages(), cur, dir);
    if (n >= 0) void this.start(n);
  }

  setSpeed(rate: number): void {
    try { this.player?.setPlaybackRate?.(rate, "high"); } catch { /* keep */ }
  }

  /** Stop and let go of everything (leaving Chant mode, Learn, leaving the screen). */
  stop(): void {
    this.release();
    this.idx = -1;
    this.setPlaying(false);
    this.host.onVerse(-1, null);
  }

  /** Let go of everything without telling the screen (it is going away). */
  dispose(): void {
    this.release();
    this.idx = -1;
    this.playing = false;
  }

  private finish(idx: number): void {
    const plan = afterFinish(this.host.repeat(), this.host.pages(), idx, this.host.autoplay?.() ?? true);
    if (plan.kind === "repeat") {
      void this.start(idx);
    } else if (plan.kind === "next") {
      this.pending = plan.index;
      this.clearTimer();
      this.timer = this.host.setTimer(() => {
        this.timer = null;
        const n = this.pending;
        this.pending = null;
        if (n !== null) void this.start(n);
      }, GAP_MS);
    } else {
      this.ended = true;
      this.setPlaying(false);
    }
  }

  private buildAhead(idx: number): void {
    const pages = this.host.pages();
    const n = nextChantIndex(pages, idx, 1);
    const url = n >= 0 && this.willContinue() ? pages[n]?.chant?.url : undefined;
    if (!url || this.ahead?.idx === n) return;
    try {
      this.ahead = { idx: n, player: this.host.createPlayer(this.host.resolve(url)) };
    } catch { /* keep */ }
  }

  /** Whether the queue goes on after this verse (Repeat verse replays the
   *  same one, so nothing next is wanted); Repeat chapter continues to the
   *  next even with autoplay off. */
  private willContinue(): boolean {
    const r = this.host.repeat();
    if (r === "verse") return false;
    if (r === "chapter") return true;
    return this.host.autoplay?.() ?? true;
  }

  /** Frees every player except `keep` (the prefetched one about to be used). */
  private release(keep?: PlayerLike | null): void {
    this.token += 1;
    this.clearTimer();
    this.pending = null;
    this.ended = false;
    try { this.sub?.remove(); } catch { /* gone */ }
    this.sub = null;
    for (const p of [this.player, this.ahead?.player]) {
      if (p && p !== keep) this.free(p);
    }
    this.player = null;
    this.ahead = null;
  }

  private free(p: PlayerLike): void {
    try { p.setActiveForLockScreen?.(false); } catch { /* gone */ }
    try { p.pause(); } catch { /* gone */ }
    // v57 docs: AudioPlayer.remove() frees the player (web also has release()).
    try { p.remove?.(); } catch { /* gone */ }
    try { p.release?.(); } catch { /* gone */ }
  }

  private clearTimer(): void {
    if (this.timer !== null) this.host.clearTimer(this.timer);
    this.timer = null;
  }

  private setPlaying(on: boolean): void {
    if (this.playing === on) return;
    this.playing = on;
    this.host.onPlaying(on);
  }
}

export default ChantController;
