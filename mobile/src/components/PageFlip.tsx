// PageFlip — a 3D book page-turn for the reader (U13).
//
// Renders one "page" of content and, when `pageKey` changes, rotates it about
// its vertical axis to reveal the new page — first folding the current face
// away, then unfolding the incoming face back to flat. Pure cosmetic motion:
// the content swap is what matters, and the animation is skippable (§3.7) and
// fully disabled under Reduce Motion (§3.4). No JS-thread work during the
// loop; the corner swap is driven from the UI thread via runOnJS at the fold.
//
// Usage:
//   <PageFlip pageKey={verse.id} direction={dir} reducedMotion={reduced}>
//     <VersePage ... />   // swaps identity whenever pageKey changes
//   </PageFlip>

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const FOLD_MS = 200; // each half of the turn; a full flip is ~400ms
const DEPTH = 1600; // rotateY perspective — higher looks flatter

interface PageFlipProps {
  children: React.ReactNode;
  /** Changes identity when the page should flip to new content. */
  pageKey: string;
  /** Which direction the next flip turns. */
  direction?: "forward" | "back";
  reducedMotion?: boolean;
}

export default function PageFlip({
  children,
  pageKey,
  direction = "forward",
  reducedMotion = false,
}: PageFlipProps) {
  const angle = useSharedValue(0);
  const [visible, setVisible] = useState<React.ReactNode>(children);
  // Skip the flip on the very first key so the initial page renders flat.
  const isFirst = useRef(true);

  const swap = useCallback(() => {
    setVisible(children);
  }, [children]);

  useEffect(() => {
    if (isFirst.current) {
      setVisible(children);
      isFirst.current = false;
      return;
    }

    // Reduce Motion: swap instantly, no turn (§3.4).
    if (reducedMotion) {
      setVisible(children);
      angle.value = 0;
      return;
    }

    // Fold the current face away, swap at the edge, unfold the incoming face.
    const foldTo = direction === "forward" ? -90 : 90;
    const unfoldFrom = direction === "forward" ? 90 : -90;
    const easing = Easing.inOut(Easing.quad);
    angle.value = withSequence(
      withTiming(foldTo, { duration: FOLD_MS, easing }, (finished) => {
        if (finished) runOnJS(swap)();
      }),
      withTiming(unfoldFrom, { duration: 0 }),
      withTiming(0, { duration: FOLD_MS, easing }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, direction, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: DEPTH }, { rotateY: `${angle.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.page, animatedStyle]}>
      {visible}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { backfaceVisibility: "hidden" },
});