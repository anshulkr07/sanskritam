// Small shared pieces of the Voice screens: the back bar, section labels,
// Sanskrit text at the app's floor size, and the little bordered pills that
// carry a voice description or a line to try.
//
// Look rule, the same as the rest of the app: a coloured surface is a deep
// solid fill with cream text; everything else sits straight on the cream
// page. The Voice hub's boxes are the exception the app already allows — a
// white card on paper with a coloured plate inside it.

import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { useTypeScale } from "../hooks/useTypeScale";
import { color, fill, onFill, sanskritFace, script, scriptFontFamily, space, type FillName } from "../theme";
import type { Saying } from "./companions";

/** The colour of a small label on a deep fill: gold, except on the fills
 *  where gold falls below 4.5:1 (same rule as scripts/check-contrast.mjs). */
export function labelOn(tone: FillName): string {
  return tone === "saffron" || tone === "gold" || tone === "ok" || tone === "bad" ? onFill.text : onFill.gold;
}

/** A short label over a section, on the cream page. */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.sectionLabel, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Sanskrit in Devanagari: never below the app's 18pt floor, with the line
 *  height the script needs for matras and conjuncts. */
export function Deva({
  children,
  size = 20,
  weight = "semibold",
  on = "page",
  style,
  ...rest
}: TextProps & {
  children: React.ReactNode;
  size?: number;
  weight?: keyof typeof scriptFontFamily;
  on?: "page" | "fill" | "gold";
}) {
  const { sized } = useTypeScale();
  const fontSize = sized(Math.max(18, size), { sanskrit: true });
  const tone = on === "fill" ? onFill.text : on === "gold" ? onFill.gold : color.ink;
  return (
    <Text {...rest} style={[script(weight), { fontSize, lineHeight: Math.round(fontSize * 1.45), color: tone }, style]}>
      {children}
    </Text>
  );
}

/** A line of Sanskrit in the reading face: Tiro, for a sentence the learner
 *  is meant to read rather than a name on a card. */
export function SanskritBody({
  children,
  size = 20,
  on = "page",
  style,
  ...rest
}: TextProps & { children: React.ReactNode; size?: number; on?: "page" | "fill" }) {
  const { sized } = useTypeScale();
  const fontSize = sized(Math.max(18, size), { sanskrit: true });
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: sanskritFace.regular,
          fontSize,
          lineHeight: Math.round(fontSize * 1.75),
          color: on === "fill" ? onFill.text : color.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** A bordered pill: how a companion sounds. */
export function Chip({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { sized } = useTypeScale();
  return (
    <View style={[styles.chip, style]}>
      <Text style={[styles.chipText, { fontSize: sized(12) }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A line the learner can say, in Devanagari with its English under it. When
 *  the call is live it is a button that sends the line. */
export function SayingPill({ saying, onPress }: { saying: Saying; onPress?: () => void }) {
  const { sized } = useTypeScale();
  const body = (
    <>
      <Text style={[script("semibold"), { fontSize: sized(17, { sanskrit: true }), lineHeight: Math.round(sized(17, { sanskrit: true }) * 1.45), color: color.ink }]}>
        {saying.sa}
      </Text>
      <Text style={[styles.sayingEn, { fontSize: sized(11.5) }]} numberOfLines={2}>
        {saying.en}
      </Text>
    </>
  );
  if (!onPress) return <View style={styles.saying}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${saying.sa}. ${saying.en}`}
      accessibilityHint="Sends this line to your companion"
      style={({ pressed }) => [styles.saying, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** A dark bar with room for a title and one action. */
export function BackBar({
  onBack,
  label = "Back",
  children,
  right,
}: {
  onBack: () => void;
  label?: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={26} color={color.ink} />
      </Pressable>
      <View style={styles.barBody}>{children}</View>
      {right ?? null}
    </View>
  );
}

/** A deep solid fill with room inside. */
export function Panel({ tone, children, style }: { tone: FillName; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, { backgroundColor: fill[tone] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginTop: space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: color.surface,
  },
  chipText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  saying: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    backgroundColor: color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
    maxWidth: 260,
  },
  sayingEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  pressed: { opacity: 0.85 },
  bar: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingRight: space.md, minHeight: 56 },
  barButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  barBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  panel: { borderRadius: 20, padding: space.md, overflow: "hidden" },
});
