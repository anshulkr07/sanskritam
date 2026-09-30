// Speech playback service — imperative Bulbul TTS via expo-audio (SDK 57).
// The recorder is hook-based and lives in the talking-agent screen; this
// module owns `speak()` and mode setup that is callable from any component.

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

import type { TTSResponse } from "../api/client";

const IS_WEB = Platform.OS === "web";

/**
 * A language this app can speak: Sanskrit, or any of Sarvam's ten bridge
 * languages. Widened from `"sa" | "hi" | "en"` on 2026-09-22 when Talk became
 * multilingual — the narrow type was not merely incomplete, it made the bug
 * below untypeable.
 */
export type SpeakLang =
  | "sa" | "en" | "hi" | "mr" | "bn" | "gu" | "pa" | "or" | "ta" | "te" | "kn" | "ml";

/** Sarvam TTS code for each. */
const BULBUL: Record<SpeakLang, string> = {
  // Sanskrit is sent AS Sanskrit and the server picks the voice
  // (TTS_SANSKRIT_CODE): Bulbul has no sa-IN outside beta, so today that is
  // the Hindi voice (architecture §4.1), and flipping it once the beta lands
  // needs no app release. Needs a backend that maps sa-IN — deploy it first.
  // Every OTHER language uses its own voice: this function used to be
  // `lang === "en" ? "en-IN" : "hi-IN"`, which read a Kannada or Telugu reply
  // aloud in Hindi.
  sa: "sa-IN",
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  or: "od-IN",   // Sarvam spells Odia "od-IN"; ISO 639-1 is "or".
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
};

export function bulbulLangCode(lang: string): string {
  return BULBUL[lang as SpeakLang] ?? "hi-IN";
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

// Short strings (a letter, a word) are spoken again and again: every tap on a
// varṇa used to be a fresh ~900 ms synthesis round trip that also spent
// quota. Keep the last few in memory so a repeat tap is instant and free.
const TTS_CACHE_MAX_CHARS = 16;
const TTS_CACHE_MAX_ENTRIES = 80;
const ttsCache = new Map<string, TTSResponse>();

export async function speak(
  text: string,
  lang: SpeakLang | string = "sa",
  pace = 1.0,
  onComplete?: () => void,
  onStart?: (durationMs: number) => void,
): Promise<SpeakHandle> {
  await setPlaybackMode();
  const cacheable = text.length <= TTS_CACHE_MAX_CHARS;
  const key = `${bulbulLangCode(lang)}|${pace}|${text}`;
  let res = cacheable ? ttsCache.get(key) : undefined;
  if (!res) {
    const { api } = await import("../api/client");
    const fresh = await api.tts(text, bulbulLangCode(lang), "aditya", pace);
    if (cacheable && fresh?.audio_base64) {
      ttsCache.set(key, fresh);
      if (ttsCache.size > TTS_CACHE_MAX_ENTRIES) {
        const oldest = ttsCache.keys().next().value;
        if (oldest !== undefined) ttsCache.delete(oldest);
      }
    }
    res = fresh;
  }
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
  lang: SpeakLang | string = "sa",
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

// Whether a pre-rendered clip exists, asked once per URL. The server sends a
// clip path for every letter as a naming convention, but the bank may not be
// rendered (or only partly), and playing a 404 is silent. After two misses
// with no hit the bank is assumed absent and the check stops.
const clipKnown = new Map<string, boolean>();
let clipHits = 0;
let clipMisses = 0;

async function clipExists(src: string): Promise<boolean> {
  const known = clipKnown.get(src);
  if (known !== undefined) return known;
  if (clipHits === 0 && clipMisses >= 2) return false;
  try {
    const ok = (await fetch(src, { method: "HEAD" })).ok;
    clipKnown.set(src, ok);
    if (ok) clipHits += 1;
    else clipMisses += 1;
    return ok;
  } catch {
    return false; // offline: not a verdict on the file, so nothing is remembered
  }
}

/**
 * One letter: the pre-rendered clip when the server has it, otherwise
 * (cached) TTS. Free and instant when the clip exists; still correct when not.
 */
export async function playLetter(
  url: string | undefined,
  text: string,
  lang: SpeakLang | string = "sa",
  onComplete?: () => void,
): Promise<SpeakHandle> {
  await setPlaybackMode();
  if (url && url.trim()) {
    const { BASE_URL } = await import("../config");
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    if (await clipExists(src)) return playSource(src, 1.5, onComplete);
  }
  return speak(text, lang, 1.0, onComplete);
}

/**
 * Grammar guide: play one pre-rendered clip. Unlike playTutorAudio there is no
 * live-TTS fallback — the guide only shows a speaker when a clip exists, so a
 * missing file stays silent instead of spending a synthesis call.
 */
export async function playClip(url: string, onComplete?: () => void): Promise<SpeakHandle | null> {
  if (!url || !url.trim()) return null;
  await setPlaybackMode();
  const { BASE_URL } = await import("../config");
  const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  return playSource(src, 2, onComplete);
}

export default { speak, playLetter, playTutorAudio, playClip, setPlaybackMode, bulbulLangCode };
