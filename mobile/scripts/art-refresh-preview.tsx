// Offline visual QA: production covers, Play screen, leaderboard and art components.
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { registerRootComponent } from "expo";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { api } from "../src/api/client";
import { playApi } from "../src/games/v2/client";
import Play from "../src/screens/Play";
import Leaderboards from "../src/screens/Leaderboards";
import CoverArt from "../src/components/book/CoverArt";
import { COVER_COLOURS, PAINTED_COVERS } from "../src/components/book/covers";
import { PaintedThumbnail } from "../src/components/artwork/PaintedBackground";
import { hubArtwork } from "../src/components/artwork/hubs";
import { TypeScaleProvider } from "../src/hooks/useTypeScale";

const games = [
  ["rush", "Shabda Rush", "शब्दवेगः", "Race against the clock"],
  ["smriti", "Smriti", "स्मृतिः", "Find the matching pairs"],
  ["varna-jaal", "Varna Jaal", "वर्णजालम्", "Find words in the grid"],
  ["daily-word", "Daily word", "दैनिकशब्दः", "One new word each day"],
  ["word-groups", "Word Groups", "शब्दसमूहाः", "Find what belongs together"],
  ["pada-path", "Pada Path", "पदपथः", "Build a path through words"],
  ["number", "Number Builder", "सङ्ख्या", "Build the Sanskrit number"],
];
playApi.catalog = async () => ({ games: games.map(([key,title,sa,subtitle]) => ({key,title,sa,subtitle})), practice: [] }) as any;
playApi.summary = async () => ({
  rank_today: { rank: 12, points: 240, change_since_visit: 2, explain_ist: "Resets at midnight IST" },
  goal: { label: "Complete 3 rounds", done: 1, target: 3, streak: 4 },
  competition: { pieces: 3, closes_at: "2026-10-18T18:30:00Z" },
  friend_goal: { partner: { name: "Asha" }, total: 12, target: 20, mine: 7, partner_rounds: 5, min_each: 3 },
}) as any;
api.progressDaily = async () => ({ attempts: 3 }) as any;
playApi.leaderboard = async () => ({ period: "daily", period_end: "2026-10-15T18:30:00Z", board: "combined", scope: "everyone", total: 80, empty: false,
  rows: [{ rank: 1, learner_id: "a", name: "Asha", score: 300, participation: 3, is_me: false }, { rank: 2, learner_id: "b", name: "You", score: 240, participation: 2, is_me: true }],
  me: { rank: 2, learner_id: "b", name: "You", score: 240, participation: 2, is_me: true },
}) as any;

function Preview() {
  const [mode,setMode] = useState("Play");
  const [tap,setTap] = useState("Offline artwork preview");
  const [loaded] = useFonts({
    Nunito_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    Mukta_400Regular: require("@expo-google-fonts/mukta/400Regular/Mukta_400Regular.ttf"),
    Mukta_600SemiBold: require("@expo-google-fonts/mukta/600SemiBold/Mukta_600SemiBold.ttf"),
    Mukta_700Bold: require("@expo-google-fonts/mukta/700Bold/Mukta_700Bold.ttf"),
    TiroDevanagariSanskrit_400Regular: require("@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf"),
  });
  if (!loaded) return <Text>Loading fonts</Text>;
  const nav = { navigate: (name: string) => setTap(`Tapped: ${name}`) } as any;
  return <View style={{ flex:1, backgroundColor:"#FFF8EE" }}>
    <View style={{ flexDirection:"row", gap:10, flexWrap:"wrap", padding:8 }}>
      {["Read","Play","Leaderboard","Learn"].map(name => <Pressable key={name} accessibilityRole="button" onPress={()=>setMode(name)}><Text style={{color:mode===name?"#A44422":"#222",fontWeight:"700",padding:4}}>{name}</Text></Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={{padding:8,fontSize:12}}>{tap}</Text>
    {mode === "Play" ? <Play navigation={nav} route={{} as any} /> : mode === "Leaderboard" ? <Leaderboards navigation={{goBack:()=>{}}} /> :
    <ScrollView contentContainerStyle={{padding:16,gap:16}}>
      {mode === "Read" ? <View style={{flexDirection:"row",flexWrap:"wrap",gap:14}}>{Object.keys(PAINTED_COVERS).map(key=><View key={key} style={{width:100,gap:5}}><CoverArt bookKey={key} titleSa={COVER_COLOURS[key]?.titleSa ?? key} width={100}/><Text>{key}</Text></View>)}</View> :
      ["tables","verse","advanced","library"].map(key=><View key={key} style={{flexDirection:"row",gap:12,alignItems:"center",borderBottomWidth:1,borderColor:"#D8CBB7",paddingVertical:12}}><PaintedThumbnail source={hubArtwork(`learn:${key}`)}/><Text style={{fontSize:18}}>{key}</Text></View>)}
    </ScrollView>}
  </View>;
}
registerRootComponent(()=><SafeAreaProvider><NavigationContainer><TypeScaleProvider><Preview/></TypeScaleProvider></NavigationContainer></SafeAreaProvider>);
