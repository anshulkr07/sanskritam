// ScansionStrip (U7-3) — the long/short rhythm of a Sanskrit verse line,
// computed from the text by the backend (P11-1). Each syllable sits over a
// weight bar — tall for guru (long), short for laghu. The bar height is the
// information; colour is constant so no meaning rides on colour alone (§U5-3).
//
// The metre NAME is optional and often absent (anuṣṭubh is variable). We
// render the strip regardless and simply omit the label — never a guess, and
// never hiding the strip when the name is null (P11-1).
//
// Horizontal overflow scrolls inside the strip; the screen never scrolls
// sideways.

import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import api from "../api/client";
import type { ScanSyllable, Scansion } from "../api/client";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, font, radius, script, space } from "../theme";

interface ScansionStripProps {
  /** Devanagari verse line, e.g. a quarter of a śloka. */
  text: string;
  /** Sync the highlight to recitation audio; null/undefined = no highlight. */
  playing?: boolean;
  /** Index of the current syllable to highlight during playback. */
  currentSyllable?: number;
}

export default function ScansionStrip({
  text,
  playing = false,
  currentSyllable = -1,
}: ScansionStripProps) {
  const [scan, setScan] = useState<Scansion | null>(null);
  const reduced = useReducedMotion();
  const firstLine = scan?.lines?.[0]?.syllables ?? [];

  useEffect(() => {
    let alive = true;
    api
      .scansion(text)
      .then((s) => alive && setScan(s && s.lines?.length ? s : null))
      .catch(() => alive && setScan(null));
    return () => {
      alive = false;
    };
  }, [text]);

  // The weight bar is the information; height is animated on a fixed-bar scale.
  return (
    <View style={styles.wrap} accessible accessibilityRole="text">
      {scan?.metre ? (
        <Text style={[styles.metreName, script("semibold")]}>{scan.metre}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        nestedScrollEnabled
      >
        {firstLine.map((syl, i) => (
          <Syllable
            key={i}
            syl={syl}
            active={playing && i === currentSyllable}
            reduced={reduced}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Syllable({
  syl,
  active,
  reduced,
}: {
  syl: ScanSyllable;
  active: boolean;
  reduced: boolean;
}) {
  const isGuru = syl.weight === "G";
  const pulse = useSharedValue(reduced ? 0 : 1);

  useEffect(() => {
    if (active && !reduced) {
      pulse.value = 0.35;
      pulse.value = withTiming(1, { duration: 300 });
    } else if (!reduced) {
      pulse.value = 0;
    }
  }, [active, pulse, reduced]);

  const animated = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0.35 + 0.65 * pulse.value,
  }));

  return (
    <View style={styles.syllableCol}>
      <Text style={[styles.sylText, script("semibold")]} numberOfLines={1}>
        {syl.syllable_devanagari}
      </Text>
      {/* Fixed-width bar; animate opacity/scale, never height (§8). */}
      <View style={styles.barGutter}>
        <Animated.View
          style={[
            styles.bar,
            isGuru ? styles.barG : styles.barL,
            animated,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: space.sm,
  },
  metreName: {
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.xs,
    textAlign: "center",
  },
  strip: {
    alignItems: "flex-end",
    paddingHorizontal: space.sm,
  },
  syllableCol: {
    alignItems: "center",
    width: 28,
    marginHorizontal: 3,
  },
  sylText: {
    fontSize: font.sizes.base,
    color: color.ink,
  },
  barGutter: {
    height: 18,
    width: 8,
    justifyContent: "flex-end",
    marginTop: 4,
    borderRadius: radius.sm,
  },
  bar: {
    width: 8,
    borderRadius: radius.sm,
    backgroundColor: color.saffron,
  },
  barG: {
    height: 18, // guru — tall
  },
  barL: {
    height: 8, // laghu — short
  },
});
