// The tithi — the time the Moon takes to gain 12 degrees on the Sun.
//
// On arrival the Moon runs from the new moon to where it is now, the wedge
// of its lead over the Sun opening behind it a tithi at a time. Drag the
// Moon to try any angle. Then the sixteen names, which are numbers.

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, onFill, space } from "../../theme";
import { tithiRows } from "../basics";
import { CellGrid, FillButton, ItemCell, NowLine, Steps, useArrival } from "../basicsUi";
import MoonOrbit from "../charts/MoonOrbit";
import { spanText } from "../clock";
import { elongation } from "../engine";
import { moonModel, moonReading, tithiGloss } from "../learn";
import { FULL_NEW, TITHIS, WORDS } from "../sanskritNames";
import { romanName } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred } from "../ui";
import type { TopicProps } from "./types";

export default function TithiTopic({ today, tone, width }: TopicProps) {
  const { snap, now, clockText } = today;
  const { sized } = useTypeScale();
  const live = useMemo(() => (snap ? elongation(now) : null), [snap, now]);
  const [held, setHeld] = useState<number | null>(null);
  const { progress, play } = useArrival(live !== null, 2200);
  const lastTithi = useRef(-1);
  const lunationStart = snap ? snap.lunation.start.getTime() : 0;
  const { value: month } = useDeferred(() => (snap ? moonModel(snap.lunation) : null), [lunationStart]);

  if (!snap || live === null) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const angle = held ?? live * progress;
  const reading = moonReading(angle);
  const orbit = Math.min(width - 2 * space.md, 320);
  const rows = tithiRows(snap.tithi.number);

  const moveTo = (deg: number) => {
    const t = Math.floor(deg / 12);
    if (t !== lastTithi.current) {
      lastTithi.current = t;
      haptics.tap();
    }
    setHeld(deg);
  };
  const step = (by: 1 | -1) => {
    const next = (((Math.floor(angle / 12) + by) % 30) + 30) % 30;
    setHeld(next * 12 + 6);
  };

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <MoonOrbit size={orbit} angle={angle} onAngle={moveTo} onStep={step} valueText={`${romanName(reading.name)}, ${tithiGloss(reading.tithi)}, ${Math.round(angle)} degrees`} />
        </View>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>Moon's lead</Text>
            <Text style={styles.factValue}>{Math.round(angle)}°</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>12° each</Text>
            <Text style={styles.factValue}>Tithi {reading.tithi}</Text>
          </View>
          <View style={[styles.fact, styles.factWide]}>
            <Sa size={19} on="fill" numberOfLines={1}>
              {reading.name.nom}
            </Sa>
          </View>
        </View>
        <NowLine tone={tone}>{`${tithiGloss(snap.tithi.number)}, ${romanName(rows.find((r) => r.now)?.name ?? TITHIS[0])}, until ${clockText(snap.tithi.end)}.`}</NowLine>
        <View style={styles.buttons}>
          <FillButton
            label="Play again"
            icon="refresh"
            onPress={() => {
              setHeld(null);
              play();
            }}
            accessibilityLabel="Run the Moon from the new moon again"
          />
          {held !== null && <FillButton label="Back to now" onPress={() => setHeld(null)} accessibilityLabel="Put the Moon back where it is now" />}
        </View>
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Drag the Moon round its ring. The wedge is its lead over the Sun.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "A tithi is a lunar day: the time the Moon takes to gain 12° on the Sun.", terms: [WORDS.tithi] },
          { text: "Seen from the Earth, the Moon pulls ahead of the Sun by about 12° a day." },
          { text: "From one new moon to the next it gains the whole 360°: thirty tithis." },
          {
            text: month
              ? `The Moon's speed changes, so tithis are not all one length. This month's run from ${spanText(month.shortest * 3600000)} to ${spanText(month.longest * 3600000)}.`
              : "The Moon's speed changes, so tithis are not all one length.",
          },
          { text: "Their names are numbers: pratipadā the first, dvitīyā the second, up to caturdaśī the 14th.", terms: [TITHIS[0], TITHIS[1], TITHIS[13]] },
          { text: "The fifteenth is pūrṇimā, the full moon, or amāvāsyā, the new moon: the night the Sun and Moon dwell together.", terms: [FULL_NEW[0], FULL_NEW[1]] },
          { text: "A day takes the name of the tithi running at its sunrise." },
        ]}
      />

      <SectionLabel>The sixteen names</SectionLabel>
      <CellGrid>
        {rows.map((r) => (
          <ItemCell
            key={r.key}
            lead={r.number}
            sa={r.name.nom}
            roman={r.roman}
            note={r.gloss}
            now={r.now}
            accessibilityLabel={`${r.roman}: ${r.gloss}.${r.now ? " The tithi now." : ""}`}
          />
        ))}
      </CellGrid>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  facts: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  fact: { minWidth: 0 },
  factWide: { flex: 1, alignItems: "flex-end" },
  factLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  factValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18, color: onFill.text },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
