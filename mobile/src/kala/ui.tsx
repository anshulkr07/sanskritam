// Small shared pieces of the Kāla screens.
//
// Look rule (HANDOVER section 2): a coloured surface is a deep solid fill
// with cream text; everything else sits straight on the cream page with
// hairlines between rows. Sanskrit is never set below 18pt.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";

import { useTypeScale } from "../hooks/useTypeScale";
import { color, fill, onFill, script, scriptFontFamily, space, type FillName } from "../theme";

/** The colour of a small label on a deep fill: gold, except on the fills
 *  where gold falls below 4.5:1 (scripts/check-contrast.mjs). */
export function labelOn(tone: FillName): string {
  return tone === "saffron" || tone === "gold" || tone === "ok" || tone === "bad" ? onFill.text : onFill.gold;
}

/** A short label over a section, on the cream page. */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.sectionLabel, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A deep solid fill with room inside. */
export function Panel({ tone, children, style }: { tone: FillName; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, { backgroundColor: fill[tone] }, style]}>{children}</View>;
}

interface SaProps extends TextProps {
  children: React.ReactNode;
  /** The size at the default text setting. Raised to 18 if lower. */
  size?: number;
  weight?: keyof typeof scriptFontFamily;
  /** On a deep fill (cream) or on the page (ink). */
  on?: "fill" | "page";
}

/** Sanskrit in Devanagari. Never below 18pt, and with the line height the
 *  script needs for what sits above and below the line. */
export function Sa({ children, size = 20, weight = "semibold", on = "page", style, ...rest }: SaProps) {
  const { sized } = useTypeScale();
  const fontSize = sized(Math.max(18, size), { sanskrit: true });
  return (
    <Text
      {...rest}
      style={[script(weight), { fontSize, lineHeight: Math.round(fontSize * 1.5), color: on === "fill" ? onFill.text : color.ink }, style]}
    >
      {children}
    </Text>
  );
}

/** A value worked out off the current frame, so a screen draws at once and
 *  fills in. `null` until it lands; `failed` if it could not be worked out. */
export function useDeferred<T>(compute: () => T, deps: React.DependencyList): { value: T | null; failed: boolean } {
  const [state, setState] = useState<{ value: T | null; failed: boolean }>({ value: null, failed: false });
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      if (!alive) return;
      try {
        setState({ value: compute(), failed: false });
      } catch (err) {
        console.warn("[kala] could not work that out:", err);
        setState({ value: null, failed: true });
      }
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // The caller lists what the value depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** A number moved smoothly from one value to another by the screen itself,
 *  for charts that are redrawn from state. The caller skips it under Reduce
 *  Motion. */
export function useTween() {
  const frame = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  useEffect(() => stop, [stop]);
  const run = useCallback(
    (from: number, to: number, ms: number, onValue: (v: number) => void, onDone?: () => void) => {
      stop();
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - t0) / Math.max(1, ms));
        const eased = 1 - Math.pow(1 - p, 3);
        onValue(from + (to - from) * eased);
        if (p < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          frame.current = null;
          onDone?.();
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [stop],
  );
  return { run, stop };
}

/** Bars that hold a panel's shape while its reading is made. */
export function Ghost({ lines = 3, on = "fill" }: { lines?: number; on?: "fill" | "page" }) {
  const tint = on === "fill" ? onFill.faint : color.border;
  return (
    <View style={styles.ghost} accessible accessibilityLabel="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={[styles.ghostBar, { backgroundColor: tint, width: `${88 - i * 17}%` }]} />
      ))}
    </View>
  );
}

/** One line that says a reading could not be made. */
export function Failed({ on = "page" }: { on?: "fill" | "page" }) {
  return <Text style={[styles.failed, { color: on === "fill" ? onFill.text : color.ink }]}>Couldn't work this out. Go back and open it again.</Text>;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginTop: space.sm,
  },
  panel: { borderRadius: 16, padding: space.md, overflow: "hidden" },
  ghost: { gap: 10, paddingVertical: space.xs },
  ghostBar: { height: 14, borderRadius: 4 },
  failed: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14 },
});
