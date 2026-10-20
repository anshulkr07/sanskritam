// Progress — the learner's stats: day streak, today's XP, the last five weeks,
// the tutor's Sanskrit mix, topic mastery and achievements. (U8-6: renamed from
// Profile. The Sanskrit-mix dial stays HERE, never in the drawer: it is the
// product's most distinctive idea, U4-3.)
//
// Lives in the left drawer: consulted, not lived in. Takes no navigation props.
//
// Every number is real and says what it is:
//   • The DAY streak and the calendar come from GET /progress/history. The
//     `streak` field on /me and /progress/streak is a run of correct answers
//     (adaptive.py), not days, so it is not shown as one.
//   • Today's XP comes from GET /progress/daily.
//   • Mastery comes from /me, grouped by the feature taxonomy's `kind`.
//   • Achievements are kept on this device (services/achievements.ts).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Feature } from "../api/client";
import AchievementReveal from "../components/AchievementReveal";
import FetchError from "../components/FetchError";
import ProgressRing from "../components/ProgressRing";
import { Skeleton } from "../components/Skeleton";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import { useDayStats } from "../hooks/useDayStats";
import { cachedGet } from "../services/apiCache";
import { ACHIEVEMENTS, SPARSHA_25, getSparshaCoverage, getUnlocked } from "../services/achievements";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { accent, accentAt, fill, onFill, color, font, radius, script, shadow, space, type AccentName } from "../theme";
import { weekGrid } from "../utils/streak";
import { plain } from "../utils/text";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** A readable name for a feature id the taxonomy did not return. */
function humanise(id: string): string {
  return id.replace(/[_.]/g, " ").replace(/\s+/g, " ").trim();
}

export default function ProgressScreen() {
  const { learner, refresh } = useAuth();
  const { stats, failed, refresh: refreshStats } = useDayStats();
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [bumping, setBumping] = useState(false);
  // U3-4: achievements live here, the trophy shelf, not a tab.
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [sparshaCount, setSparshaCount] = useState(0);
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  const load = useCallback(() => {
    // /me holds ratios and mastery; the day stats hold XP and the calendar.
    // Refresh both together so the screen never shows a stale profile beside
    // fresh bars (that staleness is what read as "mock data").
    refresh().catch(() => {});
    refreshStats();
    cachedGet("grammar-features", api.features, 10 * 60_000)
      .then(setFeatures)
      .catch(() => setFeatures(null));
    getUnlocked().then(setUnlocked).catch(() => {});
    getSparshaCoverage().then((s) => setSparshaCount(s.length)).catch(() => {});
  }, [refresh, refreshStats]);

  // Progress goes stale behind other screens (a lesson writes mastery and XP
  // while this one is unfocused), so it refetches on every focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // U3-4: a 7-day streak unlocks sapta-dina the moment Progress sees it.
  const streakDays = stats?.streak ?? 0;
  useEffect(() => {
    if (streakDays >= 7) {
      recordAch({ type: "streak", days: streakDays }).then((fresh) => {
        if (fresh.length) getUnlocked().then(setUnlocked).catch(() => {});
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakDays]);

  // Mastery by topic: average per feature kind (case, number, tense, ...).
  const { topics, top } = useMemo(() => {
    const mastery = learner?.feature_mastery ?? {};
    const byId = new Map((features ?? []).map((f) => [f.id, f] as const));
    const groups: Record<string, number[]> = {};
    const rows: { id: string; label: string; score: number }[] = [];
    for (const [id, raw] of Object.entries(mastery)) {
      const score = typeof raw === "number" ? raw : 0;
      const f = byId.get(id);
      const kind = f?.kind ?? "other";
      (groups[kind] ??= []).push(score);
      rows.push({ id, label: plain(f?.label_en) || humanise(id), score });
    }
    const topics = Object.entries(groups).map(([kind, scores]) => ({
      kind,
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
    rows.sort((a, b) => b.score - a.score);
    return { topics, top: rows.slice(0, 6) };
  }, [learner?.feature_mastery, features]);

  const cells = useMemo(
    () => (stats ? weekGrid(stats.history, stats.daily.date, 5) : []),
    [stats],
  );

  if (!learner) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.muted}>No profile yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mix = learner.sanskrit_ratio ?? 0;
  const ceiling = learner.sanskrit_ratio_setting ?? mix;
  const script_ = learner.script_ratio ?? 0;

  const bumpScript = async () => {
    if (bumping) return;
    haptics.press();
    setBumping(true);
    try {
      await api.updateRatio({ script_ratio: Math.min(1, script_ + 0.1) });
      await refresh();
    } finally {
      setBumping(false);
    }
  };

  const daily = stats?.daily;
  const goal = daily?.goal_xp || 50;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}><Text style={styles.eyebrow}>YOUR PRACTICE, TAKING ROOT</Text><Text style={styles.introTitle}>Every day adds up.</Text><Text style={styles.introCopy}>A little Sanskrit, a growing journey.</Text></View>
        {/* the three numbers that matter */}
        <View style={styles.tiles}>
          <Tile tone="saffron" label="Day streak">
            {stats ? (
              <View style={styles.tileValueRow}>
                <Ionicons name="flame" size={22} color={accent.saffron.fg} />
                <Text style={[styles.tileValue, { color: accent.saffron.fg }]}>{stats.streak}</Text>
              </View>
            ) : (
              <Skeleton height={28} width={44} />
            )}
          </Tile>
          <Tile tone="teal" label="Today">
            {daily ? (
              <ProgressRing progress={daily.xp / goal} size={52} stroke={6} tint={daily.goal_met ? color.okText : accent.teal.fg} track="#FFFFFF">
                <Text style={[styles.ringNum, { color: accent.teal.fg }]}>{daily.xp}</Text>
              </ProgressRing>
            ) : (
              <Skeleton width={52} height={52} radius={26} />
            )}
          </Tile>
          <Tile tone="sage" label="Days practised">
            {stats ? (
              <Text style={[styles.tileValue, { color: accent.sage.fg }]}>{stats.practised}</Text>
            ) : (
              <Skeleton height={28} width={44} />
            )}
          </Tile>
        </View>
        {daily ? (
          <Text style={styles.goalLine} accessibilityLabel={`${daily.xp} of ${goal} XP today`}>
            {daily.xp} of {goal} XP today{daily.goal_met ? ", goal met" : ""}
          </Text>
        ) : null}

        {/* the last five weeks */}
        <Text style={styles.sectionTitle}>Last 5 weeks</Text>
        {failed && !stats ? (
          <View style={styles.card}>
            <FetchError label="Couldn't load your days." onRetry={load} />
          </View>
        ) : !stats ? (
          <Skeleton height={190} radius={radius.lg} />
        ) : (
          <View style={styles.card}>
            <View style={styles.weekHead}>
              {WEEKDAYS.map((d, i) => (
                <Text key={i} style={styles.weekHeadText}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((c) => (
                <View
                  key={c.key}
                  style={styles.cell}
                  accessible
                  accessibilityLabel={
                    c.future
                      ? c.key
                      : `${c.key}${c.isToday ? ", today" : ""}, ${c.active ? (c.goal ? "goal met" : "practised") : "no practice"}`
                  }
                >
                  <View style={[styles.dot, c.future && styles.dotFuture, c.active && styles.dotOn, c.goal && styles.dotGoal]}>
                    <Text
                      style={[
                        styles.cellText,
                        c.active && styles.cellTextOn,
                        c.isToday && styles.cellTextToday,
                        c.future && styles.cellTextFuture,
                      ]}
                    >
                      {c.day}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: accent.sage.from }]} />
                <Text style={styles.legendText}>Practised</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendGoal]} />
                <Text style={styles.legendText}>Goal met</Text>
              </View>
            </View>
          </View>
        )}

        {/* the tutor's language mix */}
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.card}>
          <View style={styles.mixHead}>
            <Text style={styles.mixTitle}>Tutor's Sanskrit mix</Text>
            <Text style={[styles.mixPct, { color: accent.slate.fg }]}>{Math.round(mix * 100)}%</Text>
          </View>
          <View
            style={styles.track}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Tutor's Sanskrit mix ${Math.round(mix * 100)} percent, up to ${Math.round(ceiling * 100)} percent`}
          >
            <View style={[styles.fill, { width: `${Math.round(mix * 100)}%`, backgroundColor: accent.slate.from }]} />
            <View style={[styles.marker, { left: `${Math.round(ceiling * 100)}%` }]} />
          </View>
          <Text style={styles.subLabel}>Up to {Math.round(ceiling * 100)}%</Text>

          <View style={[styles.mixHead, { marginTop: space.md }]}>
            <Text style={styles.mixTitle}>Devanagari in lessons</Text>
            <Text style={[styles.mixPct, { color: accent.sage.fg }]}>{Math.round(script_ * 100)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(script_ * 100)}%`, backgroundColor: accent.sage.from }]} />
          </View>
          <Pressable
            onPress={bumpScript}
            disabled={bumping || script_ >= 1}
            style={[styles.more, (bumping || script_ >= 1) && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Show 10 percent more Devanagari"
            accessibilityState={{ disabled: bumping || script_ >= 1, busy: bumping }}
          >
            <Ionicons name="add" size={16} color={accent.sage.fg} />
            <Text style={styles.moreText}>{bumping ? "Adding…" : "More Devanagari"}</Text>
          </Pressable>
        </View>

        {/* mastery by topic */}
        <Text style={styles.sectionTitle}>Topics</Text>
        {topics.length === 0 ? (
          <Text style={styles.muted}>No topics yet.</Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rings}>
              {topics.map((t, i) => {
                const tone = accentAt(i);
                return (
                  <View key={t.kind} style={styles.ringItem} accessible accessibilityLabel={`${t.label}, ${Math.round(t.score * 100)} percent`}>
                    <ProgressRing progress={t.score} size={64} stroke={7} tint={accent[tone].from}>
                      <Text style={[styles.ringNum, { color: accent[tone].fg }]}>{Math.round(t.score * 100)}</Text>
                    </ProgressRing>
                    <Text style={styles.ringLabel} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.card}>
              {top.map((r, i) => (
                <View key={r.id} style={styles.topRow}>
                  <Text style={styles.topLabel} numberOfLines={1}>
                    {r.label}
                  </Text>
                  <View style={styles.topTrack}>
                    <View style={{ width: `${Math.round(r.score * 100)}%`, height: 8, borderRadius: 4, backgroundColor: accent[accentAt(i)].from }} />
                  </View>
                  <Text style={styles.topScore}>{Math.round(r.score * 100)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* achievements (U3-4): Sanskrit motifs, never generic trophies */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achGrid}>
          {ACHIEVEMENTS.map((a, i) => {
            const isOut = !!unlocked[a.id];
            const tone: AccentName = accentAt(i + 1);
            const sub =
              a.id === "sparsha-pancaka" && !isOut ? `${sparshaCount} / ${SPARSHA_25.length} sounds tried` : a.hint;
            return (
              <View
                key={a.id}
                style={[styles.achTile, isOut ? { backgroundColor: color.bg, borderColor: color.border, borderWidth: 1 } : styles.achLocked]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${a.sa}. ${a.en}. ${isOut ? "Earned" : `Locked. ${sub}`}`}
              >
                <Text style={[styles.achMotif, script("bold"), { color: isOut ? accent[tone].fg : color.inkFaint }]}>{a.motif}</Text>
                <Text style={[styles.achSa, script("bold"), !isOut && { color: color.inkSoft }]}>{a.sa}</Text>
                {/* Earned: what it means. Locked: how to earn it. One line each. */}
                <Text style={isOut ? styles.achEn : styles.achHint}>{isOut ? a.en : sub}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <AchievementReveal queue={achQueue} onDone={dismissAch} />
    </SafeAreaView>
  );
}

function Tile({ tone, label, children }: { tone: AccentName; label: string; children: React.ReactNode }) {
  return (
    <View style={[styles.tile, { backgroundColor: color.bg, borderColor: color.border, borderWidth: 1 }]}>
      <View style={styles.tileBody}>{children}</View>
      <Text style={[styles.tileLabel, { color: accent[tone].fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  // 120 at the bottom: the Ask bubble floats over the last tiles.
  body: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 120 },
  intro: { backgroundColor: fill.teal, padding: 24, marginBottom: 20, gap: 8 },
  eyebrow: { fontFamily: "Nunito_800ExtraBold", fontSize: 10, letterSpacing: 1.2, color: onFill.gold },
  introTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, lineHeight: 36, color: onFill.text },
  introCopy: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: onFill.soft },
  tiles: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.sm, alignItems: "center", gap: space.xs },
  tileBody: { minHeight: 52, alignItems: "center", justifyContent: "center" },
  tileValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tileValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 34, lineHeight: 42 },
  tileLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, textAlign: "center" },
  ringNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  goalLine: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, textAlign: "center", marginTop: space.sm },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", color: color.inkSoft, marginTop: 32, marginBottom: space.sm },
  card: { backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, borderRadius: 16, padding: 20 },
  // ── calendar ──
  weekHead: { flexDirection: "row", marginBottom: 6 },
  weekHeadText: { width: `${100 / 7}%`, textAlign: "center", fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dot: { flex: 1, borderRadius: 999, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  dotFuture: { backgroundColor: "transparent" },
  dotOn: { backgroundColor: accent.sage.from },
  dotGoal: { borderWidth: 3, borderColor: color.saffronBtn },
  cellText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  cellTextOn: { color: color.white },
  cellTextToday: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, textDecorationLine: "underline" },
  cellTextFuture: { opacity: 0.35 },
  legend: { flexDirection: "row", gap: space.md, marginTop: space.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendGoal: { borderWidth: 2, borderColor: color.saffronBtn, backgroundColor: "transparent" },
  legendText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  // ── language ──
  mixHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs },
  mixTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  mixPct: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base },
  track: { height: 12, borderRadius: 6, backgroundColor: color.border, overflow: "visible", justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, height: 12, borderRadius: 6 },
  marker: { position: "absolute", top: -4, width: 3, height: 20, borderRadius: 1.5, backgroundColor: color.ink },
  subLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 6 },
  more: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: accent.sage.bg, marginTop: space.sm },
  moreText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: accent.sage.fg },
  // ── topics ──
  rings: { gap: space.md, paddingVertical: space.xs, paddingRight: space.lg },
  ringItem: { alignItems: "center", width: 72 },
  ringLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 4 },
  topRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  topLabel: { width: "38%", fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  topTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.border, overflow: "hidden", marginHorizontal: space.sm },
  topScore: { width: 28, textAlign: "right", fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft },
  // ── achievements ──
  achGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  achTile: { flexGrow: 1, flexBasis: "46%", borderRadius: radius.lg, padding: space.md, alignItems: "center" },
  achLocked: { backgroundColor: color.surfaceMuted },
  achMotif: { fontSize: font.sizes.xl, lineHeight: 42 },
  achSa: { fontSize: font.sizes.base, color: color.ink, marginTop: 4, textAlign: "center" },
  achEn: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2, textAlign: "center" },
  achHint: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkFaint, marginTop: 4, textAlign: "center" },
});
