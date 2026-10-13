// Daily Shloka — one verse a day. Loads /shlokas/today, shows Devanagari +
// IAST + whole-verse meaning, and can speak the verse.
// The meaning (Hindi and English) rides in with the verse when the server
// has it stored. When it does not, /shlokas/{id}/meaning writes it once and
// stores it; the verse shows at once and the meaning fills in under it.
// The verse fades in line by line at duration.telling, with its metre shown
// as a rhythm strip. Meaning is given for the whole verse.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { api, type Shloka } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { cachedGet, peekCache } from "../services/apiCache";
import { haptics } from "../services/haptics";
import { playClip, preloadClip, speak } from "../services/speech";
import { playChantSegment, type SegmentHandle } from "../recite/linePlayback";
import { SinglePlayback } from "../services/singlePlayback";
import { useAchievementReveal } from "../hooks/useAchievementReveal";
import AchievementReveal from "../components/AchievementReveal";
import FetchError from "../components/FetchError";
import ReportButton from "../components/ReportButton";
import { color, font, script, shadow, space } from "../theme";
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

// ── Main screen ───────────────────────────────────────────────────────

// Skeleton preview of the manuscript: source line, verse card, and the word
// breakdown list — holds screen shape while the daily verse loads (U9-4).
function ShlokaSkeleton() {
  return (
    <>
      <Skeleton width={140} height={14} radius={0} style={{ marginBottom: space.md }} />
      <View style={styles.verseCard}>
        <Skeleton height={26} width="92%" />
        <Skeleton height={26} width="72%" style={{ marginTop: 8 }} />
        <Skeleton height={26} width="82%" style={{ marginTop: 8 }} />
        <Skeleton height={16} width="45%" style={{ marginTop: space.sm }} />
      </View>
      <View style={{ marginTop: space.lg }}>
        <SkeletonGroup count={5} height={52} radius={0} />
      </View>
    </>
  );
}

export default function ShlokaScreen() {
  const navigation = useNavigation();
  const [shloka, setShloka] = useState<Shloka | null>(() => peekCache<Shloka>("shloka-today") ?? null);
  const [loading, setLoading] = useState(() => peekCache("shloka-today") === undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [playError, setPlayError] = useState("");
  const playback = useRef(new SinglePlayback()).current;
  const mounted = useRef(true);
  const [linePlaying, setLinePlaying] = useState<number | null>(null);
  const segRef = useRef<SegmentHandle | null>(null);
  const [meaning, setMeaning] = useState<{ hi: string; en: string } | null>(null);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const reduced = useReducedMotion();
  const { queue: achQueue, record: recordAch, dismiss: dismissAch } = useAchievementReveal();

  // U11: the ask button asks about the verse on screen.
  useAskContext("shloka", shloka?.devanagari ?? "");

  const load = useCallback(() => {
    setLoading(peekCache("shloka-today") === undefined);
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

  useEffect(() => {
    void preloadClip(shloka?.chant?.url || shloka?.audio_url);
  }, [shloka?.chant?.url, shloka?.audio_url]);

  useFocusEffect(useCallback(() => {
    mounted.current = true;
    setSpeaking(false);
    setLinePlaying(null);
    return () => {
      mounted.current = false;
      playback.stop();
      try { segRef.current?.stop(); } catch { /* gone */ }
      segRef.current = null;
    };
  }, [playback]));

  const play = useCallback(async () => {
    if (!shloka || playback.busy) return;
    haptics.tap();
    setPlayError("");
    setSpeaking(true);
    setLinePlaying(null);
    try { segRef.current?.stop(); } catch { /* gone */ }
    try {
      const recording = shloka.chant?.url || shloka.audio_url;
      await playback.play((onComplete, signal) => recording
        ? playClip(recording, onComplete, signal)
        : speak(shloka.devanagari, "sa", 1, onComplete, undefined, signal));
    } catch {
      if (mounted.current) setPlayError("Couldn't play the verse. Tap to try again.");
    } finally {
      if (mounted.current && !playback.busy) setSpeaking(false);
    }
  }, [shloka, playback]);

  // Per-line chant play on the daily card: when the verse has chant lines,
  // each line plays its own segment (same helper as Learn's listen step).
  const playLine = useCallback(async (i: number) => {
    const chant = shloka?.chant;
    const ln = chant?.lines?.find((l) => l.i === i);
    if (!chant?.url || !ln || playback.busy) return;
    haptics.tap();
    setPlayError("");
    setLinePlaying(i);
    try { segRef.current?.stop(); } catch { /* gone */ }
    try {
      segRef.current = await playChantSegment(
        async (u) => {
          if (u.startsWith("http")) return u;
          const base = (await import("../config")).BASE_URL;
          return `${base}${u}`;
        },
        chant.url,
        ln,
        1,
      );
    } catch {
      if (mounted.current) {
        setPlayError("Couldn't play that line. Tap to try again.");
        setLinePlaying(null);
      }
    }
  }, [shloka, playback]);

  // Animate verse lines unfurling (splitting on newlines or sentence boundaries)
  const lines = shloka?.devanagari?.split(/\n|।\s*/).filter(Boolean) ?? [];
  const chantLines = shloka?.chant?.lines?.length ? shloka.chant.lines : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
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
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Top: source + play */}
        <View style={styles.topRow}>
          <Text style={styles.source}>{shloka.source_ref}</Text>
          <View style={styles.topBtns}>
            <Pressable
              onPress={() => (navigation as never as { navigate: (r: string, p?: object) => void }).navigate("Recite", {
                verseUid: shloka.verse_uid ?? shloka.id, start: "listen",
              })}
              accessibilityRole="button"
              accessibilityLabel="Learn this verse"
              style={styles.learnBtn}
            >
              <Text style={styles.learnText}>Learn</Text>
            </Pressable>
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
        </View>

        {!!playError && <Text accessibilityRole="alert" style={styles.meaningEn}>{playError}</Text>}

        {/* Verse — unfurling manuscript style */}
        <View style={styles.verseCard}>
          {chantLines
            ? chantLines.map((ln) => (
              <AnimatedLine
                key={ln.i}
                text={ln.text}
                index={ln.i}
                reduced={reduced}
                active={linePlaying === ln.i}
                onPress={() => void playLine(ln.i)}
              />
            ))
            : lines.map((line, i) => (
              <AnimatedLine
                key={i}
                text={line}
                index={i}
                reduced={reduced}
                active={false}
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
  active,
  onPress,
}: {
  text: string;
  index: number;
  reduced: boolean;
  active: boolean;
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
        accessibilityLabel={active ? `Playing verse line. ${text}।` : `Play verse line. ${text}।`}
        accessibilityState={{ busy: active }}
        style={styles.lineHit}
      >
        <View style={styles.lineRow}>
          <Text style={[styles.verse, script("bold")]}>{text}।</Text>
          {active && <Ionicons name="volume-high" size={16} color={color.saffron} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: space.lg, paddingBottom: 120 },
  lineHit: { minHeight: 44, justifyContent: "center" },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md },
  topBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  learnBtn: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1.5, borderColor: "#D9C9AE", borderRadius: 0 },
  learnText: { fontWeight: "700", color: color.ink },
  source: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffron, textTransform: "uppercase", letterSpacing: 0.5 },
  playBtn: { width: 48, height: 48, borderRadius: 0, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  verseCard: {
    backgroundColor: color.surface,
    borderRadius: 0,
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
  metreBeat: { borderRadius: 0 },
  meaning: { marginTop: space.lg },
  meaningHi: { fontSize: font.sizes.base, color: color.ink, lineHeight: 28, marginBottom: space.xs },
  meaningEn: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.base, color: color.inkSoft, lineHeight: 24 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
});
