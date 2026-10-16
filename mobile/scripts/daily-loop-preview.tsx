// Isolated browser QA entry. No live API calls, accounts or provider billing.
import React, { useState } from "react";
import { registerRootComponent } from "expo";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import DailyLearningCard from "../src/home/DailyLearningCard";
import FloatingAudioBar from "../src/components/FloatingAudioBar";
import AudioModal from "../src/components/AudioModal";
import { bindSession, listenBus } from "../src/services/listenBus";
import { setProgressOwner } from "../src/services/progressStorage";
import { api, type Shloka } from "../src/api/client";

api.reviewDue = async () => ({ due_count: 3, items: [] });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input).includes("/me/learning-state")) return new Response(JSON.stringify({ entries: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  return originalFetch(input, init);
};
setProgressOwner("daily-loop-browser-qa");
// A real chant session over a local silent clip: the floating bar is then the
// app's own MiniPlayer on the shared listen transport, driven by a sounding
// verse instead of a hand-rolled transport claim. public/qa-silence.wav is the
// fixture clip (12 s of silence; the transport is released when a clip ends, so
// the browser check keeps its playback windows short); the URL is absolute so
// listenBus.resolve passes it through instead of prefixing the API base.
const qaClip = new URL("qa-silence.wav", location.origin).href;
const qaVerse = {
  id: "qa-verse-1",
  source_ref: "QA fixture",
  audio_url: "",
  chant: { url: qaClip, lines: [] },
} as unknown as Shloka;
bindSession({ id: "daily-loop-browser-qa", bookKey: "", chapter: null, title: "Sanskrit reading", pages: [qaVerse] }, 0);
const Stack = createNativeStackNavigator();
function Screen() {
  const [destination, setDestination] = useState("Choose your goal");
  const [dialog, setDialog] = useState(false);
  return <View style={{ flex: 1, backgroundColor: "#FFF8EE", padding: 16, gap: 24 }}>
    <Text style={{ fontSize: 28, fontWeight: "800", color: "#3B2E25" }}>Today's learning</Text>
    <DailyLearningCard navigate={route => setDestination(route)} />
    <Text accessibilityLabel="Preview destination">{destination}</Text>
    <Pressable onPress={() => listenBus.startAt(0)} accessibilityRole="button" accessibilityLabel="Preview audio controls" style={{ minHeight: 48, justifyContent: "center" }}><Text>Preview audio controls</Text></Pressable>
    <Pressable onPress={() => setDialog(true)} accessibilityRole="button" accessibilityLabel="Preview native dialog"><Text>Preview native dialog</Text></Pressable>
    <FloatingAudioBar />
    <AudioModal visible={dialog} transparent onRequestClose={() => setDialog(false)}>
      <View style={{ flex: 1, backgroundColor: "#FFF8EE", paddingTop: 130, paddingHorizontal: 16 }}>
        <Text>Reading dialog</Text>
        <Pressable onPress={() => setDialog(false)} accessibilityRole="button" accessibilityLabel="Close preview dialog"><Text>Close</Text></Pressable>
      </View>
    </AudioModal>
  </View>;
}
registerRootComponent(() => <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Preview" component={Screen} /></Stack.Navigator></NavigationContainer></SafeAreaProvider>);
