// Central navigation param lists — single source of truth for the app's
// two-level navigation: a bottom tab bar (the persistent destinations) with
// a stack on top of it for flows you step into and return from (a practice
// session isn't a place you live, so it isn't a tab — same as Duolingo never
// puts "Lesson" in its tab bar).

import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type MainTabParamList = {
  Home: undefined;
  Conversation: undefined;
  Shloka: undefined;
  Varnamala: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Challenge: { challengeId?: string };
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
