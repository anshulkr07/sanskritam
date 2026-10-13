// Legacy Play hub preview parts, kept for scripts/hub-art-preview.tsx (the
// offline visual-QA harness). The live hub is Play.tsx v2; these preserve the
// painted-card artwork previews the harness screenshots.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { firstAkshara } from "../utils/akshara";
import PaintedBackground, { PaintedThumbnail } from "../components/artwork/PaintedBackground";
import { hubArtwork, practiceArtwork } from "../components/artwork/hubs";
import { color, fill, onFill, script, type FillName } from "../theme";

export const GAMES: { key: string; name: string; sa: string; tint: FillName; stat: string; route: string; params?: object }[] = [
  { key: "rush", name: "Shabda Rush", sa: "शब्द-वेगः", tint: "saffron", stat: "Best", route: "ShabdaRush" },
  { key: "smriti", name: "Smriti", sa: "स्मृतिः", tint: "rose", stat: "Best", route: "Smriti" },
  { key: "varna", name: "Varna Jaal", sa: "वर्ण-जालम्", tint: "slate", stat: "Today", route: "VarnaJaal" },
  { key: "daily", name: "Daily word", sa: "वर्ण-बन्धः", tint: "gold", stat: "Streak", route: "DailyWord" },
  { key: "word-groups", name: "Word Groups", sa: "पद-वर्गाः", tint: "teal", stat: "New", route: "WordGroups" },
  { key: "pada-path", name: "Pada Path", sa: "पद-पथः", tint: "sage", stat: "New", route: "PadaPath" },
  { key: "number", name: "Number Builder", sa: "सङ्ख्या-रचना", tint: "maroon", stat: "New", route: "NumberBuilder" },
];

export const PRACTICE: { name: string; kind: string; title: string }[] = [
  { name: "Word order", kind: "reorder", title: "Word order" },
  { name: "Sandhi", kind: "sandhi_join", title: "Sandhi" },
  { name: "Paradigms", kind: "grid_fill", title: "Paradigms" },
  { name: "Pingala", kind: "scan_metre", title: "Pingala" },
  { name: "Words", kind: "words", title: "Words" },
  { name: "Challenges", kind: "challenges", title: "Challenges" },
];

export function PlayBanner({ kind, done = false, children }: { kind: "challenge" | "competition"; done?: boolean; children: React.ReactNode }) {
  return <View style={[pv.challenge, { backgroundColor: done ? fill.sage : fill.teal }]}>
    <PaintedBackground source={hubArtwork(`play:${kind}`)} banner />
    {children}
  </View>;
}

export function GameTile({ game, onPress }: { game: (typeof GAMES)[number]; onPress: () => void }) {
  const artwork = hubArtwork(`play:${game.key}`);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${game.name}. ${game.sa}`} style={[pv.tile, { backgroundColor: fill[game.tint] }]}>
    <PaintedBackground source={artwork} />
    {!artwork && <Text style={pv.tileSa} aria-hidden>{firstAkshara(game.sa)}</Text>}
    <View style={{ flex: 1 }} />
    <Text style={pv.tileName} numberOfLines={2}>{game.name}</Text>
    <Text style={[pv.tileSub, script("regular")]} numberOfLines={1}>{game.sa}</Text>
    <Text style={pv.tileStat}>{game.stat}</Text>
  </Pressable>;
}

export function PracticeRow({ practice, stat = "", onPress }: { practice: (typeof PRACTICE)[number]; stat?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={practice.name} style={pv.row}>
    <PaintedThumbnail source={practiceArtwork(practice.kind)} />
    <Text style={pv.rowName}>{practice.name}</Text>
    <Text style={pv.rowStat}>{stat}</Text>
    <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
  </Pressable>;
}

export function ReciteCard({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Recite" style={pv.reciteRow}>
    <PaintedBackground source={hubArtwork("play:recite")} banner />
    <View style={{ flex: 1 }}><Text style={pv.reciteName}>Recite</Text><Text style={pv.reciteSub}>Read a verse aloud</Text></View>
    <Ionicons name="chevron-forward" size={20} color={onFill.text} />
  </Pressable>;
}

const pv = StyleSheet.create({
  challenge: { borderRadius: 16, padding: 16, gap: 4, minHeight: 124, overflow: "hidden" },
  tile: { width: "47.5%", borderRadius: 16, padding: 14, height: 190, gap: 2, overflow: "hidden" },
  tileSa: { position: "absolute", right: 6, bottom: -8, fontSize: 72, color: onFill.faint, fontWeight: "800" },
  tileName: { color: onFill.text, fontWeight: "800", fontSize: 16 },
  tileSub: { color: onFill.text, fontSize: 13, lineHeight: 22 },
  tileStat: { color: onFill.gold, fontSize: 12, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.border, minHeight: 56 },
  rowName: { flex: 1, fontWeight: "700", fontSize: 16, color: color.ink },
  rowStat: { color: color.inkSoft, fontSize: 13 },
  reciteRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: fill.maroon, minHeight: 108, overflow: "hidden" },
  reciteName: { color: onFill.text, fontSize: 20, fontWeight: "800" },
  reciteSub: { color: onFill.text, fontSize: 13, marginTop: 4, maxWidth: "65%" },
});
