// FactCard — today's "Do you know" on Home, under the word journey.
//
// One deep teal fill with cream text (the look rule): the fact as a sentence,
// and under a hairline the text and verse it rests on. A faint first letter
// of the verse sits behind, the way the tithi card carries its numeral.
// Tapping it opens the verse itself (screens/DoYouKnow.tsx).
//
// The card hides itself on an old backend (404) or when there is no fact
// yet: both directions keep working. New app, old backend: no card, no error.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError, api, type FactToday } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { Ghost, labelOn } from "../kala/ui";
import { haptics } from "../services/haptics";
import { fill, onFill, shadow, space } from "../theme";
import { firstAkshara } from "../utils/akshara";
import { plain } from "../utils/text";
import { FACT_TITLE, cardSentence, refLine } from "./labels";

/** Today's fact, with 404 mapped to null so the card hides on old backends. */
export async function fetchFactToday(): Promise<FactToday | null> {
  try {
    return await api.factToday();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export default function FactCard() {
  const { data, loading, failed, retry } = useQuery<FactToday | null>("fact-today", fetchFactToday, {
    refetchOnFocus: true,
  });
  const { sized } = useTypeScale();
  const navigation = useNavigation();

  // The last answer that arrived. Home asks again each time it regains focus;
  // meanwhile the card keeps showing that answer, and on a backend without
  // the endpoint it stays hidden instead of flashing its placeholder.
  const [settled, setSettled] = useState<FactToday | null | undefined>(undefined);
  if (!loading && !failed && settled !== data) setSettled(data);
  const shown = loading ? settled : data;

  if (shown === undefined) {
    return (
      <View style={styles.card} accessible accessibilityLabel="Today's fact, loading">
        <Ghost lines={3} on="fill" />
      </View>
    );
  }

  if (failed && !loading) {
    return (
      <View style={styles.card}>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.failRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Couldn't load today's fact. Tap to retry."
        >
          <Ionicons name="refresh" size={18} color={onFill.text} />
          <Text style={styles.failText}>Couldn't load today's fact. Tap to retry.</Text>
        </Pressable>
      </View>
    );
  }

  const fact = shown?.available ? (shown?.fact ?? null) : null;
  const body = plain(fact?.fact).trim();
  // Nothing today: render nothing.
  if (!fact || !body) return null;
  const ref = refLine(fact);
  const dev = (fact.devanagari ?? "").trim();

  const open = () => {
    haptics.tap();
    navigation.navigate("DoYouKnow");
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={plain(cardSentence(fact))}
      accessibilityHint="Opens the verse it rests on"
    >
      {!!dev && (
        <Text style={styles.watermark} accessible={false} importantForAccessibility="no">
          {firstAkshara(dev)}
        </Text>
      )}

      <Text style={[styles.eyebrow, { color: labelOn("teal") }]}>{FACT_TITLE}</Text>
      <Text
        style={[styles.fact, { fontSize: sized(18), lineHeight: Math.round(sized(18) * 1.4) }]}
        numberOfLines={5}
      >
        {body}
      </Text>

      <View style={styles.foot}>
        <Text style={styles.ref} numberOfLines={1}>
          {ref || "See the verse"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={onFill.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fill.teal,
    borderRadius: 10,
    padding: space.md,
    marginBottom: space.sm,
    overflow: "hidden",
    ...shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  watermark: {
    position: "absolute",
    right: 12,
    top: -26,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 104,
    lineHeight: 135,
    color: "rgba(255,248,238,0.12)",
  },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  fact: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    color: onFill.text,
    marginTop: 4,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: onFill.faint,
    minHeight: 44,
  },
  ref: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.soft },
  failRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 72 },
  failText: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.text },
});
