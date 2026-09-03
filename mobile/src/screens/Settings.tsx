// Settings — the drawer's content (U8-1). The drawer is chrome: account,
// sign out, sound and haptics toggles, a reduced-motion override, text size,
// about, licences. No mascot, no streak, no gamification — it is where things
// go to be configured, not celebrated.
//
// The sound/haptics/reduced-motion preferences were previously invisible (the
// services had no user-facing toggle, U6-2). They persist to AsyncStorage so
// the drawer is honest: a toggle here changes real behaviour next run.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "../store/auth";
import { color, font, radius, script, shadow, space } from "../theme";

const KEYS = {
  sound: "shabd.pref.sound",
  haptics: "shabd.pref.haptics",
  reducedMotion: "shabd.pref.reducedMotion",
  textSize: "shabd.pref.textSize",
};

function pref(key: string): Promise<boolean> {
  return AsyncStorage.getItem(key).then((v) => v !== "false");
}
function setPref(key: string, v: boolean): Promise<void> {
  return AsyncStorage.setItem(key, v ? "true" : "false");
}

export default function SettingsPanel() {
  const { learner, logout, displayName } = useAuth();
  const [sound, setSound] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [textSize, setTextSize] = useState<"S" | "M" | "L">("M");

  useEffect(() => {
    pref(KEYS.sound).then(setSound);
    pref(KEYS.haptics).then(setHapticsOn);
    pref(KEYS.reducedMotion).then(setReduced);
    AsyncStorage.getItem(KEYS.textSize).then((v) => {
      if (v === "S" || v === "L") setTextSize(v);
    });
  }, []);

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.body}>
      <Text style={styles.title}>Settings</Text>

      {/* Account */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(learner?.display_name || displayName || "G")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, script("bold")]}>
              {learner?.display_name || displayName || "Learner"}
            </Text>
            <Text style={styles.sub}>Signed in on this device</Text>
          </View>
        </View>
        <Pressable
          onPress={() => logout()}
          style={styles.dangerBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.dangerText}>Sign out</Text>
        </Pressable>
      </View>

      {/* Experience */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sound & feel</Text>
        <ToggleRow label="Sound effects" value={sound} onChange={setSound} icon="volume-high" />
        <ToggleRow label="Haptics" value={hapticsOn} onChange={setHapticsOn} icon="phone-portrait" />
        <ToggleRow
          label="Reduce motion"
          value={reduced}
          onChange={setReduced}
          icon="accessibility"
          hint="Cut decorative animation"
        />
      </View>

      {/* Text size */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Text size</Text>
        <View style={styles.sizerRow}>
          {(["S", "M", "L"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setTextSize(s)}
              style={[styles.sizer, textSize === s && styles.sizerActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: textSize === s }}
            >
              <Text style={[styles.sizerText, textSize === s && styles.sizerTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Shabd — learn Sanskrit by evidence, not guesswork.</Text>
        <Pressable
          onPress={() => {}}
          style={styles.linkRow}
          accessibilityRole="button"
        >
          <Text style={styles.link}>Licences and credits</Text>
          <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  icon,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: IoniconsIconName;
  hint?: string;
}) {
  return (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={color.inkSoft} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          onChange(v);
          const key =
            label === "Sound effects" ? KEYS.sound
            : label === "Haptics" ? KEYS.haptics
            : KEYS.reducedMotion;
          setPref(key, v);
        }}
        trackColor={{ true: color.saffron, false: color.border }}
        thumbColor={color.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: color.ink, marginBottom: space.md },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.md, ...shadow.card },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center" },
  avatarText: { color: color.white, fontSize: 18, fontWeight: "800" },
  name: { fontSize: font.sizes.base, color: color.ink },
  sub: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft },
  rowLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  rowHint: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.xs, color: color.inkFaint, marginTop: 2 },
  dangerBtn: { marginTop: space.xs, alignSelf: "flex-start", backgroundColor: color.badBg, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  dangerText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.badText },
  sizerRow: { flexDirection: "row", gap: space.sm },
  sizer: { flex: 1, alignItems: "center", paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: color.surfaceMuted },
  sizerActive: { backgroundColor: color.saffron },
  sizerText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.inkSoft },
  sizerTextActive: { color: color.white },
  aboutText: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm, lineHeight: 19 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.xs },
  link: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
});
