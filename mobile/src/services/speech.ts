// Speech playback service — imperative Bulbul TTS via expo-audio (SDK 57).
// The recorder is hook-based and lives in the talking-agent screen; this
// module owns `speak()` and mode setup that is callable from any component.

import { clearPreloadedSource, preload, setAudioModeAsync } from "expo-audio";
import { createManagedAudioPlayer } from "./managedAudio";
import { Platform } from "react-native";

import { TtsAudioCache } from "./ttsAudioCache";

const IS_WEB = Platform.OS === "web";
const GAME_ROUTES = new Set(["Smriti", "ShabdaRush", "VarnaJaal", "WordGroups", "PadaPath", "NumberBuilder", "RoomLobby"]);
let speechRoute = "";
let routeVersion = 0;
export function setSpeechRoute(route: string): void {
  if (speechRoute !== route) { speechRoute = route; routeVersion++; }
}

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
  // Native Sanskrit beta. Bridge-language text keeps its own language code.
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
  const code = lang.toLowerCase().split("-")[0];
  return BULBUL[(code === "od" ? "or" : code) as SpeakLang] ?? "hi-IN";
}

export interface SpeakHandle {
  stop: () => Promise<void>;
  durationHint: number; // in seconds
}

let activePlayback: (() => void) | null = null;
const preloadedClips = new Map<string, Promise<void>>();

/** Buffer only recordings the learner is about to hear; never synthesise speculatively. */
export async function preloadClip(url?: string): Promise<void> {
  if (!url?.trim()) return;
  const { BASE_URL } = await import("../config");
  const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const pending = preloadedClips.get(src);
  if (pending) return pending;
  const loading = Promise.resolve().then(() => preload(src)).catch(() => {
    if (preloadedClips.get(src) === loading) preloadedClips.delete(src);
  });
  preloadedClips.set(src, loading);
  // Keep only three nearby clips, including buffers retained by Android/web.
  if (preloadedClips.size > 3) {
    const oldest = preloadedClips.keys().next().value!;
    const ready = preloadedClips.get(oldest)!;
    preloadedClips.delete(oldest);
    void ready.then(() => {
      if (!preloadedClips.has(oldest)) return clearPreloadedSource(oldest);
    }).catch(() => {});
  }
  return loading;
}

/**
 * Keep exactly these clips buffered: load the ones missing, release the rest.
 * A lesson passes the clips of the card on screen and the three cards each way
 * (story/audioWindow.ts), so a swipe never waits on the network.
 */
export async function holdClips(urls: string[]): Promise<void> {
  const { BASE_URL } = await import("../config");
  const wanted = urls.filter(url => url?.trim()).map(url => (url.startsWith("http") ? url : `${BASE_URL}${url}`));
  const keep = new Set(wanted);
  for (const src of [...preloadedClips.keys()]) {
    if (keep.has(src)) continue;
    preloadedClips.delete(src);
    void Promise.resolve().then(() => clearPreloadedSource(src)).catch(() => {});
  }
  for (const src of wanted) {
    if (preloadedClips.has(src)) continue;
    const loading = Promise.resolve().then(() => preload(src)).catch(() => {
      if (preloadedClips.get(src) === loading) preloadedClips.delete(src);
    });
    preloadedClips.set(src, loading);
  }
}

export async function setPlaybackMode(): Promise<void> {
  if (IS_WEB) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
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
  signal?: AbortSignal,
): SpeakHandle {
  if (signal?.aborted) throw new Error("Playback cancelled");
  activePlayback?.();
  const player = createManagedAudioPlayer(src, undefined, "Spoken audio");
  // iOS transfers the preloaded source to the player; it can be warmed again.
  if (Platform.OS === "ios") preloadedClips.delete(src);

  let started = false;
  let finished = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let sub: { remove(): void } | null = null;

  const cleanup = () => {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    try { sub?.remove(); } catch { /* already gone */ }
    try { player.pause(); } catch { /* already gone */ }
    try { player.remove(); } catch { /* already gone */ }
    if (activePlayback === finish) activePlayback = null;
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete?.();
  };

  const armTimeout = (seconds: number) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(finish, (seconds + 3) * 1000);
  };

  sub = player.addListener("playbackStatusUpdate", (st) => {
    if (finished) return;
    // "Audible", not "asked to play": loading a clip takes a few hundred ms
    // and a mouth started at call time runs that far ahead of the voice.
    if (!started && st.isLoaded && st.playing && st.currentTime > 0) {
      started = true;
      onStart?.((st.duration > 0 ? st.duration : durationHint) * 1000);
    }
    // A clip's duration is unknown at creation. Keep the backstop beyond its
    // actual remaining time instead of treating every verse as a 2-second clip.
    if (!st.playing && timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (st.playing && st.isLoaded && st.duration > 0) {
      armTimeout(Math.max(0, st.duration - st.currentTime));
    }
    if (st.didJustFinish) finish();
  });

  activePlayback = finish;
  try {
    // Allow a slow download before we have a duration/status to work with.
    armTimeout(Math.max(30, durationHint));
    player.play();
  } catch (error) {
    finished = true;
    cleanup();
    throw error;
  }

  return {
    stop: async () => {
      if (finished) return;
      finished = true;
      cleanup();
    },
    durationHint,
  };
}

/** ~0.08 s per character — only ever a fallback; the player reports the truth. */
const hintFor = (text: string) => Math.max(1, text.length * 0.08);

const ttsCache = new TtsAudioCache();

export async function speak(
  text: string,
  lang: SpeakLang | string = "sa",
  pace = 1.0,
  onComplete?: () => void,
  onStart?: (durationMs: number) => void,
  signal?: AbortSignal,
): Promise<SpeakHandle> {
  if (signal?.aborted) throw new Error("Playback cancelled");
  const version = routeVersion;
  const silent = () => { onComplete?.(); return { stop: async () => {}, durationHint: 0 }; };
  if (GAME_ROUTES.has(speechRoute)) return silent();
  const language = bulbulLangCode(lang);
  const key = JSON.stringify([language, "aditya", pace, text]);
  const [, res] = await Promise.all([setPlaybackMode(), ttsCache.get(key, async () => {
    const { api } = await import("../api/client");
    return api.tts(text, language, "aditya", pace);
  })]);
  if (version !== routeVersion || GAME_ROUTES.has(speechRoute)) return silent();
  return playSource(
    `data:audio/wav;base64,${res.audio_base64}`,
    res.duration_hint || hintFor(text),
    onComplete,
    onStart,
    signal,
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
  if (!audioBase64?.trim() && !url?.trim()) {
    return speak(text, lang, 1.0, onComplete, onStart);
  }
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
  if (url && url.trim()) {
    const { BASE_URL } = await import("../config");
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const [, exists] = await Promise.all([setPlaybackMode(), clipExists(src)]);
    if (exists) return playSource(src, 1.5, onComplete);
  }
  return speak(text, lang, 1.0, onComplete);
}

/**
 * Grammar guide: play one pre-rendered clip. Unlike playTutorAudio there is no
 * live-TTS fallback — the guide only shows a speaker when a clip exists, so a
 * missing file stays silent instead of spending a synthesis call.
 */
export async function playClip(url: string, onComplete?: () => void, signal?: AbortSignal): Promise<SpeakHandle | null> {
  if (!url || !url.trim()) return null;
  await setPlaybackMode();
  const { BASE_URL } = await import("../config");
  const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  return playSource(src, 2, onComplete, undefined, signal);
}

export default { speak, playLetter, playTutorAudio, playClip, setPlaybackMode, bulbulLangCode };
