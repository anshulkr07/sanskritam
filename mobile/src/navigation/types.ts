// Central navigation param lists — single source of truth for the app's
// two-level navigation: a bottom tab bar (the persistent destinations) with
// a stack on top of it for flows you step into and return from (a practice
// session isn't a place you live, so it isn't a tab — same as Duolingo never
// puts "Lesson" in its tab bar).
//
// U8-1 (info architecture): tabs plus a left drawer. Shloka and Varnamala
// stop being tabs and become stack screens reached from Home cards (U8-2);
// Learn is one trail plus a Library; Progress lives in the drawer (hamburger)
// next to Settings — it is consulted, not lived in. The drawer hangs off a
// hamburger on Home.

import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type MainTabParamList = {
  Home: undefined;
  Conversation: undefined;
  Play: undefined;
  Read: undefined;
  VoiceLab: undefined;
  Learn: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  // The full Grammar guide browser, reached from Learn's Library.
  Grammar: undefined;
  // Learn's Library (2026-10-13): tables, Grammar chapters, tools, deeper
  // readings. `section: "verse"` lists the metre course.
  LearnLibrary: { section?: "verse" } | undefined;
  // U8-0: a session launched from a Path node carries the unit's feature
  // filter. This is a deliberate shape (NOT smuggled through challengeId).
  Challenge: { challengeId?: string; features?: string[] };
  SessionComplete: {
    correctCount: number;
    totalCount: number;
    streakDays?: number;
    freezeUsed?: boolean;
    xpEarned?: number;
    isPersonalBest?: boolean;
  };
  // U7 proof surfaces
  WordOrder: { sentence?: string };
  Paradigm: { word?: string; kind: "verb" | "noun" };
  // U8-1: Shloka and Varnamala are reached from Home cards, not tabs.
  Shloka: undefined;
  Varnamala: undefined;
  // U12-5: writing is Varṇamālā's practice mode — a stack screen, never a
  // seventh tab (U8-1). Reached from the Varṇamālā screen and Home.
  Writing: undefined;
  // U8-4: the daily word (वर्ण-बन्धः)
  DailyWord: undefined;
  // The canon reader is a TAB (Read), not a stack screen — books live where
  // the learner lives. ReaderScreen takes no params; the book + page it opens
  // to are restored from persisted reading progress, not navigation params.
  // U14/P22: the learning layer — Lesson → Practice → Challenge. A Lesson is
  // reached from a Path node when has_lesson is true; Vocab from Play.
  // U15-1: the lesson is now a step player addressed by id; featureId stays
  // as the legacy entry (Path nodes that only know their feature).
  Lesson: { featureId: string; lessonId?: string };
  // LearnV2 (additive Learn tab): static catalogue lessons. Reading progress
  // is device-local (shabd.learnv2.*); nothing here writes mastery or XP.
  LearnV2Lesson: { lessonId: string };
  Vocab: { topic?: string } | undefined;
  // U15-6: Piṅgala as binary — light/heavy enumeration, mātrāmeru.
  Pingala: undefined;
  // Story deck (Discover Sanskrit) — the swipeable basics→advanced cards,
  // reached from the Home hero. Read-only; progress lives on the device.
  Story: undefined;
  SandhiPractice: undefined;
  // Grammar guide (2026-09-15): one topic page, and the word lookup that used
  // to sit at the bottom of the Grammar tab. Both stack over the tab — never a
  // seventh tab (U8-1).
  GrammarTopic: { topicId: string };
  GrammarChapter: { chapterId: string };
  WordLab: { word?: string } | undefined;
  // Read fullscreen page (HANDOVER 7.4): covers the tab bar.
  // Paged books read one chapter at a time: chapter names the chapter.
  // mode "chant" opens it in Chant mode (a paged chapter's Chant button).
  Book: { bookKey: string; index?: number; chapter?: string; mode?: "chant" };
  // Listen: the player-first chant screen — same chapter, transport on top.
  // Reuses Book's player (useChant), reached from the chant player bar.
  Listen: { bookKey: string; index?: number; chapter?: string };
  // Audiobook: one book on the Audio side (chapters with lengths, Resume,
  // Read along), opened from the Audio shelf before the player.
  Audiobook: { bookKey: string };
  // Play games (HANDOVER 5): fullscreen, header hidden.
  ShabdaRush: { topic?: string; daily?: boolean; mode?: "local"; seats?: number } | undefined;
  Smriti: { set?: string; size?: number; daily?: boolean; mode?: "local"; seats?: number } | undefined;
  VarnaJaal: { daily?: boolean } | undefined;
  // Play v2 (handover_games_daily_multiplayer): the seven games' new screens,
  // leaderboards, friends and the room lobby.
  WordGroups: undefined;
  PadaPath: undefined;
  NumberBuilder: undefined;
  Leaderboards: { period?: "daily" | "weekly" | "monthly"; board?: string; track?: "games" | "recitation"; division?: "standard" | "beginner" } | undefined;
  Friends: undefined;
  RoomLobby: { matchId?: string; code?: string; mode?: "friends" | "quick" } | undefined;
  // Recitation calibration capture (dev builds only, brief §8).
  Calibration: undefined;
  PracticeRound: { kind: string; title: string; daily?: boolean };
  // Parva: festivals and vrats. List plus one page per observance.
  // `date` is the occurrence start; `dayDate` the selected series day.
  // `tradition` pins the calculation so share/Ask/reminder links reopen
  // the same occurrence instead of a different year's or month's.
  Parva: undefined;
  ParvaPage: { slug: string; variant?: string; date?: string; dayDate?: string; tradition?: string };
  // Kāla: time as Sanskrit counts it. The hub behind the Home date card, and
  // one screen that shows whichever of its six chapters is asked for.
  Kala: undefined;
  KalaChapter: { chapter: "today" | "moon" | "clock" | "year" | "yugas" | "calendars" };
  // One basics card (kala/topics.ts); `month` opens the months card on one.
  KalaTopic: {
    topic: "kala" | "kalpa" | "manvantara" | "yuga" | "ayana" | "ritu" | "masa" | "paksha" | "tithi" | "vara" | "nakshatra";
    month?: number;
  };
  // Word journey: the screen behind the Home word card. Without params it
  // shows today's word; "More words" pushes it with an originId.
  WordJourney: { originId?: string } | undefined;
  // Do you know: the screen behind the Home fact card. Without params it
  // shows today's fact; "Earlier" pushes it with a factId.
  DoYouKnow: { factId?: string } | undefined;
  // Recite (handover_recite): Learn screen, contests, certificates, rules.
  Recite: { verseUid: string; competitionId?: string; start?: "listen" | "practise" | "recite"; division?: "standard" | "beginner" };
  RecitePicker: undefined;
  Contest: { id?: string } | undefined;
  ContestResults: { id: string } | undefined;
  MasterBoard: undefined;
  Certificate: { code: string } | undefined;
  ContestRules: undefined;
};

// Screens that live inside a tab but need to push a screen from the parent
// stack (Home -> Challenge) use this composite type instead of the plain
// BottomTabScreenProps.
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList, MainTabParamList {}
  }
}
