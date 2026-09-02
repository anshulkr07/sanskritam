// DerivationPlayer (U7-1) — play a Pāṇinian derivation one sūtra at a time.
//
// The current form sits large on stage (Devanagari via script()). One sūtra
// card is visible at a time; the diffed span of the result scales briefly and
// cross-fades while the unchanged text holds still — the change IS the
// animation. Bookkeeping steps (form unchanged) render dimmed and pass fast.
// The learner drives via a scrubber + prev/next; autoplay is optional, never
// the default (§3.7). Under Reduce Motion the full ladder renders statically.
//
// Rule that governs U7: never render a claim the backend did not return. A
// missing step is never invented, and steps are never re-ordered.

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import api from "../../api/client";
import type { Derivation } from "../../api/client";
import { duration, easing } from "../../motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useDerivation, diffResult } from "../../hooks/useDerivation";
import { color, font, script, space } from "../../theme";
import SutraCard from "./SutraCard";

interface DerivationPlayerProps {
  /** Devanagari word to derive, e.g. "भू" or "देव". */
  word: string;
  /** Whether to land on the final form immediately (wrong-answer moment). */
  landOnEnd?: boolean;
  /** Optional header line, e.g. the word being derived. */
  title?: string;
  /** Prefix a stage form with this label (noun vs verb disambiguation). */
  kind?: "verb" | "noun";
}

export default function DerivationPlayer({
  word,
  landOnEnd = false,
  title,
  kind = "verb",
}: DerivationPlayerProps) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  const fetchFn = (): Promise<Derivation | null> =>
    kind === "verb"
      ? api.deriveWord({ dhatu: word })
      : api.deriveWord({ pratipadika: word });

  const r = useDerivation(fetchFn);

  // Land on the end immediately when opened from a wrong-answer moment.
  useEffect(() => {
    if (landOnEnd && r.stepCount > 0) r.setCurrent(r.stepCount - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.stepCount, landOnEnd]);

  // Optional autoplay — never the default.
  useEffect(() => {
    if (!playing || reduced) return;
    if (r.atEnd) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      r.next();
    }, r.steps[r.current]?.bookkeeping ? duration.quick : duration.telling);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, r.current, r.atEnd, reduced]);

  if (r.loading) {
    return (
      <View style={styles.center} accessible>
        <Text style={styles.muted}>Deriving…</Text>
      </View>
    );
  }
  if (r.error || !r.derivation || r.stepCount === 0) {
    return (
      <View style={styles.center} accessible>
        <Text style={[styles.stage, script("semibold")]}>{word}</Text>
        <Text style={styles.muted}>
          {r.error ? "Could not load the derivation." : "No derivation available."}
        </Text>
      </View>
    );
  }

  const currentStep = r.steps[r.current];
  const finalForm = r.derivation.result;

  // ── Reduce Motion: full ladder, static ──
  if (reduced) {
    return (
      <View accessible accessibilityRole="text">
        {title ? <Text style={styles.header}>{title}</Text> : null}
        <Text style={[styles.stage, script("semibold")]} numberOfLines={2}>
          {finalForm}
        </Text>
        <ScrollView style={styles.scroll} nestedScrollEnabled>
          {r.steps.map((s, i) => (
            <SutraCard
              key={s.step.code + i}
              code={s.step.code}
              sutraDevanagari={s.step.sutra_devanagari}
              dimmed={s.bookkeeping}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View>
      <ChangeSpan
        result={currentStep.step.result}
        changed={currentStep.changed}
        stepKey={r.current}
      />
      <SutraCard
        code={currentStep.step.code}
        sutraDevanagari={currentStep.step.sutra_devanagari}
        dimmed={currentStep.bookkeeping}
      />

      {/* Scrubber + transport */}
      <View style={styles.transport}>
        <Pressable
          onPress={r.prev}
          disabled={r.atStart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          style={[styles.navBtn, r.atStart && styles.navDisabled]}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <View style={styles.scrubber}>
          {Array.from({ length: Math.min(r.stepCount, 20) }).map((_, i) => {
            const idx = Math.round((i / Math.max(1, Math.min(r.stepCount, 20) - 1)) * (r.stepCount - 1));
            const active = idx === r.current;
            return (
              <Pressable
                key={idx}
                onPress={() => r.setCurrent(idx)}
                accessibilityRole="button"
                accessibilityLabel={`Step ${idx + 1} of ${r.stepCount}`}
                style={[
                  styles.seg,
                  active && styles.segActive,
                  r.steps[idx]?.bookkeeping && styles.segBook,
                ]}
              />
            );
          })}
        </View>
        <Pressable
          onPress={r.next}
          disabled={r.atEnd}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          style={[styles.navBtn, r.atEnd && styles.navDisabled]}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.rowCount}>
        <Text style={styles.muted}>Step {r.current + 1} of {r.stepCount}</Text>
        <Pressable
          onPress={() => setPlaying((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play through"}
          accessibilityState={{ selected: playing }}
        >
          <Text style={styles.play}>{playing ? "Pause" : "▶ Play"}</Text>
        </Pressable>
      </View>
      <Text style={[styles.final, script("semibold")]} numberOfLines={2}>
        {finalForm}
      </Text>
    </View>
  );
}

/** Animates ONLY the changed span; the unchanged text holds still. */
function ChangeSpan({
  result,
  changed,
  stepKey,
}: {
  result: string;
  changed: string | null;
  stepKey: number;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withDelay(
      duration.instant,
      withTiming(1, {
        duration: duration.base,
        easing: easing.standard,
      }),
    );
  }, [stepKey, pulse]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.55 * pulse.value,
    transform: [{ scale: 1 + 0.05 * pulse.value }],
  }));

  if (!changed) {
    return (
      <Text style={[styles.stage, script("semibold")]} numberOfLines={2}>
        {result}
      </Text>
    );
  }
  // Split result around the changed span.
  const p = result.indexOf(changed);
  const before = p > 0 ? result.slice(0, p) : "";
  const after = p + changed.length < result.length ? result.slice(p + changed.length) : "";
  return (
    <Text style={[styles.stage, script("semibold")]} numberOfLines={2}>
      {before}
      <Animated.Text style={[styles.changed, animated]}>{changed}</Animated.Text>
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xl,
  },
  header: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.xs,
  },
  stage: {
    fontSize: font.sizes.xxl,
    color: color.ink,
    textAlign: "center",
    minHeight: 48,
    marginVertical: space.md,
  },
  changed: {
    color: color.saffronText,
  },
  scroll: {
    marginTop: space.sm,
  },
  transport: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.md,
  },
  scrubber: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: space.sm,
  },
  seg: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.surfaceMuted,
  },
  segActive: {
    backgroundColor: color.saffron,
    transform: [{ scale: 1.2 }],
  },
  segBook: {
    height: 4,
    width: 8,
  },
  navBtn: {
    padding: space.sm,
  },
  navDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: font.sizes.lg,
    color: color.saffronText,
    fontWeight: "700",
  },
  rowCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.xs,
  },
  muted: {
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  play: {
    fontSize: font.sizes.sm,
    color: color.saffronText,
    fontWeight: "700",
  },
  final: {
    fontSize: font.sizes.lg,
    color: color.okText,
    textAlign: "center",
    marginTop: space.md,
  },
});