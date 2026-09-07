// Central navigation param lists — single source of truth for the app's
// two-level navigation: a bottom tab bar (the persistent destinations) with
// a stack on top of it for flows you step into and return from (a practice
// session isn't a place you live, so it isn't a tab — same as Duolingo never
// puts "Lesson" in its tab bar).
//
// U8-1 (info architecture): six tabs plus a left drawer. Shloka and Varnamala
// stop being tabs and become stack screens reached from Home cards (U8-2);
// Play, Grammar and Progress are new tabs; the drawer (Settings) hangs off a
// hamburger on Home.

import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type MainTabParamList = {
  Home: undefined;
  Path: undefined;
  Conversation: undefined;
  Play: undefined;
  Grammar: undefined;
  Progress: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
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
  // U13/P21: the canon reader — a scroll of tappable verses (a stack screen,
  // not a seventh tab). Reached from Grammar.
  Reader: undefined;
  // U14/P22: the learning layer — Lesson → Practice → Challenge. A Lesson is
  // reached from a Path node when has_lesson is true; Vocab from Play.
  Lesson: { featureId: string };
  Vocab: { topic?: string } | undefined;
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
