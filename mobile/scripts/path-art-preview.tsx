// Visual QA with the actual Path cards and all released curriculum topics.
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { registerRootComponent } from "expo";
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { Hero, LessonCard } from "../src/screens/Path";
import { accentAt, color, script } from "../src/theme";
import { units } from "./path-art-fixtures";
import type { Unit } from "../src/api/client";

function Preview() {
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Baloo2_700Bold, Baloo2_800ExtraBold,
    TiroDevanagariSanskrit_400Regular: require("@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf"),
  });
  const [index, setIndex] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [status, setStatus] = useState("Tap a card to verify interaction");
  if (!loaded) return <Text>Loading fonts…</Text>;
  const unit = units[index];
  const rail = (u: Unit, wrap: boolean) => {
    const cards = u.lessons.map((lesson, i) => <LessonCard key={lesson.id} lesson={lesson} number={i + 1} tone={accentAt(u.rank - 1)} locked={false} videos={0} onPress={() => setStatus(`Lesson tapped — ${lesson.title_en}`)} />);
    return wrap ? <View style={[s.rail, s.wrap]}>{cards}</View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>{cards}</ScrollView>;
  };
  const hero = (u: Unit) => <Hero unit={u} lesson={u.lessons[0]} tone={accentAt(u.rank - 1)} onPress={() => setStatus(`Continue tapped — ${u.title_en}`)} />;
  return <ScrollView style={s.page} contentContainerStyle={s.body}>
    <View style={s.controls}>
      <View style={s.titleRow}><Text style={s.title}>Path</Text><Text style={s.chip}>11 units · 49 topics</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setGallery(!gallery)} style={s.toggle}><Text style={s.controlText}>{gallery ? "Phone preview" : "Show all artwork"}</Text></Pressable>
      {!gallery && <ScrollView horizontal contentContainerStyle={s.tabs}>
        {units.map((u, i) => <Pressable key={u.id} accessibilityRole="button" accessibilityLabel={`Preview Unit ${u.rank}: ${u.title_en}`} accessibilityState={{ selected: index === i }} onPress={() => setIndex(i)} style={[s.tab, index === i && s.selected]}><Text style={s.controlText}>{u.rank} · {u.title_en}</Text></Pressable>)}
      </ScrollView>}
      <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
    </View>
    {gallery ? <View style={s.gallery}>{units.map(u => <View key={u.id} style={s.group}>
      {hero(u)}<Text style={s.railTitle}>Unit {u.rank} · {u.title_en}</Text>{rail(u, true)}
    </View>)}</View> : <View style={s.phone}>
      {hero(unit)}
      <Text style={s.railTitle}>Unit {unit.rank} · <Text style={script("bold")}>{unit.title_hi}</Text> · {unit.title_en}</Text>
      {rail(unit, false)}
      <Text style={s.railTitle}>Locked appearance</Text>
      <View style={[s.rail, { opacity: 0.6 }]}><LessonCard lesson={unit.lessons[0]} number={1} tone={accentAt(index)} locked videos={1} onPress={() => setStatus(`Finish Unit ${Math.max(1, unit.rank - 1)} first`)} /></View>
    </View>}
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg }, body: { paddingTop: 12, paddingBottom: 28 },
  controls: { width: "100%", maxWidth: 430, alignSelf: "center" },
  phone: { width: "100%", maxWidth: 430, alignSelf: "center" },
  gallery: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 8 },
  group: { width: 384, maxWidth: "100%", marginBottom: 20 },
  wrap: { flexWrap: "wrap" },
  titleRow: { marginHorizontal: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: color.ink },
  chip: { fontFamily: "Nunito_800ExtraBold", color: color.ink, fontSize: 12 },
  tabs: { paddingHorizontal: 24, gap: 8, marginBottom: 12 },
  tab: { padding: 10, borderRadius: 12, backgroundColor: color.surface },
  selected: { backgroundColor: "#EDD1A8" },
  toggle: { marginHorizontal: 24, marginBottom: 12, alignSelf: "flex-start", padding: 10, backgroundColor: "#EDD1A8", borderRadius: 12 },
  controlText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: color.ink },
  railTitle: { marginHorizontal: 24, marginBottom: 12, fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: color.ink },
  rail: { paddingHorizontal: 24, flexDirection: "row", gap: 12, marginBottom: 24 },
  status: { marginHorizontal: 24, marginBottom: 14, color: color.inkSoft, fontFamily: "Nunito_600SemiBold", fontSize: 14 },
});
registerRootComponent(Preview);
