// Smriti: memory pairs. Letters pair Devanagari with roman; Words pair Sanskrit with meaning.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import GameShell from "../games/GameShell";
import ResultSheet from "../games/ResultSheet";
import { gamesDeck, gamesResult } from "../games/api";
import { haptics } from "../services/haptics";
import { playLetter } from "../services/speech";
import { color, fill, font, onFill, script, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Smriti">;

interface Card { id: number; key: string; label: string; sub?: string }

export default function SmritiScreen({ navigation, route }: Props) {
  const set = route.params?.set ?? "Words";
  const size = route.params?.size ?? 16;
  const daily = !!route.params?.daily;
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [choice, setChoice] = useState<string>("Words");
  const [count, setCount] = useState<number>(16);
  const [done, setDone] = useState<{ xp: number; best: number; isBest: boolean } | null>(null);

  const build = async (kind: string, n: number) => {
    const d = await gamesDeck("smriti", kind.toLowerCase() === "letters" ? "letters" : "words");
    const pairs = [...d.items].sort(() => Math.random() - 0.5).slice(0, n / 2);
    const deck: Card[] = [];
    pairs.forEach((p, i) => {
      if (kind === "Letters") {
        deck.push({ id: i * 2, key: `p${i}`, label: p.sa, sub: "letter" });
        deck.push({ id: i * 2 + 1, key: `p${i}`, label: p.meaning || p.iast, sub: "roman" });
      } else {
        deck.push({ id: i * 2, key: `p${i}`, label: p.sa, sub: p.iast });
        deck.push({ id: i * 2 + 1, key: `p${i}`, label: p.meaning, sub: "meaning" });
      }
    });
    setCards(deck.sort(() => Math.random() - 0.5));
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setDone(null);
    setStarted(true);
  };

  useEffect(() => {
    if (route.params?.set || route.params?.size) {
      void build(set, size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = (idx: number) => {
    if (open.includes(idx) || open.length >= 2) return;
    const c = cards[idx];
    if (matched.has(c.key)) return;
    haptics.tap();
    const next = [...open, idx];
    setOpen(next);
    if (c.sub === "letter") {
      try { void playLetter(undefined, c.label, "sa"); } catch { /* no audio */ }
    }
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((i) => cards[i]);
      setTimeout(() => {
        if (a.key === b.key) {
          setMatched((m) => new Set(m).add(a.key));
          haptics.tap();
        }
        setOpen([]);
        const nm = new Set(matched);
        if (a.key === b.key) nm.add(a.key);
        if (nm.size * 2 >= cards.length && cards.length > 0) {
          void gamesResult({ game: "smriti", mode: `${choice}-${count}`, score: moves + 1, moves: moves + 1, daily }).then((r) => {
            setDone({ xp: r.xp, best: r.best, isBest: r.is_best });
          }).catch(() => setDone({ xp: 0, best: moves + 1, isBest: false }));
        }
      }, a.key === b.key ? 300 : 700);
    }
  };

  if (!started) {
    return (
      <View style={styles.start}>
        <Text style={styles.title}>Smriti</Text>
        <Text style={styles.sub}>Memory pairs</Text>
        <View style={styles.row}>
          {(["Letters", "Words"] as const).map((k) => (
            <Pressable key={k} onPress={() => setChoice(k)} accessibilityRole="button" accessibilityLabel={k} accessibilityState={{ selected: choice === k }} style={[styles.chip, choice === k && styles.chipOn]}>
              <Text style={[styles.chipText, choice === k && styles.chipTextOn]}>{k}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          {([12, 16, 20] as const).map((n) => (
            <Pressable key={n} onPress={() => setCount(n)} accessibilityRole="button" accessibilityLabel={`${n} cards`} accessibilityState={{ selected: count === n }} style={[styles.chip, count === n && styles.chipOn]}>
              <Text style={[styles.chipText, count === n && styles.chipTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void build(choice, count)} accessibilityRole="button" accessibilityLabel="Start" style={styles.primary}>
          <Text style={styles.primaryText}>Start</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.start}>
        <ResultSheet score={moves} best={done.best} isBest={done.isBest} xp={done.xp} onAgain={() => void build(choice, count)} onDone={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <GameShell title="Smriti" progress={matched.size / (cards.length / 2 || 1)} progressLabel={`${matched.size} of ${cards.length / 2} pairs`} score={moves} combo={`${moves} moves`} onClose={() => navigation.goBack()}>
      <View style={styles.grid}>
        {cards.map((c, i) => {
          const face = open.includes(i) || matched.has(c.key);
          return (
            <Pressable key={c.id} onPress={() => flip(i)} accessibilityRole="button" accessibilityLabel={face ? c.label : "Hidden card"} style={[styles.card, face && styles.cardUp]}>
              <Text style={[styles.cardText, script("semibold"), { color: face ? onFill.text : color.ink }]} numberOfLines={2}>
                {face ? c.label : "·"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  start: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 28, color: color.ink },
  sub: { fontSize: 14, color: color.inkSoft },
  row: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1.5, borderColor: color.ink, borderRadius: 999, paddingHorizontal: 16, minHeight: 40, justifyContent: "center" },
  chipOn: { backgroundColor: fill.ink },
  chipText: { color: color.ink, fontWeight: "700" },
  chipTextOn: { color: onFill.text },
  primary: { backgroundColor: color.saffronBtn, borderRadius: 12, minHeight: 48, paddingHorizontal: 24, justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { width: "23%", aspectRatio: 0.8, backgroundColor: color.surface, borderRadius: 10, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center", padding: 4 },
  cardUp: { backgroundColor: fill.slate },
  cardText: { fontSize: 14, textAlign: "center" },
});
