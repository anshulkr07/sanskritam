// WordCard — today's word journey on Home, between the tithi card and the
// Śloka and Daily word pair.
//
// One deep maroon fill with cream text (the look rule): the word in its own
// language large, the language named, its meaning, and one line saying how it
// connects to Sanskrit, ending in the Sanskrit word. A faint first letter of
// the Sanskrit word sits behind, the way the tithi card carries its numeral.
//
// The card hides itself on an old backend (404) or when there is nothing
// today: both directions keep working. New app, old backend: no card, no
// error. Sanskrit is never below 18pt (Sa enforces the floor).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError, api, type WordToday } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { Ghost, Sa, labelOn } from "../kala/ui";
import { haptics } from "../services/haptics";
import { fill, onFill, shadow, space } from "../theme";
import { firstAkshara } from "../utils/akshara";
import { plain } from "../utils/text";
import { FEATURE_TITLE, cardSentence, headlineRoute, relationLine } from "./labels";

async function fetchToday(): Promise<WordToday | null> {
  try {
    return await api.wordToday();
  } catch (e) {
    // An old backend has no such endpoint: hide, do not error.
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** Today's word, with 404 mapped to null so the card hides on old backends. */
export function fetchWordToday(): Promise<WordToday | null> {
  return fetchToday();
}

export default function WordCard() {
  const { data, loading, failed, retry } = useQuery<WordToday | null>("word-today", fetchToday, {
    refetchOnFocus: true,
  });
  const { sized } = useTypeScale();
  const navigation = useNavigation();

  // The last answer that arrived. Home asks again each time it regains focus,
  // and while it asks the card keeps showing that answer: the word stays in
  // place, and on a backend without the endpoint the card stays hidden
  // instead of flashing its placeholder. The placeholder is for the first
  // load only, before any answer exists.
  const [settled, setSettled] = useState<WordToday | null | undefined>(undefined);
  if (!loading && !failed && settled !== data) setSettled(data);
  const shown = loading ? settled : data;

  if (shown === undefined) {
    return (
      <View style={styles.card} accessible accessibilityLabel="Today's word, loading">
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
          accessibilityLabel="Couldn't load today's word. Tap to retry."
        >
          <Ionicons name="refresh" size={18} color={onFill.text} />
          <Text style={styles.failText}>Couldn't load today's word. Tap to retry.</Text>
        </Pressable>
      </View>
    );
  }

  const origin = shown?.available ? (shown?.origin ?? null) : null;
  const route = origin ? headlineRoute(origin.routes, shown?.headline_route_id) : null;
  // Nothing today, or the headline route cannot be found: render nothing.
  if (!origin || !route) return null;
  const relation = relationLine(route);
  if (!relation) return null;

  const dev = (origin.sanskrit?.dev ?? "").trim();
  const iast = (origin.sanskrit?.iast ?? "").trim();
  const word = (route.word ?? "").trim();
  const langName = (route.lang_name ?? "").trim();
  const gloss = plain(route.gloss);
  const nonLatin = (route.script ?? "latin").trim() !== "latin" && (route.script ?? "").trim() !== "";
  const roman = (route.roman ?? "").trim();

  const open = () => {
    haptics.tap();
    navigation.navigate("WordJourney");
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={plain(cardSentence(origin, route))}
      accessibilityHint="Opens the word's journey"
    >
      {!!dev && (
        <Text style={styles.watermark} accessible={false} importantForAccessibility="no">
          {firstAkshara(dev)}
        </Text>
      )}

      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: labelOn("maroon") }]}>{FEATURE_TITLE}</Text>
        {!!langName && (
          <Text style={styles.lang} numberOfLines={1}>
            {langName}
          </Text>
        )}
      </View>

      <Text style={[styles.word, nonLatin && styles.wordPlain, { fontSize: sized(30) }]} numberOfLines={2}>
        {word}
      </Text>
      {nonLatin && !!roman && (
        <Text style={styles.roman} numberOfLines={1}>
          {roman}
        </Text>
      )}
      {!!gloss && (
        <Text style={styles.gloss} numberOfLines={2}>
          {gloss}
        </Text>
      )}

      <View style={styles.foot}>
        <Text style={styles.relation} numberOfLines={2}>
          {relation}
        </Text>
        <View style={styles.saRow}>
          {!!dev && (
            <Sa size={20} on="fill" numberOfLines={1}>
              {dev}
            </Sa>
          )}
          {!!iast && (
            <Text style={styles.iast} numberOfLines={1}>
              {iast}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={onFill.text} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fill.maroon,
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
    color: "rgba(255,248,238,0.14)",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  lang: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 13,
    color: onFill.soft,
  },
  word: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    lineHeight: 40,
    color: onFill.text,
    marginTop: 2,
  },
  // A non-Latin word renders in the platform font, which carries Cyrillic.
  wordPlain: { fontFamily: undefined },
  roman: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 14,
    color: onFill.soft,
    marginTop: 1,
  },
  gloss: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    color: onFill.soft,
    marginTop: 2,
  },
  foot: { marginTop: space.xs, paddingTop: space.xs, borderTopWidth: 1, borderTopColor: onFill.faint },
  relation: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    color: onFill.text,
  },
  saRow: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 2, minHeight: 44 },
  iast: { flexShrink: 1, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 14, color: onFill.soft },
  failRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 72 },
  failText: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.text },
});
