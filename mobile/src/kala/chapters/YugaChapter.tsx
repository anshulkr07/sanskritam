// The yugas — the four ages, and where the present stands among them.
//
// The ring is one cycle of the four ages in their true proportions, 4:3:2:1.
// It draws itself in on arrival, and the marker shows how little of the last
// age has passed. Below it the same position is read at every scale, up to
// the kalpa.
//
// The numbers are the traditional ones (engine.ts cites where they were
// read). The only live value is the Kali year, from the calendar engine.

import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import SegmentRing from "../charts/SegmentRing";
import { KALPA_YEARS, YUGA_YEARS } from "../engine";
import { grouped, yugaModel } from "../learn";
import { ordinal } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel, useTween } from "../ui";
import type { ChapterProps } from "./types";

export default function YugaChapter({ today, tone, width }: ChapterProps) {
  const { snap } = today;
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { run } = useTween();
  const kali = snap ? snap.years.kali : null;
  const model = useMemo(() => (kali === null ? null : yugaModel(kali)), [kali]);
  const [picked, setPicked] = useState(3);

  // The ring draws in and the kalpa's count runs up, once, on arrival.
  const ready = model !== null;
  const [shown, setShown] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      setShown(1);
      return;
    }
    run(0, 1, 900, setShown);
  }, [ready, reduced, run]);

  if (!model) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const size = Math.min(width - 2 * space.md, 300);
  const yuga = model.yugas[picked];
  // Where now falls on the ring: a little way into the last age.
  const marker = model.yugas[3].from + (model.yugas[3].to - model.yugas[3].from) * model.kali01;

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={size}
            thickness={40}
            margin={10}
            segments={model.yugas.map((y) => ({ from: Math.min(y.from, shown), to: Math.min(y.to, shown) }))}
            selected={picked}
            onSelect={(i) => {
              if (i !== picked) haptics.tap();
              setPicked(i);
            }}
            marker={shown >= 1 ? marker : null}
            ground={fill[tone]}
            accessibilityLabel="The four ages of one cycle"
            valueText={`${yuga.roman}, ${grouped(yuga.years)} years`}
          >
            <Sa size={22} weight="bold" on="fill" style={styles.ringSa}>
              {yuga.name.nom}
            </Sa>
            <Text style={styles.ringRoman}>{yuga.roman}</Text>
            <Text style={[styles.ringYears, { color: label }]}>{grouped(yuga.years)} years</Text>
          </SegmentRing>
        </View>

        {model.yugas.map((y, i) => {
          const on = i === picked;
          return (
            <Pressable
              key={y.roman}
              onPress={() => {
                haptics.tap();
                setPicked(i);
              }}
              style={({ pressed }) => [styles.yugaRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${y.roman}: ${grouped(y.years)} years, ${y.share} parts of ten${i === 3 ? ". The age now" : ""}.`}
            >
              <Text style={[styles.share, on && { color: onFill.gold }]}>{y.share}</Text>
              <View style={styles.yugaText}>
                <Sa size={19} on="fill" style={on ? { color: onFill.gold } : undefined}>
                  {y.name.nom}
                </Sa>
                <Text style={styles.yugaRoman}>
                  {y.roman}
                  {i === 3 ? " · now" : ""}
                </Text>
              </View>
              <Text style={[styles.yugaYears, on && styles.picked]}>{grouped(y.years)}</Text>
            </Pressable>
          );
        })}
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>
        Lengths in years, as the Sūrya Siddhānta and the Bhāgavata Purāṇa count them. The line on the ring is now.
      </Text>

      <SectionLabel>Where we are</SectionLabel>
      <View style={styles.steps}>
        <Step
          title="Kali age"
          value={`${grouped(model.kali)} of ${grouped(YUGA_YEARS[3])} years`}
          note={`${grouped(model.kaliLeft)} years to go`}
          sized={sized}
        >
          <Bar share={model.kali01} tone={fill[tone]} />
        </Step>
        <Step title="Cycle of the four ages" value={`${ordinal(model.cycle.at)} of ${model.cycle.of}`} note="in this manvantara" sized={sized}>
          <Cells count={model.cycle.of} at={model.cycle.at} tone={fill[tone]} />
        </Step>
        <Step title="Manvantara" value={`${ordinal(model.manvantara.at)} of ${model.manvantara.of}`} note="in this kalpa" sized={sized}>
          <Cells count={model.manvantara.of} at={model.manvantara.at} tone={fill[tone]} />
        </Step>
        <Step
          title="Kalpa"
          value={`${grouped(Math.round(model.kalpaYears * shown))} years`}
          note={`of ${grouped(KALPA_YEARS)}`}
          sized={sized}
          label={`Kalpa: ${grouped(model.kalpaYears)} of ${grouped(KALPA_YEARS)} years.`}
        >
          <Bar share={model.kalpa01 * shown} tone={fill[tone]} />
        </Step>
      </View>

      <SectionLabel>Larger spans</SectionLabel>
      <View>
        {model.spans.map((s) => (
          <View key={s.roman} style={styles.spanRow} accessible accessibilityLabel={`${s.roman}: ${s.made}. ${grouped(s.years)} years.`}>
            <View style={styles.spanName}>
              <Sa size={20}>{s.name.nom}</Sa>
              <Text style={styles.spanRoman}>{s.name.iast}</Text>
            </View>
            <View style={styles.spanText}>
              <Text style={[styles.spanMade, { fontSize: sized(14) }]}>{s.made}</Text>
              <Text style={[styles.spanYears, { fontSize: sized(13) }]}>{grouped(s.years)} years</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function Step({
  title,
  value,
  note,
  sized,
  label,
  children,
}: {
  title: string;
  value: string;
  note: string;
  sized: (pt: number) => number;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View accessible accessibilityLabel={label ?? `${title}: ${value}, ${note}.`}>
      <View style={styles.stepHead}>
        <Text style={[styles.stepTitle, { fontSize: sized(14) }]}>{title}</Text>
        <Text style={[styles.stepValue, { fontSize: sized(14) }]}>{value}</Text>
      </View>
      {children}
      <Text style={[styles.stepNote, { fontSize: sized(12.5) }]}>{note}</Text>
    </View>
  );
}

/** A bar filled to a share of its width. A sliver stays visible. */
function Bar({ share, tone }: { share: number; tone: string }) {
  const pct = Math.min(100, Math.max(0, share * 100));
  return (
    <View style={styles.track}>
      <View style={{ height: 12, borderRadius: 3, backgroundColor: tone, width: `${pct}%`, minWidth: share > 0 ? 3 : 0 }} />
    </View>
  );
}

/** A run of equal cells: those gone, the one now, those to come. The one
 *  now is taller as well as another colour. */
function Cells({ count, at, tone }: { count: number; at: number; tone: string }) {
  return (
    <View style={styles.cells}>
      {Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        return (
          <View
            key={n}
            style={[
              styles.cell,
              { backgroundColor: n < at ? tone : n === at ? color.saffron : color.border },
              n === at && styles.cellNow,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  ringSa: { textAlign: "center" },
  ringRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.soft, textAlign: "center" },
  ringYears: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, marginTop: 2 },
  yugaRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56, paddingVertical: 4, borderTopWidth: 1, borderTopColor: onFill.faint },
  pressed: { opacity: 0.75 },
  share: { width: 28, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 26, color: onFill.text, textAlign: "center" },
  yugaText: { flex: 1, minWidth: 0 },
  yugaRoman: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, color: onFill.soft },
  yugaYears: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.text },
  // Colour is never the only signal: the picked row is underlined too.
  picked: { color: onFill.gold, textDecorationLine: "underline" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  steps: { gap: space.md },
  stepHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm, marginBottom: 5 },
  stepTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  stepValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, flexShrink: 1, textAlign: "right" },
  stepNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: 3 },
  track: { height: 12, borderRadius: 3, backgroundColor: color.border, overflow: "hidden" },
  cells: { flexDirection: "row", alignItems: "center", height: 18, gap: 1 },
  cell: { flex: 1, height: 12, borderRadius: 1 },
  cellNow: { height: 18 },

  spanRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 62, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.border },
  spanName: { minWidth: 112 },
  spanRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: color.inkSoft, fontStyle: "italic" },
  spanText: { flex: 1, minWidth: 0 },
  spanMade: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  spanYears: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft },
});
