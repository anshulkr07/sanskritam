// Play hub v2: today's rank and goal up top, play with friends and quick
// match beside the game collection, the recitation competition, and the
// weekly friend goal. Specialised grammar exercises live in Learn/Practice —
// only discovery links remain here.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TabScreenProps } from "../navigation/types";
import { api } from "../api/client";
import { useQuery } from "../hooks/useQuery";
import { playApi, type PlaySummary } from "../games/v2/client";
import { useCatalog } from "../games/v2/useCatalog";
import { haptics } from "../services/haptics";
import { color, fill, font, onFill, radius, script, shadow, space } from "../theme";
import { GAMES_TINT_FALLBACK } from "./playTheme";
import PaintedBackground, { PaintedThumbnail } from "../components/artwork/PaintedBackground";
import { gameArtwork, hubArtwork } from "../components/artwork/hubs";

type Props = TabScreenProps<"Play">;

export default function PlayScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<PlaySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const catalog = useCatalog();
  const { data: progress } = useQuery("progress-daily", api.progressDaily);

  const load = useCallback(() => {
    playApi.summary().then(setSummary).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    playApi.summary().then(setSummary).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const nav = navigation as unknown as { navigate: (r: string, p?: object) => void };
  const openGame = (key: string) => {
    haptics.tap();
    const route = { rush: "ShabdaRush", smriti: "Smriti", "varna-jaal": "VarnaJaal",
      "daily-word": "DailyWord", "word-groups": "WordGroups", "pada-path": "PadaPath",
      number: "NumberBuilder" }[key] ?? "ShabdaRush";
    nav.navigate(route, {});
  };

  const rank = summary?.rank_today;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.inkSoft} />}>
        <View style={styles.headRow}>
          <Text style={styles.title} accessibilityRole="header">Play</Text>
          {!!summary && summary.goal.streak > 0 && (
            <View style={styles.streak}>
              <Ionicons name="flame" size={16} color={color.saffronText} />
              <Text style={styles.streakText}>{summary.goal.streak}-day streak</Text>
            </View>
          )}
        </View>

        {/* 1. Your rank today — never a fabricated position */}
        <View style={styles.rankCard}>
          <PaintedBackground source={hubArtwork("play:leaderboard")} banner denseText />
          <Text style={styles.rankLabel}>Your rank today</Text>
          {rank?.unranked_yet ? (
            <Text style={styles.rankBody}>Play a ranked round to get your rank.</Text>
          ) : (
            <View style={styles.rankRow}>
              <Text style={styles.rankNum}>{rank?.rank != null ? `#${rank.rank}` : "—"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankPoints}>{rank?.points ?? 0} ranked points</Text>
                <Text style={styles.rankSub}>
                  Best of three games today{rank && rank.change_since_visit !== 0
                    ? ` · ${rank.change_since_visit > 0 ? "+" : ""}${rank.change_since_visit} since your last visit`
                    : ""}
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.rankIst}>{rank?.explain_ist}</Text>
        </View>

        {/* 2. Personal goal (separate from ranked points) */}
        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <PaintedThumbnail source={hubArtwork("play:challenge")} wide />
            <Text style={styles.goalText}>{summary?.goal.label ?? "Complete 3 rounds"}</Text>
            <Text style={styles.goalCount}>{summary?.goal.done ?? 0}/{summary?.goal.target ?? 3}</Text>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, {
              width: `${Math.min(100, ((summary?.goal.done ?? 0) / Math.max(1, summary?.goal.target ?? 3)) * 100)}%`,
            }]} />
          </View>
        </View>

        <Pressable onPress={() => nav.navigate("RecitePicker", {})} accessibilityRole="button"
          accessibilityLabel="Open recitation practice" style={styles.compCard}>
          <Ionicons name="mic" size={22} color={onFill.gold} />
          <View style={{ flex: 1 }}><Text style={styles.compTitle}>Recitation practice</Text>
            <Text style={styles.compSub}>Listen, practise, and recite at your own pace.</Text></View>
          <Ionicons name="chevron-forward" size={18} color={onFill.text} />
        </Pressable>

        {/* Game collection */}
        <Text style={styles.section}>Games</Text>
        <View style={styles.grid}>
          {(catalog?.games ?? []).map((g) => (
            <GameTile key={g.key} gameKey={g.key} title={g.title} sa={g.sa} subtitle={g.subtitle}
              tint={(GAMES_TINT_FALLBACK as Record<string, string>)[g.key] ?? "slate"}
              onPress={() => openGame(g.key)} />
          ))}
        </View>

        {/* Discovery links for specialised practice in Learn/Practice */}
        <Text style={styles.section}>More practice</Text>
        <View style={styles.moreCard}>
          <PaintedThumbnail source={hubArtwork("learn:library")} />
          <Text style={styles.moreText}>
            Grammar drills — word order, sandhi, paradigms, metre — live in Learn › Practice.
          </Text>
          <Pressable onPress={() => nav.navigate("PracticeRound", { kind: "reorder", title: "Word order" })}
            accessibilityRole="button" accessibilityLabel="Open word order practice" style={styles.moreBtn}>
            <Text style={styles.moreBtnText}>Open</Text>
            <Ionicons name="chevron-forward" size={14} color={color.saffronText} />
          </Pressable>
        </View>

        {!!progress && (
          <Text style={styles.foot}>{progress.attempts ?? 0} practice rounds today</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function GameTile({ gameKey, title, sa, subtitle, tint, onPress }: {
  gameKey: string; title: string; sa: string; subtitle: string; tint: string; onPress: () => void;
}) {
  const bg = (fill as Record<string, string>)[tint] ?? fill.slate;
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`} style={[styles.tile, { backgroundColor: bg }]}>
      <PaintedBackground source={gameArtwork(gameKey)} />
      <Text style={styles.tileTitle} numberOfLines={2}>{title}</Text>
      <Text style={[styles.tileSa, script("regular")]} numberOfLines={1}>{sa}</Text>
      <Text style={styles.tileSub} numberOfLines={2}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakText: { fontWeight: "800", color: color.ink, fontSize: font.sizes.sm },
  rankCard: { backgroundColor: fill.ink, borderRadius: radius.lg, padding: space.lg, gap: 6, overflow: "hidden", ...shadow.card },
  rankLabel: { color: onFill.gold, fontSize: font.sizes.xs, fontWeight: "800", textTransform: "uppercase" },
  rankBody: { color: onFill.text, fontSize: font.sizes.lg, fontWeight: "700" },
  rankRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  rankNum: { color: onFill.text, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 40 },
  rankPoints: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.md },
  rankSub: { color: onFill.soft, fontSize: font.sizes.xs },
  rankLink: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", minHeight: 32 },
  rankLinkText: { color: onFill.gold, fontWeight: "800", fontSize: font.sizes.sm },
  rankIst: { color: onFill.soft, fontSize: font.sizes.xs },
  goalCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 8, ...shadow.card },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  goalText: { flex: 1, fontWeight: "700", color: color.ink },
  goalCount: { fontWeight: "800", color: color.ink, fontVariant: ["tabular-nums"] },
  goalTrack: { height: 6, borderRadius: 3, backgroundColor: color.border, overflow: "hidden" },
  goalFill: { height: 6, backgroundColor: color.saffronBtn },
  goalFillGold: { height: 6, backgroundColor: color.gold },
  socialRow: { flexDirection: "row", gap: space.sm },
  socialBtn: { flex: 1, borderRadius: radius.lg, padding: space.md, gap: 6, minHeight: 144, justifyContent: "flex-end", overflow: "hidden" },
  socialText: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.base },
  compCard: {
    flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: fill.maroon,
    borderRadius: radius.lg, padding: space.md, minHeight: 76, overflow: "hidden",
  },
  compTitle: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.md },
  compSub: { color: onFill.soft, fontSize: font.sizes.sm },
  friendGoal: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 8, ...shadow.card },
  friendGoalText: { flex: 1, fontWeight: "700", color: color.ink, fontSize: font.sizes.sm },
  friendGoalSub: { color: color.inkSoft, fontSize: font.sizes.xs },
  section: { fontWeight: "800", fontSize: 18, color: color.ink, marginTop: space.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: { width: "47.6%", borderRadius: radius.lg, padding: space.md, minHeight: 216, justifyContent: "flex-end", overflow: "hidden", gap: 2 },
  tileTitle: { color: onFill.text, fontWeight: "800", fontSize: font.sizes.md },
  tileSa: { color: onFill.soft, fontSize: font.sizes.sm, lineHeight: 22 },
  tileSub: { color: onFill.soft, fontSize: font.sizes.xs, marginTop: 2 },
  moreCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 8, ...shadow.card },
  moreText: { color: color.inkSoft, fontSize: font.sizes.sm },
  moreBtn: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", minHeight: 36 },
  moreBtnText: { color: color.saffronText, fontWeight: "800" },
  foot: { color: color.inkFaint, fontSize: font.sizes.xs, textAlign: "center" },
});
