// Read tab parts shared by the Books and Audio homes and the contents pages:
// the header with its Books | Audio tabs, section heads, square buttons,
// chapter number boxes and progress lines. Square corners throughout.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { haptics } from "../services/haptics";
import { T, ui } from "./look";

export type Media = "books" | "audio";

/** "Read" and the Books | Audio tabs under it. */
export function ReadHeader({ media, onMedia }: { media: Media; onMedia: (m: Media) => void }) {
  const tab = (m: Media, icon: "book-outline" | "headset-outline", label: string) => {
    const on = media === m;
    return (
      <Pressable
        onPress={() => !on && onMedia(m)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        style={[styles.tab, on && styles.tabOn]}
      >
        <Ionicons name={icon} size={18} color={on ? T.ink : T.ink3} />
        <Text style={[styles.tabText, on ? styles.tabTextOn : null]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View>
      <Text style={styles.title} accessibilityRole="header">
        Read
      </Text>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tab("books", "book-outline", "Books")}
        {tab("audio", "headset-outline", "Audio")}
      </View>
    </View>
  );
}

export function SectionHead({
  title,
  right,
  onRight,
  style,
}: {
  title: string;
  right?: string;
  onRight?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHead, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {right ? (
        onRight ? (
          <Pressable onPress={onRight} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.sectionLink}>{right}</Text>
          </Pressable>
        ) : (
          <Text style={styles.sectionRight}>{right}</Text>
        )
      ) : null}
    </View>
  );
}

/** A filled action button (or an outlined one with `outline`). */
export function SquareButton({
  label,
  icon,
  onPress,
  outline = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.press();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.btn, outline ? styles.btnOutline : styles.btnFill, pressed && styles.pressed, style]}
    >
      {icon ? <Ionicons name={icon} size={16} color={outline ? T.ink : T.white} /> : null}
      <Text style={[styles.btnText, { color: outline ? T.ink : T.white }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A chapter's number box: ticked when read, ringed when current. */
export function NumBox({ state, label }: { state: "done" | "now" | "ahead"; label: string }) {
  if (state === "done") {
    return (
      <View style={[styles.num, styles.numDone]} accessibilityLabel="Finished">
        <Ionicons name="checkmark" size={20} color={T.white} />
      </View>
    );
  }
  return (
    <View style={[styles.num, state === "now" ? styles.numNow : styles.numAhead]}>
      <Text style={[styles.numText, state === "now" && { color: T.action }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

export function ProgressLine({
  frac,
  fillColor = T.action,
  trackColor = T.line,
  height = 4,
  style,
}: {
  frac: number;
  fillColor?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0)) * 100;
  return (
    <View style={[{ height, backgroundColor: trackColor }, style]}>
      <View style={{ height, width: `${pct}%`, backgroundColor: fillColor }} />
    </View>
  );
}

export const readStyles = StyleSheet.create({
  eyebrow: { ...ui("bold"), fontSize: 12, letterSpacing: 1.4, color: T.ink3 },
});

const styles = StyleSheet.create({
  title: { ...ui("bold"), fontSize: 30, lineHeight: 36, color: T.ink },
  tabs: { flexDirection: "row", gap: 28, borderBottomWidth: 1, borderBottomColor: T.line, marginTop: 6 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    paddingBottom: 3,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabOn: { borderBottomColor: T.action },
  tabText: { ...ui("medium"), fontSize: 17, color: T.ink3 },
  tabTextOn: { ...ui("semibold"), color: T.ink },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  sectionTitle: { ...ui("bold"), fontSize: 19, color: T.ink, flexShrink: 1 },
  sectionRight: { ...ui("regular"), fontSize: 13.5, color: T.ink3 },
  sectionLink: { ...ui("semibold"), fontSize: 14, color: T.action },
  btn: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  btnFill: { backgroundColor: T.action },
  btnOutline: { borderWidth: 1.5, borderColor: T.ink },
  btnText: { ...ui("semibold"), fontSize: 15.5 },
  pressed: { opacity: 0.85 },
  num: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  numDone: { backgroundColor: T.done },
  numNow: { borderWidth: 2, borderColor: T.action },
  numAhead: { borderWidth: 1, borderColor: T.lineStrong },
  numText: { ...ui("semibold"), fontSize: 15, color: T.ink2, paddingHorizontal: 2 },
});
