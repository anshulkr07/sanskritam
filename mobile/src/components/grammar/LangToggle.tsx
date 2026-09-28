// LangToggle — English | हिन्दी for the grammar guide. One shared preference:
// switching here switches the hub, every topic, the quiz and the glossary.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GuideLang } from "../../api/client";
import { haptics } from "../../services/haptics";
import { color, font, radius, script } from "../../theme";
import { GUIDE_UI } from "./strings";

const OPTIONS: { value: GuideLang; short: string; name: string }[] = [
  { value: "en", short: "EN", name: "English" },
  { value: "hi", short: "हिं", name: "हिन्दी" },
];

export default function LangToggle({ lang, onChange }: { lang: GuideLang; onChange: (l: GuideLang) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={GUIDE_UI.languageLabel[lang]}>
      {OPTIONS.map((o) => {
        const active = o.value === lang;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (active) return;
              haptics.tap();
              onChange(o.value);
            }}
            hitSlop={6}
            style={[styles.option, active && styles.active]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.name}
          >
            <Text style={[styles.text, o.value === "hi" && script("bold"), active && styles.activeText]}>{o.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", backgroundColor: color.surfaceMuted, borderRadius: radius.pill, padding: 3 },
  option: { minWidth: 44, minHeight: 32, paddingHorizontal: 10, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: color.saffron },
  text: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft },
  activeText: { color: color.white },
});
