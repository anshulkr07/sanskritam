// The companions inside one group, as boxes.
//
// A group (गुरुः, मित्रम्, योगः …) holds named companions: each box is a white
// card on the cream page with the companion's portrait plate in the group's
// colour, their name in Devanagari, what they are for, the one quality that
// makes them themselves, and how they sound. Tapping a box opens the live
// call for that companion.
//
// Nothing here needs the network. The group's lines to try are shown above
// the boxes, so a learner meets the words before the call.

import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTypeScale } from "../hooks/useTypeScale";
import type { RootStackParamList } from "../navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { haptics } from "../services/haptics";
import { color, fill, onFill, radius, script, shadow, space } from "../theme";
import CompanionPortrait from "../voiceLab/CompanionPortrait";
import VoiceEmblem from "../voiceLab/VoiceEmblem";
import { VOICE_CATEGORIES, categoryById, roleParts, type Companion } from "../voiceLab/companions";
import { BackBar, Chip, Deva, Panel, SectionLabel, SayingPill, labelOn } from "../voiceLab/ui";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceCompanions">;

export default function VoiceCompanions({ navigation, route }: Props) {
  const { sized } = useTypeScale();
  const { width } = useWindowDimensions();
  const category = categoryById(route.params.category) ?? VOICE_CATEGORIES[0];

  const columns = width >= 720 ? 3 : 2;
  const cardWidth = Math.floor((width - space.lg * 2 - space.sm * (columns - 1)) / columns);

  const open = (companion: Companion) => {
    haptics.press();
    navigation.navigate("VoiceSession", { companionId: companion.id });
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <BackBar onBack={() => navigation.goBack()} label={`Back from ${category.en}`}>
        <Deva size={20} weight="bold">
          {category.deva}
        </Deva>
        <Text style={[styles.barEn, { fontSize: sized(13) }]}>{category.en}</Text>
      </BackBar>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Panel tone={category.tone} style={styles.hero}>
          <View style={styles.heroHead}>
            <VoiceEmblem id={category.id} size={44} />
            <View style={styles.heroNames}>
              <Deva size={30} weight="bold" on="fill">
                {category.deva}
              </Deva>
              <Text style={[styles.heroEn, { fontSize: sized(14) }]}>
                {category.en} · {category.people.length} companions
              </Text>
            </View>
          </View>
          <Text style={[styles.heroIntro, { fontSize: sized(14.5) }]}>{category.intro}</Text>
          {!!category.caution && (
            <Text style={[styles.caution, { fontSize: sized(12.5), color: labelOn(category.tone) }]}>{category.caution}</Text>
          )}
        </Panel>

        <SectionLabel>Try saying</SectionLabel>
        <View style={styles.sayings}>
          {category.sayings.map((saying) => (
            <SayingPill key={saying.sa} saying={saying} />
          ))}
        </View>

        <SectionLabel>Choose a companion</SectionLabel>
        <View style={styles.grid}>
          {category.people.map((companion) => (
            <CompanionBox key={companion.id} companion={companion} width={cardWidth} onPress={() => open(companion)} />
          ))}
        </View>

        <Text style={[styles.note, { fontSize: sized(12.5) }]}>
          Portraits for these companions are still being painted; for now each one wears their own colour. The name and the voice are
          ready today.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompanionBox({
  companion,
  width,
  onPress,
}: {
  companion: Companion;
  width: number;
  onPress: () => void;
}) {
  const { sized } = useTypeScale();
  const role = roleParts(companion.role);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${companion.roman}, ${role.en}. ${companion.quality} Sounds ${companion.voice.join(", ")}.`}
      style={({ pressed }) => [styles.box, { width }, pressed && styles.pressed]}
    >
      <CompanionPortrait companion={companion} size={width - 16} />
      <View style={styles.boxBody}>
        <Deva size={19} weight="bold">
          {companion.deva}
        </Deva>
        <Text style={[styles.roman, { fontSize: sized(12.5) }]}>{companion.roman}</Text>
        <Text style={styles.role}>
          <Text style={[script("medium"), { fontSize: sized(18, { sanskrit: true }) }]}>{role.sa}</Text>
          {!!role.en && <Text style={[styles.roleEn, { fontSize: sized(12.5) }]}> · {role.en}</Text>}
        </Text>
        <Text style={[styles.quality, { fontSize: sized(13) }]}>{companion.quality}</Text>
        <View style={styles.chips}>
          {companion.voice.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  barEn: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },

  hero: { gap: space.sm },
  heroHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  heroNames: { flex: 1, gap: 2 },
  heroEn: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.soft },
  heroIntro: { fontFamily: "Nunito_400Regular", fontWeight: "400", lineHeight: 22, color: onFill.text },
  caution: { fontFamily: "Nunito_700Bold", fontWeight: "700", lineHeight: 19 },

  sayings: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  box: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.xs,
    gap: space.xs,
    ...shadow.card,
  },
  boxBody: { paddingHorizontal: 6, paddingBottom: space.xs, gap: 1 },
  roman: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  role: { marginTop: space.xxs, color: color.ink },
  roleEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  quality: { fontFamily: "Nunito_400Regular", fontWeight: "400", lineHeight: 19, color: color.inkSoft, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.xs },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 19, marginTop: space.sm, paddingHorizontal: 2 },
});
