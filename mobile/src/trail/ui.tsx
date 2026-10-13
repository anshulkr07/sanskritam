// Learn's small parts: square everything (owner, 2026-10-13: "pointed and
// sharp with zero rounding"), one action colour, Mukta for the interface.

import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";

import { hubArtwork } from "../components/artwork/hubs";
import { unitArtwork } from "../components/path/artwork";
import type { GuideLang } from "../api/client";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { T, ui } from "./theme";

/** "path:u4" (2:1 Path hero, subject on the right) or "hub:grammar:x" (4:5 portrait). */
export function trailArt(key: string): { source?: ImageSourcePropType; aspect: number } {
  if (key.startsWith("path:")) return { source: unitArtwork(key.slice(5)), aspect: 2 };
  if (key.startsWith("hub:")) return { source: hubArtwork(key.slice(4)), aspect: 0.8 };
  return { aspect: 1 };
}

/** A square crop of a painting: the right-hand subject of a wide hero, the top of a portrait. */
export function Medallion({ art, size, ring }: { art: string; size: number; ring?: string }) {
  const { source, aspect } = trailArt(art);
  const wide = aspect >= 1;
  return (
    <View style={[styles.medal, { width: size, height: size }, ring ? { borderWidth: 2, borderColor: ring } : null]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {source ? (
        <Image
          source={source}
          resizeMode="cover"
          style={wide
            ? { position: "absolute", top: 0, height: size, width: size * aspect, left: -size * (aspect - 1) * 0.85 }
            : { position: "absolute", top: 0, left: 0, width: size, height: size / aspect }}
        />
      ) : null}
    </View>
  );
}

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

export function SecondaryButton({ label, onPress, disabled, icon, accessibilityLabel, style }: ButtonProps) {
  const { sized } = useTypeScale();
  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.8 }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={T.action} /> : null}
      <Text style={[ui("bold"), { fontSize: sized(16), color: T.action }]}>{label}</Text>
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
  return (
    <View style={styles.segments} accessible accessibilityLabel={`${filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < filled ? color : T.line }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: { overflow: "hidden", backgroundColor: T.line },
  overline: { letterSpacing: 1.3 },
  primary: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: T.action },
  primaryOff: { backgroundColor: T.line },
  secondary: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1.5, borderColor: T.action, backgroundColor: T.surface },
  textBtn: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  lang: { flexDirection: "row", height: 32, borderWidth: 1, borderColor: T.line },
  langCell: { minWidth: 34, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: T.surface },
  segments: { flex: 1, flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 5 },
});
