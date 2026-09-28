// ReaderSlider — the Kindle scrubber for the Read tab.
//
// Drag along the track and a tooltip follows the thumb ("Gītā 2.47 · 12/48");
// release to jump. A tap jumps straight there. The jump itself is instant —
// scrubbing past six leaves with six flips is theatre, not wayfinding — with
// a haptic tick on commit. ≥44pt touch height (U5-4); the tooltip and the
// position announce through accessibility (value + adjustable actions).
//
// Taps go through a gesture-handler Tap (same coordinate space as the scrub
// Pan) — never a nested Pressable reading locationX, which is undefined on
// some platforms and used to commit NaN, poisoning the book's page state.

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  if (!Number.isFinite(i)) return 0;
  const n = Math.round(i);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(count - 1, n));
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
  const widthShared = useSharedValue(0);
  // Last previewed page, on the UI thread — scrubbing only crosses into JS
  // when the previewed page actually changes, not every frame.
  const lastPreview = useSharedValue(-1);

  const shown = preview ?? clamp(index, count);
  const safeShown = Number.isFinite(shown) ? shown : 0;
  const frac = count > 1 ? safeShown / (count - 1) : 0;
  const safeFrac = Number.isFinite(frac) ? Math.max(0, Math.min(1, frac)) : 0;

  const commit = (i: number) => {
    lastPreview.value = -1;
    setPreview(null);
    if (!Number.isFinite(i)) return;
    const c = clamp(i, count);
    if (c !== clamp(index, count)) {
      haptics.tap();
      cbRef.current(c);
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // Worklet: x (gesture space) → page. Reads the shared width so taps and
  // scrubs agree even before the next render.
  const toIndexWorklet = (x: number, w: number, n: number): number => {
    "worklet";
    if (!Number.isFinite(x) || n <= 1 || !(w > 0)) return 0;
    const raw = (x / w) * (n - 1);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(raw)));
  };

  // Memoised like PageCurlBook's: scrubbing re-renders on preview change,
  // and a gesture recreated mid-scrub cancels the scrub — so the gestures
  // only ever depend on [enabled-shape], reading the rest from shared
  // values and stable refs.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(count > 1)
        .activeOffsetX([-6, 6])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          scrub.value = e.x;
          const nxt = toIndexWorklet(e.x, widthShared.value, count);
          if (nxt !== lastPreview.value) {
            lastPreview.value = nxt;
            runOnJS(setPreview)(nxt);
          }
        })
        .onEnd((e) => {
          const end = toIndexWorklet(e.x, widthShared.value, count);
          lastPreview.value = -1;
          runOnJS(commitRef.current)(end);
        })
        .onFinalize(() => {
          lastPreview.value = -1;
          runOnJS(setPreview)(null);
        }),
    // `count` is captured by the worklet math — rebuilt when the book
    // changes, never mid-scrub (the book is fixed while reading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(count > 1)
        .onEnd((e) => {
          const at = toIndexWorklet(e.x, widthShared.value, count);
          runOnJS(commitRef.current)(at);
        }),
    // Same as pan: rebuilt only when the book changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );

  const composed = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const thumbStyle = useAnimatedStyle(() => {
    const w = width > 0 ? width : 1;
    const raw = preview !== null ? scrub.value : safeFrac * w;
    const x = Number.isFinite(raw) ? Math.max(0, Math.min(w, raw)) : 0;
    return { transform: [{ translateX: x }] };
  });

  if (count <= 1) return null;

  return (
    <View style={styles.wrap}>
      {/* Tooltip: what the thumb is on, while held. */}
      {preview !== null && (
        <View style={styles.tip} pointerEvents="none">
          <Text style={styles.tipText} numberOfLines={1}>
            {labelFor(safeShown)} · {safeShown + 1}/{count}
          </Text>
        </View>
      )}
      <GestureDetector gesture={composed}>
        <View
          style={styles.hit}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            setWidth(w);
            widthShared.value = w;
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={`Reading position, page ${safeShown + 1} of ${count}, ${labelFor(safeShown)}`}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "increment") commit(safeShown + 1);
            else commit(safeShown - 1);
          }}
        >
          <View style={styles.track} accessibilityRole="none">
            <View style={[styles.fill, { width: `${safeFrac * 100}%` }]} />
          </View>
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
