// LevelPill — beginner / intermediate / advanced. The word is always shown;
// the tint only repeats it (colour is never the only signal, §U5-3).

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { GuideLang } from "../../api/client";
import { color, font, radius, script } from "../../theme";

export const LEVEL_LABEL: Record<number, { en: string; hi: string }> = {
  1: { en: "Beginner", hi: "आरम्भिक" },
  2: { en: "Intermediate", hi: "मध्यम" },
  3: { en: "Advanced", hi: "उन्नत" },
};

const TONE: Record<number, { bg: string; fg: string }> = {
  1: { bg: color.okBg, fg: color.okText },
  2: { bg: color.warnBg, fg: color.warnText },
  3: { bg: color.unsureBg, fg: color.unsureText },
};

export default function LevelPill({ level, lang }: { level: number; lang: GuideLang }) {
  const tone = TONE[level] ?? TONE[1];
  const label = (LEVEL_LABEL[level] ?? LEVEL_LABEL[1])[lang];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, lang === "hi" && script("semibold"), { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  text: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs },
});
