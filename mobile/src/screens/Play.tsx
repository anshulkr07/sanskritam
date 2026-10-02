// Play hub: Today's challenge, games grid, practice rows.
// Deep solid fills, no pale tiles. Bottom padding so Ask never covers rows.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TabScreenProps } from "../navigation/types";
import { api } from "../api/client";
import { gamesDaily } from "../games/api";
import { useQuery } from "../hooks/useQuery";
import { haptics } from "../services/haptics";
import { color, fill, font, onFill, script, space, type FillName } from "../theme";
import { firstAkshara } from "../utils/akshara";

type Props = TabScreenProps<"Play">;

const GAMES: { key: string; name: string; sa: string; tint: FillName; stat: string; route: string; params?: object }[] = [
  { key: "rush", name: "Shabda Rush", sa: "शब्द-वेगः", tint: "saffron", stat: "Best", route: "ShabdaRush" },
  { key: "smriti", name: "Smriti", sa: "स्मृतिः", tint: "rose", stat: "Best", route: "Smriti" },
  { key: "varna", name: "Varna Jaal", sa: "वर्ण-जालम्", tint: "slate", stat: "Today", route: "VarnaJaal" },
  { key: "daily", name: "Daily word", sa: "वर्ण-बन्धः", tint: "gold", stat: "Streak", route: "DailyWord" },
];

const PRACTICE: { name: string; kind: string; title: string }[] = [
  { name: "Word order", kind: "reorder", title: "Word order" },
  { name: "Sandhi", kind: "sandhi_join", title: "Sandhi" },
  { name: "Paradigms", kind: "grid_fill", title: "Paradigms" },
  { name: "Pingala", kind: "scan_metre", title: "Pingala" },
  { name: "Words", kind: "words", title: "Words" },
  { name: "Challenges", kind: "challenges", title: "Challenges" },
];

export default function PlayScreen({ navigation }: Props) {
  const [daily, setDaily] = useState<{ date: string; game: string; goal: { label: string }; done: boolean; streak: number } | null>(null);
  const { data: progress } = useQuery("progress-daily", api.progressDaily);

  useEffect(() => {
    void gamesDaily().then(setDaily).catch(() => {});
  }, []);

  const openGame = (g: (typeof GAMES)[number]) => {
    haptics.tap();
    if (g.route === "DailyWord") {
      (navigation as unknown as { navigate: (r: string) => void }).navigate("DailyWord");
      return;
    }
    (navigation as unknown as { navigate: (r: string, p?: object) => void }).navigate(g.route, g.params ?? {});
  };

  const openPractice = (p: (typeof PRACTICE)[number]) => {
    haptics.tap();
    const nav = navigation as unknown as { navigate: (r: string, params?: object) => void };
    if (p.kind === "words") {
      nav.navigate("Vocab", {});
      return;
    }
    if (p.kind === "challenges") {
      nav.navigate("Challenge", {});
      return;
    }
    if (p.kind === "sandhi_join") {
      nav.navigate("PracticeRound", { kind: "sandhi_join", title: "Sandhi" });
      return;
    }
    if (p.kind === "grid_fill") {
      nav.navigate("PracticeRound", { kind: "grid_fill", title: "Paradigms" });
      return;
    }
    if (p.kind === "scan_metre") {
      nav.navigate("PracticeRound", { kind: "scan_metre", title: "Pingala" });
      return;
    }
    nav.navigate("PracticeRound", { kind: p.kind, title: p.title });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.title} accessibilityRole="header">Play</Text>
          {!!daily && daily.streak > 0 && (
            <View style={styles.streak}>
              <Ionicons name="flame" size={16} color={color.saffronText} />
              <Text style={styles.streakText}>{daily.streak} days</Text>
            </View>
          )}
        </View>

        {!!daily && (
          <View style={[styles.challenge, { backgroundColor: daily.done ? fill.sage : fill.teal }]}>
            <Text style={styles.chLabel}>Today's challenge</Text>
            <Text style={styles.chGame}>{daily.game}</Text>
            <Text style={styles.chGoal}>{daily.goal.label}</Text>
            {daily.done ? (
              <View style={styles.chDoneRow}>
                <Ionicons name="checkmark-circle" size={20} color={onFill.text} />
                <Text style={styles.chDone}>Done for today</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  const g = GAMES.find((x) => x.key === daily.game || x.route.toLowerCase().includes(daily.game.split("-")[0]));
                  if (g) openGame(g);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Play today's challenge: ${daily.game}`}
                style={styles.chPlay}
              >
                <Ionicons name="play" size={20} color={fill.teal} />
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.section}>Games</Text>
        <View style={styles.grid}>
          {GAMES.map((g) => (
            <Pressable
              key={g.key}
              onPress={() => openGame(g)}
              accessibilityRole="button"
              accessibilityLabel={`${g.name}. ${g.sa}`}
              style={[styles.tile, { backgroundColor: fill[g.tint] }]}
            >
              <Text style={styles.tileSa}>{firstAkshara(g.sa)}</Text>
              <Text style={styles.tileName}>{g.name}</Text>
              <Text style={styles.tileSub}>{g.sa}</Text>
              <Text style={styles.tileStat}>{g.stat}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Practice</Text>
        {PRACTICE.map((p, i) => (
          <Pressable
            key={p.name}
            onPress={() => openPractice(p)}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            style={styles.row}
          >
            <View style={[styles.square, { backgroundColor: fill[["saffron", "teal", "sage", "rose", "gold", "slate"][i % 6] as FillName] }]} />
            <Text style={styles.rowName}>{p.name}</Text>
            <Text style={styles.rowStat}>{p.kind === "challenges" ? `${progress?.attempts ?? 0} today` : ""}</Text>
            <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 12 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakText: { fontWeight: "800", color: color.ink },
  challenge: { borderRadius: 16, padding: 16, gap: 4 },
  chLabel: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  chGame: { color: onFill.text, fontSize: 20, fontWeight: "800" },
  chGoal: { color: onFill.text, fontSize: 14 },
  chPlay: { position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center" },
  chDoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  chDone: { color: onFill.text, fontWeight: "700" },
  section: { fontWeight: "800", fontSize: 18, color: color.ink, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", borderRadius: 16, padding: 14, minHeight: 132, gap: 2, overflow: "hidden" },
  tileSa: { position: "absolute", right: 6, bottom: -8, fontSize: 72, color: onFill.faint, fontWeight: "800" },
  tileName: { color: onFill.text, fontWeight: "800", fontSize: 16 },
  tileSub: { color: onFill.soft, fontSize: 13 },
  tileStat: { color: onFill.gold, fontSize: 12, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 56 },
  square: { width: 26, height: 26, borderRadius: 6 },
  rowName: { flex: 1, fontWeight: "700", fontSize: 16, color: color.ink },
  rowStat: { color: color.inkSoft, fontSize: 13 },
});
