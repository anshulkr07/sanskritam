// Profile — the learner's stats: streak, the two ratios, and feature mastery.
// Reads /me (already cached in auth). Lets the user bump the script ratio.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { color, font, radius, shadow, space } from "../theme";

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

        {/* Feature mastery */}
        <Text style={styles.sectionTitle}>Feature mastery</Text>
        {mastery.length === 0 ? (
          <Text style={styles.muted}>No features mastered yet. Do a few lessons!</Text>
        ) : (
          mastery.slice(0, 12).map(([id, score]) => (
            <View key={id} style={styles.masteryRow}>
              <Text style={styles.masteryId}>{id}</Text>
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
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  masteryRow: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  masteryId: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink, width: 90 },
  masteryTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.border, overflow: "hidden", marginHorizontal: space.sm },
  masteryScore: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft, width: 26, textAlign: "right" },
});