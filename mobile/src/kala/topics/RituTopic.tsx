// The seasons — six of two months each, this year's laid out on a wheel.
//
// The wheel is this lunar year, Caitra at the top, cut into its six seasons
// at their true lengths (a season with an added month is longer). It draws
// in on arrival; touch it to read each season. The line is now.

import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import { rituSpans } from "../basics";
import { CellGrid, FillButton, ItemCell, NowLine, Steps, useArrival } from "../basicsUi";
import SegmentRing from "../charts/SegmentRing";
import { dateTextFor } from "../clock";
import { rituOfMonth } from "../engine";
import { monthLabel, RITUS_EN, yearModel } from "../learn";
import { MONTHS, RITUS, WORDS } from "../sanskritNames";
import { cap, romanName } from "../today";
import { Failed, Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred } from "../ui";
import type { TopicProps } from "./types";

export default function RituTopic({ today, tone, width }: TopicProps) {
  const { snap, now } = today;
  const { sized } = useTypeScale();
  const nowRef = useRef(now);
  nowRef.current = now;
  const lunationStart = snap ? snap.lunation.start.getTime() : 0;
  const { value: year, failed } = useDeferred(() => (snap ? yearModel(nowRef.current) : null), [lunationStart]);
  const [picked, setPicked] = useState<number | null>(null);
  const { progress, play } = useArrival(year !== null, 1300);

  if (failed) return <Failed />;
  if (!snap || !year) return <Ghost lines={4} on="page" />;

  const spans = rituSpans(year);
  const ritu = rituOfMonth(snap.lunation.month);
  const current = Math.max(0, spans.findIndex((s) => s.ritu === ritu && now.getTime() >= s.start.getTime() && now.getTime() < s.end.getTime()));
  const index = Math.min(spans.length - 1, picked ?? current);
  const span = spans[index];
  const label = labelOn(tone);
  const dateText = dateTextFor(snap.place.tz, now);
  const size = Math.min(width - 2 * space.md, 300);
  const marker = Math.min(1, Math.max(0, (now.getTime() - year.start.getTime()) / (year.end.getTime() - year.start.getTime())));
  const name = RITUS[span.ritu];

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={size}
            thickness={36}
            margin={10}
            segments={spans.map((s) => ({ from: Math.min(s.from, progress), to: Math.min(s.to, progress) }))}
            selected={index}
            onSelect={(i) => {
              if (i !== index) haptics.tap();
              setPicked(i);
            }}
            marker={progress >= 1 ? marker : null}
            ground={fill[tone]}
            accessibilityLabel="The six seasons of this year"
            valueText={`${romanName(name)}, ${RITUS_EN[span.ritu]}${index === current ? ", the season now" : ""}`}
          >
            <Sa size={22} weight="bold" on="fill" style={styles.ringSa}>
              {name.nom}
            </Sa>
            <Text style={styles.ringRoman}>{romanName(name)}</Text>
            <Text style={[styles.ringCount, { color: label }]}>
              {RITUS_EN[span.ritu]}
              {index === current ? " · now" : ""}
            </Text>
          </SegmentRing>
        </View>

        <View style={styles.detail} accessible accessibilityLabel={`${romanName(name)}: ${span.months.map((m) => monthLabel(m).roman).join(" and ")}. ${dateText(span.start)} to ${dateText(span.end)}.`}>
          <Text style={[styles.detailLabel, { color: label }]}>Its months this year</Text>
          <View style={styles.months}>
            {span.months.map((m) => (
              <View key={m.start.getTime()} style={styles.month}>
                <Sa size={18} on="fill">
                  {monthLabel(m).sa}
                </Sa>
                <Text style={styles.monthRoman}>{monthLabel(m).roman}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.detailValue}>
            {dateText(span.start)} to {dateText(span.end)}
          </Text>
        </View>

        <NowLine tone={tone}>{`${romanName(RITUS[ritu])}, ${RITUS_EN[ritu].toLowerCase()}, until ${dateText(spans[current].end)}.`}</NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Draw the wheel again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>This lunar year from {cap(MONTHS[0].iast)}, at the top. Touch the wheel to read each season.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Ṛtu means a season, a set time of the year. Later texts count six.", terms: [WORDS.ritu] },
          { text: `Each takes two months, starting with ${romanName(RITUS[0])}, spring, in ${cap(MONTHS[0].iast)} and ${cap(MONTHS[1].iast)}.`, terms: [RITUS[0]] },
          { text: "When a month is added, its season holds three." },
          { text: "In Sanskrit the rains are plural: varṣāḥ, the rains.", terms: [RITUS[2]] },
          { text: "Here a season follows the new-moon month, as Drik Panchang's Vedic ritu does." },
          { text: "So in a calendar that ends its months at the full moon, the season changes half way through a month, at the new moon." },
        ]}
      />

      <SectionLabel>The six seasons</SectionLabel>
      <CellGrid>
        {RITUS.map((r, i) => (
          <ItemCell
            key={r.iast}
            lead={String(i + 1)}
            sa={r.nom}
            roman={`${romanName(r)} · ${RITUS_EN[i]}`}
            note={`${cap(MONTHS[2 * i].iast)} and ${cap(MONTHS[2 * i + 1].iast)}`}
            now={i === ritu}
            accessibilityLabel={`${i + 1}. ${romanName(r)}, ${RITUS_EN[i]}: ${cap(MONTHS[2 * i].iast)} and ${cap(MONTHS[2 * i + 1].iast)}.${i === ritu ? " The season now." : ""}`}
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
  detail: { marginTop: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  detailLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  months: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md },
  month: { minWidth: 0 },
  monthRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft, marginTop: -4 },
  detailValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14.5, color: onFill.text, marginTop: 4 },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
