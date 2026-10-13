// Leaderboards: daily/weekly/monthly periods, combined and per-game boards,
// Friends/Everyone filters, restrained top-three treatment, a pinned "You"
// row, and a score explanation on tap. Empty, loading and offline states are
// designed, not accidental.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { playApi, type Leaderboard, type LeaderRow } from "../games/v2/client";
import { GameTopBar } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";

type Props = {
  navigation: { goBack: () => void };
  route?: { params?: { period?: "daily" | "weekly" | "monthly"; board?: string } };
};

const PERIODS: { key: Leaderboard["period"]; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
];

export default function LeaderboardsScreen({ navigation, route }: Props) {
  const [period, setPeriod] = useState<string>(route?.params?.period ?? "daily");
  const [board, setBoard] = useState<string>(route?.params?.board ?? "combined");
  const [scope, setScope] = useState<"everyone" | "friends">("everyone");
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [explain, setExplain] = useState<LeaderRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    playApi.leaderboard({ period, board, scope, limit: 50 })
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Couldn't load the board."))
      .finally(() => setLoading(false));
  }, [period, board, scope]);

  useEffect(() => { load(); }, [load]);

  const boards: { key: string; label: string }[] = [
    { key: "combined", label: "All games" },
    { key: "rush", label: "Rush" },
    { key: "smriti", label: "Smriti" },
    { key: "varna-jaal", label: "Varna Jaal" },
    { key: "daily-word", label: "Daily word" },
    { key: "word-groups", label: "Word Groups" },
    { key: "pada-path", label: "Pada Path" },
    { key: "number", label: "Number" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Leaderboards" sa="श्रेणी-सूची" onClose={() => navigation.goBack()} />
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {PERIODS.map((p) => (
            <Chip key={p.key} label={p.label} on={period === p.key} onPress={() => setPeriod(p.key)} />
          ))}
          <View style={styles.divider} />
          {boards.map((b) => (
            <Chip key={b.key} label={b.label} on={board === b.key} onPress={() => setBoard(b.key)} />
          ))}
        </ScrollView>
        <View style={styles.scopeRow}>
          <Chip label="Everyone" on={scope === "everyone"} onPress={() => setScope("everyone")} />
          <Chip label="Friends" on={scope === "friends"} onPress={() => setScope("friends")} />
          <Text style={styles.ist}>India Standard Time · resets 00:00 IST</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading && <Text style={styles.state}>Loading…</Text>}
        {!loading && err && (
          <View style={styles.stateBox}>
            <Ionicons name="cloud-offline" size={22} color={color.inkSoft} />
            <Text style={styles.state}>{err}</Text>
            <Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
        {!loading && !err && data?.empty && (
          <View style={styles.stateBox}>
            <Ionicons name="sparkles" size={22} color={color.inkSoft} />
            <Text style={styles.state}>No one has played a ranked round in this period yet. Be the first.</Text>
          </View>
        )}
        {!loading && !err && data && !data.empty && (
          <>
            {data.rows.slice(0, 3).map((r) => (
              <Place key={r.learner_id} row={r} podium={r.rank}
                onPress={() => setExplain(explain?.learner_id === r.learner_id ? null : r)} />
            ))}
            {data.rows.slice(3).map((r) => (
              <Row key={r.learner_id} row={r}
                onPress={() => setExplain(explain?.learner_id === r.learner_id ? null : r)} />
            ))}
            {data.me && !data.rows.some((r) => r.is_me) && (
              <View style={styles.pinned}>
                <Row row={data.me} onPress={() => setExplain(data.me?.learner_id === explain?.learner_id ? null : data.me!)} />
              </View>
            )}
            {!!explain && (
              <View style={styles.explain}>
                <Text style={styles.explainHead}>
                  {explain.rank === 1 ? "1st" : explain.rank === 2 ? "2nd" : explain.rank === 3 ? "3rd" : `${explain.rank}th`} · {explain.score} points
                </Text>
                <Text style={styles.explainBody}>
                  Combined boards sum the best ranked result from three different games today
                  (max 3000). Each game allows three ranked rounds a day; your best counts. Ties share a rank.
                </Text>
                <Text style={styles.explainBody}>
                  {data.frozen ? "This period has closed and the standings are frozen." :
                    `Period ends ${fmtEnd(data.period_end)}.`}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function fmtEnd(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric" });
  } catch {
    return iso;
  }
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Place({ row, podium, onPress }: { row: LeaderRow; podium: number; onPress: () => void }) {
  const bg = podium === 1 ? fill.gold : podium === 2 ? fill.slate : fill.rose;
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}: ${row.name}, ${row.score} points`} style={[styles.place, { backgroundColor: bg }]}>
      <Text style={styles.placeRank}>{row.rank}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials(row.name)}</Text></View>
      <Text style={styles.placeName} numberOfLines={1}>{row.name}{row.is_me ? " (you)" : ""}</Text>
      <Text style={styles.placeScore}>{row.score}</Text>
    </Pressable>
  );
}

function Row({ row, onPress }: { row: LeaderRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}: ${row.name}, ${row.score} points`}
      style={[styles.row, row.is_me && styles.rowMe]}>
      <Text style={styles.rank}>{row.rank}</Text>
      <View style={[styles.avatar, styles.avatarSmall]}><Text style={styles.avatarTextSm}>{initials(row.name)}</Text></View>
      <Text style={styles.name} numberOfLines={1}>{row.name}{row.is_me ? " (you)" : ""}</Text>
      <Text style={styles.score}>{row.score}</Text>
    </Pressable>
  );
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "S";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  filters: { gap: 6, paddingBottom: 4 },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: space.lg, alignItems: "center" },
  divider: { width: 1, height: 20, backgroundColor: color.border, marginHorizontal: 4 },
  scopeRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.lg },
  ist: { marginLeft: "auto", fontSize: font.sizes.xs, color: color.inkFaint, flexShrink: 1 },
  chip: {
    borderWidth: 1.5, borderColor: color.border, borderRadius: radius.pill,
    paddingHorizontal: space.md, minHeight: 40, justifyContent: "center", backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  chipText: { color: color.ink, fontWeight: "700", fontSize: font.sizes.sm },
  chipTextOn: { color: onFill.text },
  body: { padding: space.lg, gap: 8 },
  state: { color: color.inkSoft, textAlign: "center", marginTop: space.md },
  stateBox: { alignItems: "center", gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.xl },
  retry: { borderWidth: 1.5, borderColor: color.ink, borderRadius: radius.md, minHeight: 44, paddingHorizontal: space.lg, justifyContent: "center" },
  retryText: { fontWeight: "700", color: color.ink },
  place: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.lg, padding: space.md, minHeight: 68 },
  placeRank: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xl, color: onFill.text, width: 30 },
  placeName: { flex: 1, color: onFill.text, fontWeight: "800", fontSize: font.sizes.base },
  placeScore: { color: onFill.gold, fontWeight: "800", fontSize: font.sizes.lg, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10, paddingHorizontal: space.sm, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 52 },
  rowMe: { backgroundColor: color.saffronLight, borderRadius: radius.md },
  rank: { width: 30, fontWeight: "800", color: color.inkSoft, fontVariant: ["tabular-nums"], textAlign: "center" },
  name: { flex: 1, fontWeight: "700", color: color.ink },
  score: { fontWeight: "800", color: color.ink, fontVariant: ["tabular-nums"] },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: onFill.faint, alignItems: "center", justifyContent: "center" },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.surfaceMuted },
  avatarText: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.sm },
  avatarTextSm: { color: color.inkSoft, fontWeight: "800", fontSize: font.sizes.xs },
  pinned: { borderTopWidth: 2, borderTopColor: color.border, paddingTop: 6, marginTop: 6 },
  explain: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 6 },
  explainHead: { fontWeight: "800", color: color.ink },
  explainBody: { color: color.inkSoft, fontSize: font.sizes.sm, lineHeight: 21 },
});
