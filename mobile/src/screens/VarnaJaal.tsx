// Varna Jaal v2 (वर्ण-जालम्): accessible word search. Hit testing uses the
// measured cell rectangles (padding, gaps and safe areas included) instead
// of dividing the whole board into approximate quarters. Drag supports
// backtracking; tap-in-order stays as the accessible fallback; a cancelled
// gesture never submits. Server checks every path against the hidden key.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { CatalogGame, playApi, type VarnaPack } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { loadRemembered, usePlaySession } from "../games/v2/useSession";
import { GameTopBar, ResultSheetV2, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
};

export default function VarnaJaalScreen({ navigation }: Props) {
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("varna-jaal");
  const pack = session?.pack as VarnaPack | undefined;
  const size = pack?.size ?? 4;
  const [found, setFound] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<number[]>([]);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const game = useCatalogGame("varna-jaal");
  const reduced = useReducedMotion();
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  // Measured geometry: the board's content box and each cell's rect.
  const boardRef = useRef({ w: 0, h: 0, pad: 0, gap: 0 });
  const selRef = useRef<number[]>([]);

  useEffect(() => { void loadRemembered("varna-jaal").then(setRemembered); }, []);
  useEffect(() => {
    if (session?.status === "active" && startedAt.current === 0) startedAt.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (startedAt.current || Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [session?.status]);

  const setPath = (next: number[]) => { selRef.current = next; setSel(next); };

  const adjacent = useCallback((a: number, b: number) => {
    const ar = Math.floor(a / size), ac = a % size, br = Math.floor(b / size), bc = b % size;
    return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && a !== b;
  }, [size]);

  const checkPath = useCallback(async (path: number[]) => {
    if (path.length < 2 || !pack) { setPath([]); return; }
    setBusy(true);
    const res = await answer({ cells: path });
    setBusy(false);
    setPath([]);
    if (!res) return;
    const r = res as { found: boolean; already?: boolean; index?: number; complete?: boolean };
    if (r.found && !r.already) {
      haptics.correct();
      if (typeof r.index === "number") {
        setFound((f) => new Set(f).add(String(r.index)));
      }
      if (r.complete) void finish({ window_ms: 300000, outcome: "finish" });
    } else if (!r.found) {
      haptics.incorrect();
      if (!reduced) {
        shakeX.value = withSequence(withTiming(-8, { duration: 40 }), withTiming(8, { duration: 40 }),
          withTiming(-4, { duration: 40 }), withTiming(0, { duration: 40 }));
      }
    }
  }, [answer, finish, pack, reduced, setBusy]);

  // cellFromPoint via measured rects: cells are square, laid out with `gap`
  // between them and `pad` around the board.
  const cellFromPoint = (x: number, y: number): number | null => {
    const { w, h, pad, gap } = boardRef.current;
    if (!w || !h) return null;
    const inner = (w - 2 * pad - (size - 1) * gap) / size;
    const innerH = (h - 2 * pad - (size - 1) * gap) / size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x0 = pad + c * (inner + gap);
        const y0 = pad + r * (innerH + gap);
        if (x >= x0 && x <= x0 + inner && y >= y0 && y <= y0 + innerH) return r * size + c;
      }
    }
    return null;
  };

  const addToPath = (idx: number) => {
    const cur = selRef.current;
    if (cur.includes(idx)) {
      if (cur.length >= 2 && idx === cur[cur.length - 2]) setPath(cur.slice(0, -1));
      return;
    }
    if (cur.length > 0 && !adjacent(cur[cur.length - 1], idx)) return;
    haptics.tap();
    setPath([...cur, idx]);
  };

  const pan = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(1)
      .maxPointers(1)
      .onBegin((e) => { setPath([]); const idx = cellFromPoint(e.x, e.y); if (idx != null) addToPath(idx); })
      .onUpdate((e) => { const idx = cellFromPoint(e.x, e.y); if (idx != null) addToPath(idx); })
      .onFinalize((e, success) => {
        // A cancelled gesture never submits.
        if (success === false) { setPath([]); return; }
        if (selRef.current.length >= 2) void checkPath(selRef.current);
        else setPath([]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkPath, size]);

  const tapCell = (i: number) => {
    if (sel.includes(i)) {
      const last = sel[sel.length - 1];
      setPath(i === last ? sel.slice(0, -1) : []);
      return;
    }
    if (sel.length > 0 && !adjacent(sel[sel.length - 1], i)) { haptics.tap(); return; }
    addToPath(i);
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Varna Jaal" sa="वर्ण-जालम्" onClose={() => navigation.goBack()} />
        {!game || error ? (
          <Text style={styles.loading} accessibilityRole="alert">{error ?? "Loading…"}</Text>
        ) : (
          <SetupSheet game={game as CatalogGame} remembered={remembered} onStart={(c) => void start(c)} busy={busy} />
        )}
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.doneBody}>
          <ResultSheetV2 result={result} onAgain={() => { reset(); setFound(new Set()); }} onDone={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Varna Jaal" sa="वर्ण-जालम्"
        onClose={() => void finish({ window_ms: 300000 }).then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{found.size}/{pack?.required ?? 5}</Text>
          <Text style={styles.countLabel}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <GestureDetector gesture={pan}>
          <Animated.View collapsable={false}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              boardRef.current = { ...boardRef.current, w: width, h: height };
            }}
            onMoveShouldSetResponderCapture={() => true}
            style={[styles.board, shakeStyle]}>
            {(pack?.cells ?? []).map((c, i) => (
              <Pressable key={i} onPress={() => tapCell(i)} accessibilityRole="button"
                accessibilityLabel={`Cell ${c}${sel.includes(i) ? `, ${sel.indexOf(i) + 1} in path` : ""}`}
                style={[styles.cell, sel.includes(i) && styles.cellOn,
                  { width: `${100 / size - 2.4}%`, aspectRatio: 1 }]}>
                <Text style={[script("bold"), styles.cellText, sel.includes(i) && styles.cellTextOn]}>{c}</Text>
                {sel.includes(i) && <Text style={styles.order}>{sel.indexOf(i) + 1}</Text>}
              </Pressable>
            ))}
          </Animated.View>
        </GestureDetector>
        {sel.length >= 2 && (
          <Pressable onPress={() => void checkPath(selRef.current)} accessibilityRole="button"
            accessibilityLabel={`Check ${sel.map((i) => pack?.cells[i]).join("")}`} style={styles.check}>
            <Text style={styles.checkText}>Check ({sel.map((i) => pack?.cells[i] ?? "").join("")})</Text>
          </Pressable>
        )}
        <View style={styles.clues}>
          {(pack?.words ?? []).map((w, i) => {
            const got = found.has(String(i));
            return (
              <View key={i} style={[styles.clue, got && styles.clueGot]}>
                <Ionicons name={got ? "checkmark-circle" : "ellipse-outline"} size={16}
                  color={got ? onFill.text : color.inkFaint} />
                <Text style={[styles.clueText, got && styles.clueTextGot]} numberOfLines={1}>
                  {w.meaning} · {w.akshara_count} sounds
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1 },
  board: {
    flexDirection: "row", flexWrap: "wrap", gap: 6, backgroundColor: color.surface,
    borderRadius: radius.lg, padding: 8,
  },
  cell: {
    borderRadius: radius.sm, borderWidth: 1, borderColor: color.border,
    alignItems: "center", justifyContent: "center", minHeight: 56,
  },
  cellOn: { backgroundColor: fill.slate, borderColor: fill.slate },
  cellText: { fontSize: 22, lineHeight: 34, color: color.ink },
  cellTextOn: { color: onFill.text },
  order: { position: "absolute", top: 2, right: 6, fontWeight: "800", color: onFill.text, fontSize: 12 },
  check: { backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 48, paddingHorizontal: space.lg, justifyContent: "center", alignItems: "center", alignSelf: "center" },
  checkText: { color: "#fff", fontWeight: "800" },
  clues: { gap: 6 },
  clue: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.border },
  clueGot: { opacity: 0.7 },
  clueText: { fontSize: 15, color: color.ink, flex: 1 },
  clueTextGot: { textDecorationLine: "line-through", color: color.inkSoft },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
});
