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
  const label = (LEVEL_LABEL[level] ?? LEVEL_LABEL[1])[lang];
  return (
    <Text style={[styles.text, lang === "hi" && script("semibold")]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
});
