// Pingala — prosody as binary (U15-6, LESSON_OVERHAUL §2.4).
//
// Piṅgala's Chandaḥśāstra (c. 3rd–2nd c. BCE) describes prosody as an
// exhaustive enumeration of two states — light (laghu) and heavy (guru) —
// a binary encoding; its mātrāmeru sequence is the Fibonacci sequence. A
// learner who has played the scansion steps has been manipulating binary
// strings for a week without being told so. Revealing that costs one screen.
//
// No reviewer needed: every pattern here is arithmetic, and the verse check
// behind "try it" is the chandas engine (scan_metre), which grades — called
// live here via GET /grammar/scansion (api.scansion) on a seeded Gītā line.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import api from "../api/client";
import type { Scansion } from "../api/client";
import { Button } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptics } from "../services/haptics";
import { duration } from "../motion";
import { color, font, radius, script, shadow, space } from "../theme";

function patterns(n: number): string[][] {
  if (n === 0) return [[]];
  const rest = patterns(n - 1);
  return [...rest.map((r) => ["L", ...r]), ...rest.map((r) => ["G", ...r])];
}

const MERU = [1, 2, 3, 5, 8, 13, 21];

// A real verse, scanned live — Gītā 1.1, first line.
const SEED_VERSE = "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः";

export default function PingalaScreen() {
  const [n, setN] = useState(3);
  const rows = useMemo(() => patterns(n), [n]);
  const reduced = useReducedMotion();
  const [scan, setScan] = useState<Scansion | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(false);
  const resultOpacity = useSharedValue(0);

  const runScan = useCallback(() => {
    haptics.tap();
    setScanning(true);
    setScanError(false);
    api
      .scansion(SEED_VERSE)
      .then((s) => setScan(s))
      .catch(() => {
        setScan(null);
        setScanError(true);
      })
      .finally(() => setScanning(false));
  }, []);

  // The result fades in on the UI thread; reduced motion shows it at once.
  const showResult = !scanning && (scan !== null || scanError);
  useEffect(() => {
    resultOpacity.value = showResult
      ? reduced
        ? 1
        : withTiming(1, { duration: duration.base })
      : 0;
  }, [showResult, reduced, resultOpacity]);
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  const syllables = useMemo(
    () => (scan?.lines ?? []).flatMap((l) => l.syllables),
    [scan],
  );
  const weights = useMemo(() => syllables.map((s) => s.weight), [syllables]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>U15-6 · THE MATHEMATICS LAYER</Text>
        <Text style={[styles.titleSa, script("extrabold")]}>छन्दः-खेलः</Text>
        <Text style={styles.titleEn}>Pingala — counting in light and heavy</Text>

        <Text style={styles.para}>
          Two thousand years before binary, Piṅgala listed every pattern of two
          states — light (laghu, L) and heavy (guru, G). Pick a length: there
          are exactly 2^n patterns, no more, no fewer.
        </Text>

        <View style={styles.nRow} accessible accessibilityLabel={`Pattern length ${n}`}>
          {[1, 2, 3, 4].map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                haptics.tap();
                setN(k);
              }}
              style={[styles.nBtn, n === k && styles.nBtnActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: n === k }}
              accessibilityLabel={`Length ${k}: ${2 ** k} patterns`}
            >
              <Text style={[styles.nText, n === k && styles.nTextActive]}>n={k}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.count}>
          {rows.length} patterns — count them, they run out exactly on time.
        </Text>
        <View style={styles.grid}>
          {rows.map((row, i) => (
            <View
              key={i}
              style={styles.pattern}
              accessible
              accessibilityLabel={`Pattern ${i + 1}: ${row.join(", ")}`}
            >
              {row.map((w, j) => (
                <View key={j} style={[styles.cell, w === "G" && styles.cellHeavy]}>
                  <View style={[styles.bar, w === "G" && styles.barHeavy]} />
                  <Text style={styles.cellText}>{w}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.section}>The mātrāmeru — count by weight, get Fibonacci</Text>
        <Text style={styles.para}>
          Group the patterns by total weight (L=1, G=2 morae): 1 way to make 0,
          then 1, 2, 3, 5, 8… Every number is the sum of the two before it —
          the sequence Europe would name for Fibonacci a thousand years later.
        </Text>
        <View style={styles.meru}>
          {MERU.map((m, i) => (
            <View key={i} style={styles.meruCell} accessible accessibilityLabel={`Meru row ${i}: ${m}`}>
              <Text style={styles.meruNum}>{m}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Try it on a real verse"
          onPress={runScan}
          disabled={scanning}
          block
          style={{ marginTop: space.xl }}
        />

        {scanning && !showResult ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Scanning the verse"
            style={{ marginTop: space.md }}
          >
            <Skeleton style={{ height: 88 }} />
          </View>
        ) : null}

        {showResult ? (
          <Animated.View style={[styles.scanCard, scanError && styles.scanCardError, resultStyle]}>
            {scanError ? (
              <>
                <Text
                  style={styles.scanErrorText}
                  accessibilityRole="text"
                  accessibilityLabel="The scansion engine could not be reached. Your patterns above are safe."
                >
                  Couldn't reach the engine — your patterns above are safe. Not a mistake.
                </Text>
                <Button label="Retry" tone="neutral" onPress={runScan} style={{ marginTop: space.md }} />
              </>
            ) : syllables.length ? (
              <>
                <Text
                  style={[styles.scanVerse, script("semibold")]}
                  accessibilityRole="text"
                  accessibilityLabel={`Seed verse: ${SEED_VERSE}`}
                >
                  {SEED_VERSE}
                </Text>
                <View
                  style={styles.scanRow}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Scansion: ${weights.join(", ")}${scan?.metre ? `. Metre ${scan.metre}` : ""}`}
                >
                  {syllables.map((syl, i) => (
                    <View key={i} style={styles.scanSyll}>
                      <Text style={[styles.scanWeight, script("extrabold")]}>{syl.weight}</Text>
                      <View style={[styles.bar, syl.weight === "G" && styles.barHeavy]} />
                    </View>
                  ))}
                </View>
                <View style={styles.scanOk}>
                  <Text
                    style={styles.scanOkText}
                    accessibilityRole="text"
                    accessibilityLabel={`Scanned ${syllables.length} syllables${scan?.metre ? `, metre ${scan.metre}` : ""}. The engine graded it.`}
                  >
                    ✓ {syllables.length} syllables{scan?.metre ? ` · ${scan.metre}` : ""} — the engine graded it.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.scanUnsure}>
                <Text
                  style={styles.scanUnsureText}
                  accessibilityRole="text"
                  accessibilityLabel="The engine could not scan this verse. No penalty. The patterns above still count."
                >
                  The engine couldn't scan this verse — no penalty. The patterns above still count.
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  kicker: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.saffron,
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleSa: { fontSize: font.sizes.xl, color: color.ink },
  titleEn: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: 2,
    marginBottom: space.md,
  },
  para: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.base,
    color: color.ink,
    lineHeight: 24,
    marginBottom: space.md,
  },
  nRow: { flexDirection: "row", gap: space.sm, marginBottom: space.sm },
  nBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  nBtnActive: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  nText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink },
  nTextActive: { color: color.saffronDeep },
  count: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.sm,
  },
  grid: { gap: space.xs, marginBottom: space.lg },
  pattern: { flexDirection: "row", gap: 4 },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  cellHeavy: { borderColor: color.saffron },
  bar: { width: 16, height: 5, borderRadius: 2.5, backgroundColor: color.border, marginBottom: 2 },
  barHeavy: { height: 12, backgroundColor: color.saffron },
  cellText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.xs, color: color.inkSoft },
  section: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  meru: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  meruCell: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: color.surface,
    paddingHorizontal: space.sm,
    ...shadow.card,
  },
  meruNum: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.saffronDeep },
  // Live scansion result — success speaks VerdictSheet's "correct" (ok tones),
  // an empty scan abstains in violet (unsure, never red), and a network
  // failure is a retryable system failure (Challenge's error vocabulary).
  scanCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginTop: space.md,
    ...shadow.card,
  },
  scanCardError: { borderWidth: 2, borderColor: color.warnBg },
  scanVerse: { fontSize: font.sizes.lg, color: color.ink, textAlign: "center" },
  scanRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm, justifyContent: "center" },
  scanSyll: { alignItems: "center", minWidth: 28, paddingVertical: 4 },
  scanWeight: { fontSize: font.sizes.sm, color: color.inkSoft },
  scanOk: { backgroundColor: color.okBg, borderRadius: radius.md, padding: space.sm, marginTop: space.sm },
  scanOkText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.okText,
    textAlign: "center",
    lineHeight: 20,
  },
  scanUnsure: { backgroundColor: color.unsureBg, borderRadius: radius.md, padding: space.sm },
  scanUnsureText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.unsureText,
    textAlign: "center",
    lineHeight: 20,
  },
  scanErrorText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.ink,
    lineHeight: 20,
  },
});
