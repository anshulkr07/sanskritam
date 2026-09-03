// Play — the games hub (U8-3). A grid of mode cards, each with its Sanskrit
// name, an English subtitle and a one-line rule. Ships with the three modes
// that already exist (Word Order, Paradigm drill, Challenges); modes not yet
// built render as locked "soon" cards that are announced as unavailable by
// VoiceOver but are never tappable-with-no-feedback.
//
// ⚠ Play is exploration, not assessment. Nothing launched from here writes
// mastery EXCEPT Challenges, which run the same graded path they run from
// Path. Word Order and Paradigm are reference/exploration, never graded.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TabScreenProps } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";

type Props = TabScreenProps<"Play">;

interface ModeCard {
  key: string;
  sa: string;
  en: string;
  rule: string;
  icon: IoniconsIconName;
  built: boolean;
  assessment: boolean;
  target: "wordOrder" | "paradigm" | "challenge" | null;
}

const MODES: ModeCard[] = [
  {
    key: "wordorder",
    sa: "वाक्य-क्रीडा",
    en: "Word Order",
    rule: "Rearrange a sentence every way it still means the same.",
    icon: "swap-horizontal",
    built: true,
    assessment: false,
    target: "wordOrder",
  },
  {
    key: "paradigm",
    sa: "शब्दरूप-द्वन्द्वः",
    en: "Paradigm drill",
    rule: "The full declension grid, one proof per cell.",
    icon: "grid",
    built: true,
    assessment: false,
    target: "paradigm",
  },
  {
    key: "challenge",
    sa: "अभ्यासः",
    en: "Challenges",
    rule: "A graded session counts toward mastery.",
    icon: "create",
    built: true,
    assessment: true,
    target: "challenge",
  },
  // Not yet built — promised, never hidden.
  {
    key: "varnabandha",
    sa: "वर्ण-बन्धः",
    en: "Daily word",
    rule: "One word a day, scored on the mouth-map grid.",
    icon: "extension-puzzle",
    built: false,
    assessment: false,
    target: null,
  },
  {
    key: "sandhi",
    sa: "सन्धि-खेलः",
    en: "Sandhi",
    rule: "Where words meet and blend.",
    icon: "git-merge",
    built: false,
    assessment: false,
    target: null,
  },
];

export default function PlayScreen({ navigation }: Props) {
  const launch = (mode: ModeCard) => {
    if (!mode.built || !mode.target) return;
    haptics.tap();
    if (mode.target === "wordOrder") {
      navigation.navigate("WordOrder", {});
    } else if (mode.target === "paradigm") {
      navigation.navigate("Paradigm", { word: "देव", kind: "noun" });
    } else {
      navigation.navigate("Challenge", {});
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Play</Text>
        <Text style={styles.subtitle}>The lab — explore, then be assessed.</Text>

        <View style={styles.grid}>
          {MODES.map((m) => (
            <ModeCardView key={m.key} mode={m} onPress={() => launch(m)} />
          ))}
        </View>

        <Text style={styles.note}>
          Word Order and Paradigm never change your progress. Only Challenges
          count toward mastery.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeCardView({ mode, onPress }: { mode: ModeCard; onPress: () => void }) {
  const tint = mode.built ? color.saffron : color.inkFaint;
  return (
    <Pressable
      onPress={onPress}
      disabled={!mode.built}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${mode.sa} — ${mode.en}. ${mode.rule}`}
      accessibilityState={{ disabled: !mode.built }}
      accessibilityHint={mode.built ? undefined : "Coming soon"}
    >
      <View style={[styles.iconWrap, { backgroundColor: mode.built ? color.saffronLight : color.border }]}>
        <Ionicons name={mode.icon} size={26} color={mode.built ? color.saffron : color.inkFaint} />
      </View>
      <Text style={[styles.sa, script("bold"), mode.built ? styles.saActive : styles.saLocked]}>
        {mode.sa}
      </Text>
      <Text style={styles.en}>{mode.en}</Text>
      <Text style={styles.rule}>{mode.rule}</Text>
      {!mode.built && (
        <View style={styles.soon}>
          <Text style={styles.soonText}>soon</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink },
  subtitle: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.lg, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadow.card,
  },
  cardPressed: { transform: [{ translateY: 2 }] },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  sa: { fontSize: font.sizes.base, color: color.ink },
  saActive: { color: color.ink },
  saLocked: { color: color.inkFaint },
  en: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink, marginTop: 2 },
  rule: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 4, lineHeight: 16 },
  soon: { alignSelf: "flex-start", marginTop: space.sm, backgroundColor: color.border, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  soonText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkFaint, textTransform: "uppercase", letterSpacing: 0.5 },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkFaint, marginTop: space.sm, lineHeight: 18 },
});
