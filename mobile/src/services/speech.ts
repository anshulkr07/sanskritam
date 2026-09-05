// Speech playback service — imperative Bulbul TTS via expo-audio (SDK 57).
// The recorder is hook-based and lives in the talking-agent screen; this
// module owns `speak()` and mode setup that is callable from any component.

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

export function bulbulLangCode(lang: "sa" | "hi" | "en"): string {
  // 'sa' renders hi-IN until the sa-IN beta flag lands (architecture §4.1).
  if (lang === "en") return "en-IN";
  return "hi-IN";
}

export interface SpeakHandle {
  stop: () => Promise<void>;
  durationHint: number; // in seconds
}

export async function setPlaybackMode(): Promise<void> {
  if (IS_WEB) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    /* non-fatal */
  }
}

/**
 * One player, one set of listeners, for every source we can hand expo-audio.
 *
 * The url path and the live-TTS path used to be separate implementations and
 * only the url one grew the `onStart` hook, so the lip sync still ran ahead of
 * the voice on any line without pre-rendered audio — which in LLM mode is
 * every line. Both now go through here.
 */
function playSource(
  src: string,
  durationHint: number,
  onComplete?: () => void,
  onStart?: (durationMs: number) => void,
): SpeakHandle {
  const player = createAudioPlayer(src);

  let started = false;
  let finished = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    try { sub.remove(); } catch { /* already gone */ }
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete?.();
  };

  const sub = player.addListener("playbackStatusUpdate", (st) => {
    // "Audible", not "asked to play": loading a clip takes a few hundred ms
    // and a mouth started at call time runs that far ahead of the voice.
    if (!started && st.isLoaded && st.playing && st.currentTime > 0) {
      started = true;
      onStart?.((st.duration > 0 ? st.duration : durationHint) * 1000);
    }
    if (st.didJustFinish) finish();
  });

  player.play();
  // Backstop, in case the status listener never lands.
  timeoutId = setTimeout(finish, (durationHint + 3) * 1000);

  return {
    stop: async () => {
      finished = true;
      cleanup();
      try { player.pause(); } catch { /* already ended */ }
    },
    durationHint,
  };
}

/** ~0.08 s per character — only ever a fallback; the player reports the truth. */
const hintFor = (text: string) => Math.max(1, text.length * 0.08);

export async function speak(
  text: string,
  lang: "sa" | "hi" | "en" = "sa",
  pace = 1.0,
  onComplete?: () => void,
  onStart?: (durationMs: number) => void,
): Promise<SpeakHandle> {
  await setPlaybackMode();
  const { api } = await import("../api/client");
  const res = await api.tts(text, bulbulLangCode(lang), "aditya", pace);
  return playSource(
    `data:audio/wav;base64,${res.audio_base64}`,
    res.duration_hint || hintFor(text),
    onComplete,
    onStart,
  );
}

/**
 * P17-3: play a tutor node's line.
 *
 * Source preference, cheapest first:
 *   1. `audioBase64` — the turn response carried the audio with it. No extra
 *      request at all; this is why the backend synthesises inline.
 *   2. `url` — a pre-rendered static file (zero Sarvam calls, zero quota).
 *   3. Live Bulbul TTS, one more round trip, still metered.
 */
export async function playTutorAudio(
  url: string,
  text: string,
  lang: "sa" | "hi" | "en" = "sa",
  onComplete?: () => void,
  /**
   * Fired when audio is ACTUALLY audible, with the file's real duration.
   * Drive the mouth from here, not from the call site.
   */
  onStart?: (durationMs: number) => void,
  audioBase64?: string,
): Promise<SpeakHandle> {
  await setPlaybackMode();

  if (audioBase64 && audioBase64.trim()) {
    return playSource(
      `data:audio/wav;base64,${audioBase64}`,
      hintFor(text),
      onComplete,
      onStart,
    );
  }

  if (url && url.trim()) {
    const { BASE_URL } = await import("../config");
    // URL may be absolute (production CDN) or relative (/audio/...) — join.
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    return playSource(src, hintFor(text), onComplete, onStart);
  }

  return speak(text, lang, 1.0, onComplete, onStart);
}

export default { speak, playTutorAudio, setPlaybackMode, bulbulLangCode };
