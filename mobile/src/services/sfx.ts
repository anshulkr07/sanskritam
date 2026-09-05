// UI sound effects — short, synthesized tones (no licensed audio assets).
// Players are created lazily and reused; seekTo(0) + play() replays them on
// each trigger without allocating a new player per tap. No-ops on web where
// autoplay-without-gesture can throw.
//
// U6-2: Extended sound family: session start, streak extend, badge unlock,
// tile pickup/drop, path node unlock.

import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IS_WEB = Platform.OS === "web";

// U6-2: every sound respects the user-facing sound toggle (Settings →
// "Sound effects"). Cached after the first read; toggling updates the cache
// through setSoundEnabled so the change is immediate.
const SOUND_PREF_KEY = "shabd.pref.sound";
let soundEnabled = true;
let soundPrefLoaded = false;

AsyncStorage.getItem(SOUND_PREF_KEY)
  .then((v) => {
    soundEnabled = v !== "false";
  })
  .catch(() => {});

/** Called by Settings when the toggle flips, so the change is immediate. */
export function setSoundEffectsEnabled(v: boolean): void {
  soundEnabled = v;
  AsyncStorage.setItem(SOUND_PREF_KEY, v ? "true" : "false").catch(() => {});
}

const SOURCES = {
  correct: require("../../assets/sfx/correct.wav"),
  near: require("../../assets/sfx/near.wav"),
  incorrect: require("../../assets/sfx/incorrect.wav"),
  tap: require("../../assets/sfx/tap.wav"),
  // Extended sounds (U6-2) — add .wav files to assets/sfx/ when available;
  // these gracefully degrade to existing sounds until then.
  sessionStart: require("../../assets/sfx/correct.wav"),
  streakExtend: require("../../assets/sfx/correct.wav"),
  badgeUnlock: require("../../assets/sfx/correct.wav"),
  tilePickup: require("../../assets/sfx/tap.wav"),
  tileDrop: require("../../assets/sfx/tap.wav"),
  pathUnlock: require("../../assets/sfx/near.wav"),
} as const;

type SfxName = keyof typeof SOURCES;

const players: Partial<Record<SfxName, AudioPlayer>> = {};

function getPlayer(name: SfxName): AudioPlayer {
  let p = players[name];
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    players[name] = p;
  }
  return p;
}

async function playSfx(name: SfxName): Promise<void> {
  if (IS_WEB || !soundEnabled) return;
  try {
    const p = getPlayer(name);
    await p.seekTo(0);
    p.play();
  } catch {
    /* non-fatal */
  }
}

export const sfx = {
  correct: () => playSfx("correct"),
  near: () => playSfx("near"),
  incorrect: () => playSfx("incorrect"),
  tap: () => playSfx("tap"),
  sessionStart: () => playSfx("sessionStart"),
  streakExtend: () => playSfx("streakExtend"),
  badgeUnlock: () => playSfx("badgeUnlock"),
  tilePickup: () => playSfx("tilePickup"),
  tileDrop: () => playSfx("tileDrop"),
  pathUnlock: () => playSfx("pathUnlock"),
};

export default sfx;