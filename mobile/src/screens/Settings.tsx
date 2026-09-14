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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "../store/auth";
import type { RootStackParamList } from "../navigation/types";
import { setSoundEffectsEnabled } from "../services/sfx";
import {
  isHapticsEnabled,
  isReducedMotionOverride,
  loadPrefs,
  setHapticsEnabled,
  setReducedMotionOverride,
} from "../services/prefs";
import { color, font, radius, script, shadow, space } from "../theme";
import { useTypeScale, type TextSize } from "../hooks/useTypeScale";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { textSize, setTextSize } = useTypeScale();
  const [sound, setSound] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    pref(KEYS.sound).then(setSound);
    // U15-7: both flags are real now — haptics gates services/haptics, the
    // reduce-motion override gates useReducedMotion. Load persisted values.
    loadPrefs().then(() => {
      setHapticsOn(isHapticsEnabled());
      setReduced(isReducedMotionOverride());
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
            <Text style={styles.avatarText}>{((learner?.display_name || displayName || "").trim().charAt(0).toUpperCase() || "…")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, script("bold")]}>
              {learner?.display_name || displayName || "…"}
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
        <ToggleRow
          label="Sound effects"
          value={sound}
          onChange={(v) => {
            setSound(v);
            setSoundEffectsEnabled(v); // U6-2: immediate, respects the toggle
          }}
          icon="volume-high"
        />
        <ToggleRow label="Haptics" value={hapticsOn} onChange={(v) => { setHapticsOn(v); setHapticsEnabled(v); }} icon="phone-portrait" />
        <ToggleRow
          label="Reduce motion"
          value={reduced}
          onChange={(v) => { setReduced(v); setReducedMotionOverride(v); }}
          icon="accessibility"
          hint="Cut decorative animation"
        />
      </View>

      {/* Text size — U5-2: "Larger text" scales the app's own type ramp
          independently of the OS; XL targets elder mode. */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Text size</Text>
        <View style={styles.sizerRow}>
          {(["S", "M", "L", "XL"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setTextSize(s as TextSize)}
              style={[styles.sizer, textSize === s && styles.sizerActive]}
              accessibilityRole="button"
              accessibilityLabel={`Text size ${s}`}
              accessibilityState={{ selected: textSize === s }}
            >
              <Text style={[styles.sizerText, textSize === s && styles.sizerTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sizerHint}>
          XL is elder mode — Sanskrit body text never drops below 18pt.
        </Text>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Sanskritam — learn Sanskrit by evidence, not guesswork.</Text>
        <Pressable
          onPress={() => {
            // Settings lives in the drawer; Licences lives on the root
            // stack — route through the parent navigator.
            const parent = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
            if (parent) parent.navigate("Licences");
            else navigation.navigate("Licences" as never);
          }}
          style={styles.linkRow}
          accessibilityRole="button"
          accessibilityLabel="Licences and credits"
        >
          <Text style={styles.link}>Licences and credits</Text>
            <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
          </Pressable>
          {/* P24: YouTube API Services Developer Policies III.A.1 — clients
              must display a link to YouTube's Terms and bind their users to
              them. Lesson videos play in YouTube's own player. */}
          <Pressable
            onPress={async () => {
              try {
                await WebBrowser.openBrowserAsync("https://www.youtube.com/t/terms");
              } catch {
                try {
                  await Linking.openURL("https://www.youtube.com/t/terms");
                } catch {
                  /* no browser available — the row stays, the link waits */
                }
              }
            }}
            style={styles.linkRow}
            accessibilityRole="button"
            accessibilityLabel="YouTube Terms of Service"
          >
            <Text style={styles.link}>YouTube Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
          </Pressable>
          <Text style={styles.aboutNote}>
            Lesson videos play on YouTube. By watching them you agree to be bound by the YouTube Terms of Service.
          </Text>
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
  sizer: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: color.surfaceMuted },
  sizerActive: { backgroundColor: color.saffron },
  sizerText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.inkSoft },
  sizerTextActive: { color: color.white },
  sizerHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: space.sm,
    lineHeight: 16,
  },
  aboutText: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.sm, lineHeight: 19 },
  aboutNote: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: space.xs,
    lineHeight: 16,
  },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.xs },
  link: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
});
