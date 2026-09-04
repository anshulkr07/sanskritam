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

export async function speak(
  text: string,
  lang: "sa" | "hi" | "en" = "sa",
  pace = 1.0,
  onComplete?: () => void,
): Promise<SpeakHandle> {
  await setPlaybackMode();
  const { api } = await import("../api/client");
  const res = await api.tts(text, bulbulLangCode(lang), "aditya", pace);
  const src = `data:audio/wav;base64,${res.audio_base64}`;
  const player = createAudioPlayer(src);
  
  // Fallback duration if the API doesn't provide one (approximate based on char count)
  const durationHint = res.duration_hint || Math.max(1, text.length * 0.08);
  
  player.play();

  // Expo Audio (SDK 57) doesn't have a simple onEnded promise out of the box
  // without attaching listeners. For v1, we use the duration_hint from the API
  // to fire the onComplete callback.
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (onComplete) {
    timeoutId = setTimeout(() => {
      onComplete();
    }, durationHint * 1000);
  }

  return {
    stop: async () => {
      try {
        if (timeoutId) clearTimeout(timeoutId);
        player.pause();
      } catch {
        /* already ended */
      }
    },
    durationHint,
  };
}

/**
 * P17-3: play a tutor node's line, preferring the PRE-RENDERED audio_url when
 * present (zero Sarvam calls, zero quota — it is a static file) and only
 * falling back to live Bulbul TTS for authored-but-unrendered nodes.
 *
 * `url` is the backend's /audio/<path>; the app serves it from the same origin
 * as BASE_URL. The backend's NodeOut carries audio_url already, so callers pass
 * it straight through.
 */
export async function playTutorAudio(
  url: string,
  text: string,
  lang: "sa" | "hi" | "en" = "sa",
  onComplete?: () => void,
): Promise<SpeakHandle> {
  await setPlaybackMode();
  if (url && url.trim()) {
    const { BASE_URL } = await import("../config");
    // URL may be absolute (production CDN) or relative (/audio/...) — join.
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const player = createAudioPlayer(src);
    player.play();
    // Rough duration: ~0.08s per char is close enough for the skip-on-complete
    // choreography; no TTS round-trip and no explicit duration are available
    // for a static file.
    const durationHint = Math.max(1, text.length * 0.08);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (onComplete) {
      timeoutId = setTimeout(() => onComplete(), durationHint * 1000);
    }
    return {
      stop: async () => {
        try {
          if (timeoutId) clearTimeout(timeoutId);
          player.pause();
        } catch { /* already ended */ }
      },
      durationHint,
    };
  }
  // No pre-rendered audio — live TTS (the P17-2 fallback; still metered).
  return speak(text, lang, 1.0, onComplete);
}

export default { speak, playTutorAudio, setPlaybackMode, bulbulLangCode };