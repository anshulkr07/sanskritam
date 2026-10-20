// Learn's small parts: square everything (owner, 2026-10-13: "pointed and
// sharp with zero rounding"), one action colour, Mukta for the interface.

import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import type { GuideLang } from "../api/client";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { T, ui } from "./theme";

export function Overline({ text, color = T.ink2 }: { text: string; color?: string }) {
  const { sized } = useTypeScale();
  return <Text style={[styles.overline, ui("bold"), { color, fontSize: sized(12) }]}>{text.toUpperCase()}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IoniconsIconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, disabled, icon, accessibilityLabel, style }: ButtonProps) {
  const { sized } = useTypeScale();
  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.primary, disabled && styles.primaryOff, pressed && !disabled && { opacity: 0.85 }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={disabled ? T.ink2 : T.white} /> : null}
      <Text style={[ui("bold"), { fontSize: sized(17), color: disabled ? T.ink2 : T.white }]}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress, accessibilityLabel }: ButtonProps) {
  const { sized } = useTypeScale();
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} style={styles.textBtn} hitSlop={6}>
      <Text style={[ui("semibold"), { fontSize: sized(15.5), color: T.action, textAlign: "center" }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color = T.ink }: { icon: IoniconsIconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn} hitSlop={4}>
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function LangSwitch({ lang, onChange }: { lang: GuideLang; onChange: (l: GuideLang) => void }) {
  return (
    <View style={styles.lang} accessibilityRole="radiogroup">
      {(["en", "hi"] as const).map((l) => {
        const on = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => { haptics.tap(); onChange(l); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l === "en" ? "English" : "हिन्दी"}
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.langCell, on && { backgroundColor: T.ink }]}
          >
            <Text style={[ui("semibold"), { fontSize: l === "en" ? 13 : 14, color: on ? T.surface : T.ink }]}>{l === "en" ? "EN" : "हि"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small square progress run: n cells, the first `filled` in colour. */
export function Segments({ total, filled, color }: { total: number; filled: number; color: string }) {
  const segments = Math.min(total, 20);
  return (
    <View style={styles.segments} accessible accessibilityLabel={`${filled} of ${total}`}>
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: (i + 1) / segments <= filled / total ? color : T.line }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overline: { letterSpacing: 1.3 },
  primary: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: T.action },
  primaryOff: { backgroundColor: T.line },
  textBtn: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  lang: { flexDirection: "row", height: 32, borderWidth: 1, borderColor: T.line },
  langCell: { minWidth: 34, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: T.surface },
  segments: { flex: 1, flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 5 },
});
