// KaraokeLine: one chant line of text with the sounding word tinted.
// The words come from chantClock.lineWords — exact when the pipeline has
// emitted ChantLine.words, otherwise an akshara-weighted estimate across the
// line's span. The active word re-mounts (keyed) so its tint fades in; every
// other word is a plain span, so a word change costs one small fade.

import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { ChantWord } from "../../api/client";
import { lineWords } from "../../recite/chantClock";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function KaraokeLine({
  line,
  active,
  wordNow,
  style,
  litWordStyle,
  prefix = "▶ ",
}: {
  line: { text: string; start_ms: number; end_ms: number; words?: ChantWord[] };
  /** The line is sounding (its words are live). */
  active: boolean;
  /** Index of the word sounding now within this line (-1 none). */
  wordNow: number;
  style?: StyleProp<TextStyle>;
  /** The active word's look: a mild tint + colour on top of `style`. */
  litWordStyle: StyleProp<TextStyle>;
  /** Marker before the line when active. */
  prefix?: string;
}) {
  const reduced = useReducedMotion();
  if (!active) return <Text style={style}>{line.text}</Text>;
  const words = lineWords(line);
  if (!words.length || wordNow < 0) {
    return (
      <Text style={style}>
        {prefix}
        {line.text}
      </Text>
    );
  }
  return (
    <Text style={style}>
      {prefix}
      {words.map((w, i) => {
        const text = i < words.length - 1 ? `${w.text} ` : w.text;
        return i === wordNow ? (
          <AnimatedText
            key={`w${i}`}
            entering={reduced ? undefined : FadeIn.duration(140)}
            style={[style, styles.litBase, litWordStyle]}
          >
            {text}
          </AnimatedText>
        ) : (
          <Text key={`w${i}`}>{text}</Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  litBase: { fontWeight: "700" },
});
