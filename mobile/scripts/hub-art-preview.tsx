// Visual QA using the production cards and offline curriculum fixtures.
// Callbacks report taps; this page does not call the backend or run games.
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { registerRootComponent } from "expo";
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { GAMES, PRACTICE, GameTile, PlayBanner, PracticeRow, ReciteCard } from "../src/screens/playPreviewParts";
import { GrammarChapterCard, GrammarContinueCard, GrammarToolCard } from "../src/screens/Grammar";
import LangToggle from "../src/components/grammar/LangToggle";
import { color, onFill } from "../src/theme";
import type { GuideIndex, GuideLang } from "../src/api/client";
import fixtures from "./hub-art-fixtures.json";

const guide = fixtures as GuideIndex;
const tools = [
  { key: "word-lab", label: "Word Lab", icon: "flask-outline" },
  { key: "sound-map", label: "Sound map", icon: "musical-notes-outline" },
  { key: "word-order", label: "Word order", icon: "swap-horizontal-outline" },
  { key: "rhythm", label: "Rhythm", icon: "pulse-outline" },
];

function Preview() {
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Baloo2_700Bold, Baloo2_800ExtraBold,
    TiroDevanagariSanskrit_400Regular: require("@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf"),
  });
  const [mode, setMode] = useState("Both tabs");
  const [lang, setLang] = useState<GuideLang>("en");
  const [status, setStatus] = useState("Artwork preview · tap a card to verify interaction");
  const tap = (title: string) => () => setStatus(`Tapped: ${title}`);
  if (!loaded) return <Text>Loading fonts…</Text>;
  return <ScrollView style={s.page} contentContainerStyle={s.body}>
    <View style={s.controls}>
      <View style={s.tabs}>{["Both tabs", "Play", "Grammar"].map(label => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Preview ${label}`} accessibilityState={{ selected: mode === label }} onPress={() => setMode(label)} style={[s.tab, mode === label && s.selected]}><Text style={s.controlText}>{label}</Text></Pressable>)}</View>
      <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
    </View>
    <View style={s.stage}>
      {mode !== "Grammar" && <View style={s.phone}>
        <Text style={s.title}>Play</Text>
        <PlayBanner kind="challenge">
          <Text style={s.eyebrow}>Today's challenge</Text>
          <Text style={s.bannerTitle}>Shabda Rush</Text>
          <Text style={s.bannerHint}>Find 10 words in 60 seconds</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Play today's challenge" onPress={tap("Today's challenge")} style={s.playButton}><Text style={s.playGlyph}>▶</Text></Pressable>
        </PlayBanner>
        <PlayBanner kind="competition">
          <Text style={s.eyebrow}>Competition</Text>
          <Text style={s.bannerTitle}>Bhagavad Gītā 2.47</Text>
          <Text style={s.bannerHint}>Best 92% · rank 4</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open competition" onPress={tap("Competition")} style={s.enter}><Text style={s.controlText}>Enter</Text></Pressable>
        </PlayBanner>
        <ReciteCard onPress={tap("Recite")} />
        <Text style={s.section}>Games</Text>
        <View style={s.grid}>{GAMES.map(game => <GameTile key={game.key} game={game} onPress={tap(game.name)} />)}</View>
        <Text style={s.section}>Practice</Text>
        {PRACTICE.map(practice => <PracticeRow key={practice.kind} practice={practice} stat={practice.kind === "challenges" ? "3 today" : ""} onPress={tap(practice.name)} />)}
      </View>}
      {mode !== "Play" && <View style={s.phone}>
        <View style={s.heading}><Text style={s.title}>{lang === "en" ? "Grammar" : "व्याकरण"}</Text><LangToggle lang={lang} onChange={setLang} /></View>
        <GrammarContinueCard topic={guide.topics[0]} lang={lang} onPress={tap("Continue reading")} />
        <Text style={s.section}>{lang === "en" ? "All chapters" : "सभी अध्याय"}</Text>
        <View style={s.grid}>{guide.chapters.map((chapter, i) => <GrammarChapterCard key={chapter.id} chapter={chapter} lang={lang} done={i === 0 ? 2 : 0} onPress={tap(chapter.title[lang])} />)}</View>
        <View style={s.tools}>{tools.map((tool, i) => <GrammarToolCard key={tool.key} toolKey={tool.key} icon={tool.icon} label={tool.label} index={i} onPress={tap(tool.label)} />)}</View>
      </View>}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg }, body: { paddingTop: 12, paddingBottom: 28 },
  controls: { width: "100%", maxWidth: 430, alignSelf: "center", paddingHorizontal: 16 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: { padding: 10, borderRadius: 12, backgroundColor: color.surface }, selected: { backgroundColor: "#EDD1A8" },
  controlText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: color.ink },
  status: { marginBottom: 14, color: color.inkSoft, fontFamily: "Nunito_600SemiBold", fontSize: 12 },
  stage: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 24 },
  phone: { width: "100%", maxWidth: 390, paddingHorizontal: 16, gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { fontWeight: "800", fontSize: 18, color: color.ink, marginTop: 8 },
  tools: { flexDirection: "row", gap: 8 },
  eyebrow: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  bannerTitle: { color: onFill.text, fontSize: 20, fontWeight: "800", maxWidth: "72%" },
  bannerHint: { color: onFill.text, fontSize: 14, maxWidth: "70%" },
  enter: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", backgroundColor: onFill.text, borderRadius: 12, marginTop: 8 },
  playButton: { position: "absolute", right: 16, bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center" },
  playGlyph: { color: "#2C5F50", fontSize: 20 },
});
registerRootComponent(Preview);
