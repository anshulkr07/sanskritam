// The Sun's two halves — uttarāyaṇa and dakṣiṇāyana.
//
// The chart is this year's Sun, swinging north and south of the equator.
// It turns at the solstices; the almanac's halves turn when it enters
// Makara and Karka, some 24 or 25 days later. Drik Panchang prints both (its
// "Drik Ayana" and "Vedic Ayana"); You are here shows the almanac's.

import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, onFill, space } from "../../theme";
import { ayanaModel } from "../basics";
import { FillButton, NowLine, Steps, useArrival } from "../basicsUi";
import SunSwing from "../charts/SunSwing";
import { dateTextFor } from "../clock";
import { AYANAS, RASHIS, WORDS } from "../sanskritNames";
import { romanName } from "../today";
import { Failed, Ghost, Panel, SectionLabel, useDeferred } from "../ui";
import type { TopicProps } from "./types";

export default function AyanaTopic({ today, tone, width }: TopicProps) {
  const { snap, now } = today;
  const { sized } = useTypeScale();
  const nowRef = useRef(now);
  nowRef.current = now;
  const hour = Math.floor(now.getTime() / 3600000);
  const { value: model, failed } = useDeferred(() => (snap ? ayanaModel(nowRef.current) : null), [snap !== null, hour]);
  const { progress, play } = useArrival(model !== null, 1800);

  if (failed) return <Failed />;
  if (!snap || !model) return <Ghost lines={4} on="page" />;

  const dateText = dateTextFor(snap.place.tz, now);
  const north = romanName(AYANAS[0]);
  const south = romanName(AYANAS[1]);
  const makara = romanName(RASHIS[9]);
  const karka = romanName(RASHIS[3]);
  const half = model.almanac === 0 ? north : south;
  const june = model.turns.find((t) => t.north);
  const december = model.turns.find((t) => !t.north);
  const entryMakara = model.entries.find((e) => e.sign === 9);
  const entryKarka = model.entries.find((e) => e.sign === 3);
  const nextHalf = model.nextAlmanac.sign === 9 ? north : south;
  const agree = model.almanac === model.sun;
  const nowText = agree
    ? `${half}: the Sun is going ${model.sun === 0 ? "north" : "south"}. It turns on ${dateText(model.nextSun.at)}, and ${nextHalf} begins with ${romanName(RASHIS[model.nextAlmanac.sign])} on ${dateText(model.nextAlmanac.at)}.`
    : `${half} by the almanac, though the Sun has already turned ${model.sun === 0 ? "north" : "south"}. ${nextHalf} begins with ${romanName(RASHIS[model.nextAlmanac.sign])} on ${dateText(model.nextAlmanac.at)}.`;

  return (
    <>
      <Panel tone={tone}>
        <SunSwing width={width - 2 * space.md} model={model} progress={progress} ground={fill[tone]} entryLabels={[makara, karka]} />
        <View style={styles.legend}>
          {entryMakara && entryKarka && (
            <View style={styles.legendRow} accessible accessibilityLabel={`Shaded: ${north} by the almanac, from the Sun's entry into ${makara} on ${dateText(entryMakara.at)} to its entry into ${karka} on ${dateText(entryKarka.at)}.`}>
              <View style={styles.swatch} />
              <Text style={styles.legendText}>
                {north} by the almanac: {makara} {dateText(entryMakara.at)} to {karka} {dateText(entryKarka.at)}
              </Text>
            </View>
          )}
          {june && december && (
            <View style={styles.legendRow} accessible accessibilityLabel={`Rings: the Sun turns, on ${dateText(june.at)} and ${dateText(december.at)}.`}>
              <View style={styles.ring} />
              <Text style={styles.legendText}>
                The Sun turns: {dateText(june.at)} and {dateText(december.at)}
              </Text>
            </View>
          )}
        </View>
        <NowLine tone={tone}>{nowText}</NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Run the Sun along the year again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>How far north or south of the equator the Sun stands through {model.start.getUTCFullYear()}.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Ayana means a going, a course: here, the Sun's course through the year.", terms: [WORDS.ayana] },
          { text: "For half the year the Sun rises a little further north each morning, then for half a little further south." },
          { text: `${north} is the northward half. ${south} is the southward half.`, terms: [AYANAS[0], AYANAS[1]] },
          { text: "The Manusmṛti calls a year one day and night of the gods: the northward half their day, the southward half their night." },
          { text: "The Sun itself turns at the solstices, about 21 June and 21 December." },
          { text: `Almanacs begin each half when the Sun enters ${makara} or ${karka}, about ${model.lagDays} days later. Drik Panchang gives both.`, terms: [RASHIS[9], RASHIS[3]] },
          { text: "You are here shows the almanac's half." },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  legend: { gap: 6, marginTop: space.xs },
  legendRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: { width: 22, height: 12, borderRadius: 2, backgroundColor: "rgba(242,200,121,0.45)", borderWidth: 1, borderColor: onFill.gold },
  ring: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: onFill.text, marginHorizontal: 5 },
  legendText: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, lineHeight: 17, color: onFill.text },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
