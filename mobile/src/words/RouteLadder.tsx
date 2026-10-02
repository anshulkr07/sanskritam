// RouteLadder — the word's route as rows on the cream page, Sanskrit first
// and the word last, one stop per row with its language, its form and, when
// given, its meaning.
//
// Between rows a 1.5dp thread and an arrow. For a related word the first join
// is not an arrow: a swap icon and the words "Same family", with one line
// saying the word is not borrowed. The last row is heavier, not a different
// colour. Rows fade in with the shared stagger, skipped under Reduce Motion.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { Sa } from "../kala/ui";
import { duration, stagger } from "../motion";
import { color, font, space } from "../theme";
import { plain } from "../utils/text";
import { journeySentence, stops, type OriginLike, type RouteLike } from "./labels";

export default function RouteLadder({ origin, route }: { origin: OriginLike; route: RouteLike }) {
  const reduced = useReducedMotion();
  const { sized } = useTypeScale();
  const rows = stops(origin, route);
  const related = (route.relation ?? "").trim() === "related";

  return (
    <View accessible accessibilityLabel={plain(journeySentence(origin, route))}>
      {related && <Text style={[styles.familyNote, { fontSize: sized(font.sizes.sm) }]}>Not borrowed. Both come from one older language.</Text>}
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        const body = (
          <View key={`${row.label}-${row.form}-${i}`} style={styles.row}>
            <Text style={[styles.lang, { fontSize: sized(12) }]}>{row.label.toUpperCase()}</Text>
            {i === 0 && row.script === "devanagari" && !!row.form ? (
              <Sa size={26} numberOfLines={2}>
                {row.form}
              </Sa>
            ) : (
              <Text
                style={[
                  styles.form,
                  row.script !== "" && row.script !== "latin" && styles.formPlain,
                  last && styles.formLast,
                  { fontSize: sized(last ? 22 : 20) },
                ]}
                numberOfLines={2}
              >
                {row.form}
              </Text>
            )}
            {!!row.roman && (
              <Text style={[styles.roman, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>
                {row.roman}
              </Text>
            )}
            {!!row.gloss && (
              <Text style={[styles.gloss, { fontSize: sized(font.sizes.sm) }]} numberOfLines={3}>
                {plain(row.gloss)}
              </Text>
            )}
          </View>
        );
        const join = i === 0 ? null : rows[i].join === "family" ? (
          <View style={styles.joinRow} accessible={false}>
            <View style={styles.thread} />
            <View style={styles.familyRow}>
              <Ionicons name="swap-vertical" size={16} color={color.inkSoft} />
              <Text style={[styles.family, { fontSize: sized(font.sizes.sm) }]}>Same family</Text>
            </View>
          </View>
        ) : (
          <View style={styles.joinRow} accessible={false}>
            <View style={styles.thread} />
            <Ionicons name="arrow-down" size={16} color={color.inkFaint} />
          </View>
        );
        return (
          <React.Fragment key={`stop-${i}`}>
            {join}
            {reduced ? (
              body
            ) : (
              <Animated.View entering={FadeInDown.delay(stagger(i, 40, 10)).duration(duration.base)}>{body}</Animated.View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  familyNote: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: color.inkSoft,
    marginBottom: space.sm,
    lineHeight: 20,
  },
  row: { minHeight: 44, paddingVertical: space.xs },
  lang: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    letterSpacing: 0.9,
    color: color.inkSoft,
  },
  form: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    lineHeight: 28,
    color: color.ink,
  },
  // A non-Latin form renders in the platform font, which carries the script.
  formPlain: { fontFamily: undefined },
  formLast: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  roman: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  gloss: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, lineHeight: 20 },
  joinRow: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingLeft: 2, minHeight: 28 },
  thread: { width: 1.5, alignSelf: "stretch", backgroundColor: color.border, marginLeft: 6 },
  familyRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  family: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft },
});
