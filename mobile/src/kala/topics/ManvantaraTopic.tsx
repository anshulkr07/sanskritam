// The manvantara — the age of one Manu, fourteen of them to a kalpa.
//
// The ring is the kalpa's fourteen Manus. It draws itself in on arrival;
// touch or drag it to read each Manu's name. Those gone are bright, the
// seventh is now (the line), those to come are faint. Under it, the 71
// cycles of the four ages in this Manu's age fill up to the 28th.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import { MANU_NOW, manuRows } from "../basics";
import { CellGrid, FillButton, ItemCell, NowLine, Steps, useArrival } from "../basicsUi";
import SegmentRing from "../charts/SegmentRing";
import { yugaModel } from "../learn";
import { MANUS, SPANS, WORDS } from "../sanskritNames";
import { ordinal } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

const ROWS = manuRows();

export default function ManvantaraTopic({ today, tone, width }: TopicProps) {
  const { snap } = today;
  const { sized } = useTypeScale();
  const kali = snap ? snap.years.kali : null;
  const ages = useMemo(() => (kali === null ? null : yugaModel(kali)), [kali]);
  const [picked, setPicked] = useState(MANU_NOW - 1);
  const { progress, play } = useArrival(ages !== null, 1500);

  if (!ages) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const size = Math.min(width - 2 * space.md, 300);
  const row = ROWS[picked];
  // Where now falls: into the seventh piece by the cycles gone.
  const within = (ages.cycle.at - 1 + ages.cycle01) / ages.cycle.of;
  const marker = (MANU_NOW - 1 + within) / 14;
  const shown = progress * 14;
  const filled = Math.round((ages.cycle.at - 1) * progress);

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={size}
            thickness={34}
            margin={10}
            segments={ROWS.map((r, i) => ({ from: Math.min(i, shown) / 14, to: Math.min(i + 1, shown) / 14, strong: r.state === "gone" }))}
            selected={picked}
            onSelect={(i) => {
              if (i !== picked) haptics.tap();
              setPicked(i);
            }}
            marker={progress >= 1 ? marker : null}
            ground={fill[tone]}
            accessibilityLabel="The fourteen Manus of a kalpa"
            valueText={`${row.roman}, the ${ordinal(row.number)} Manu, ${row.state === "now" ? "the present one" : row.state === "gone" ? "gone" : "to come"}`}
          >
            <Sa size={21} weight="bold" on="fill" style={styles.ringSa}>
              {row.name.nom}
            </Sa>
            <Text style={styles.ringRoman} numberOfLines={1}>
              {row.roman}
            </Text>
            <Text style={[styles.ringCount, { color: label }]}>
              {ordinal(row.number)} of 14{row.state === "now" ? " · now" : row.state === "gone" ? " · gone" : " · to come"}
            </Text>
          </SegmentRing>
        </View>

        <View style={styles.cyclesHead}>
          <Text style={[styles.cyclesTitle, { color: label }]}>This Manu's cycles</Text>
          <Text style={styles.cyclesValue}>
            {ordinal(ages.cycle.at)} of {ages.cycle.of}
          </Text>
        </View>
        <View style={styles.cells} accessible accessibilityLabel={`In this manvantara, ${ages.cycle.at - 1} of 71 cycles of the four ages are over. This is the ${ordinal(ages.cycle.at)}.`}>
          {Array.from({ length: ages.cycle.of }, (_, i) => {
            const n = i + 1;
            const now = n === ages.cycle.at && progress >= 1;
            return <View key={n} style={[styles.cell, { backgroundColor: n <= filled ? onFill.text : now ? onFill.gold : onFill.faint }, now && styles.cellNow]} />;
          })}
        </View>

        <NowLine tone={tone}>{`The age of ${ROWS[MANU_NOW - 1].roman}, the ${ordinal(MANU_NOW)} Manu: cycle ${ages.cycle.at} of ${ages.cycle.of}.`}</NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Draw the ring again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Touch the ring to read each Manu's name. The line is now.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "A Manu is a forefather and ruler of humankind. Fourteen follow one another in each kalpa.", terms: [WORDS.manu] },
          { text: "A manvantara is the age of one Manu: 71 cycles of the four ages, 306,720,000 years.", terms: [SPANS[1]] },
          { text: "A junction as long as the first age comes before the first Manu and after each one." },
          { text: "Six Manus have gone. This is the age of the seventh, Vaivasvata, son of Vivasvat, the Sun.", terms: [MANUS[6]] },
          { text: `Of his 71 cycles, ${ages.cycle.at - 1} are over. We are in the ${ordinal(ages.cycle.at)}.` },
          { text: "Seven Manus are still to come, the first of them Sāvarṇi.", terms: [MANUS[7]] },
        ]}
      />

      <SectionLabel>The fourteen Manus</SectionLabel>
      <CellGrid>
        {ROWS.map((r) => (
          <ItemCell
            key={r.number}
            lead={String(r.number)}
            sa={r.name.nom}
            roman={r.roman}
            note={r.state === "gone" ? "Gone" : r.state === "coming" ? "To come" : undefined}
            now={r.state === "now"}
            accessibilityLabel={`${r.number}. ${r.roman}. ${r.state === "now" ? "The present Manu" : r.state === "gone" ? "Gone" : "To come"}.`}
          />
        ))}
      </CellGrid>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  ringSa: { textAlign: "center" },
  ringRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.soft, textAlign: "center" },
  ringCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, marginTop: 2, textAlign: "center" },
  cyclesHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  cyclesTitle: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  cyclesValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, color: onFill.text },
  cells: { flexDirection: "row", alignItems: "center", height: 20, gap: 1, marginTop: 6 },
  cell: { flex: 1, height: 12, borderRadius: 1 },
  cellNow: { height: 20 },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
