// SandhiVisual (U4-5) — SEE a sandhi happen. Two words slide together, the
// junction highlights, and the combined form morphs into place with the rule
// name beneath. Reuses U7-1's SutraCard for the rule — no second morph
// implementation, and no path-tweening of conjuncts (§U7-1.3: Devanagari
// conjuncts cannot be path-tweened; the change IS the cross-fade).
//
// Data comes from GET /grammar/sandhi (P11-2): split candidates with lexical
// validity. The component renders ONLY what the engine returned — absent is
// absent (§6).

import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import api from "../../api/client";
import { duration, spring } from "../../motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import SutraCard from "./SutraCard";
import { color, font, radius, script, space } from "../../theme";

interface SandhiVisualProps {
  /** The joined form to split, e.g. "रामो गच्छति" or "तदेव". */
  joined: string;
  /** Initial side of the display: show the join happening (true) or the split. */
  autoPlay?: boolean;
}

interface Candidate {
  first: string;
  second: string;
  first_valid: boolean;
  second_valid: boolean;
}

export default function SandhiVisual({ joined, autoPlay = false }: SandhiVisualProps) {
  const reduced = useReducedMotion();
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [error, setError] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  useEffect(() => {
    let alive = true;
    setCands(null);
    setError(false);
    api
      .sandhiSplit(joined)
      .then((res) => {
        if (!alive) return;
        setCands(res.candidates ?? []);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [joined]);

  // Animation state: 0 = apart, 1 = joined.
  const slide = useSharedValue(autoPlay && !reduced ? 0 : 1);
  const [merged, setMerged] = useState(autoPlay && !reduced);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(
      () => {
        slide.value = withSpring(1, spring.gentle);
        setTimeout(() => setShowSplit(true), duration.base);
      },
      autoPlay ? 350 : 0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(1 - slide.value) * 28 }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - slide.value) * 28 }],
  }));

  const toggle = () => {
    if (reduced) {
      setShowSplit((s) => !s);
      return;
    }
    // Re-run the junction animation on every tap.
    slide.value = 0;
    setTimeout(() => {
      slide.value = withSpring(1, spring.gentle);
      setTimeout(() => setShowSplit(true), duration.base);
    }, 30);
  };

  const best = (cands || []).find((c) => c.first_valid && c.second_valid);

  if (error) {
    return (
      <View style={styles.center} accessible>
        <Text style={styles.muted}>Could not reach the sandhi engine.</Text>
      </View>
    );
  }
  if (!cands) {
    return (
      <View style={styles.center} accessible>
        <Text style={styles.muted}>Splitting…</Text>
      </View>
    );
  }
  if (!best) {
    return (
      <View style={styles.center} accessible>
        <Text style={[styles.joined, script("semibold")]}>{joined}</Text>
        <Text style={styles.muted}>No split found for this phrase.</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`Sandhi: ${best.first} plus ${best.second} makes ${joined}. Tap to replay.`}>
      <View style={styles.stage}>
        <Animated.View style={[styles.word, leftStyle]}>
          <Text style={[styles.wordText, script("bold")]}>{best.first}</Text>
        </Animated.View>
        <Animated.View style={[styles.word, styles.wordRight, rightStyle]}>
          <Text style={[styles.wordText, script("bold")]}>{best.second}</Text>
        </Animated.View>
      </View>

      {/* The junction: highlight the final + initial sounds, then the merged
          form morphs (cross-fade — never a path tween) into place. */}
      <Animated.View entering={merged || showSplit ? FadeIn.duration(duration.base) : undefined}>
        <Text style={[styles.joined, script("bold")]}>
          {joined.replace(/\s+/g, "")}
        </Text>
      </Animated.View>

      <SutraCard
        code="सन्धिः"
        sutraDevanagari={`${best.first} + ${best.second} → ${joined.replace(/\s+/g, "")}`}
        dimmed={!best.first_valid || !best.second_valid}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.lg,
  },
  stage: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
  },
  word: {
    backgroundColor: color.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  wordRight: {},
  wordText: {
    fontSize: font.sizes.lg,
    color: color.ink,
  },
  joined: {
    fontSize: font.sizes.xxl,
    color: color.saffronText,
    textAlign: "center",
    marginVertical: space.md,
    minHeight: 44,
  },
  muted: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    textAlign: "center",
    lineHeight: 20,
  },
});
