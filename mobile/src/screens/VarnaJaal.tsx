// Varna Jaal: the letter net. Drag across neighbouring cells to spell a clue;
// tap-in-order still works as an accessible fallback. Neighbour rule enforced
// locally; a miss shakes once and clears without a red flash.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import type { RootStackParamList } from "../navigation/types";
import GameShell from "../games/GameShell";
import ResultSheet from "../games/ResultSheet";
import { gamesResult, varnaJaal } from "../games/api";
import { haptics } from "../services/haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, fill, onFill, script } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "VarnaJaal">;

function adjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / 4);
  const ac = a % 4;
  const br = Math.floor(b / 4);
  const bc = b % 4;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && a !== b;
}

export default function VarnaJaalScreen({ navigation, route }: Props) {
  const daily = !!route.params?.daily;
  const reduced = useReducedMotion();
  const [cells, setCells] = useState<string[]>([]);
  const [words, setWords] = useState<{ aksharas: string[]; sa: string; iast: string; meaning: string }[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<number[]>([]);
  const [secs, setSecs] = useState(0);
  const [done, setDone] = useState<{ xp: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const selRef = useRef<number[]>([]);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    void varnaJaal().then((b) => {
      setCells(b.cells);
      setWords(b.words);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const foundCount = found.size;
  const total = words.length;

  useEffect(() => {
    if (total > 0 && foundCount >= total && !done) {
      void gamesResult({ game: "varna-jaal", mode: "daily", score: foundCount, found: foundCount, total, daily }).then((r) => {
        setDone({ xp: r.xp });
      }).catch(() => setDone({ xp: 0 }));
    }
  }, [foundCount, total, done, daily]);

  const tapCell = (i: number) => {
    if (foundCount >= total) return;
    if (sel.includes(i)) {
      // Tapping the last cell steps back; tapping any other selected cell
      // clears the path so a wrong diagonal can be restarted quickly.
      const last = sel[sel.length - 1];
      const next = i === last ? sel.slice(0, -1) : [];
      selRef.current = next;
      setSel(next);
      return;
    }
    if (sel.length > 0 && !adjacent(sel[sel.length - 1], i)) {
      haptics.tap();
      return;
    }
    haptics.tap();
    const next = [...sel, i];
    selRef.current = next;
    setSel(next);
  };

  const checkPath = (path: number[]) => {
    if (path.length === 0) return;
    const spelled = path.map((i) => cells[i]).join("");
    const hit = words.find((w) => w.aksharas.join("") === spelled && !found.has(w.sa));
    if (hit) {
      const next = new Set(found);
      next.add(hit.sa);
      setFound(next);
      haptics.correct();
      void gamesResult({ game: "varna-jaal", mode: "daily", score: next.size, found: 1, total, daily: false }).catch(() => {});
    } else {
      haptics.incorrect();
      if (!reduced) {
        shakeX.value = withSequence(withTiming(-8, { duration: 40 }), withTiming(8, { duration: 40 }), withTiming(-4, { duration: 40 }), withTiming(0, { duration: 40 }));
      }
    }
    selRef.current = [];
    setSel([]);
  };

  const check = () => checkPath(selRef.current);

  const cellFromPoint = (x: number, y: number): number | null => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return null;
    if (x < 0 || y < 0 || x > w || y > h) return null;
    const c = Math.floor((x / w) * 4);
    const r = Math.floor((y / h) * 4);
    if (c < 0 || c > 3 || r < 0 || r > 3) return null;
    // Diagonal drags fail without this: sliding centre-to-centre diagonally
    // clips the corner of an orthogonal neighbour. Only accept the cell when
    // the finger is near its centre, so corner clips are ignored and the
    // intended diagonal cell is picked on arrival.
    const cw = w / 4;
    const ch = h / 4;
    const cx = (c + 0.5) * cw;
    const cy = (r + 0.5) * ch;
    const dx = (x - cx) / cw;
    const dy = (y - cy) / ch;
    if (dx * dx + dy * dy > 0.16) return null;
    return r * 4 + c;
  };

  const addToPath = (idx: number) => {
    const cur = selRef.current;
    if (cur.includes(idx)) {
      // Dragging back onto the previous cell steps back one, so an accidental
      // orthogonal pickup on the way to a diagonal can be undone mid-drag.
      if (cur.length >= 2 && idx === cur[cur.length - 2]) {
        const next = cur.slice(0, -1);
        selRef.current = next;
        setSel(next);
      }
      return;
    }
    if (cur.length > 0 && !adjacent(cur[cur.length - 1], idx)) return;
    const next = [...cur, idx];
    selRef.current = next;
    setSel(next);
  };

  // One Pan on the board (5.5). e.x/e.y are board-relative; direction comes
  // from movement, never from translation at gesture start (1.3).
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(1)
        .maxPointers(1)
        .onBegin((e) => {
          selRef.current = [];
          setSel([]);
          const idx = cellFromPoint(e.x, e.y);
          if (idx != null) addToPath(idx);
        })
        .onUpdate((e) => {
          const idx = cellFromPoint(e.x, e.y);
          if (idx != null) addToPath(idx);
        })
        .onFinalize(() => {
          if (selRef.current.length > 0) checkPath(selRef.current);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cells, words, found, reduced],
  );

  if (done) {
    return (
      <View style={styles.start}>
        <ResultSheet score={foundCount} best={total} isBest={false} xp={done.xp} onAgain={() => { setFound(new Set()); setSel([]); setDone(null); }} onDone={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <GameShell title="Varna Jaal" progress={total ? foundCount / total : 0} progressLabel={`${foundCount} of ${total} today`} score={foundCount} combo={`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`} onClose={() => navigation.goBack()}>
      <GestureDetector gesture={pan}>
        <Animated.View
          collapsable={false}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            sizeRef.current = { w: width, h: height };
          }}
          style={[styles.board, shakeStyle]}
        >
          {cells.map((c, i) => (
            <Pressable key={i} onPress={() => tapCell(i)} accessibilityRole="button" accessibilityLabel={`Cell ${c}${sel.includes(i) ? `, ${sel.indexOf(i) + 1} in path` : ""}`} style={[styles.cell, sel.includes(i) && styles.cellOn]}>
              <Text style={[script("bold"), styles.cellText, sel.includes(i) && styles.cellTextOn]}>{c}</Text>
              {sel.includes(i) && <Text style={styles.order}>{sel.indexOf(i) + 1}</Text>}
            </Pressable>
          ))}
        </Animated.View>
      </GestureDetector>
      {sel.length > 0 && (
        <Pressable onPress={check} accessibilityRole="button" accessibilityLabel={`Check ${sel.map((i) => cells[i]).join("")}`} style={styles.check}>
          <Text style={styles.checkText}>Check ({sel.map((i) => cells[i]).join("")})</Text>
        </Pressable>
      )}
      <View style={styles.clues}>
        {words.map((w) => {
          const got = found.has(w.sa);
          return got ? (
            <View key={w.sa} style={styles.chipGot}>
              <Text style={styles.chipGotText}>{w.sa}</Text>
            </View>
          ) : (
            <View key={w.sa} style={styles.clue}>
              <Text style={styles.clueText}>{w.meaning}</Text>
            </View>
          );
        })}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  start: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  board: { flexDirection: "row", flexWrap: "wrap", gap: 6, backgroundColor: color.surface, borderRadius: 12, padding: 8 },
  cell: { width: "23%", aspectRatio: 1, borderRadius: 8, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  cellOn: { backgroundColor: fill.slate },
  cellText: { fontSize: 22, color: color.ink },
  cellTextOn: { color: onFill.text },
  order: { position: "absolute", top: 2, right: 6, fontWeight: "800", color: onFill.text, fontSize: 12 },
  check: { backgroundColor: color.saffronBtn, borderRadius: 10, minHeight: 44, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  checkText: { color: "#fff", fontWeight: "800" },
  clues: { gap: 6 },
  clue: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.border },
  clueText: { fontSize: 15, color: color.ink },
  chipGot: { backgroundColor: fill.slate, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start" },
  chipGotText: { color: onFill.text, fontWeight: "700" },
});
