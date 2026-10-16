// Voice (सम्भाषण-प्रयोगशाला) — the hub.
//
// The tab used to open straight into one lab with four personas. It now
// answers "who do you want to talk to?" in three steps, said out loud under
// the title: pick a group, meet its companions, start talking. A group is a
// single bold card in its own colour; the companions behind it are named
// people with one quality each, on the group's own page
// (screens/VoiceCompanions.tsx). Choosing one opens the live call
// (screens/VoiceSession.tsx).
//
// Everything here is offline: the group list, the companions and their
// voices are all in src/voiceLab/companions.ts. Only the call itself needs
// the network.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PaintedBackground from "../components/artwork/PaintedBackground";
import { hubArtwork } from "../components/artwork/hubs";
import { useTypeScale } from "../hooks/useTypeScale";
import type { TabScreenProps } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, fill, onFill, radius, script, shadow, space } from "../theme";
import CompanionPortrait from "../voiceLab/CompanionPortrait";
import VoiceEmblem from "../voiceLab/VoiceEmblem";
import {
  COMPANION_COUNT,
  VOICE_CATEGORIES,
  categoryOf,
  companionById,
  type Companion,
  type VoiceCategory,
} from "../voiceLab/companions";
import { readLastCompanion } from "../voiceLab/recents";
import { Deva, SectionLabel, labelOn } from "../voiceLab/ui";

type Props = TabScreenProps<"VoiceLab">;

export default function VoiceHub({ navigation }: Props) {
  const { sized } = useTypeScale();
  const { width } = useWindowDimensions();
  const [recent, setRecent] = useState<Companion | null>(null);

  // Whatever was spoken with last, offered again at the top.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      readLastCompanion()
        .then((id) => {
          if (alive) setRecent(companionById(id ?? undefined) ?? null);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const openGroup = (category: VoiceCategory["id"]) => {
    haptics.tap();
    navigation.navigate("VoiceCompanions", { category });
  };
  const openCompanion = (companion: Companion) => {
    haptics.press();
    navigation.navigate("VoiceSession", { companionId: companion.id });
  };

  const columns = width >= 720 ? 3 : 2;
  const cardWidth = Math.floor((width - space.lg * 2 - space.sm * (columns - 1)) / columns);

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <PaintedBackground source={hubArtwork("grammar:voice")} banner denseText />
          <Text style={styles.eyebrow}>सम्भाषण-प्रयोगशाला</Text>
          <Text style={styles.heroTitle}>Voice companions</Text>
          <Text style={styles.heroBody}>
            Each companion speaks Sanskrit with you, live, in their own voice — and answers out loud.
          </Text>
        </View>

        <Text style={styles.steps}>
          <Text style={styles.stepNum}>1</Text> Pick a group · <Text style={styles.stepNum}>2</Text> Meet the companions ·{" "}
          <Text style={styles.stepNum}>3</Text> Start talking
        </Text>

        {recent && (
          <Pressable
            onPress={() => openCompanion(recent)}
            accessibilityRole="button"
            accessibilityLabel={`Talk again with ${recent.roman}, ${recent.quality}`}
            style={({ pressed }) => [
              styles.recentCard,
              { backgroundColor: fill[categoryOf(recent).tone] },
              pressed && styles.pressed,
            ]}
          >
            <CompanionPortrait companion={recent} size={56} variant="medallion" />
            <View style={styles.recentBody}>
              <Text style={[styles.recentLabel, { color: labelOn(categoryOf(recent).tone) }]}>Talk again with</Text>
              <Deva size={21} weight="bold" on="fill">
                {recent.deva}
              </Deva>
              <Text style={styles.recentSub} numberOfLines={2}>
                {recent.quality}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={onFill.text} />
          </Pressable>
        )}

        <SectionLabel style={{ marginTop: space.md }}>Choose a group</SectionLabel>
        <View style={styles.grid}>
          {VOICE_CATEGORIES.map((category) => (
            <GroupCard key={category.id} category={category} width={cardWidth} onPress={() => openGroup(category.id)} />
          ))}
        </View>

        <Text style={[styles.note, { fontSize: sized(12.5) }]}>
          {COMPANION_COUNT} companions across {VOICE_CATEGORIES.length} groups. A call runs for up to ten minutes, then you can start
          another. Talking uses your daily voice allowance, and the speech recognition can mishear a word — ask your companion to repeat
          it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({
  category,
  width,
  onPress,
}: {
  category: VoiceCategory;
  width: number;
  onPress: () => void;
}) {
  const { sized } = useTypeScale();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category.en}, ${category.hook}. ${category.people.length} companions.`}
      style={({ pressed }) => [styles.group, { backgroundColor: fill[category.tone], width }, pressed && styles.pressed]}
    >
      <View style={styles.groupTop}>
        <VoiceEmblem id={category.id} size={34} />
        <Text style={[styles.groupCount, { fontSize: sized(11.5) }]}>{category.people.length} voices</Text>
      </View>
      <Deva size={23} weight="bold" on="fill">
        {category.deva}
      </Deva>
      <Text style={[styles.groupEn, { fontSize: sized(14.5) }]}>{category.en}</Text>
      <Text style={[styles.groupHook, { fontSize: sized(12.5), color: labelOn(category.tone) }]} numberOfLines={2}>
        {category.hook}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xl, gap: space.sm },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

  hero: {
    backgroundColor: fill.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    overflow: "hidden",
    minHeight: 176,
    justifyContent: "flex-end",
    ...shadow.card,
  },
  eyebrow: { ...script("medium"), fontSize: 15, color: onFill.gold },
  heroTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 30, color: onFill.text },
  heroBody: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: 14.5, lineHeight: 21, color: onFill.soft, maxWidth: 320 },

  steps: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, lineHeight: 20, color: color.inkSoft, paddingHorizontal: 2 },
  stepNum: { color: color.saffronText },

  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.md,
    minHeight: 84,
    ...shadow.card,
  },
  recentBody: { flex: 1, gap: 1 },
  recentLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  recentSub: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: 12.5, lineHeight: 18, color: onFill.soft },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  group: { borderRadius: radius.md, padding: 14, minHeight: 172, gap: 2 },
  groupTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space.xs },
  groupCount: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.soft },
  groupEn: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, marginTop: -4 },
  groupHook: { fontFamily: "Nunito_700Bold", fontWeight: "700", lineHeight: 17, marginTop: "auto", paddingTop: space.xs },

  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 19, paddingHorizontal: 2, marginTop: space.sm },
});
