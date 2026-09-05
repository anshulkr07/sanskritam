// WritingCanvas (U12-2) — the ink surface.
//
// A guide box holding the reference letter at low opacity behind the stroke,
// the śirorekhā headline, undo-last-stroke and clear. NO TIMER anywhere
// (§U5-4: a learner who needs thirty seconds is not failing).
//
// §2.16 / U12-2 privacy: strokes are captured as normalised point lists and
// handed to a recogniser ADAPTER that runs ON DEVICE. What can ever leave the
// device is the recognised string + confidence (via the attempt endpoint) —
// never the stroke array, never an image. The adapter interface is the seam
// for the ML Kit Digital Ink native module (dev build); when the module is
// absent the canvas says so honestly instead of faking a verdict.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import { color, font, radius, script, space } from "../../theme";
import type { StrokePath } from "../../api/client";

const VIEW = 100; // same coordinate space as P20-2 stroke data
const REEKHA_Y = 10;

export interface Point {
  x: number;
  y: number;
}

/** The recogniser seam. Implementations run ON DEVICE (§2.16). */
export interface InkRecogniser {
  /** Human-readable status shown under the canvas when not ready. */
  ready: boolean;
  statusNote: string;
  /**
   * Recognise ink. Resolves with the recognised string and a 0..1 confidence.
   * MUST NOT transmit strokes or images anywhere.
   */
  recognise: (strokes: Point[][]) => Promise<{ text: string; confidence: number } | null>;
}

/** A minimal SVG-path serialiser for captured strokes (client-side display). */
function strokeToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

interface Props {
  reference: string; // the letter to write (Devanagari)
  referencePaths?: StrokePath[]; // ghost guide, when authored
  recogniser: InkRecogniser;
  onAttempt: (recognised: string, confidence: number) => void;
}

export default function WritingCanvas({ reference, referencePaths, recogniser, onAttempt }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const [layout, setLayout] = useState({ w: 0, h: 0 });

  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin((e) => {
      const { w, h } = layout;
      if (!w || !h) return;
      beginStroke({ x: (e.x / w) * VIEW, y: (e.y / h) * VIEW });
    })
    .onUpdate((e) => {
      const { w, h } = layout;
      if (!w || !h) return;
      extendStroke({ x: (e.x / w) * VIEW, y: (e.y / h) * VIEW });
    })
    .onEnd(() => {
      endStroke();
    });

  const beginStroke = useCallback((p: Point) => {
    setCurrent([p]);
  }, []);

  const extendStroke = useCallback((p: Point) => {
    setCurrent((c) => [...c, p]);
  }, []);

  const endStroke = useCallback(() => {
    setCurrent((c) => {
      if (c.length > 1) {
        setStrokes((s) => [...s, c]);
      }
      return [];
    });
  }, []);

  const undo = useCallback(() => {
    setStrokes((s) => s.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
  }, []);

  const submit = useCallback(async () => {
    if (strokes.length === 0) return;
    const result = await recogniser.recognise(strokes);
    if (result) {
      onAttempt(result.text, result.confidence);
    }
  }, [strokes, recogniser, onAttempt]);

  const canSubmit = strokes.length > 0 && recogniser.ready;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.canvasWrap}>
        <View
          style={styles.canvas}
          onLayout={(e) => {
            setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
          }}
        >
          <GestureDetector gesture={pan}>
            <Svg viewBox={`0 0 ${VIEW} ${VIEW}`} style={StyleSheet.absoluteFill}>
              {/* guide box + baseline */}
              <Rect x={2} y={2} width={96} height={96} rx={6} fill={color.bg} stroke={color.border} strokeWidth={1} />
              <Path d={`M 5 ${REEKHA_Y} L 95 ${REEKHA_Y}`} stroke={color.border} strokeWidth={1.5} />
              {/* reference ghost */}
              {referencePaths && referencePaths.length > 0 ? (
                referencePaths.map((s, i) => (
                  <Path key={i} d={s.d} stroke={color.saffronLight} strokeWidth={6} fill="none"
                    strokeLinecap="round" strokeLinejoin="round" />
                ))
              ) : (
                <SvgText x={50} y={70} textAnchor="middle" fontSize={64} fill={color.saffronLight}>
                  {reference}
                </SvgText>
              )}
              {/* the learner's ink */}
              {strokes.map((s, i) => (
                <Path key={i} d={strokeToPath(s)} stroke={color.ink} strokeWidth={4.5}
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {current.length > 1 ? (
                <Path d={strokeToPath(current)} stroke={color.ink} strokeWidth={4.5}
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </Svg>
          </GestureDetector>
        </View>
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={undo}
          disabled={strokes.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Undo the last stroke"
          accessibilityState={{ disabled: strokes.length === 0 }}
          style={[styles.ctrl, strokes.length === 0 && styles.ctrlDisabled]}
        >
          <Ionicons name="arrow-undo" size={18} color={color.inkSoft} />
          <Text style={styles.ctrlText}>Undo</Text>
        </Pressable>
        <Pressable
          onPress={clear}
          disabled={strokes.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear the canvas"
          accessibilityState={{ disabled: strokes.length === 0 }}
          style={[styles.ctrl, strokes.length === 0 && styles.ctrlDisabled]}
        >
          <Ionicons name="refresh" size={18} color={color.inkSoft} />
          <Text style={styles.ctrlText}>Clear</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Check my writing"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.ctrl, styles.ctrlPrimary, !canSubmit && styles.ctrlDisabled]}
        >
          <Ionicons name="checkmark" size={18} color={canSubmit ? color.white : color.inkFaint} />
          <Text style={[styles.ctrlText, canSubmit && styles.ctrlTextPrimary]}>Check</Text>
        </Pressable>
      </View>

      {!recogniser.ready ? (
        <Text style={styles.note}>{recogniser.statusNote}</Text>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center" },
  canvasWrap: { width: "100%", alignItems: "center" },
  canvas: {
    width: 280,
    height: 280,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  row: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  ctrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  ctrlPrimary: { backgroundColor: color.saffron, borderColor: color.saffron },
  ctrlDisabled: { opacity: 0.45 },
  ctrlText: { fontSize: font.sizes.sm, fontWeight: "700", color: color.inkSoft },
  ctrlTextPrimary: { color: color.white },
  note: {
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: space.sm,
    textAlign: "center",
    maxWidth: 280,
  },
});
