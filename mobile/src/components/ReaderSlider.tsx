// ReaderSlider — the Kindle scrubber for the Read tab.
//
// Drag along the track and a tooltip follows the thumb ("Gītā 2.47 · 12/48");
// release to jump. A tap jumps straight there. The jump itself is instant —
// scrubbing past six leaves with six flips is theatre, not wayfinding — with
// a haptic tick on commit. ≥44pt touch height (U5-4); the tooltip and the
// position announce through accessibility (value + adjustable actions).

import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { haptics } from "../services/haptics";
import { color, font, radius, space } from "../theme";

interface ReaderSliderProps {
  index: number;
  count: number;
  /** Short label per page, e.g. the source_ref ("Bhagavad Gītā 2.47"). */
  labelFor: (i: number) => string;
  onScrubEnd: (i: number) => void;
}

function clamp(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(i)));
}

export default function ReaderSlider({
  index,
  count,
  labelFor,
  onScrubEnd,
}: ReaderSliderProps) {
  const [width, setWidth] = useState(0);
  // The page the thumb previews while held; null = rest on `index`.
  const [preview, setPreview] = useState<number | null>(null);
  const cbRef = useRef(onScrubEnd);
  cbRef.current = onScrubEnd;
  const scrub = useSharedValue(0);
  const widthRef = useRef(0);
  widthRef.current = width;

  const shown = preview ?? clamp(index, count);
  const frac = count > 1 ? shown / (count - 1) : 0;

  const toIndex = (x: number): number => {
    const w = widthRef.current || 1;
    return clamp((x / w) * (count - 1), count);
  };
  const toIndexRef = useRef(toIndex);
  toIndexRef.current = toIndex;

  const commit = (i: number) => {
    const c = clamp(i, count);
    setPreview(null);
    if (c !== clamp(index, count)) {
      haptics.tap();
      cbRef.current(c);
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // Memoised like BookFlip's: scrubbing re-renders every frame (preview),
  // and a gesture recreated mid-scrub cancels the scrub.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(count > 1)
        .activeOffsetX([-6, 6])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          scrub.value = e.x;
          runOnJS(setPreview)(toIndexRef.current(e.x));
        })
        .onEnd((e) => {
          runOnJS(commitRef.current)(toIndexRef.current(e.x));
        })
        .onFinalize(() => {
          runOnJS(setPreview)(null);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const w = width || 1;
    const x = preview !== null ? Math.max(0, Math.min(w, scrub.value)) : frac * w;
    return { transform: [{ translateX: x }] };
  });

  if (count <= 1) return null;

  return (
    <View style={styles.wrap}>
      {/* Tooltip: what the thumb is on, while held. */}
      {preview !== null && (
        <View style={styles.tip} pointerEvents="none">
          <Text style={styles.tipText} numberOfLines={1}>
            {labelFor(shown)} · {shown + 1}/{count}
          </Text>
        </View>
      )}
      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel={`Reading position, page ${shown + 1} of ${count}, ${labelFor(shown)}`}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "increment") commit(shown + 1);
            else commit(shown - 1);
          }}
        >
          <Pressable
            style={styles.track}
            onPress={(e) => commit(toIndex(e.nativeEvent.locationX))}
            accessibilityRole="button"
            accessibilityLabel="Jump to a page"
          >
            <View style={[styles.fill, { width: `${frac * 100}%` }]} />
          </Pressable>
          <Animated.View style={[styles.thumbAnchor, thumbStyle]} pointerEvents="none">
            <View style={styles.thumb} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.ends}>
        <Text style={styles.endText} numberOfLines={1}>{labelFor(0)}</Text>
        <Text style={styles.endText} numberOfLines={1}>{labelFor(count - 1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.xs },
  tip: {
    alignSelf: "center",
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginBottom: 4,
    maxWidth: "90%",
  },
  tipText: { color: color.white, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs },
  hit: { height: 44, justifyContent: "center" },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: color.saffron },
  thumbAnchor: { position: "absolute", left: -11, top: 0, bottom: 0, justifyContent: "center", width: 22 },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.saffron,
  },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  endText: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    maxWidth: "45%",
  },
});
