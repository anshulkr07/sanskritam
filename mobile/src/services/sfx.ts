// UI sound effects — short, synthesized tones (no licensed audio assets).
// Players are created lazily and reused; seekTo(0) + play() replays them on
// each trigger without allocating a new player per tap. No-ops on web where
// autoplay-without-gesture can throw.

import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

const SOURCES = {
  correct: require("../../assets/sfx/correct.wav"),
  near: require("../../assets/sfx/near.wav"),
  incorrect: require("../../assets/sfx/incorrect.wav"),
  tap: require("../../assets/sfx/tap.wav"),
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
  if (IS_WEB) return; // avoid autoplay-policy rejections cluttering the console
  try {
    const p = getPlayer(name);
    await p.seekTo(0);
    p.play();
  } catch {
    /* non-fatal — a missing sound should never block a lesson */
  }
}

export const sfx = {
  correct: () => playSfx("correct"),
  near: () => playSfx("near"),
  incorrect: () => playSfx("incorrect"),
  tap: () => playSfx("tap"),
};

export default sfx;
