// cues: the spoken and tone cues of an eyes-closed recitation
// (handover_games_daily_multiplayer §7). Bundled clips, so they play offline
// and instantly: "Close your eyes; begin after the tone", the tone itself,
// countdown ticks, and "Finished. You can open your eyes." English or Hindi
// by the app language. They play whatever the sound-effects setting says:
// a learner with closed eyes needs them. Each resolves when the clip ends,
// so nothing is ever recorded over a cue.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

import { getLang } from "../i18n";

const SOURCES = {
  tone: require("../../assets/recite/tone.wav"),
  tick: require("../../assets/recite/tick.wav"),
  "close.en": require("../../assets/recite/close.en.wav"),
  "close.hi": require("../../assets/recite/close.hi.wav"),
  "done.en": require("../../assets/recite/done.en.wav"),
  "done.hi": require("../../assets/recite/done.hi.wav"),
} as const;

type Clip = keyof typeof SOURCES;
export type Cue = "tone" | "tick" | "close" | "done";

const players: Partial<Record<Clip, AudioPlayer>> = {};

function clipFor(cue: Cue): Clip {
  if (cue === "tone" || cue === "tick") return cue;
  return `${cue}.${getLang() === "hi" ? "hi" : "en"}` as Clip;
}

/** Load every clip ahead of the countdown so none waits on the disk. */
export function preloadCues(): void {
  if (Platform.OS === "web") return;
  for (const name of Object.keys(SOURCES) as Clip[]) {
    try {
      if (!players[name]) players[name] = createAudioPlayer(SOURCES[name]);
    } catch { /* missing module: cues stay silent */ }
  }
}

/** Play a cue and resolve when it has finished (or after `maxMs`). */
export async function playCue(cue: Cue, maxMs = 5000): Promise<void> {
  if (Platform.OS === "web") return;
  const name = clipFor(cue);
  let p = players[name];
  try {
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      players[name] = p;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
    await p.seekTo(0);
  } catch {
    return;
  }
  const player = p;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub.remove();
      resolve();
    };
    const timer = setTimeout(finish, maxMs);
    const sub = player.addListener("playbackStatusUpdate", (st) => {
      if (st.didJustFinish) finish();
    });
    try {
      player.play();
    } catch {
      finish();
    }
  });
}

export function releaseCues(): void {
  for (const name of Object.keys(players) as Clip[]) {
    try { players[name]?.remove(); } catch { /* gone */ }
    delete players[name];
  }
}
