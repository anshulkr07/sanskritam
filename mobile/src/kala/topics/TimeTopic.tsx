// Time — what kāla means, and the idea under every other card: cycles that
// sit one inside another.
//
// The chart is five rings, the day innermost and the kalpa outermost, each
// filled to where this moment stands in it. They draw in on arrival.

import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, onFill, space } from "../../theme";
import { cycleRows, percentText } from "../basics";
import { FillButton, Steps, useArrival } from "../basicsUi";
import CycleRings from "../charts/CycleRings";
import { yearModel } from "../learn";
import { SPANS, WORDS } from "../sanskritNames";
import { Failed, Ghost, Panel, Sa, SectionLabel, useDeferred } from "../ui";
import type { TopicProps } from "./types";

const RING_LABELS = { day: "day", month: "month", year: "year", age: "Kali", kalpa: "kalpa" } as const;

export default function TimeTopic({ today, tone, width }: TopicProps) {
  const { snap, now } = today;
  const { sized } = useTypeScale();
  const nowRef = useRef(now);
  nowRef.current = now;
  const minute = Math.floor(now.getTime() / 60000);
  const { value: rows, failed } = useDeferred(() => (snap ? cycleRows(snap, nowRef.current, yearModel(nowRef.current)) : null), [snap, minute]);
  const { progress, play } = useArrival(rows !== null, 1600);

  if (failed) return <Failed />;
  if (!snap || !rows) return <Ghost lines={4} on="page" />;

  const size = Math.min(width - 2 * space.md, 320);

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <CycleRings size={size} rings={rows.map((r) => ({ label: RING_LABELS[r.key], fraction: r.fraction }))} progress={progress} ground={fill[tone]}>
            <Sa size={20} weight="bold" on="fill" style={styles.centreSa}>
              {WORDS.kala.nom}
            </Sa>
          </CycleRings>
        </View>
        {[...rows].reverse().map((r) => (
          <View
            key={r.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${r.title}, ${r.span}: ${r.fraction === null ? "no sunrise here today" : `${percentText(r.fraction)} gone`}.`}
          >
            <View style={styles.rowName}>
              <Sa size={18} on="fill">
                {r.name.nom}
              </Sa>
              <Text style={styles.rowTitle}>
                {r.title} · {r.span}
              </Text>
            </View>
            <Text style={styles.rowValue}>{r.fraction === null ? "none" : percentText(r.fraction)}</Text>
          </View>
        ))}
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Draw the rings again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Each ring is one turn of a cycle, from the top. The dot is now.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Kāla means time. The word comes from kal, to count.", terms: [WORDS.kala] },
          { text: "The Sūrya Siddhānta names two kinds of time: time that ends all things, and time that can be counted." },
          { text: "Counted time runs in cycles, each one inside a larger one." },
          { text: "The Sun makes the day, sunrise to sunrise, and the year. The Moon makes the tithi and the month.", terms: [WORDS.surya, WORDS.chandra] },
          { text: "Longer spans are counted in the Sun's years: the yuga, the manvantara and the kalpa.", terms: [WORDS.yuga, SPANS[1], SPANS[2]] },
          { text: "You are here, at the foot of the Kāla page, names this moment in each of them, largest first, like an address." },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center", marginBottom: space.xs },
  centreSa: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52, paddingVertical: 4, borderTopWidth: 1, borderTopColor: onFill.faint },
  rowName: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft, marginTop: -3 },
  rowValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, color: onFill.text },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
