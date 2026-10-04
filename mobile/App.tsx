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
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color } from "./src/theme";
import type { RootStackParamList } from "./src/navigation/types";
import UpdateBanner from "./src/components/UpdateBanner";import { AuthProvider, useAuth } from "./src/store/auth";
import { TypeScaleProvider } from "./src/hooks/useTypeScale";
import { AskProvider } from "./src/ask/AskProvider";

import MainTabs from "./src/navigation/AppDrawer";
import { loadPrefs } from "./src/services/prefs";
import ChallengeScreen from "./src/screens/Challenge";
import LoginScreen from "./src/screens/Login";
import WordOrderScreen from "./src/screens/WordOrder";
import ParadigmScreen from "./src/screens/Paradigm";
import ShlokaScreen from "./src/screens/Shloka";
import VarnamalaScreen from "./src/screens/Varnamala";
import DailyWordScreen from "./src/screens/DailyWord";
import WritingScreen from "./src/screens/Writing";
import LessonScreen from "./src/screens/Lesson";
import VocabScreen from "./src/screens/Vocab";
import PingalaScreen from "./src/screens/Pingala";
import StoryDeckScreen from "./src/screens/StoryDeck";
import GrammarTopicScreen from "./src/screens/GrammarTopic";
import GrammarChapterScreen from "./src/screens/GrammarChapter";
import WordLabScreen from "./src/screens/WordLab";
import BookScreen from "./src/screens/Book";
import ShabdaRushScreen from "./src/screens/ShabdaRush";
import SmritiScreen from "./src/screens/Smriti";
import VarnaJaalScreen from "./src/screens/VarnaJaal";
import PracticeRoundScreen from "./src/screens/PracticeRound";
import KalaScreen from "./src/screens/Kala";
import KalaChapterScreen from "./src/screens/KalaChapter";
import WordJourneyScreen from "./src/screens/WordJourney";
import DoYouKnowScreen from "./src/screens/DoYouKnow";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
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
            <Stack.Screen name="Vocab" component={VocabScreen} options={{ title: "Words" }} />
            {/* U15-6: Piṅgala as binary. */}
            <Stack.Screen name="Pingala" component={PingalaScreen} options={{ title: "Pingala" }} />
            {/* Story deck (Discover Sanskrit) — the swipeable basics→advanced cards. */}
            <Stack.Screen name="Story" component={StoryDeckScreen} options={{ title: "Discover Sanskrit" }} />
            {/* Grammar guide: a topic page and the word lookup, stacked over the Grammar tab. */}
            <Stack.Screen name="GrammarTopic" component={GrammarTopicScreen} options={{ title: "Grammar" }} />
            <Stack.Screen name="GrammarChapter" component={GrammarChapterScreen} options={{ title: "Chapter" }} />
            <Stack.Screen name="WordLab" component={WordLabScreen} options={{ title: "Word Lab" }} />
            {/* Read fullscreen page: covers the tab bar. */}
            <Stack.Screen name="Book" component={BookScreen} options={{ headerShown: false }} />
            {/* Play games: fullscreen, header hidden. */}
            <Stack.Screen name="ShabdaRush" component={ShabdaRushScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Smriti" component={SmritiScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VarnaJaal" component={VarnaJaalScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PracticeRound" component={PracticeRoundScreen} options={{ headerShown: false }} />
            {/* Kāla: the calendar hub behind the Home date card, and its chapters. */}
            <Stack.Screen name="Kala" component={KalaScreen} options={{ title: "Kāla" }} />
            <Stack.Screen name="KalaChapter" component={KalaChapterScreen} options={{ title: "Kāla" }} />
            {/* Word journey: the screen behind the Home word card. */}
            <Stack.Screen name="WordJourney" component={WordJourneyScreen} options={{ title: "Word journey" }} />
            {/* Do you know: the screen behind the Home fact card. */}
            <Stack.Screen name="DoYouKnow" component={DoYouKnowScreen} options={{ title: "Do you know" }} />
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
  });
  // The focused route's name, so the Ask bubble can step aside on screens that
  // own the bottom of the display (Talk, Writing, the daily word).
  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  const trackRoute = () => setRouteName(navRef.getCurrentRoute()?.name);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <PrefsLoader />
          <TypeScaleProvider>
            <AuthProvider>
              <NavigationContainer ref={navRef} onReady={trackRoute} onStateChange={trackRoute}>
                <AskProvider routeName={routeName}>
                  <RootNavigator />
                  {/* OTA: the restart prompt when an update has downloaded. */}
                  <UpdateBanner />
                </AskProvider>
              </NavigationContainer>
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