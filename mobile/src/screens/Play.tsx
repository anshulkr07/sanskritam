// Play — the lab (U8-3, U15-4). A grid of doors, each with its Sanskrit name,
// an English title and a few words on what it is.
//
// U15-4: the same components appear as GRADED steps inside lessons (the
// paradigm tensor, sandhi and word order count toward mastery there). Every
// tile here is an UNGRADED sandbox door: explore freely here, be graded in
// lessons. The screen no longer says so in a paragraph; the tiles simply open.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TabScreenProps } from "../navigation/types";
import { haptics } from "../services/haptics";
import { accent, accentAt, color, font, gradientOf, radius, script, shadow, space } from "../theme";

type Props = TabScreenProps<"Play">;

type Target = "wordOrder" | "paradigm" | "challenge" | "vocab" | "dailyWord" | "sandhi" | "pingala";

interface Mode {
  key: string;
  sa: string;
  en: string;
  hint: string;
  icon: IoniconsIconName;
  target: Target;
}

const MODES: Mode[] = [
  { key: "wordorder", sa: "वाक्य-क्रीडा", en: "Word order", hint: "Rearrange a sentence", icon: "swap-horizontal", target: "wordOrder" },
  { key: "paradigm", sa: "शब्दरूप-द्वन्द्वः", en: "Paradigms", hint: "Declension grids", icon: "grid", target: "paradigm" },
  { key: "challenge", sa: "अभ्यासः", en: "Challenges", hint: "Graded practice", icon: "create", target: "challenge" },
  // U14-4: the vocabulary curriculum, frequency-ordered words by topic.
  { key: "vocab", sa: "शब्द-संग्रहः", en: "Words", hint: "Common words by topic", icon: "book", target: "vocab" },
  { key: "varnabandha", sa: "वर्ण-बन्धः", en: "Daily word", hint: "One word a day", icon: "extension-puzzle", target: "dailyWord" },
  // U15-2/6: sandhi as f(a,b)→c, the U6 lesson's machine as a sandbox.
  { key: "sandhi", sa: "सन्धि-खेलः", en: "Sandhi", hint: "Where words meet", icon: "git-merge", target: "sandhi" },
  // U15-6: Piṅgala as binary, light/heavy enumeration.
  { key: "pingala", sa: "छन्दः-खेलः", en: "Piṅgala", hint: "Light and heavy", icon: "calculator", target: "pingala" },
];

export default function PlayScreen({ navigation }: Props) {
  const launch = (mode: Mode) => {
    haptics.tap();
    switch (mode.target) {
      case "wordOrder":
        navigation.navigate("WordOrder", {});
        break;
      case "paradigm":
        // No demo word: the table needs a real looked-up word. Grammar is the
        // lookup surface; Paradigm without a word only shows an empty state.
        navigation.navigate("Grammar" as never);
        break;
      case "vocab":
        navigation.navigate("Vocab", {});
        break;
      case "dailyWord":
        navigation.navigate("DailyWord");
        break;
      case "sandhi":
        navigation.navigate("Lesson", { featureId: "VOWEL-SANDHI" });
        break;
      case "pingala":
        navigation.navigate("Pingala");
        break;
      default:
        navigation.navigate("Challenge", {});
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Play
        </Text>
        <View style={styles.grid}>
          {MODES.map((m, i) => {
            const tone = accentAt(i + 1);
            return (
              <Pressable
                key={m.key}
                onPress={() => launch(m)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${m.en}. ${m.hint}`}
              >
                <LinearGradient colors={gradientOf(tone)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                  <Ionicons name={m.icon} size={24} color={color.white} />
                </LinearGradient>
                <Text style={styles.en}>{m.en}</Text>
                <Text style={[styles.sa, script("semibold"), { color: accent[tone].fg }]}>{m.sa}</Text>
                <Text style={styles.hint}>{m.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  // 120 at the bottom: the Ask bubble floats over the last row.
  body: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: 120 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink, marginBottom: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm },
  card: { width: "48.5%", backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  badge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  en: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  sa: { fontSize: font.sizes.sm, lineHeight: 22 },
  hint: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 4 },
});
