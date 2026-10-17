import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";
// The Sanskrit body face. Bundled eagerly because it renders the app's core
// content on almost every screen; the learner's own Indic script is
// registered on demand instead (src/services/scriptFonts.ts).
//
// Imported by its exact subpath, NOT from the package root. The root index
// does `export const X = require(...)` for every weight at module scope, so
// `from "@expo-google-fonts/tiro-devanagari-sanskrit"` drags the 700 KB
// italic into the bundle for a face we never set in italic. Verified against
// `npx expo export`: the italic disappears from the asset list this way.
const TiroDevanagariSanskrit_400Regular = require(
  "@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf",
);
// Learn's interface face (2026-10-13): English and Hindi in one family. Same
// exact-subpath import, so only the four weights Learn uses are bundled.
const Mukta_400Regular = require("@expo-google-fonts/mukta/400Regular/Mukta_400Regular.ttf");
const Mukta_500Medium = require("@expo-google-fonts/mukta/500Medium/Mukta_500Medium.ttf");
const Mukta_600SemiBold = require("@expo-google-fonts/mukta/600SemiBold/Mukta_600SemiBold.ttf");
const Mukta_700Bold = require("@expo-google-fonts/mukta/700Bold/Mukta_700Bold.ttf");
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import AppErrorBoundary from "./src/components/AppErrorBoundary";
import LearningProgressSync from "./src/components/LearningProgressSync";
import DailyReviewScreen from "./src/screens/DailyReview";
import OfflineLibraryScreen from "./src/screens/OfflineLibrary";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";

import { color } from "./src/theme";
import type { RootStackParamList } from "./src/navigation/types";
import UpdateBanner from "./src/components/UpdateBanner";import { AuthProvider, useAuth } from "./src/store/auth";
import { TypeScaleProvider } from "./src/hooks/useTypeScale";
import { AskProvider } from "./src/ask/AskProvider";

import MainTabs from "./src/navigation/AppDrawer";
import { loadPrefs } from "./src/services/prefs";
import { setSpeechRoute } from "./src/services/speech";
import ChallengeScreen from "./src/screens/Challenge";
import LoginScreen from "./src/screens/Login";
import WordOrderScreen from "./src/screens/WordOrder";
import ParadigmScreen from "./src/screens/Paradigm";
import ShlokaScreen from "./src/screens/Shloka";
import VarnamalaScreen from "./src/screens/Varnamala";
import DailyWordScreen from "./src/screens/DailyWord";
import WritingScreen from "./src/screens/Writing";
import LessonScreen from "./src/screens/Lesson";
import LearnV2LessonScreen from "./src/screens/LearnV2Lesson";
import LearnLibraryScreen from "./src/screens/LearnLibrary";
import GrammarScreen from "./src/screens/Grammar";
import VocabScreen from "./src/screens/Vocab";
import PingalaScreen from "./src/screens/Pingala";
import StoryDeckScreen from "./src/screens/StoryDeck";
import SandhiPracticeScreen from "./src/screens/SandhiPractice";
import GrammarTopicScreen from "./src/screens/GrammarTopic";
import GrammarChapterScreen from "./src/screens/GrammarChapter";
import WordLabScreen from "./src/screens/WordLab";
import BookScreen from "./src/screens/Book";
import ListenScreen from "./src/screens/Listen";
import AudiobookScreen from "./src/screens/Audiobook";
import ShabdaRushScreen from "./src/screens/ShabdaRush";
import SmritiScreen from "./src/screens/Smriti";
import VarnaJaalScreen from "./src/screens/VarnaJaal";
import PracticeRoundScreen from "./src/screens/PracticeRound";
import WordGroupsScreen from "./src/screens/WordGroups";
import PadaPathScreen from "./src/screens/PadaPath";
import NumberBuilderScreen from "./src/screens/NumberBuilder";
import CalibrationScreen from "./src/screens/Calibration";
import KalaScreen from "./src/screens/Kala";
import KalaChapterScreen from "./src/screens/KalaChapter";
import KalaTopicScreen from "./src/screens/KalaTopic";
import ParvaScreen from "./src/screens/Parva";
import ParvaPageScreen from "./src/screens/ParvaPage";
import ParvaNotifyNav from "./src/parva/notifyNav";
import WordJourneyScreen from "./src/screens/WordJourney";
import DoYouKnowScreen from "./src/screens/DoYouKnow";
import ReciteScreen from "./src/screens/Recite";
import RecitePickerScreen from "./src/screens/RecitePicker";

const Stack = createNativeStackNavigator<RootStackParamList>();

// These screens have no safe-area root of their own. Protect every state
// (setup, loading, play and results), while the native header owns the top
// on routes that show it. Tab screens and readers manage their own insets.
const FRAMED_ROUTES = new Set<keyof RootStackParamList>([
  "Certificate", "Contest", "ContestResults", "ContestRules", "MasterBoard",
  "Paradigm", "Parva", "ParvaPage", "PracticeRound", "Recite", "RecitePicker",
  "ShabdaRush", "Smriti", "VarnaJaal", "WordOrder",
]);

const HEADER_OPTS = {
  headerStyle: { backgroundColor: color.bg },
  headerTintColor: color.ink,
  headerTitleStyle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800" as const,
  },
};

// Loads persisted preference flags once, so the haptics and reduce-motion
// toggles drive real behaviour from the first run (U15-7).
function PrefsLoader() {
  useEffect(() => {
    loadPrefs();
  }, []);
  return null;
}

function RootNavigator() {
  const { loading, onboarded } = useAuth();
  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }
  // If not onboarded, show the login/onboarding screen instead of the app
  if (!onboarded) {
    return <LoginScreen />;
  }
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS} screenLayout={({ children, route, options }) => (
      FRAMED_ROUTES.has(route.name) ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}
          edges={options.headerShown === false
            ? ["top", "bottom", "left", "right"] : ["bottom", "left", "right"]}>
          {children}
        </SafeAreaView>
      ) : <>{children}</>
    )}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="DailyReview" component={DailyReviewScreen} options={{ title: "Today's review" }} />
      <Stack.Screen name="OfflineLibrary" component={OfflineLibraryScreen} options={{ title: "Saved reading" }} />
      <Stack.Screen name="Grammar" component={GrammarScreen} options={{ title: "Reference" }} />
      <Stack.Screen name="LearnLibrary" component={LearnLibraryScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Challenge"
        component={ChallengeScreen}
        options={{ title: "Challenges", presentation: "card" }}
      />
      <Stack.Screen
        name="WordOrder"
        component={WordOrderScreen}
        options={{ title: "Word Order" }}
      />
      <Stack.Screen
        name="Paradigm"
        component={ParadigmScreen}
        options={{ title: "Paradigm" }}
      />
      {/* U8-1: Shloka and Varṇamālā are stack screens reached from Home cards. */}
      <Stack.Screen name="Shloka" component={ShlokaScreen} options={{ title: "Daily Śloka" }} />
      <Stack.Screen name="Varnamala" component={VarnamalaScreen} options={{ title: "Varṇamālā" }} />
      {/* U12-5: Varṇamālā's practice mode — write the letters. */}
            <Stack.Screen name="Writing" component={WritingScreen} options={{ title: "Write it" }} />
            {/* U14/P22: the learning layer — Lesson → Practice → Challenge. */}
            <Stack.Screen name="Lesson" component={LessonScreen} options={{ title: "Learn" }} />
            {/* LearnV2: the additive Learn tab's static lesson player. Separate
                route and separate resume state; old Lesson/Path flows untouched. */}
            <Stack.Screen name="LearnV2Lesson" component={LearnV2LessonScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Vocab" component={VocabScreen} options={{ title: "Words" }} />
            {/* U15-6: Piṅgala as binary. */}
            <Stack.Screen name="Pingala" component={PingalaScreen} options={{ title: "Pingala" }} />
            {/* Story deck (Discover Sanskrit) — the swipeable basics→advanced cards. */}
            <Stack.Screen name="Story" component={StoryDeckScreen} options={{ title: "Introduction" }} />
            <Stack.Screen name="SandhiPractice" component={SandhiPracticeScreen} options={{ title: "Play with sandhi" }} />
            {/* Grammar guide: a topic page and the word lookup, stacked over the Grammar tab. */}
            <Stack.Screen name="GrammarTopic" component={GrammarTopicScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GrammarChapter" component={GrammarChapterScreen} options={{ title: "Chapter" }} />
            <Stack.Screen name="WordLab" component={WordLabScreen} options={{ title: "Word Lab" }} />
            {/* Read fullscreen page: covers the tab bar. */}
            <Stack.Screen name="Book" component={BookScreen} options={{ headerShown: false }} />
            {/* Listen: player-first chant screen over the tab bar. */}
            <Stack.Screen name="Listen" component={ListenScreen} options={{ headerShown: false }} />
            {/* Audiobook: a book's page on the Audio side, before the player. */}
            <Stack.Screen name="Audiobook" component={AudiobookScreen} options={{ headerShown: false }} />
            {/* Play games: fullscreen, header hidden. */}
            <Stack.Screen name="ShabdaRush" component={ShabdaRushScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Smriti" component={SmritiScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VarnaJaal" component={VarnaJaalScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PracticeRound" component={PracticeRoundScreen} options={{ headerShown: false }} />
            {/* Play v2 (handover_games_daily_multiplayer): new games + social surfaces. */}
            <Stack.Screen name="WordGroups" component={WordGroupsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PadaPath" component={PadaPathScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NumberBuilder" component={NumberBuilderScreen} options={{ headerShown: false }} />

            {/* Group: chats, a circle's page, circles, people, your card, new circle/room. Own headers. */}

            <Stack.Screen name="Calibration" component={CalibrationScreen} options={{ title: "Calibration" }} />
            {/* Voice: the companions inside one group, and the live call with one of them. */}

            {/* Parva: festivals and vrats. */}
            <Stack.Screen name="Parva" component={ParvaScreen} options={{ title: "Festivals" }} />
            <Stack.Screen name="ParvaPage" component={ParvaPageScreen} options={{ title: "Festival" }} />
            {/* Kāla: the calendar hub behind the Home date card, its basics cards and its chapters. */}
            <Stack.Screen name="Kala" component={KalaScreen} options={{ title: "Kāla" }} />
            <Stack.Screen name="KalaTopic" component={KalaTopicScreen} options={{ title: "Kāla" }} />
            <Stack.Screen name="KalaChapter" component={KalaChapterScreen} options={{ title: "Kāla" }} />
            {/* Word journey: the screen behind the Home word card. */}
            <Stack.Screen name="WordJourney" component={WordJourneyScreen} options={{ title: "Word journey" }} />
            {/* Do you know: the screen behind the Home fact card. */}
            <Stack.Screen name="DoYouKnow" component={DoYouKnowScreen} options={{ title: "Do you know" }} />
            {/* Recite + competitions */}
            <Stack.Screen name="Recite" component={ReciteScreen} options={{ title: "Learn" }} />
            <Stack.Screen name="RecitePicker" component={RecitePickerScreen} options={{ title: "Recite" }} />


            {/* U8-4: the daily word */}
            <Stack.Screen name="DailyWord" component={DailyWordScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    TiroDevanagariSanskrit_400Regular,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
  });
  // The focused route's name, so the Ask bubble can step aside on screens that
  // own the bottom of the display (Talk, Writing, the daily word).
  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  const trackRoute = () => {
    const name = navRef.getCurrentRoute()?.name;
    setRouteName(name); setSpeechRoute(name || "");
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <PrefsLoader />
          <TypeScaleProvider>
            <AuthProvider>

              <LearningProgressSync />
              <AppErrorBoundary routeName={routeName}>
              <NavigationContainer ref={navRef} onReady={trackRoute} onStateChange={trackRoute}>

                <AskProvider routeName={routeName}>
                  {/* Play share links (handover_games_daily_multiplayer §11). */}

                  <ParvaNotifyNav />
                  <RootNavigator />
                  {/* OTA: the restart prompt when an update has downloaded. */}
                  <UpdateBanner />
                </AskProvider>

              </NavigationContainer>
              </AppErrorBoundary>
              <StatusBar style="dark" />
            </AuthProvider>
          </TypeScaleProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg },
});
