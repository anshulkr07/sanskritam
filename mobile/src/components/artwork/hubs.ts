import { remoteArtwork } from "./remoteArtwork";
import type { ImageSourcePropType } from "react-native";

// Stable IDs and static requires keep all hub artwork available offline.
const paintings: Record<string, ImageSourcePropType> = {
  "play:leaderboard": remoteArtwork("games/leaderboard-v2.webp"),
  "play:friends": remoteArtwork("games/friends-v2.webp"),
  "play:quick": remoteArtwork("games/quick-v2.webp"),
  "learn:tables": remoteArtwork("learn/tables-v2.webp"),
  "learn:advanced": remoteArtwork("learn/advanced-v2.webp"),
  "learn:verse": remoteArtwork("learn/verse-v2.webp"),
  "learn:library": remoteArtwork("learn/library-v2.webp"),

  "grammar:continue": remoteArtwork("hubs/grammar-continue.webp"),
  "grammar:start": remoteArtwork("hubs/grammar-start.webp"),
  "grammar:sounds": remoteArtwork("hubs/grammar-sounds.webp"),
  "grammar:nouns": remoteArtwork("hubs/grammar-nouns.webp"),
  "grammar:cases": remoteArtwork("hubs/grammar-cases.webp"),
  "grammar:families": remoteArtwork("hubs/grammar-families.webp"),
  "grammar:pronouns": remoteArtwork("hubs/grammar-pronouns.webp"),
  "grammar:verbs": remoteArtwork("hubs/grammar-verbs.webp"),
  "grammar:tenses": remoteArtwork("hubs/grammar-tenses.webp"),
  "grammar:small-words": remoteArtwork("hubs/grammar-small-words.webp"),
  "grammar:sentences": remoteArtwork("hubs/grammar-sentences.webp"),
  "grammar:sandhi": remoteArtwork("hubs/grammar-sandhi.webp"),
  "grammar:compounds": remoteArtwork("hubs/grammar-compounds.webp"),
  "grammar:krdanta": remoteArtwork("hubs/grammar-krdanta.webp"),
  "grammar:voice": remoteArtwork("hubs/grammar-voice.webp"),
  "grammar:taddhita": remoteArtwork("hubs/grammar-taddhita.webp"),
  "grammar:verse": remoteArtwork("hubs/grammar-verse.webp"),
  "grammar:panini": remoteArtwork("hubs/grammar-panini.webp"),
  "grammar:reference": remoteArtwork("hubs/grammar-reference.webp"),
  "play:rush": remoteArtwork("games/rush-v2.webp"),
  "play:smriti": remoteArtwork("games/smriti-v2.webp"),
  "play:varna": remoteArtwork("games/varna-v2.webp"),
  "play:daily": remoteArtwork("games/daily-v2.webp"),
  "play:word-groups": remoteArtwork("games/word-groups-v2.webp"),
  "play:pada-path": remoteArtwork("games/pada-path-v2.webp"),
  "play:number": remoteArtwork("games/number-v2.webp"),
  "play:challenge": remoteArtwork("games/challenge-v2.webp"),
  "play:competition": remoteArtwork("games/competition-v2.webp"),
  "play:recite": remoteArtwork("hubs/play-recite.webp"),
  "tool:word-lab": remoteArtwork("hubs/tool-word-lab.webp"),
  "tool:writing": remoteArtwork("learn/writing-study.webp"),
  "tool:sound-map": remoteArtwork("hubs/tool-sound-map.webp"),
  "tool:word-order": remoteArtwork("hubs/tool-word-order.webp"),
  "tool:rhythm": remoteArtwork("hubs/tool-rhythm.webp"),
  "practice:sandhi": remoteArtwork("hubs/practice-sandhi.webp"),
  "practice:paradigms": remoteArtwork("hubs/practice-paradigms.webp"),
  "practice:words": remoteArtwork("hubs/practice-words.webp"),
  "practice:challenges": remoteArtwork("hubs/practice-challenges.webp"),
};

export function hubArtwork(key: string): ImageSourcePropType | undefined {
  return paintings[key];
}

export function gameArtwork(key: string): ImageSourcePropType | undefined {
  const aliases: Record<string, string> = { "varna-jaal": "varna", "daily-word": "daily" };
  return hubArtwork(`play:${aliases[key] ?? key}`);
}

const practiceKeys: Record<string, string> = {
  reorder: "tool:word-order",
  sandhi_join: "practice:sandhi",
  grid_fill: "practice:paradigms",
  scan_metre: "tool:rhythm",
  words: "practice:words",
  challenges: "practice:challenges",
};
export function practiceArtwork(kind: string): ImageSourcePropType | undefined {
  return hubArtwork(practiceKeys[kind]);
}

