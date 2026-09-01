// Profile — the learner's stats: streak, the two ratios, and feature mastery.
// Reads /me (already cached in auth). Lets the user bump the script ratio.
// U3-3: Added Skia-inspired radial rings for per-category mastery visualisation.
// U4-3: Code-switch dial made visible with animated language bar.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { api } from "../api/client";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { color, font, radius, script, shadow, space } from "../theme";
import { spring as springCfg } from "../motion";

// ── Grouped feature kinds ─────────────────────────────────────────────

const FEATURE_GROUPS: Record<string, { label: string; color: string }> = {
  case:       { label: "Case",       color: color.saffron },
  number:     { label: "Number",     color: color.ok },
  tense:      { label: "Tense",      color: "#5A7D9A" },
  voice:      { label: "Voice",      color: color.unsure },
  gender:     { label: "Gender",     color: "#9D650B" },
  sandhi:     { label: "Sandhi",     color: "#CA4715" },
  compound:   { label: "Compound",   color: "#25833E" },
  verb:       { label: "Verb",       color: color.tutor },
  noun:       { label: "Noun",       color: "#6F59EC" },
};

function groupFeatures(mastery: Record<string, number>): { label: string; color: string; score: number }[] {
  const groups: Record<string, number[]> = {};
  for (const [key, val] of Object.entries(mastery)) {
    const prefix = key.split("_")[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(val);
  }
  return Object.entries(groups).map(([prefix, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const info = FEATURE_GROUPS[prefix] ?? { label: prefix, color: color.inkSoft };
    return { ...info, score: avg };
  });
}

// ── Radial ring component ─────────────────────────────────────────────

function MasteryRing({
  label,
  score,
  ringColor,
  size = 48,
}: {
  label: string;
  score: number;
  ringColor: string;
  size?: number;
}) {
  const animVal = useSharedValue(0);
  animVal.value = withSpring(score, springCfg.snappy);

  const circleStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 4,
    borderColor: ringColor,
    opacity: 0.3 + animVal.value * 0.7,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: ringColor,
    transform: [{ rotate: `${animVal.value * 360}deg` }],
  }));

  return (
    <View style={{ alignItems: "center", width: size + 16 }}>
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={[styles.ringBg, circleStyle]} />
        <Text style={[styles.ringScore, { fontSize: size * 0.28 }]}>
          {Math.round(score * 100)}
        </Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

// ── Code-switch dial ──────────────────────────────────────────────────

function CodeSwitchDial({
  sanskritRatio,
  sanskritRatioSetting,
}: {
  sanskritRatio: number;
  sanskritRatioSetting: number;
}) {
  return (
    <View style={styles.dialCard}>
      <Text style={styles.dialTitle}>Sanskrit vs Bridge</Text>
      <View style={styles.langBar}>
        {/* Sanskrit fill — animated */}
        <View
          style={[
            styles.langBarFill,
            { width: `${Math.round(sanskritRatio * 100)}%`, backgroundColor: color.tutor },
          ]}
        />
        {/* Setting marker — learner's ceiling */}
        <View
          style={[
            styles.langBarMarker,
            { left: `${Math.round(sanskritRatioSetting * 100)}%` },
          ]}
        />
      </View>
      <View style={styles.langBarLabels}>
        <Text style={styles.langBarLabel}>Bridge ({Math.round((1 - sanskritRatio) * 100)}%)</Text>
        <Text style={[styles.langBarLabel, { color: color.tutor }]}>
          Sanskrit ({Math.round(sanskritRatio * 100)}%)
        </Text>
      </View>
      <Text style={styles.dialHint}>
        Your ceiling: {Math.round(sanskritRatioSetting * 100)}%. The system drifts
        beneath it as you grow.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { learner, refresh } = useAuth();
  const [bumping, setBumping] = useState(false);

  if (!learner) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.muted}>No profile yet.</Text></View>
      </SafeAreaView>
    );
  }

  const mastery = Object.entries(learner.feature_mastery || {}).sort((a, b) => b[1] - a[1]);
  const groups = groupFeatures(learner.feature_mastery || {});

  const bumpScript = async () => {
    if (bumping) return;
    haptics.press();
    setBumping(true);
    try {
      const next = Math.min(1, (learner.script_ratio || 0) + 0.1);
      await api.updateRatio({ script_ratio: next });
      await refresh();
    } finally {
      setBumping(false);
    }
  };

  const stat = (label: string, value: string, accent: string, icon?: IoniconsIconName) => (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        {icon && <Ionicons name={icon} size={18} color={accent} />}
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{learner.display_name[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{learner.display_name}</Text>
            <Text style={styles.langs}>{learner.bridge_langs.join(" · ")}</Text>
          </View>
        </View>

        {/* Stat row */}
        <View style={styles.statRow}>
          {stat("Streak", `${learner.streak}`, color.saffron, "flame")}
          {stat("Sãskṛta", `${Math.round((learner.sanskrit_ratio || 0) * 100)}%`, color.tutor)}
          {stat("Script", `${Math.round((learner.script_ratio || 0) * 100)}%`, color.ok)}
        </View>

        {/* Code-switch dial (U4-3) */}
        <CodeSwitchDial
          sanskritRatio={learner.sanskrit_ratio || 0}
          sanskritRatioSetting={learner.sanskrit_ratio || 0}
        />

        {/* Script ratio dial */}
        <View style={styles.dialCard}>
          <View style={styles.dialRow}>
            <Text style={styles.dialTitle}>Roman → Devanagari</Text>
            <Pressable onPress={bumpScript} disabled={bumping} style={styles.dialBtn}>
              <Text style={styles.dialBtnText}>{bumping ? "…" : "+ 10%"}</Text>
            </Pressable>
          </View>
          <View style={styles.dialTrack}>
            <View
              style={{
                width: `${Math.round((learner.script_ratio || 0) * 100)}%`,
                height: 10,
                borderRadius: 5,
                backgroundColor: color.ok,
              }}
            />
          </View>
          <Text style={styles.dialHint}>How much of your interface uses Devanagari vs IAST.</Text>
        </View>

        {/* Mastery rings (U3-3) */}
        <Text style={styles.sectionTitle}>Category mastery</Text>
        {groups.length === 0 ? (
          <Text style={styles.muted}>No data yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ringRow}>
            {groups.map((g) => (
              <MasteryRing
                key={g.label}
                label={g.label}
                score={g.score}
                ringColor={g.color}
              />
            ))}
          </ScrollView>
        )}

        {/* Feature detail list */}
        <Text style={styles.sectionTitle}>Feature detail</Text>
        {mastery.length === 0 ? (
          <Text style={styles.muted}>No features mastered yet. Do a few lessons!</Text>
        ) : (
          mastery.slice(0, 12).map(([id, score]) => (
            <View key={id} style={styles.masteryRow}>
              <Text style={styles.masteryId}>{id.replace(/_/g, " ")}</Text>
              <View style={styles.masteryTrack}>
                <View
                  style={{ width: `${Math.round(score * 100)}%`, height: 8, borderRadius: 4, backgroundColor: color.saffron }}
                />
              </View>
              <Text style={styles.masteryScore}>{Math.round(score * 100)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  body: { padding: space.lg },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center" },
  avatarText: { color: color.white, fontSize: 24, fontWeight: "800" },
  name: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  langs: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
  statRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.lg, ...shadow.card },
  stat: { alignItems: "center" },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  statLabel: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2 },
  dialCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.lg, ...shadow.card },
  dialRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  dialTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  dialBtn: { backgroundColor: color.ok, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 6 },
  dialBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.white },
  dialTrack: { height: 10, borderRadius: 5, backgroundColor: color.border, overflow: "hidden" },
  dialHint: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.sm },
  langBar: { height: 16, borderRadius: 8, backgroundColor: color.border, overflow: "visible", position: "relative", marginBottom: space.xs },
  langBarFill: { height: 16, borderRadius: 8, position: "absolute", left: 0, top: 0 },
  langBarMarker: { position: "absolute", top: -4, width: 3, height: 24, backgroundColor: color.ink, borderRadius: 1.5 },
  langBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  langBarLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm, marginTop: space.md },
  ringRow: { marginBottom: space.lg, paddingBottom: space.xs },
  ringBg: { position: "absolute" },
  ringScore: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  ringLabel: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 4, textAlign: "center" },
  masteryRow: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  masteryId: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink, width: 90 },
  masteryTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.border, overflow: "hidden", marginHorizontal: space.sm },
  masteryScore: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, width: 26, textAlign: "right" },
});