// Progress — the learner's stats: a month of practice, day streak, today's
// XP, the tutor's Sanskrit mix, topic mastery and achievements. (U8-6: renamed
// from Profile. The Sanskrit-mix dial stays HERE, never in the drawer: it is
// the product's most distinctive idea, U4-3.)
//
// Owner's pick (2026-10-20): option R3, the month calendar first and the
// numbers as a plain ledger under it; achievements as option R1's rows, each
// with a trophy on its shelf (owner: "instead of just name boxes there, lets
// have some trophies"). Hairline rules and square shapes, no cards.
//
// Lives in the left drawer: consulted, not lived in. Takes no navigation props.
//
// Every number is real and says what it is:
//   • The DAY streak and the calendar come from GET /progress/history (the
//     last 90 days, so the calendar steps back as far as that reaches). The
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
import Svg, { Path, Rect } from "react-native-svg";

import { api, type Feature, type ProgressDay } from "../api/client";
import AchievementReveal from "../components/AchievementReveal";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import { useDayStats } from "../hooks/useDayStats";
import { cachedGet } from "../services/apiCache";
import { ACHIEVEMENTS, SPARSHA_25, getSparshaCoverage, getUnlocked } from "../services/achievements";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { color, fill, fillAt, font, onFill, outline, script, space } from "../theme";
import { isActiveDay, shiftDay } from "../utils/streak";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** GET /progress/history is read for this many days. */
const HISTORY_DAYS = 90;

interface MonthCell {
  key: string;
  /** 0 for the blanks before the 1st and after the last day. */
  day: number;
  active: boolean;
  goal: boolean;
  isToday: boolean;
  future: boolean;
}

/** The month `back` months before today's, Sunday-first, padded to whole weeks. */
function monthGrid(history: ProgressDay[], today: string, back: number): { title: string; cells: MonthCell[] } {
  const [ty, tm] = today.split("-").map(Number);
  const first = new Date(Date.UTC(ty, tm - 1 - back, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const byDate = new Map(history.map((d) => [d.date, d]));
  const cells: MonthCell[] = [];
  const blank = (i: number): MonthCell => ({ key: `blank-${i}`, day: 0, active: false, goal: false, isToday: false, future: false });
  for (let i = 0; i < first.getUTCDay(); i++) cells.push(blank(i));
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = byDate.get(key);
    cells.push({ key, day: d, active: isActiveDay(rec), goal: !!rec?.goal_met, isToday: key === today, future: key > today });
  }
  while (cells.length % 7) cells.push(blank(cells.length));
  return { title: `${MONTHS[m]} ${y}`, cells };
}

export default function ProgressScreen() {
  const { learner, refresh } = useAuth();
  const { stats, failed, refresh: refreshStats } = useDayStats();
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [bumping, setBumping] = useState(false);
  const [back, setBack] = useState(0);
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
  const topics = useMemo(() => {
    const mastery = learner?.feature_mastery ?? {};
    const byId = new Map((features ?? []).map((f) => [f.id, f] as const));
    const groups: Record<string, number[]> = {};
    for (const [id, raw] of Object.entries(mastery)) {
      const kind = byId.get(id)?.kind ?? "other";
      (groups[kind] ??= []).push(typeof raw === "number" ? raw : 0);
    }
    return Object.entries(groups)
      .map(([kind, scores]) => ({
        kind,
        label: kind.charAt(0).toUpperCase() + kind.slice(1),
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.score - a.score);
  }, [learner?.feature_mastery, features]);

  const month = useMemo(() => (stats ? monthGrid(stats.history, stats.daily.date, back) : null), [stats, back]);
  // Back only as far as the history reaches.
  const canBack = !!stats && !!month && month.cells.find((c) => c.day === 1)!.key > shiftDay(stats.daily.date, -(HISTORY_DAYS - 1));

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
  const earned = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const nextUp = ACHIEVEMENTS.find((a) => !unlocked[a.id]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* the month */}
        {failed && !stats ? (
          <FetchError label="Couldn't load your days." onRetry={load} />
        ) : !stats || !month ? (
          <Skeleton height={320} radius={0} />
        ) : (
          <>
            <View style={styles.monthHead}>
              <Pressable
                onPress={() => setBack((b) => b + 1)}
                disabled={!canBack}
                style={[styles.monthStep, !canBack && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                accessibilityState={{ disabled: !canBack }}
              >
                <Ionicons name="chevron-back" size={16} color={color.ink} />
              </Pressable>
              <Text style={styles.monthTitle} accessibilityRole="header">{month.title}</Text>
              <Pressable
                onPress={() => setBack((b) => Math.max(0, b - 1))}
                disabled={back === 0}
                style={[styles.monthStep, back === 0 && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                accessibilityState={{ disabled: back === 0 }}
              >
                <Ionicons name="chevron-forward" size={16} color={color.ink} />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {WEEKDAYS.map((d, i) => (
                <Text key={`h${i}`} style={styles.weekHead}>{d}</Text>
              ))}
              {month.cells.map((c) => (
                <View
                  key={c.key}
                  style={[styles.cell, c.active && !c.future && { backgroundColor: fill.sage }, c.isToday && styles.today]}
                  accessible={c.day > 0}
                  accessibilityLabel={
                    c.day === 0 ? undefined
                      : c.future ? c.key
                        : `${c.key}${c.isToday ? ", today" : ""}, ${c.active ? (c.goal ? "goal met" : "practised") : "no practice"}`
                  }
                >
                  {c.day > 0 && (
                    <>
                      <Text style={[styles.cellText, c.active && !c.future && styles.cellTextOn, c.future && styles.cellTextFuture, c.isToday && styles.cellTextToday]}>
                        {c.day}
                      </Text>
                      <View style={[styles.goalMark, c.goal && c.active && { backgroundColor: onFill.gold }]} />
                    </>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: fill.sage }]} />
                <Text style={styles.legendText}>Practised</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: fill.sage, justifyContent: "flex-end", alignItems: "center", paddingBottom: 2 }]}>
                  <View style={{ width: 8, height: 2, backgroundColor: onFill.gold }} />
                </View>
                <Text style={styles.legendText}>Goal met</Text>
              </View>
            </View>
          </>
        )}

        {/* the ledger */}
        <View style={styles.ledger}>
          <LedgerRow label="Day streak" value={stats ? `${stats.streak} ${stats.streak === 1 ? "day" : "days"}` : null} />
          <LedgerRow label="Today" value={daily ? `${daily.xp} of ${goal} XP${daily.goal_met ? ", goal met" : ""}` : null} />
          <LedgerRow label={`Days practised, last ${HISTORY_DAYS}`} value={stats ? String(stats.practised) : null} />
          <LedgerRow
            label="Tutor's Sanskrit mix"
            value={`${Math.round(mix * 100)}%`}
            sub={`of ${Math.round(ceiling * 100)}%`}
            a11y={`Tutor's Sanskrit mix ${Math.round(mix * 100)} percent, up to ${Math.round(ceiling * 100)} percent`}
          />
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>Devanagari in lessons</Text>
            <Text style={styles.ledgerValue}>{Math.round(script_ * 100)}%</Text>
            <Pressable
              onPress={bumpScript}
              disabled={bumping || script_ >= 1}
              style={({ pressed }) => [styles.more, (bumping || script_ >= 1) && styles.disabled, pressed && { backgroundColor: color.surfaceMuted }]}
              accessibilityRole="button"
              accessibilityLabel="Show 10 percent more Devanagari"
              accessibilityState={{ disabled: bumping || script_ >= 1, busy: bumping }}
            >
              <Text style={styles.moreText}>{bumping ? "Adding…" : "More"}</Text>
            </Pressable>
          </View>
        </View>

        {/* mastery by topic */}
        <Text style={styles.sectionTitle} accessibilityRole="header">Topics</Text>
        {topics.length === 0 ? (
          <Text style={styles.muted}>No topics yet. Lessons fill these in.</Text>
        ) : (
          topics.map((t, i) => (
            <View key={t.kind} style={styles.topicRow} accessible accessibilityLabel={`${t.label}, ${Math.round(t.score * 100)} percent`}>
              <Text style={styles.topicLabel} numberOfLines={1}>{t.label}</Text>
              <View style={styles.topicTrack}>
                <View style={{ width: `${Math.round(t.score * 100)}%`, height: 4, backgroundColor: fill[fillAt(i)] }} />
              </View>
              <Text style={styles.topicPct}>{Math.round(t.score * 100)}</Text>
            </View>
          ))
        )}

        {/* achievements (U3-4): each one a trophy on the shelf */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Achievements · {earned} of {ACHIEVEMENTS.length}
        </Text>
        {ACHIEVEMENTS.map((a, i) => {
          const isOut = !!unlocked[a.id];
          const line = isOut ? a.en
            : a.id === "sparsha-pancaka" ? `${sparshaCount} / ${SPARSHA_25.length} sounds tried`
              : a.hint;
          return (
            <View
              key={a.id}
              style={styles.achRow}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${a.sa}. ${a.en}. ${isOut ? "Earned" : `Locked. ${line}`}`}
            >
              <Trophy earned={isOut} tone={fill[fillAt(i)]} />
              <View style={styles.achText}>
                <Text style={[styles.achSa, script("bold"), !isOut && { color: color.inkSoft }]}>{a.sa}</Text>
                <Text style={styles.achLine}>{line}</Text>
              </View>
              <Text style={[styles.achState, { color: isOut ? color.okText : color.inkSoft }]}>{isOut ? "EARNED" : "LOCKED"}</Text>
            </View>
          );
        })}
        {!!nextUp && earned > 0 && <Text style={styles.note}>Next: {nextUp.sa}, {nextUp.hint.charAt(0).toLowerCase() + nextUp.hint.slice(1)}.</Text>}
      </ScrollView>
      <AchievementReveal queue={achQueue} onDone={dismissAch} />
    </SafeAreaView>
  );
}

function LedgerRow({ label, value, sub, a11y }: { label: string; value: string | null; sub?: string; a11y?: string }) {
  return (
    <View style={styles.ledgerRow} accessible accessibilityLabel={a11y ?? (value ? `${label}, ${value}` : label)}>
      <Text style={styles.ledgerLabel}>{label}</Text>
      {value === null ? (
        <Skeleton width={56} height={16} radius={0} />
      ) : (
        <Text style={styles.ledgerValue}>
          {value}
          {!!sub && <Text style={styles.ledgerSub}> {sub}</Text>}
        </Text>
      )}
    </View>
  );
}

/**
 * A trophy in a square case. Earned: the cup in the achievement's colour with
 * a gold rim. Locked: the outline only.
 */
function Trophy({ earned, tone }: { earned: boolean; tone: string }) {
  const rim = earned ? color.gold : outline;
  const body = earned ? tone : "none";
  return (
    <View style={[styles.trophyCase, { borderColor: earned ? color.gold : color.border }]}>
      <Svg width={34} height={34} viewBox="0 0 24 24">
        {/* handles */}
        <Path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10" fill="none" stroke={rim} strokeWidth={1.4} />
        {/* cup */}
        <Path d="M7 3.5h10V8a5 5 0 0 1-10 0z" fill={body} stroke={rim} strokeWidth={1.4} strokeLinejoin="round" />
        {/* stem and base */}
        <Path d="M11 13h2v3.5h-2z" fill={earned ? rim : "none"} stroke={rim} strokeWidth={1.2} />
        <Rect x={7.5} y={16.5} width={9} height={3.5} fill={earned ? fill.ink : "none"} stroke={rim} strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, paddingVertical: space.xs },
  // 120 at the bottom: the Ask bubble floats over the last rows.
  body: { paddingHorizontal: 20, paddingTop: space.xs, paddingBottom: 120 },
  // ── month ──
  monthHead: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  monthStep: { width: 40, height: 40, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  monthTitle: { flex: 1, textAlign: "center", fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 17, color: color.ink },
  disabled: { opacity: 0.35 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: space.xs, borderTopWidth: 1, borderLeftWidth: 1, borderColor: color.border },
  weekHead: {
    width: `${100 / 7}%`,
    textAlign: "center",
    paddingVertical: 6,
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    color: color.inkSoft,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
  },
  today: { borderWidth: 2, borderColor: color.ink },
  cellText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, color: color.inkSoft },
  cellTextOn: { color: onFill.text },
  cellTextFuture: { opacity: 0.45 },
  cellTextToday: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  goalMark: { width: 14, height: 3 },
  legend: { flexDirection: "row", gap: space.md, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 12, height: 12 },
  legendText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.xs, color: color.inkSoft },
  // ── ledger ──
  ledger: { marginTop: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  ledgerRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, borderBottomWidth: 1, borderBottomColor: color.border },
  ledgerLabel: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: color.ink },
  ledgerValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, color: color.ink },
  ledgerSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12, color: color.inkSoft },
  more: { height: 30, paddingHorizontal: 10, borderWidth: 1, borderColor: color.ink, justifyContent: "center" },
  moreText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12, color: color.ink },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginTop: 28,
    marginBottom: 4,
  },
  // ── topics ──
  topicRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 40, borderBottomWidth: 1, borderBottomColor: color.border },
  topicLabel: { width: 96, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  topicTrack: { flex: 1, height: 4, backgroundColor: color.border },
  topicPct: { width: 32, textAlign: "right", fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, color: color.inkSoft },
  // ── achievements ──
  achRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 68, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.border },
  trophyCase: { width: 52, height: 52, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  achText: { flex: 1 },
  achSa: { fontSize: 16, lineHeight: 22, color: color.ink },
  achLine: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, lineHeight: 18, color: color.inkSoft },
  achState: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.6 },
  note: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, lineHeight: 19, color: color.inkSoft, marginTop: space.xs },
});
