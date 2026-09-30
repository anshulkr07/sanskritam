// WritingCanvas (U12-2) — the ink surface.
//
// A guide box holding the reference letter at low opacity behind the stroke,
// the śirorekhā headline, undo-last-stroke and clear. NO TIMER anywhere
// (§U5-4: a learner who needs thirty seconds is not failing).
//
// §2.16 / U12-2 privacy: strokes are captured as normalised point lists and
// handed to a recogniser ADAPTER that runs ON DEVICE. What can ever leave the
// device is the recognised string + confidence (via the attempt endpoint) —
// never the stroke array, never an image.
//
// Gesture notes (all three were why drawing did nothing on a phone):
//  1. With Reanimated installed, gesture callbacks are workletized and run on
//     the UI thread, where React state setters cannot run. `runOnJS(true)`
//     keeps them on the JS thread.
//  2. A vertical page scroll competes with a vertical stroke. The pan blocks
//     the enclosing gesture-handler ScrollView (`scrollRef`), and
//     `onDrawingChange` lets the page also switch scrolling off for the
//     duration of a stroke.
//  3. No nested GestureHandlerRootView: the app root already has one, and a
//     second root cannot see the ScrollView registered in the first.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Button } from "../ui";
import { color, radius, shadow, space } from "../../theme";
import type { StrokePath } from "../../api/client";

const VIEW = 100; // same coordinate space as P20-2 stroke data
const REEKHA_Y = 10;
// Skip points closer than this (in VIEW units): keeps strokes light without
// visibly changing them.
const MIN_STEP = 0.6;

export interface Point {
  x: number;
  y: number;
}

/** "preparing" while the handwriting model is fetched; "ready" once a
 *  recogniser (native or template) can answer. */
export type InkStatus = "preparing" | "ready";

/** The recogniser seam. Implementations run ON DEVICE (§2.16). */
export interface InkRecogniser {
  getStatus: () => InkStatus;
  subscribe: (listener: () => void) => () => void;
  /** Start any one-time setup (the model download). Safe to call repeatedly. */
  prepare: () => void;
  /**
   * Recognise ink. Resolves with the recognised string and a 0..1 confidence,
   * or null when there is nothing to judge. MUST NOT transmit strokes or
   * images anywhere.
   */
  recognise: (strokes: Point[][]) => Promise<{ text: string; confidence: number } | null>;
  /** The current copy target, pushed whenever the item changes. */
  setReference?: (devanagari: string, paths: StrokePath[]) => void;
}

/** A minimal SVG-path serialiser for captured strokes (client-side display). */
function strokeToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  // A dot (one point) still needs a segment to render with round caps.
  if (points.length === 1) d += ` L ${(points[0].x + 0.01).toFixed(2)} ${points[0].y.toFixed(2)}`;
  return d;
}

interface Props {
  reference: string; // the letter to write (Devanagari)
  referencePaths?: StrokePath[]; // ghost guide, when authored
  recogniser: InkRecogniser;
  /** Called with what was recognised (empty when nothing could be read). */
  onAttempt: (recognised: string, confidence: number) => void;
  /** Ref of the enclosing gesture-handler ScrollView, so a stroke beats a scroll. */
  scrollRef?: React.RefObject<unknown>;
  /** True while a finger is drawing, so the page can stop scrolling. */
  onDrawingChange?: (drawing: boolean) => void;
}

export default function WritingCanvas({
  reference,
  referencePaths,
  recogniser,
  onAttempt,
  scrollRef,
  onDrawingChange,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const size = Math.min(340, winW - space.lg * 2);
  const status = useSyncExternalStore(recogniser.subscribe, recogniser.getStatus, recogniser.getStatus);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const [busy, setBusy] = useState(false);
  const currentRef = useRef<Point[]>([]);
  const layoutRef = useRef({ w: size, h: size });
  const drawingCb = useRef(onDrawingChange);
  drawingCb.current = onDrawingChange;

  // Start the model download as soon as the screen opens.
  useEffect(() => {
    recogniser.prepare();
  }, [recogniser]);

  // Keep the recogniser's copy target in step with the item.
  useEffect(() => {
    recogniser.setReference?.(reference, referencePaths ?? []);
  }, [recogniser, reference, referencePaths]);

  const toPoint = useCallback((x: number, y: number): Point | null => {
    const { w, h } = layoutRef.current;
    if (!w || !h) return null;
    return {
      x: Math.max(0, Math.min(VIEW, (x / w) * VIEW)),
      y: Math.max(0, Math.min(VIEW, (y / h) * VIEW)),
    };
  }, []);

  const pan = useMemo(() => {
    let g = Gesture.Pan()
      .runOnJS(true)
      .minDistance(1)
      .maxPointers(1)
      .onBegin((e) => {
        const p = toPoint(e.x, e.y);
        if (!p) return;
        currentRef.current = [p];
        setCurrent([p]);
        drawingCb.current?.(true);
      })
      .onUpdate((e) => {
        const p = toPoint(e.x, e.y);
        if (!p) return;
        const last = currentRef.current[currentRef.current.length - 1];
        if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return;
        currentRef.current = [...currentRef.current, p];
        setCurrent(currentRef.current);
      })
      // onFinalize (not onEnd) also fires when the gesture is cancelled, so a
      // stroke is never left dangling.
      .onFinalize(() => {
        const pts = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        if (pts.length > 1) setStrokes((s) => [...s, pts]);
        drawingCb.current?.(false);
      });
    if (scrollRef) g = g.blocksExternalGesture(scrollRef as never);
    return g;
  }, [scrollRef, toPoint]);

  const undo = useCallback(() => setStrokes((s) => s.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);

  const submit = useCallback(async () => {
    if (strokes.length === 0 || busy) return;
    setBusy(true);
    try {
      const result = await recogniser.recognise(strokes);
      // Nothing read is still an answer (the server grades it "unsure"), so a
      // tap on Check is never silent.
      onAttempt(result?.text ?? "", result?.confidence ?? 0);
    } finally {
      setBusy(false);
    }
  }, [strokes, busy, recogniser, onAttempt]);

  const preparing = status === "preparing";
  const canSubmit = strokes.length > 0 && !preparing && !busy;
  const checkLabel = preparing ? "Preparing handwriting…" : busy ? "Checking…" : "Check";

  return (
    <View style={styles.root}>
      <View
        style={[styles.canvas, { width: size, height: size }]}
        onLayout={(e) => {
          layoutRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
      >
        <GestureDetector gesture={pan}>
          <Svg viewBox={`0 0 ${VIEW} ${VIEW}`} width={size} height={size}>
            <Rect x={0} y={0} width={VIEW} height={VIEW} fill={color.surface} />
            {/* centre guides, then the śirorekhā headline */}
            <Path d="M 50 4 L 50 96" stroke={color.border} strokeWidth={0.8} strokeDasharray="2 3" />
            <Path d="M 4 55 L 96 55" stroke={color.border} strokeWidth={0.8} strokeDasharray="2 3" />
            <Path d={`M 5 ${REEKHA_Y} L 95 ${REEKHA_Y}`} stroke={color.border} strokeWidth={1.6} strokeLinecap="round" />
            {/* reference ghost */}
            {referencePaths && referencePaths.length > 0 ? (
              referencePaths.map((s, i) => (
                <Path
                  key={i}
                  d={s.d}
                  stroke={color.saffronLight}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))
            ) : (
              <SvgText x={50} y={70} textAnchor="middle" fontSize={64} fill={color.saffronLight}>
                {reference}
              </SvgText>
            )}
            {/* the learner's ink */}
            {strokes.map((s, i) => (
              <Path
                key={i}
                d={strokeToPath(s)}
                stroke={color.ink}
                strokeWidth={4.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {current.length > 0 ? (
              <Path
                d={strokeToPath(current)}
                stroke={color.ink}
                strokeWidth={4.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </GestureDetector>
      </View>

      <View style={[styles.row, { width: size }]}>
        <Button
          label="Undo"
          tone="neutral"
          size="md"
          style={styles.half}
          disabled={strokes.length === 0}
          onPress={undo}
          icon={<Ionicons name="arrow-undo" size={18} color={color.inkSoft} />}
          accessibilityLabel="Undo the last stroke"
        />
        <Button
          label="Clear"
          tone="neutral"
          size="md"
          style={styles.half}
          disabled={strokes.length === 0}
          onPress={clear}
          icon={<Ionicons name="refresh" size={18} color={color.inkSoft} />}
          accessibilityLabel="Clear the canvas"
        />
      </View>
      <Button
        label={checkLabel}
        tone="primary"
        size="lg"
        style={{ width: size }}
        block
        disabled={!canSubmit}
        loading={busy}
        onPress={submit}
        accessibilityLabel={preparing ? "Preparing handwriting, please wait" : "Check my writing"}
        icon={!busy && !preparing ? <Ionicons name="checkmark" size={20} color={color.white} /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: space.sm },
  canvas: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    ...shadow.card,
  },
  row: { flexDirection: "row", gap: space.sm },
  half: { flex: 1 },
});
