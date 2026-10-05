// The weekday — seven days named after seven lights in the sky, and the
// Sūrya Siddhānta's rule that puts them in the order of the week.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, space } from "../../theme";
import { GRAHAS_EN, weekdayRows } from "../basics";
import { CellGrid, FillButton, ItemCell, NowLine, Steps, useArrival } from "../basicsUi";
import WeekStar from "../charts/WeekStar";
import { WEEKDAYS, WORDS } from "../sanskritNames";
import { romanName, WEEKDAYS_EN } from "../today";
import { Ghost, Panel, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

const ROWS = weekdayRows();

export default function VaraTopic({ today, tone, width }: TopicProps) {
  const { snap, clockText } = today;
  const { sized } = useTypeScale();
  const { progress, play } = useArrival(snap !== null, 2800);

  if (!snap) return <Ghost lines={4} on="page" />;

  const w = snap.weekday;
  const size = Math.min(width - 2 * space.md, 320);

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <WeekStar size={size} today={w} progress={progress} ground={fill[tone]} />
        </View>
        <NowLine tone={tone}>
          {`${romanName(WEEKDAYS[w])}, ${WEEKDAYS_EN[w]}: the day of ${GRAHAS_EN[w].replace(/^The /, "the ")}.${snap.dayEnd ? ` It turns at sunrise, ${clockText(snap.dayEnd)}.` : ""}`}
        </NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Draw the star again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>
        Round the circle from the top: the seven from the highest down. The line takes every fourth, and meets them in the order of the week.
      </Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Vāra means a turn: a day of the week.", terms: [WORDS.vara] },
          { text: `Each day is named after one of seven lights in the sky, with vāsara, day: ${romanName(WEEKDAYS[0])} is the Sun's day.`, terms: [WORDS.vasara, WEEKDAYS[0]] },
          { text: "The Sūrya Siddhānta lists the seven from the highest down: Saturn, Jupiter, Mars, the Sun, Venus, Mercury, the Moon." },
          { text: "The lords of the hours run down that list in turn. The lord of each day is the fourth on from the last, counting the last as one." },
          { text: "From Saturn, the fourth is the Sun; from the Sun, the Moon; then Mars, Mercury, Jupiter, Venus, and Saturn again. That is the week." },
          { text: "Twenty-four hours carry the hour lords the same four places on, so the two counts agree." },
          { text: "In the almanac a day runs from sunrise to sunrise, so the weekday turns at sunrise, not at midnight." },
        ]}
      />

      <SectionLabel>The seven days</SectionLabel>
      <CellGrid>
        {ROWS.map((r) => (
          <ItemCell
            key={r.weekday}
            lead={WEEKDAYS_EN[r.weekday]}
            sa={WEEKDAYS[r.weekday].nom}
            roman={romanName(WEEKDAYS[r.weekday])}
            note={`Day of ${r.grahaEn.replace(/^The /, "the ")}, ${romanName(r.graha)}`}
            now={r.weekday === w}
            nowLabel="today"
            accessibilityLabel={`${WEEKDAYS_EN[r.weekday]}: ${romanName(WEEKDAYS[r.weekday])}, the day of ${r.grahaEn.replace(/^The /, "the ")}.${r.weekday === w ? " Today." : ""}`}
          />
        ))}
      </CellGrid>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
