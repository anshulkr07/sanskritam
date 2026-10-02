// Shabda Rush: word and meaning against the clock.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import GameShell from "../games/GameShell";
import ResultSheet from "../games/ResultSheet";
import { gamesDeck, gamesResult } from "../games/api";
import { haptics } from "../services/haptics";
import { sfx } from "../services/sfx";
import { color, fill, font, onFill, sanskritText, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ShabdaRush">;

interface Item { sa: string; iast: string; meaning: string }

export default function ShabdaRushScreen({ navigation, route }: Props) {
  const topic = route.params?.topic;
  const daily = !!route.params?.daily;
  const [items, setItems] = useState<Item[]>([]);
  const [at, setAt] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [noClock, setNoClock] = useState(false);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(60);
  const [done, setDone] = useState<{ xp: number; best: number; isBest: boolean } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void gamesDeck("rush", undefined, topic).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [topic]);

  const stop = useCallback(async () => {
    if (timer.current) clearInterval(timer.current);
    try {
      const r = await gamesResult({ game: "rush", mode: noClock ? "15words" : "60s", score, daily });
      setDone({ xp: r.xp, best: r.best, isBest: r.is_best });
    } catch {
      setDone({ xp: 0, best: score, isBest: false });
    }
  }, [score, noClock, daily]);

  useEffect(() => {
    if (!started || noClock) return;
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          void stop();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [started, noClock, stop]);

  const q = items[at % Math.max(1, items.length)];
  const flipped = score >= 100 && Math.floor(at / 5) % 2 === 1;
  const options = useMemo(() => {
    if (!q || items.length < 4) return [];
    if (!flipped) {
      const others = items.filter((i) => i.sa !== q.sa && i.meaning !== q.meaning);
      const picks = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
      return [...picks.map((p) => p.meaning), q.meaning].sort(() => Math.random() - 0.5);
    }
    const others = items.filter((i) => i.sa !== q.sa && i.meaning !== q.meaning);
    const picks = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    return [...picks.map((p) => p.sa), q.sa].sort(() => Math.random() - 0.5);
  }, [q, items, at, flipped]);

  const pick = (value: string, idx: number) => {
    if (picked != null || !q) return;
    const correct = flipped ? value === q.sa : value === q.meaning;
    setPicked(idx);
    if (correct) {
      const mult = Math.min(5, 1 + Math.floor(streak / 3));
      setScore((s) => s + 10 * mult);
      setStreak((s) => s + 1);
      void sfx.correct();
      haptics.tap();
      setTimeout(() => {
        setPicked(null);
        if (!noClock && at + 1 >= 15 && false) { void stop(); return; }
        if (noClock && at + 1 >= 15) { void stop(); return; }
        setAt((a) => a + 1);
      }, 350);
    } else {
      setStreak(0);
      void sfx.incorrect();
      haptics.tap();
      setTimeout(() => {
        setPicked(null);
        setAt((a) => a + 1);
      }, 900);
    }
  };

  if (!started) {
    return (
      <View style={styles.start}>
        <Text style={styles.title}>Shabda Rush</Text>
        <Text style={styles.sub}>Word and meaning against the clock</Text>
        <Pressable onPress={() => { setNoClock(false); setStarted(true); }} accessibilityRole="button" accessibilityLabel="Play 60 seconds" style={styles.primary}>
          <Text style={styles.primaryText}>Play, 60 seconds</Text>
        </Pressable>
        <Pressable onPress={() => { setNoClock(true); setStarted(true); }} accessibilityRole="button" accessibilityLabel="Play without clock, 15 words" style={styles.secondary}>
          <Text style={styles.secondaryText}>No clock, 15 words</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.start}>
        <ResultSheet score={score} best={done.best} isBest={done.isBest} xp={done.xp} onAgain={() => { setScore(0); setAt(0); setStreak(0); setDone(null); setLeft(60); setStarted(true); }} onDone={() => navigation.goBack()} />
      </View>
    );
  }

  if (!q) {
    return (
      <View style={styles.start}>
        <Text style={styles.sub}>Loading words…</Text>
      </View>
    );
  }

  return (
    <GameShell title="Shabda Rush" progress={noClock ? at / 15 : 1 - left / 60} progressLabel={noClock ? `${at + 1} of 15` : `${left}s`} score={score} combo={streak >= 3 ? `x${Math.min(5, 1 + Math.floor(streak / 3))}` : undefined} onClose={() => navigation.goBack()}>
      <Text style={[sanskritText(28), { color: color.ink, textAlign: "center" }]}>{flipped ? q.meaning : q.sa}</Text>
      {!flipped && <Text style={styles.roman}>{q.iast}</Text>}
      <View style={styles.opts}>
        {options.map((m, i) => {
          const answer = flipped ? q.sa : q.meaning;
          const isAnswer = m === answer;
          const isPicked = picked === i;
          const bg = picked == null ? color.surface : isPicked ? (isAnswer ? fill.ok : fill.bad) : isAnswer && picked != null ? fill.ok : color.surface;
          const fg = picked != null && (isPicked || isAnswer) ? onFill.text : color.ink;
          return (
            <Pressable key={i} onPress={() => pick(m, i)} accessibilityRole="button" accessibilityLabel={m} style={[styles.opt, { backgroundColor: bg }]}>
              <Text style={[styles.optText, { color: fg }]}>{m}</Text>
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
  sub: { fontSize: 14, color: color.inkSoft, textAlign: "center" },
  primary: { backgroundColor: color.saffronBtn, borderRadius: 12, minHeight: 48, paddingHorizontal: 24, justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondary: { borderWidth: 1.5, borderColor: color.ink, borderRadius: 12, minHeight: 48, paddingHorizontal: 24, justifyContent: "center" },
  secondaryText: { color: color.ink, fontWeight: "700", fontSize: 16 },
  roman: { fontSize: 14, fontStyle: "italic", color: color.inkSoft, textAlign: "center" },
  opts: { gap: 8 },
  opt: { borderRadius: 12, minHeight: 52, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: color.border },
  optText: { fontSize: 16, fontWeight: "600" },
});
