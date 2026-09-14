/**
 * Waiting for a stopped recording to be readable.
 *
 * `recorder.stop()` resolves when the native recorder has stopped, which is
 * not quite the same as the encoder having flushed the last block to disk.
 * The old guard for that was `await sleep(300)` — a number picked to be
 * comfortably larger than the real wait, which means it was wrong twice: it
 * spent 300 ms of the learner's turn on every attempt, and it would still
 * have raced on a slow device.
 *
 * Polling for the file to exist and stop growing costs one or two ticks in
 * practice and actually answers the question being asked.
 */

const TICK_MS = 20;

export interface RecorderLike {
  uri: string | null;
}

export async function settledRecordingUri(
  recorder: RecorderLike,
  // 800 → 400: the encoder flush is 1–2 ticks (20ms) in practice; the old
  // 800ms cap spent most of a slow turn doing nothing. Timeout still hands
  // back whatever exists so the upload reports the real failure.
  timeoutMs = 400,
): Promise<string | null> {
  let FileSystem: any;
  try {
    FileSystem = require("expo-file-system/legacy");
  } catch {
    // No filesystem module (web). Nothing to wait on.
    return recorder.uri;
  }

  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;

  while (Date.now() < deadline) {
    const uri = recorder.uri;
    if (uri) {
      try {
        const info = await FileSystem.getInfoAsync(uri, { size: true });
        const size: number = info?.size ?? 0;
        // Stable across two consecutive polls: the encoder is done writing.
        if (info?.exists && size > 0 && size === lastSize) return uri;
        lastSize = size;
      } catch {
        /* not on disk yet — keep waiting */
      }
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }

  // Timed out. Hand back whatever there is and let the upload report the
  // real failure, exactly as the fixed sleep would have.
  return recorder.uri;
}

export default { settledRecordingUri };
