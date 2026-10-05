// The cards on the Kāla page: one per basics topic, and one per month.
//
// Both are deep solid fills with cream text, sized to sit in a sideways row
// with the next card showing at the edge, so the row reads as one to swipe.
// The month running now in the learner's own calendar wears a cream frame
// and the word "Now": shape and word, never colour alone.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../hooks/useTypeScale";
import { fill, onFill, space, type FillName } from "../theme";
import type { MonthCardModel } from "./basics";
import TopicEmblem from "./charts/TopicEmblem";
import { RITUS } from "./sanskritNames";
import { romanName } from "./today";
import type { TopicMeta } from "./topics";
import { labelOn, Sa } from "./ui";
import { RITUS_EN } from "./learn";

export const TOPIC_CARD_WIDTH = 172;
export const MONTH_CARD_WIDTH = 156;

/** The cards' widths at the learner's text size: they widen with the text,
 *  so a name is never cut short. */
export function useCardWidths(): { topic: number; month: number } {
  const { sized } = useTypeScale();
  return { topic: Math.round(Math.min(300, sized(TOPIC_CARD_WIDTH))), month: Math.round(Math.min(280, sized(MONTH_CARD_WIDTH))) };
}

export function TopicCard({ meta, index, onPress }: { meta: TopicMeta; index: number; onPress: () => void }) {
  const { sized } = useTypeScale();
  const { topic: width } = useCardWidths();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.topic, { backgroundColor: fill[meta.tone], width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${index + 1}. ${meta.title}: ${romanName(meta.word)}. ${meta.hook}`}
    >
      <View style={styles.topicTop}>
        <TopicEmblem id={meta.id} size={46} />
        <Text style={styles.topicIndex}>{index + 1}</Text>
      </View>
      <Sa size={21} weight="bold" on="fill">
        {meta.word.nom}
      </Sa>
      <Text style={[styles.topicTitle, { fontSize: sized(15.5) }]}>{meta.title}</Text>
      <Text style={[styles.topicHook, { fontSize: sized(12.5), color: labelOn(meta.tone) }]}>{meta.hook}</Text>
    </Pressable>
  );
}

/** The months take the six fills in turn, so neighbours never match. */
const MONTH_TONES: FillName[] = ["saffron", "teal", "sage", "rose", "gold", "slate"];

export function monthTone(index: number): FillName {
  return MONTH_TONES[index % MONTH_TONES.length];
}

export function MonthCard({ month, onPress, width }: { month: MonthCardModel; onPress: () => void; width?: number | `${number}%` }) {
  const { sized } = useTypeScale();
  const widths = useCardWidths();
  const tone = monthTone(month.index);
  const label = labelOn(tone);
  const season = RITUS[month.ritu];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.month, { backgroundColor: fill[tone], width: width ?? widths.month }, month.now && styles.monthNow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${month.roman}${month.now ? `, the month now${month.adhikaNow ? ", the added one" : ""}` : ""}. Named after ${month.starText}. About ${month.about}. ${romanName(season)}, ${RITUS_EN[month.ritu]}.`}
    >
      <View style={styles.monthTop}>
        <Text style={[styles.monthNumber, { color: label }]}>{month.index + 1}</Text>
        {month.now && <Text style={[styles.nowTag, { color: fill[tone] }]}>{month.adhikaNow ? "Now · added" : "Now"}</Text>}
      </View>
      <Sa size={22} weight="bold" on="fill">
        {month.name.nom}
      </Sa>
      <Text style={[styles.monthRoman, { fontSize: sized(14) }]}>{month.roman}</Text>
      <Text style={[styles.monthLine, { fontSize: sized(12.5), color: label }]} numberOfLines={3}>
        After {month.starText}
      </Text>
      <Text style={[styles.monthLine, { fontSize: sized(12.5) }]} numberOfLines={2}>
        {month.about}
      </Text>
      <Text style={[styles.monthSeason, { fontSize: sized(12) }]} numberOfLines={2}>
        {romanName(season)} · {RITUS_EN[month.ritu]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },

  topic: { flex: 1, minHeight: 204, borderRadius: 16, padding: 14, gap: 2 },
  topicTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: space.xs },
  topicIndex: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, color: onFill.soft },
  topicTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, marginTop: -2 },
  topicHook: { fontFamily: "Nunito_700Bold", fontWeight: "700", lineHeight: 17, marginTop: 2 },

  month: { minHeight: 184, borderRadius: 16, padding: 12, borderWidth: 2, borderColor: "transparent" },
  monthNow: { borderColor: onFill.text },
  monthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 20 },
  monthNumber: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12.5 },
  nowTag: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    backgroundColor: onFill.text,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: "hidden",
  },
  monthRoman: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text, marginTop: -4 },
  monthLine: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.text, lineHeight: 17, marginTop: 4 },
  monthSeason: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.soft, marginTop: "auto", paddingTop: 6 },
});
