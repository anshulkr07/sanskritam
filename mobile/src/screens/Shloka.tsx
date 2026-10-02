// Daily Shloka — one verse a day. Loads /shlokas/today, shows Devanagari +
// IAST + meaning + word breakdown, and can speak the verse.
// The meaning (Hindi and English) rides in with the verse when the server
// has it stored. When it does not, /shlokas/{id}/meaning writes it once and
// stores it; the verse shows at once and the meaning fills in under it.
// U4-4: Now renders as an unfurling manuscript — verse fades in line by line
// at duration.telling, each word tappable to expand word_breakdown, with
// metre visualised as a rhythm strip. Palette evokes a manuscript.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { api, type Shloka, type WordBreakdown } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import { cachedGet } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
import FetchError from "../components/FetchError";
import ReportButton from "../components/ReportButton";
import { color, font, radius, script, shadow, space } from "../theme";
import { duration, easing as easingCfg } from "../motion";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EmptyState } from "../components/ui";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { plain } from "../utils/text";

// ── Metre rhythm visualization ────────────────────────────────────────

function MetreStrip({ metre }: { metre: string }) {
  if (!metre) return null;
  // A simple visual: long syllables as wider bars, short as narrower
  const syllables = metre.split(/\s+/).filter(Boolean);
  const longs = new Set(["—", "S", "L", "G", "–"]);

  return (
    <View style={styles.metreWrap}>
      <Text style={styles.metreLabel}>Metre: {metre}</Text>
      <View style={styles.metreStrip}>
        {syllables.map((s, i) => {
          const isLong = longs.has(s) || s.length > 1;
          return (
            <View
              key={i}
              style={[
                styles.metreBeat,
                {
                  width: isLong ? 12 : 6,
                  height: isLong ? 16 : 10,
                  backgroundColor: isLong ? color.saffron : color.inkFaint,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Animated word breakdown row ───────────────────────────────────────

function AnimatedWord({
  word,
  meaning,
  played,
  onPlay,
  index,
}: {
  word: string;
  meaning?: string;
  played: boolean;
  onPlay: () => void;
  index: number;
}) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : 12);

  useEffect(() => {
    opacity.value = withDelay(
      index * 120,
      withTiming(1, { duration: duration.base, easing: easingCfg.entrance }),
    );
    translateY.value = withDelay(
      index * 120,
      withTiming(0, { duration: duration.base, easing: easingCfg.entrance }),
    );
  }, [index, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={styles.wordRow}
        onPress={onPlay}
        accessibilityRole="button"
        accessibilityLabel={`Play the word ${word}. Meaning: ${meaning ?? "not given"}`}
        accessibilityState={{ selected: played }}
      >
        <View style={styles.wordMain}>
          <Text style={[styles.wordDev, script("bold")]}>{word}</Text>
          {!!meaning && <Text style={styles.wordMeaning}>{meaning}</Text>}
        </View>
        {played && <Ionicons name="volume-high" size={16} color={color.saffron} />}
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

// Skeleton preview of the manuscript: source line, verse card, and the word
// breakdown list — holds screen shape while the daily verse loads (U9-4).
function ShlokaSkeleton() {
  return (
    <>
      <Skeleton width={140} height={14} radius={radius.sm} style={{ marginBottom: space.md }} />
      <View style={styles.verseCard}>
        <Skeleton height={26} width="92%" />
        <Skeleton height={26} width="72%" style={{ marginTop: 8 }} />
        <Skeleton height={26} width="82%" style={{ marginTop: 8 }} />
        <Skeleton height={16} width="45%" style={{ marginTop: space.sm }} />
      </View>
      <View style={{ marginTop: space.lg }}>
        <SkeletonGroup count={5} height={52} radius={radius.md} />
      </View>
    </>
  );
}

export default function ShlokaScreen() {
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [playedWord, setPlayedWord] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<{ hi: string; en: string } | null>(null);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const reduced = useReducedMotion();
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  // U11: the ask button asks about the verse on screen.
  useAskContext("shloka", shloka?.devanagari ?? "");

  const load = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    // Same key as Home's śloka card, so opening the card renders from memory.
    cachedGet("shloka-today", api.todayShloka)
      .then((s) => {
        setShloka(s);
        // U3-4: opening the daily verse earns prathama-sloka (once).
        recordAch({ type: "sloka_studied" });
        const hi = s.translation_hi ?? "";
        const en = s.translation_en ?? "";
        if (hi || en) {
          setMeaning({ hi, en });
          return;
        }
        // Not stored with the verse: ask for it. A backend from before this
        // route answers 404, and the screen simply shows no meaning.
        setMeaning(null);
        setMeaningLoading(true);
        cachedGet(`shloka-meaning-${s.id}`, () => api.shlokaMeaning(s.id))
          .then((m) => setMeaning({ hi: m.translation_hi, en: m.translation_en }))
          .catch(() => setMeaning(null))
          .finally(() => setMeaningLoading(false));
      })
      .catch(() => {
        setShloka(null);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [recordAch]);

  useEffect(() => {
    load();
  }, [load]);

  const play = useCallback(async () => {
    if (!shloka || speaking) return;
    haptics.tap();
    setSpeaking(true);
    try {
      await speak(shloka.devanagari, "sa");
    } finally {
      setSpeaking(false);
    }
  }, [shloka, speaking]);

  const playWord = useCallback(async (word: string) => {
    haptics.tap();
    setPlayedWord(word);
    try {
      await speak(word, "sa");
    } finally {
      setPlayedWord(null);
    }
  }, []);

  // Animate verse lines unfurling (splitting on newlines or sentence boundaries)
  const lines = shloka?.devanagari?.split(/\n|।\s*/).filter(Boolean) ?? [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.body}>
          <ShlokaSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!shloka) {
    // U10-3: failure and emptiness are different states and render
    // differently — a failed fetch offers retry, never a dead end.
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          {loadFailed ? (
            <FetchError label="Couldn't reach the verse." onRetry={load} />
          ) : (
            <EmptyState
              title="No śloka available yet."
              hint="A daily verse will appear here."
            />
          )}
        </View>
        <AchievementReveal queue={achQueue} onDone={dismissAch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Top: source + play */}
        <View style={styles.topRow}>
          <Text style={styles.source}>{shloka.source_ref}</Text>
          <Pressable
            onPress={play}
            style={styles.playBtn}
            disabled={speaking}
            accessibilityRole="button"
            accessibilityLabel={speaking ? "Playing the verse" : "Play the verse aloud"}
            accessibilityState={{ busy: speaking, disabled: speaking }}
          >
            {speaking ? (
              <Ionicons name="hourglass-outline" size={22} color={color.white} />
            ) : (
              <Ionicons name="volume-high" size={22} color={color.white} />
            )}
          </Pressable>
        </View>

        {/* Verse — unfurling manuscript style */}
        <View style={styles.verseCard}>
          {lines.map((line, i) => (
            <AnimatedLine
              key={i}
              text={line}
              index={i}
              reduced={reduced}
              onPress={play}
            />
          ))}
          <Text style={styles.iast}>{shloka.iast}</Text>
          <MetreStrip metre={shloka.metre} />
        </View>

        {/* Meaning: Hindi, then English, whichever exist */}
        {meaningLoading ? (
          <View
            style={styles.meaning}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading the meaning"
          >
            <Text style={styles.sectionTitle}>Meaning</Text>
            <Skeleton height={16} width="94%" />
            <Skeleton height={16} width="68%" style={{ marginTop: 8 }} />
          </View>
        ) : meaning && (meaning.hi || meaning.en) ? (
          <View style={styles.meaning}>
            <Text style={styles.sectionTitle}>Meaning</Text>
            {!!meaning.hi && (
              <Text style={[styles.meaningHi, script("regular")]}>{plain(meaning.hi)}</Text>
            )}
            {!!meaning.en && <Text style={styles.meaningEn}>{plain(meaning.en)}</Text>}
            <ReportButton
              surface="ask"
              question={`Meaning of the verse: ${shloka.devanagari}`}
              answer={[meaning.hi, meaning.en].filter(Boolean).join("\n")}
              noun="meaning"
            />
          </View>
        ) : null}

        {/* Word breakdown */}
        {(shloka.word_breakdown ?? []).length > 0 && (
          <View style={styles.words}>
            <Text style={styles.sectionTitle}>Word by word</Text>
            {shloka.word_breakdown.map((w, i) => (
              <AnimatedWord
                key={i}
                word={w.word}
                meaning={plain(w.meaning) || undefined}
                played={playedWord === w.word}
                onPlay={() => w.word && playWord(w.word)}
                index={i}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <AchievementReveal queue={achQueue} onDone={dismissAch} />
    </SafeAreaView>
  );
}

// ── Animated verse line ───────────────────────────────────────────────

function AnimatedLine({
  text,
  index,
  reduced,
  onPress,
}: {
  text: string;
  index: number;
  reduced: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : 12);

  useEffect(() => {
    opacity.value = withDelay(
      index * duration.telling,
      withTiming(1, { duration: duration.telling, easing: easingCfg.entrance }),
    );
    translateY.value = withDelay(
      index * duration.telling,
      withTiming(0, { duration: duration.telling, easing: easingCfg.entrance }),
    );
  }, [index, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Play verse line. ${text}।`}
        style={styles.lineHit}
      >
        <Text style={[styles.verse, script("bold")]}>{text}।</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: space.lg, paddingBottom: 120 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md },
  source: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffron, textTransform: "uppercase", letterSpacing: 0.5 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  verseCard: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    ...shadow.card,
    borderLeftWidth: 4,
    borderLeftColor: color.saffron,
  },
  verse: { fontSize: font.sizes.xl, color: color.ink, lineHeight: 40, marginBottom: 4 },
  iast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, marginTop: space.sm },
  metreWrap: { marginTop: space.md },
  metreLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: 4 },
  metreStrip: { flexDirection: "row", alignItems: "flex-end", gap: 3, flexWrap: "wrap" },
  metreBeat: { borderRadius: 3 },
  meaning: { marginTop: space.lg },
  meaningHi: { fontSize: font.sizes.base, color: color.ink, lineHeight: 28, marginBottom: space.xs },
  meaningEn: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, lineHeight: 24 },
  words: { marginTop: space.lg },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  wordRow: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.xs, ...shadow.card },
  wordMain: { flex: 1 },
  wordDev: { fontSize: font.sizes.base, color: color.ink },
  wordMeaning: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
});