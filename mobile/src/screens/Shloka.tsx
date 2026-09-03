// Daily Shloka — one verse a day. Loads /shlokas/today, shows Devanagari +
// IAST + word breakdown, and can speak the verse.
// U4-4: Now renders as an unfurling manuscript — verse fades in line by line
// at duration.telling, each word tappable to expand word_breakdown, with
// metre visualised as a rhythm strip. Palette evokes a manuscript.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { api, type Shloka, type WordBreakdown } from "../api/client";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { color, font, radius, script, shadow, space } from "../theme";
import { duration, easing as easingCfg } from "../motion";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EmptyState } from "../components/ui";

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
      <Pressable style={styles.wordRow} onPress={onPlay}>
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

export default function ShlokaScreen() {
  const [shloka, setShloka] = useState<Shloka | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [playedWord, setPlayedWord] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    api.todayShloka().then(setShloka).catch(() => setShloka(null));
  }, []);

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

  if (!shloka) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <EmptyState
            title="No śloka available yet."
            hint="A daily verse will appear here."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Top: source + play */}
        <View style={styles.topRow}>
          <Text style={styles.source}>{shloka.source_ref}</Text>
          <Pressable onPress={play} style={styles.playBtn} disabled={speaking}>
            {speaking ? (
              <ActivityIndicator color={color.white} size="small" />
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

        {/* Word breakdown */}
        {shloka.word_breakdown.length > 0 && (
          <View style={styles.words}>
            <Text style={styles.sectionTitle}>Word by word</Text>
            {shloka.word_breakdown.map((w, i) => (
              <AnimatedWord
                key={i}
                word={w.word}
                meaning={w.meaning}
                played={playedWord === w.word}
                onPlay={() => w.word && playWord(w.word)}
                index={i}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
      <Pressable onPress={onPress}>
        <Text style={[styles.verse, script("bold")]}>{text}।</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
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
  words: { marginTop: space.lg },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  wordRow: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.xs, ...shadow.card },
  wordMain: { flex: 1 },
  wordDev: { fontSize: font.sizes.base, color: color.ink },
  wordMeaning: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: 2 },
});