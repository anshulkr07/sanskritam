// versePlayer: one audio player for the Learn screen's Listen and Practise
// steps (handover_games_daily_multiplayer §7 Listen). Plain TypeScript with an
// injected player factory, so scripts/check-recite.mjs drives it in Node.
//
//   • One player at a time: a new request stops the previous one first.
//   • Lines end on playback position (the player's own status updates),
//     never on a timer; "each line ×3" moves on when a line has finished.
//   • Speed applies to every play; stop() really stops.

import type { ChantLine } from "../api/client";
import { lineAt } from "./chantClock";

export interface PlayerLike {
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void> | void;
  setPlaybackRate?(rate: number, quality?: string): void;
  addListener(event: "playbackStatusUpdate", fn: (st: { currentTime: number; didJustFinish?: boolean; isLoaded?: boolean }) => void): { remove(): void };
  remove(): void;
}

export interface VersePlayerHost {
  create(url: string): PlayerLike;
  /** The line now sounding (-1 when silent). */
  onLine(i: number): void;
  onPlaying(playing: boolean): void;
}

/** Margin after a line's end before pausing, so the last syllable rings. */
export const TAIL_MS = 120;

export class VersePlayer {
  private player: PlayerLike | null = null;
  private url = "";
  private token = 0;
  private sub: { remove(): void } | null = null;
  speed = 1;

  constructor(private host: VersePlayerHost, private lines: ChantLine[]) {}

  setLines(lines: ChantLine[]): void {
    this.lines = lines;
  }

  private ensure(url: string): PlayerLike {
    if (!this.player || this.url !== url) {
      this.release();
      this.player = this.host.create(url);
      this.url = url;
    }
    return this.player;
  }

  private clearSub(): void {
    this.sub?.remove();
    this.sub = null;
  }

  /** Stop whatever is playing; pending play promises resolve false. */
  stop(): void {
    this.token++;
    this.clearSub();
    try { this.player?.pause(); } catch { /* gone */ }
    this.host.onLine(-1);
    this.host.onPlaying(false);
  }

  release(): void {
    this.stop();
    try { this.player?.remove(); } catch { /* gone */ }
    this.player = null;
    this.url = "";
  }

  /** Play one line once. Resolves true when it reached its end, false when
   *  something else stopped it. */
  async playLine(url: string, i: number): Promise<boolean> {
    const ln = this.lines.find((l) => l.i === i);
    if (!ln) return false;
    // ensure() may swap players (which stops); take the token after it.
    const p = this.ensure(url);
    this.stop();
    const my = ++this.token;
    try { p.setPlaybackRate?.(this.speed, "high"); } catch { /* keep */ }
    await p.seekTo(ln.start_ms / 1000);
    if (my !== this.token) return false;
    this.host.onLine(i);
    this.host.onPlaying(true);
    return new Promise<boolean>((resolve) => {
      const end = ln.end_ms + TAIL_MS;
      // A stop() from elsewhere bumps the token: resolve false then.
      const watch = setInterval(() => {
        if (my !== this.token) {
          clearInterval(watch);
          resolve(false);
        }
      }, 200);
      this.sub = p.addListener("playbackStatusUpdate", (st) => {
        if (my !== this.token) return;
        if (st.currentTime * 1000 >= end || st.didJustFinish) {
          clearInterval(watch);
          this.clearSub();
          try { p.pause(); } catch { /* gone */ }
          this.host.onLine(-1);
          this.host.onPlaying(false);
          resolve(true);
        }
      });
      try { p.play(); } catch { this.stop(); }
    });
  }

  /** The whole verse: straight through, or each line `repeats` times in
   *  turn. Resolves true when everything played. */
  async playVerse(url: string, repeats = 1): Promise<boolean> {
    if (repeats > 1) {
      for (const ln of this.lines) {
        for (let k = 0; k < repeats; k++) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await this.playLine(url, ln.i);
          if (!ok) return false;
        }
      }
      return true;
    }
    const p = this.ensure(url);
    this.stop();
    const my = ++this.token;
    try { p.setPlaybackRate?.(this.speed, "high"); } catch { /* keep */ }
    await p.seekTo(0);
    if (my !== this.token) return false;
    this.host.onPlaying(true);
    return new Promise<boolean>((resolve) => {
      const last = this.lines.length ? Math.max(...this.lines.map((l) => l.end_ms)) + TAIL_MS : Infinity;
      let current = -2;
      const watch = setInterval(() => {
        if (my !== this.token) {
          clearInterval(watch);
          resolve(false);
        }
      }, 200);
      this.sub = p.addListener("playbackStatusUpdate", (st) => {
        if (my !== this.token) return;
        const ms = st.currentTime * 1000;
        const at = lineAt(this.lines, ms);
        if (at !== current) {
          current = at;
          this.host.onLine(at);
        }
        if (st.didJustFinish || ms >= last) {
          clearInterval(watch);
          this.clearSub();
          try { p.pause(); } catch { /* gone */ }
          this.host.onLine(-1);
          this.host.onPlaying(false);
          resolve(true);
        }
      });
      try { p.play(); } catch { this.stop(); }
    });
  }
}
