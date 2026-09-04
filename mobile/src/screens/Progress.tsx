// Progress — the learner's stats: streak, the two ratios, and feature mastery.
// (U8-6: renamed from Profile. The Sanskrit ratio dial stays HERE, never in the
// drawer — it is the product's most distinctive idea, U4-3, and hiding a
// differentiator in a settings list is how it stops being one.) Reads /me.
// U3-3: radial rings per category. U4-3: code-switch dial made visible.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { api, type ProgressDaily, type ProgressDay, type ProgressStreak } from "../api/client";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import type { TabScreenProps } from "../navigation/types";
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

// ── Streak calendar (U3-2 / U9-2) ────────────────────────────────────
// A wrap grid of the last 35 learner-local days from /progress/history.
// Colour is never the only signal: every cell shows its day number and reads
// its state aloud for the screen reader (§U5-3).

function StreakCalendar({ days }: { days: ProgressDay[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells: { date: string; day: string; active: boolean; goal: boolean; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rec = byDate.get(key);
    cells.push({
      date: key,
      day: String(d.getDate()),
      active: !!rec && rec.xp > 0,
      goal: !!rec && rec.goal_met,
      isToday: i === 0,
    });
  }

  return (
    <View style={styles.calGrid}>
      {cells.map((c) => (
        <View
          key={c.date}
          accessibilityLabel={`${c.date}, ${c.active ? (c.goal ? "goal met" : "practice done") : "no practice"}`}
          style={[
            styles.calCell,
            c.active && styles.calCellActive,
            c.goal && styles.calCellGoal,
            c.isToday && styles.calCellToday,
          ]}
        >
          <Text style={[styles.calDay, c.active && styles.calDayActive]}>{c.day}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function ProgressScreen(_props: TabScreenProps<"Progress">) {
  const { learner, refresh } = useAuth();
  const [bumping, setBumping] = useState(false);
  // ── U9-2: real progress data (was /me-only) ──
  const [daily, setDaily] = useState<ProgressDaily | null>(null);
  const [streak, setStreak] = useState<ProgressStreak | null>(null);
  const [history, setHistory] = useState<ProgressDay[]>([]);
  const [repairing, setRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  useEffect(() => {
    api.progressDaily().then(setDaily).catch(() => {});
    api.progressStreak().then(setStreak).catch(() => {});
    api.progressHistory(35).then(setHistory).catch(() => {});
  }, []);

  const repair = useCallback(async () => {
    if (repairing || (streak?.freezes ?? 0) <= 0) return;
    haptics.press();
    setRepairing(true);
    setRepairMsg(null);
    try {
      const res = await api.progressRepair();
      setRepairMsg(
        res.repaired
          ? `Streak saved — now ${res.streak}. ${res.freezes_remaining} freeze ${res.freezes_remaining === 1 ? "left" : "s left"}.`
          : "No freezes left to use.",
      );
      setStreak((s) => (s ? { ...s, streak: res.streak, freezes: res.freezes_remaining } : s));
      await refresh();
    } catch {
      setRepairMsg("Repair failed. Try again.");
    } finally {
      setRepairing(false);
    }
  }, [repairing, streak, refresh]);

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
    <SafeAreaView style={styles.safe} edges={["top"]}>
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

        {/* Daily goal — real progress, not a bare number (U9-2) */}
        {daily && (
          <View style={styles.dialCard}>
            <Text style={styles.dialTitle}>Today's goal</Text>
            <View style={styles.dialTrack}>
              <View
                style={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: color.saffron,
                  width: `${Math.min(100, daily.goal_xp ? (daily.xp / daily.goal_xp) * 100 : 0)}%`,
                }}
              />
            </View>
            <Text style={styles.dialHint}>
              {daily.xp} / {daily.goal_xp} XP {daily.goal_met ? "· goal met ✓" : ""}
            </Text>
          </View>
        )}

        {/* Streak calendar — real activity history (U3-2 / U9-2) */}
        <Text style={styles.sectionTitle}>Last 35 days</Text>
        <StreakCalendar days={history} />

        {/* Freeze / repair — explained BEFORE it fires (U3-2 / P13-3) */}
        <View style={styles.dialCard}>
          <View style={styles.dialRow}>
            <Ionicons name="shield-outline" size={18} color={color.saffron} />
            <Text style={styles.dialTitle}>Streak freezes</Text>
            <Text style={styles.freezeCount}>{streak?.freezes ?? 0} / {streak?.max_freezes ?? 2}</Text>
          </View>
          <Text style={styles.dialHint}>
            A missed day can be repaired within 48 hours using one freeze. You have these before you ever
            need them — a streak that breaks silently is the one thing this app won't do.
          </Text>
          <Pressable
            onPress={repair}
            disabled={repairing || (streak?.freezes ?? 0) <= 0}
            style={[styles.repairBtn, (streak?.freezes ?? 0) <= 0 && styles.repairBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Use a streak freeze"
            accessibilityState={{ disabled: (streak?.freezes ?? 0) <= 0, busy: repairing }}
          >
            <Text style={styles.repairBtnText}>{repairing ? "Repairing…" : "Use a freeze"}</Text>
          </Pressable>
          {repairMsg && <Text style={styles.dialHint}>{repairMsg}</Text>}
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
  // ── U9-2: freezes + calendar ──
  freezeCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  repairBtn: { alignSelf: "flex-start", backgroundColor: color.saffron, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, marginTop: space.sm, ...shadow.button },
  repairBtnDisabled: { backgroundColor: color.inkFaint },
  repairBtnText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.white },
  calGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: space.xs },
  calCell: { width: "13.2%", aspectRatio: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.surfaceMuted, borderRadius: 6 },
  calCellActive: { backgroundColor: color.okBg, borderWidth: 1, borderColor: color.ok },
  calCellGoal: { borderWidth: 2, borderColor: color.saffron },
  calCellToday: { borderWidth: 1, borderColor: color.ink },
  calDay: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  calDayActive: { color: color.okText },
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