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
import { audioTransport } from "../src/services/audioTransport";
import { setProgressOwner } from "../src/services/progressStorage";
import { api } from "../src/api/client";

api.reviewDue = async () => ({ due_count: 3, items: [] });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input).includes("/me/learning-state")) return new Response(JSON.stringify({ entries: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  return originalFetch(input, init);
};
setProgressOwner("daily-loop-browser-qa");
const Stack = createNativeStackNavigator();
function Screen() {
  const [destination, setDestination] = useState("Choose your goal");
  const [dialog, setDialog] = useState(false);
  const sample = () => {
    let id = 0;
    id = audioTransport.claim("Sanskrit reading", {
      pause: () => audioTransport.update(id, { playing: false }),
      play: () => audioTransport.update(id, { playing: true }),
    });
    audioTransport.update(id, { duration: 30, position: 8 });
  };
  return <View style={{ flex: 1, backgroundColor: "#FFF8EE", padding: 16, gap: 24 }}>
    <Text style={{ fontSize: 28, fontWeight: "800", color: "#3B2E25" }}>Today's learning</Text>
    <DailyLearningCard navigate={route => setDestination(route)} />
    <Text accessibilityLabel="Preview destination">{destination}</Text>
    <Pressable onPress={sample} accessibilityRole="button" accessibilityLabel="Preview audio controls" style={{ minHeight: 48, justifyContent: "center" }}><Text>Preview audio controls</Text></Pressable>
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
