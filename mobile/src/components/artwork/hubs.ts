import type { ImageSourcePropType } from "react-native";

// Stable IDs and static requires keep all hub artwork available offline.
const paintings: Record<string, ImageSourcePropType> = {
  "play:leaderboard": require("../../../assets/games/leaderboard-v2.webp"),
  "play:friends": require("../../../assets/games/friends-v2.webp"),
  "play:quick": require("../../../assets/games/quick-v2.webp"),
  "learn:tables": require("../../../assets/learn/tables-v2.webp"),
  "learn:advanced": require("../../../assets/learn/advanced-v2.webp"),
  "learn:verse": require("../../../assets/learn/verse-v2.webp"),
  "learn:library": require("../../../assets/learn/library-v2.webp"),

  "grammar:continue": require("../../../assets/hubs/grammar-continue.webp"),
  "grammar:start": require("../../../assets/hubs/grammar-start.webp"),
  "grammar:sounds": require("../../../assets/hubs/grammar-sounds.webp"),
  "grammar:nouns": require("../../../assets/hubs/grammar-nouns.webp"),
  "grammar:cases": require("../../../assets/hubs/grammar-cases.webp"),
  "grammar:families": require("../../../assets/hubs/grammar-families.webp"),
  "grammar:pronouns": require("../../../assets/hubs/grammar-pronouns.webp"),
  "grammar:verbs": require("../../../assets/hubs/grammar-verbs.webp"),
  "grammar:tenses": require("../../../assets/hubs/grammar-tenses.webp"),
  "grammar:small-words": require("../../../assets/hubs/grammar-small-words.webp"),
  "grammar:sentences": require("../../../assets/hubs/grammar-sentences.webp"),
  "grammar:sandhi": require("../../../assets/hubs/grammar-sandhi.webp"),
  "grammar:compounds": require("../../../assets/hubs/grammar-compounds.webp"),
  "grammar:krdanta": require("../../../assets/hubs/grammar-krdanta.webp"),
  "grammar:voice": require("../../../assets/hubs/grammar-voice.webp"),
  "grammar:taddhita": require("../../../assets/hubs/grammar-taddhita.webp"),
  "grammar:verse": require("../../../assets/hubs/grammar-verse.webp"),
  "grammar:panini": require("../../../assets/hubs/grammar-panini.webp"),
  "grammar:reference": require("../../../assets/hubs/grammar-reference.webp"),
  "play:rush": require("../../../assets/games/rush-v2.webp"),
  "play:smriti": require("../../../assets/games/smriti-v2.webp"),
  "play:varna": require("../../../assets/games/varna-v2.webp"),
  "play:daily": require("../../../assets/games/daily-v2.webp"),
  "play:word-groups": require("../../../assets/games/word-groups-v2.webp"),
  "play:pada-path": require("../../../assets/games/pada-path-v2.webp"),
  "play:number": require("../../../assets/games/number-v2.webp"),
  "play:challenge": require("../../../assets/games/challenge-v2.webp"),
  "play:competition": require("../../../assets/games/competition-v2.webp"),
  "play:recite": require("../../../assets/hubs/play-recite.webp"),
  "tool:word-lab": require("../../../assets/hubs/tool-word-lab.webp"),
  "tool:writing": require("../../../assets/learn/writing-study.webp"),
  "tool:sound-map": require("../../../assets/hubs/tool-sound-map.webp"),
  "tool:word-order": require("../../../assets/hubs/tool-word-order.webp"),
  "tool:rhythm": require("../../../assets/hubs/tool-rhythm.webp"),
  "practice:sandhi": require("../../../assets/hubs/practice-sandhi.webp"),
  "practice:paradigms": require("../../../assets/hubs/practice-paradigms.webp"),
  "practice:words": require("../../../assets/hubs/practice-words.webp"),
  "practice:challenges": require("../../../assets/hubs/practice-challenges.webp"),
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

