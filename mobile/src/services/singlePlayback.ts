// Holds a tap guard through both asynchronous loading and actual playback.
// Kept apart from React/native audio so latency races can be checked in Node.
export interface PlaybackHandle {
  stop(): Promise<void>;
}

export class SinglePlayback {
  private active: { handle: PlaybackHandle | null; finish(): void } | null = null;

  get busy(): boolean {
    return this.active !== null;
  }

  async play(load: (onComplete: () => void, signal: AbortSignal) => Promise<PlaybackHandle | null>): Promise<void> {
    if (this.active) return;
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => { resolveDone = resolve; });
    const abort = new AbortController();
    const session = {
      handle: null as PlaybackHandle | null,
      finish: () => {
        if (this.active !== session) return;
        this.active = null;
        abort.abort();
        void session.handle?.stop().catch(() => {});
        resolveDone();
      },
    };
    // Set before the first await: multiple taps in one render are guarded too.
    this.active = session;
    try {
      const handle = await load(session.finish, abort.signal);
      if (this.active !== session) {
        // The screen left, or completion fired before the handle arrived.
        await handle?.stop();
        return;
      }
      session.handle = handle;
      if (!handle) session.finish();
      await done;
    } catch (error) {
      if (this.active !== session) return;
      session.finish();
      throw error;
    }
  }

  stop(): void {
    this.active?.finish();
  }
}
