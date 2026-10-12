// Play hub: Today's challenge, games grid, practice rows.
// Painted cards over deep fills. Bottom padding so Ask never covers rows.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TabScreenProps } from "../navigation/types";
import { api } from "../api/client";
import { gamesDaily } from "../games/api";
import { useQuery } from "../hooks/useQuery";
import { haptics } from "../services/haptics";
import { color, fill, onFill, script, type FillName } from "../theme";
import { firstAkshara } from "../utils/akshara";
import PaintedBackground, { PaintedThumbnail } from "../components/artwork/PaintedBackground";
import { hubArtwork, practiceArtwork } from "../components/artwork/hubs";

type Props = TabScreenProps<"Play">;

export const GAMES: { key: string; name: string; sa: string; tint: FillName; stat: string; route: string; params?: object }[] = [
  { key: "rush", name: "Shabda Rush", sa: "शब्द-वेगः", tint: "saffron", stat: "Best", route: "ShabdaRush" },
  { key: "smriti", name: "Smriti", sa: "स्मृतिः", tint: "rose", stat: "Best", route: "Smriti" },
  { key: "varna", name: "Varna Jaal", sa: "वर्ण-जालम्", tint: "slate", stat: "Today", route: "VarnaJaal" },
  { key: "daily", name: "Daily word", sa: "वर्ण-बन्धः", tint: "gold", stat: "Streak", route: "DailyWord" },
];

export const PRACTICE: { name: string; kind: string; title: string }[] = [
  { name: "Word order", kind: "reorder", title: "Word order" },
  { name: "Sandhi", kind: "sandhi_join", title: "Sandhi" },
  { name: "Paradigms", kind: "grid_fill", title: "Paradigms" },
  { name: "Pingala", kind: "scan_metre", title: "Pingala" },
  { name: "Words", kind: "words", title: "Words" },
  { name: "Challenges", kind: "challenges", title: "Challenges" },
];

export default function PlayScreen({ navigation }: Props) {
  const [daily, setDaily] = useState<{ date: string; game: string; goal: { label: string }; done: boolean; streak: number } | null>(null);
  const [comp, setComp] = useState<{ id: string; pieces: { source_ref: string }[]; me?: { best_percent: number | null; rank: number | null } | null; closes_at: string } | null>(null);
  const [compNext, setCompNext] = useState("");
  const [compGone, setCompGone] = useState(false);
  const { data: progress } = useQuery("progress-daily", api.progressDaily);

  useEffect(() => {
    void gamesDaily().then(setDaily).catch(() => {});
    api.competitionCurrent().then((c) => {
      setComp(c.open as never);
      setCompNext(c.next?.opens_at ? `Next opens ${c.next.opens_at}` : "");
    }).catch((e) => {
      if ((e as { status?: number }).status === 404) setCompGone(true);
    });
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
          <PlayBanner kind="challenge" done={daily.done}>
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
          </PlayBanner>
        )}

        {!compGone && (
          <PlayBanner kind="competition">
            <Text style={styles.chLabel}>Competition</Text>
            {comp ? (
              <>
                <Text style={styles.chGame}>{comp.pieces?.[0]?.source_ref ?? "Recite"}</Text>
                <Text style={styles.chGoal}>Best {comp.me?.best_percent ?? "-"} rank {comp.me?.rank ?? "-"}</Text>
                <View style={styles.compRow}>
                  <Pressable
                    onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Contest", {})}
                    accessibilityRole="button"
                    accessibilityLabel="Open competition"
                    style={styles.compBtn}
                  >
                    <Text style={styles.compBtnText}>Enter</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.chGoal}>{compNext || "No competition open right now."}</Text>
            )}
          </PlayBanner>
        )}

        <ReciteCard
          onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("RecitePicker")}
        />

        <Text style={styles.section}>Games</Text>
        <View style={styles.grid}>
          {GAMES.map((g) => (
            <GameTile
              key={g.key}
              game={g}
              onPress={() => openGame(g)}
            />
          ))}
        </View>

        <Text style={styles.section}>Practice</Text>
        {PRACTICE.map((p) => (
          <PracticeRow
            key={p.name}
            practice={p}
            stat={p.kind === "challenges" ? `${progress?.attempts ?? 0} today` : ""}
            onPress={() => openPractice(p)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Shared with the local visual preview; navigation remains in PlayScreen.
export function PlayBanner({ kind, done = false, children }: { kind: "challenge" | "competition"; done?: boolean; children: React.ReactNode }) {
  return <View style={[styles.challenge, { backgroundColor: done ? fill.sage : fill.teal }]}>
    <PaintedBackground source={hubArtwork(`play:${kind}`)} banner />
    {children}
  </View>;
}

export function GameTile({ game, onPress }: { game: (typeof GAMES)[number]; onPress: () => void }) {
  const artwork = hubArtwork(`play:${game.key}`);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${game.name}. ${game.sa}`} style={[styles.tile, { backgroundColor: fill[game.tint] }]}>
    <PaintedBackground source={artwork} />
    {!artwork && <Text style={styles.tileSa} aria-hidden>{firstAkshara(game.sa)}</Text>}
    <View style={{ flex: 1 }} />
    <Text style={styles.tileName} numberOfLines={2}>{game.name}</Text>
    <Text style={[styles.tileSub, script("regular")]} numberOfLines={1}>{game.sa}</Text>
    <Text style={styles.tileStat}>{game.stat}</Text>
  </Pressable>;
}

export function PracticeRow({ practice, stat = "", onPress }: { practice: (typeof PRACTICE)[number]; stat?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={practice.name} style={styles.row}>
    <PaintedThumbnail source={practiceArtwork(practice.kind)} />
    <Text style={styles.rowName}>{practice.name}</Text>
    <Text style={styles.rowStat}>{stat}</Text>
    <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
  </Pressable>;
}

export function ReciteCard({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Recite" style={styles.reciteRow}>
    <PaintedBackground source={hubArtwork("play:recite")} banner />
    <View style={{ flex: 1 }}><Text style={styles.reciteName}>Recite</Text><Text style={styles.reciteSub}>Read a verse aloud</Text></View>
    <Ionicons name="chevron-forward" size={20} color={onFill.text} />
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 12 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakText: { fontWeight: "800", color: color.ink },
  challenge: { borderRadius: 16, padding: 16, gap: 4, minHeight: 124, overflow: "hidden" },
  chLabel: { color: onFill.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  chGame: { color: onFill.text, fontSize: 20, fontWeight: "800", maxWidth: "72%" },
  chGoal: { color: onFill.text, fontSize: 14, maxWidth: "70%" },
  chPlay: { position: "absolute", right: 16, bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center" },
  chDoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  chDone: { color: onFill.text, fontWeight: "700" },
  section: { fontWeight: "800", fontSize: 18, color: color.ink, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", borderRadius: 16, padding: 14, height: 190, gap: 2, overflow: "hidden" },
  tileSa: { position: "absolute", right: 6, bottom: -8, fontSize: 72, color: onFill.faint, fontWeight: "800" },
  tileName: { color: onFill.text, fontWeight: "800", fontSize: 16 },
  tileSub: { color: onFill.text, fontSize: 13, lineHeight: 22 },
  tileStat: { color: onFill.gold, fontSize: 12, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 56 },
  reciteRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: fill.maroon, minHeight: 108, overflow: "hidden" },
  reciteName: { color: onFill.text, fontSize: 20, fontWeight: "800" },
  reciteSub: { color: onFill.text, fontSize: 13, marginTop: 4, maxWidth: "65%" },
  compRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  compBtn: { minHeight: 44, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", backgroundColor: onFill.text, borderRadius: 12 },
  compBtnText: { color: fill.teal, fontWeight: "800" },
  rowName: { flex: 1, fontWeight: "700", fontSize: 16, color: color.ink },
  rowStat: { color: color.inkSoft, fontSize: 13 },
});
