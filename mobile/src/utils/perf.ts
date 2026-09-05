/**
 * Stage timings for the listen → transcribe → reply → speak pipeline.
 *
 * A turn is four serial network hops and the wall clock only ever reports
 * their sum, so "the reply takes four seconds" is not actionable — three of
 * those seconds could be the LLM or could be TTS and the outside cannot tell.
 * A Timeline marks each hop as it lands and prints one line with the
 * dominant stage named, which is the thing worth attacking.
 *
 * Dev-only: `report()` is a no-op in a release build, so the marks cost a
 * Date.now() each and nothing else.
 */

interface Stage {
  label: string;
  ms: number;
}

export class Timeline {
  private readonly t0 = Date.now();
  private last = this.t0;
  private readonly stages: Stage[] = [];
  private reported = false;

  constructor(private readonly name: string) {}

  /** Close the stage that has been running since the previous mark. */
  mark(label: string): void {
    const now = Date.now();
    this.stages.push({ label, ms: now - this.last });
    this.last = now;
  }

  get totalMs(): number {
    return Date.now() - this.t0;
  }

  /**
   * Print the breakdown. Safe to call more than once — only the first call
   * prints, because a turn can end either at the audio or at an error and
   * both paths report.
   */
  report(note = ""): void {
    if (this.reported) return;
    this.reported = true;
    if (!__DEV__ || this.stages.length === 0) return;

    const total = this.totalMs;
    const worst = this.stages.reduce((a, b) => (b.ms > a.ms ? b : a));
    const parts = this.stages
      .map((s) => `${s.label} ${s.ms}ms${s === worst ? "*" : ""}`)
      .join("  →  ");
    console.log(
      `[perf] ${this.name}  ${parts}  ══ ${total}ms total` +
        `  (slowest: ${worst.label} ${Math.round((worst.ms / Math.max(1, total)) * 100)}%)` +
        (note ? `  ${note}` : ""),
    );
  }
}

export const startTimeline = (name: string): Timeline => new Timeline(name);

export default { startTimeline, Timeline };
