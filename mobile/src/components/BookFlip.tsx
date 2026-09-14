// BookFlip — a real-book page turn for the Read tab.
//
// One page fills the frame. Grab it and drag: the page follows the finger
// forward AND back, folding over a spine with a shadow that deepens mid-turn,
// then falls forward or settles back on release (position + velocity decide,
// a spring finishes the thought). Buttons and the Kindle slider drive the
// same visuals programmatically; a multi-page jump cross-fades instead of
// flipping through every leaf in between.
//
// The turn pivots on the LEFT spine (translate/rotate/translate recipe —
// Reanimated has no transform-origin). Faces use backfaceVisibility so the
// leaf shows paper, not mirrored text, past 90°.
//
// Cosmetic, like everything that turns (§3.7): content identity is parent
// state, Reduce Motion disables the gesture entirely (buttons + slider keep
// working with an instant swap), and the inner ScrollView keeps vertical
// scrolls — the pan only claims horizontal travel (activeOffsetX /
// failOffsetY), so word taps still tap.

import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { haptics } from "../services/haptics";
import { radius } from "../theme";

const PAPER = "#FFFEFA";
const DEPTH = 1600;
const COMMIT_P = 0.35;
const FLING_P = 0.12;
const FLING_V = 700;
const TURN_MS = 210;

interface BookFlipProps {
  /** Controlled settled page. Jumps of >1 cross-fade; steps of 1 auto-turn. */
  index: number;
  count: number;
  onIndexChange: (i: number) => void;
  renderPage: (i: number) => React.ReactNode;
  reducedMotion?: boolean;
}

type Leaf = "fwd" | "back" | null;

function clamp(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.floor(i)));
}

export default function BookFlip({
  index,
  count,
  onIndexChange,
  renderPage,
  reducedMotion = false,
}: BookFlipProps) {
  const [cur, setCur] = useState(() => clamp(index, count));
  const [width, setWidth] = useState(0);
  // Which leaf is mid-turn (mounts the folding layer + its neighbour below).
  const [leaf, setLeaf] = useState<Leaf>(null);

  const curRef = useRef(cur);
  curRef.current = cur;
  const cbRef = useRef(onIndexChange);
  cbRef.current = onIndexChange;
  // A gesture in flight owns the truth; prop changes wait for it.
  const gesturing = useRef(false);

  // 0 = flat, 1 = fully turned. dir: 1 = forward (toward next), -1 = back.
  const prog = useSharedValue(0);
  const dir = useSharedValue<1 | -1>(1);
  // onFinalize fires after onEnd even on a clean release — without this flag
  // it would murder the settle animation onEnd just started.
  const ended = useSharedValue(false);
  const widthShared = useSharedValue(0);

  const settled = useCallback(
    (next: number) => {
      const c = clamp(next, count);
      prog.value = 0;
      setLeaf(null);
      if (c !== curRef.current) {
        setCur(c);
        cbRef.current(c);
      }
    },
    [count, prog],
  );

  const finishAnim = useCallback(
    (completed: boolean) => {
      gesturing.current = false;
      if (completed) {
        settled(curRef.current + (dir.value === 1 ? 1 : -1));
      } else {
        prog.value = 0;
        setLeaf(null);
      }
    },
    [dir, prog, settled],
  );

  const canTurn = useCallback(
    (d: 1 | -1) => {
      const c = curRef.current;
      return d === 1 ? c < count - 1 : c > 0;
    },
    [count],
  );

  // The gesture must survive re-renders mid-drag (every onUpdate runOnJS →
  // setLeaf re-renders): it only ever touches refs and shared values, so it
  // is built once per [enabled-shape] instead of once per render. A gesture
  // object recreated mid-flight cancels the flight.
  const canTurnRef = useRef(canTurn);
  canTurnRef.current = canTurn;
  const settledRef = useRef(settled);
  settledRef.current = settled;
  const finishRef = useRef(finishAnim);
  finishRef.current = finishAnim;

  // Programmatic turns (slider, buttons): a step of 1 turns the leaf, a
  // longer jump swaps instantly — flipping through six leaves to honour a
  // scrub is theatre, not wayfinding.
  useEffect(() => {
    const target = clamp(index, count);
    if (target === curRef.current || gesturing.current) return;
    const step = target - curRef.current;
    if (reducedMotion || Math.abs(step) !== 1 || width === 0) {
      prog.value = 0;
      setLeaf(null);
      setCur(target);
      return;
    }
    const d: 1 | -1 = step > 0 ? 1 : -1;
    dir.value = d;
    setLeaf(d === 1 ? "fwd" : "back");
    haptics.tap();
    prog.value = withTiming(
      1,
      { duration: TURN_MS + 60, easing: Easing.inOut(Easing.quad) },
      (fin) => {
        if (fin) runOnJS(settled)(target);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, reducedMotion, width]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!reducedMotion && count > 1)
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onStart(() => {
          gesturing.current = true;
          ended.value = false;
          runOnJS(haptics.tap)();
        })
        .onUpdate((e) => {
          const w = widthShared.value || 1;
          const d: 1 | -1 = e.translationX <= 0 ? 1 : -1;
          dir.value = d;
          const raw = Math.min(1, Math.abs(e.translationX) / w);
          // No neighbour that way: rubber-band, never a turn.
          const allowed = canTurnRef.current(d);
          prog.value = allowed ? raw : Math.min(0.22, raw * 0.25);
          runOnJS(setLeaf)(allowed ? (d === 1 ? "fwd" : "back") : null);
        })
        .onEnd((e) => {
          ended.value = true;
          const d = dir.value;
          const p = prog.value;
          const fling =
            Math.abs(e.velocityX) > FLING_V &&
            Math.sign(e.velocityX) === (d === 1 ? -1 : 1);
          const commit = canTurnRef.current(d) && (p > COMMIT_P || (p > FLING_P && fling));
          prog.value = withTiming(commit ? 1 : 0, {
            duration: TURN_MS,
            easing: Easing.inOut(Easing.quad),
          }, (fin) => {
            if (fin) runOnJS(finishRef.current)(commit);
          });
          if (commit) runOnJS(haptics.tap)();
        })
        .onFinalize(() => {
          // A cancelled gesture (interrupted, never ended) always settles flat.
          // A clean release already armed its settle in onEnd — leave it alone.
          if (!ended.value && gesturing.current) {
            prog.value = withTiming(0, { duration: 160 });
            runOnJS(setLeaf)(null);
            gesturing.current = false;
          }
        }),
    // enabled-shape only: everything the handlers read is a ref/shared value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reducedMotion, count],
  );

  // The folding leaf: pivot on the left spine; forward folds current away
  // (0 → -180), back unfolds previous home (-180 → 0).
  const leafStyle = useAnimatedStyle(() => {
    const p = prog.value;
    const deg = dir.value === 1 ? -180 * p : -180 + 180 * p;
    return {
      transform: [
        { perspective: DEPTH },
        { translateX: (width || 0) / 2 },
        { rotateY: `${deg}deg` },
        { translateX: -(width || 0) / 2 },
      ],
    };
  });

  // The moving shadow: deepest edge-on, gone flat.
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * Math.min(1, prog.value)) * 0.38,
  }));

  const fwd = leaf === "fwd";
  // Base below the leaf: the page being revealed. Folding layer: the page
  // being turned (current going forward, previous coming back) + paper back.
  const basePage = fwd ? cur + 1 : cur;
  const leafFront = fwd ? cur : cur - 1;

  return (
    <View
      style={styles.frame}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setWidth(w);
        widthShared.value = w;
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={`Page ${cur + 1} of ${count}`}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.frame}>
          {/* Base page + static spine shading: always mounted, never moves. */}
          <View style={styles.fill}>
            {renderPage(clamp(basePage, count))}
            <LinearGradient
              colors={["rgba(59,46,37,0.16)", "rgba(59,46,37,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.spine}
              pointerEvents="none"
            />
          </View>

          {/* Folding leaf, mounted only mid-turn. */}
          {leaf !== null && width > 0 && (
            <Animated.View style={[styles.leaf, leafStyle]}>
              <View style={styles.face}>{renderPage(clamp(leafFront, count))}</View>
              {/* Paper back: what a real leaf shows past 90°. */}
              <View style={[styles.face, styles.paperBack]}>
                <LinearGradient
                  colors={["rgba(59,46,37,0.10)", "rgba(59,46,37,0.02)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>
              <Animated.View style={[styles.leafShade, shadeStyle]} pointerEvents="none" />
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAPER,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  spine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 26 },
  leaf: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: "hidden",
  },
  face: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAPER,
    borderRadius: radius.lg,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  paperBack: {
    backgroundColor: "#FBF3E2",
    transform: [{ rotateY: "180deg" }],
  },
  leafShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#3B2E25",
    borderRadius: radius.lg,
  },
});
