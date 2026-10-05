// Shared pieces of the Kāla basics cards (kala/topics/*).
//
// Look rule (HANDOVER section 2): a coloured surface is a deep solid fill
// with cream text; everything else sits on the cream page with hairlines.
// Sanskrit is never below 18pt. Colour is never the only signal: the item
// "now" is set on a dark fill and also carries the word "now".

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { haptics } from "../services/haptics";
import { color, fill, onFill, space, type FillName } from "../theme";
import type { SanskritName } from "./sanskritNames";
import { romanName } from "./today";
import { labelOn, Sa, useTween } from "./ui";

/** A chart that plays once when its reading is ready, and again on asking:
 *  `progress` runs 0 to 1 over `ms`. Under Reduce Motion it stands at 1. */
export function useArrival(ready: boolean, ms: number) {
  const reduced = useReducedMotion();
  const { run } = useTween();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const play = useCallback(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    run(0, 1, ms, setProgress);
  }, [reduced, run, ms]);
  useEffect(() => {
    if (ready) play();
  }, [ready, play]);
  return { progress, play, reduced };
}

export interface StepItem {
  text: string;
  /** Words the step teaches, shown under it in Devanagari and roman. */
  terms?: SanskritName[];
}

/** Numbered short steps, one idea each, on the cream page. */
export function Steps({ steps, tone }: { steps: StepItem[]; tone: FillName }) {
  const { sized } = useTypeScale();
  return (
    <View>
      {steps.map((s, i) => (
        <View
          key={i}
          style={[styles.step, i === steps.length - 1 && styles.stepLast]}
          accessible
          accessibilityLabel={`${i + 1}. ${s.text}${s.terms && s.terms.length ? ` ${s.terms.map((t) => romanName(t)).join(", ")}.` : ""}`}
        >
          <View style={[styles.stepNumber, { backgroundColor: fill[tone] }]}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <View style={styles.stepBody}>
            <Text style={[styles.stepText, { fontSize: sized(15.5), lineHeight: Math.round(sized(15.5) * 1.45) }]}>{s.text}</Text>
            {s.terms && s.terms.length > 0 && (
              <View style={styles.terms}>
                {s.terms.map((t) => (
                  <View key={t.dev} style={styles.term}>
                    <Sa size={19}>{t.nom}</Sa>
                    <Text style={styles.termRoman}>{romanName(t)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** The live reading at the foot of a card's chart. */
export function NowLine({ tone, label = "Now", children }: { tone: FillName; label?: string; children: string }) {
  const { sized } = useTypeScale();
  return (
    <View style={styles.now}>
      <Text style={[styles.nowLabel, { color: labelOn(tone) }]}>{label}</Text>
      <Text style={[styles.nowText, { fontSize: sized(15), lineHeight: Math.round(sized(15) * 1.4) }]}>{children}</Text>
    </View>
  );
}

/** An outlined button on a deep fill: replays a chart's animation, or steps
 *  it. At least 44dp tall. */
export function FillButton({
  label,
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [label ? styles.fillButton : styles.fillRound, disabled && styles.off, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      {icon && <Ionicons name={icon} size={label ? 18 : 22} color={onFill.text} />}
      {!!label && <Text style={styles.fillButtonText}>{label}</Text>}
    </Pressable>
  );
}

/** One member of a set (a month, a Manu, a star) on the cream page. The one
 *  running now sits on a dark fill and says "now". */
export function ItemCell({
  lead,
  sa,
  roman,
  note,
  now,
  nowLabel = "now",
  onPress,
  selected = false,
  accessibilityLabel,
  style,
}: {
  /** A number or a short word before the name. */
  lead?: string;
  sa: string;
  roman: string;
  note?: string;
  now: boolean;
  nowLabel?: string;
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { sized } = useTypeScale();
  const body = (
    <>
      <View style={styles.cellTop}>
        {!!lead && <Text style={[styles.cellLead, now && styles.onDark]}>{lead}</Text>}
        {now && <Text style={styles.cellNow}>{nowLabel}</Text>}
      </View>
      <Sa size={19} style={now ? styles.onDark : undefined}>
        {sa}
      </Sa>
      <Text style={[styles.cellRoman, { fontSize: sized(13) }, now && styles.onDark]} numberOfLines={2}>
        {roman}
      </Text>
      {!!note && (
        <Text style={[styles.cellNote, { fontSize: sized(12.5) }, now && styles.onDarkSoft]} numberOfLines={3}>
          {note}
        </Text>
      )}
    </>
  );
  // One column at the largest text sizes, so nothing is cut short.
  const wide = sized(16) >= 24;
  const frame = [styles.cell, wide && styles.cellWide, now && styles.cellOn, selected && !now && styles.cellPicked, style];
  if (!onPress) {
    return (
      <View style={frame} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [...frame, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Pressable>
  );
}

/** Lays cells out in two columns (one at the largest text sizes). */
export function CellGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  stepLast: { borderBottomWidth: 0 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumberText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.text },
  stepBody: { flex: 1, minWidth: 0 },
  stepText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  terms: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: 2, marginTop: 4 },
  term: { minWidth: 0 },
  termRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: color.inkSoft, fontStyle: "italic", marginTop: -4 },

  now: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  nowLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  nowText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: onFill.text },

  fillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: onFill.text,
  },
  fillRound: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: onFill.text, alignItems: "center", justifyContent: "center" },
  fillButtonText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14.5, color: onFill.text },
  off: { opacity: 0.4 },
  pressed: { opacity: 0.75 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  cell: { width: "48.5%", minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: color.border, paddingHorizontal: 10, paddingVertical: 8 },
  cellWide: { width: "100%" },
  cellOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  cellPicked: { borderColor: color.ink, borderWidth: 2 },
  cellTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 16 },
  cellLead: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, color: color.inkSoft },
  cellNow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: fill.ink,
    backgroundColor: onFill.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  cellRoman: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, marginTop: -2 },
  cellNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: 1 },
  onDark: { color: onFill.text },
  onDarkSoft: { color: onFill.soft },
});
