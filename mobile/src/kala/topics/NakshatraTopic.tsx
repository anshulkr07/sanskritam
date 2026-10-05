// The stars — the 27 stretches of the Moon's path.
//
// On arrival the Moon travels the ring from the first star, Aśvinī, to the
// one it is in now. Touch or drag the ring to read each star. Then all 27.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import { SIDEREAL_MONTH_DAYS } from "../basics";
import { CellGrid, FillButton, ItemCell, NowLine, Steps, useArrival } from "../basicsUi";
import SegmentRing from "../charts/SegmentRing";
import { starAt } from "../learn";
import { NAKSHATRAS, WORDS } from "../sanskritNames";
import { romanName } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

const STARS = Array.from({ length: 27 }, (_, i) => ({ from: i / 27, to: (i + 1) / 27 }));

export default function NakshatraTopic({ today, tone, width }: TopicProps) {
  const { snap, now, whenText } = today;
  const { sized } = useTypeScale();
  const star = useMemo(() => (snap ? starAt(now) : null), [snap, now]);
  const [picked, setPicked] = useState<number | null>(null);
  const { progress, play } = useArrival(star !== null, 2200);

  if (!snap || !star) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const size = Math.min(width - 2 * space.md, 320);
  const moonAt = (star.longitude / 360) * progress;
  const travelling = Math.floor(moonAt * 27) % 27;
  const index = picked ?? (progress < 1 ? travelling : star.index);
  const name = NAKSHATRAS[index];

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={size}
            thickness={30}
            margin={8}
            segments={STARS}
            selected={index}
            onSelect={(i) => {
              if (i !== index) haptics.tap();
              setPicked(i);
            }}
            marker={moonAt}
            ground={fill[tone]}
            accessibilityLabel="The 27 stars on the Moon's path"
            valueText={`${romanName(name)}, ${index + 1} of 27${index === star.index ? ", where the Moon is now" : ""}`}
          >
            <Sa size={22} weight="bold" on="fill" style={styles.ringSa}>
              {name.nom}
            </Sa>
            <Text style={styles.ringRoman}>{romanName(name)}</Text>
            <Text style={[styles.ringCount, { color: label }]}>
              {index + 1} of 27{index === star.index && progress >= 1 ? " · Moon here" : ""}
            </Text>
          </SegmentRing>
        </View>
        <NowLine tone={tone}>{`The Moon is in ${romanName(NAKSHATRAS[star.index])}, star ${star.index + 1} of 27, until ${whenText(snap.nakshatra.end)}.`}</NowLine>
        <FillButton
          label="Play again"
          icon="refresh"
          onPress={() => {
            setPicked(null);
            play();
          }}
          accessibilityLabel="Send the Moon round again"
          style={styles.replay}
        />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The line is the Moon. Touch the ring to read each star.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Nakṣatra means a star. Here it is one of 27 stretches of the Moon's path, each named after its star.", terms: [WORDS.nakshatra] },
          { text: "Each stretch is 13° 20′ of the circle: 360° shared 27 ways." },
          { text: `The Moon goes round them all in about ${SIDEREAL_MONTH_DAYS.toFixed(1)} days, so it spends about a day in each.` },
          { text: "The star the Moon is in is the day's nakṣatra, one of the five limbs of the almanac." },
          { text: "The months take their names from these stars, by the one near their full moon." },
        ]}
      />

      <SectionLabel>The 27 stars</SectionLabel>
      <CellGrid>
        {NAKSHATRAS.map((n, i) => (
          <ItemCell
            key={n.iast}
            lead={String(i + 1)}
            sa={n.nom}
            roman={romanName(n)}
            now={i === star.index}
            nowLabel="Moon"
            accessibilityLabel={`${i + 1}. ${romanName(n)}.${i === star.index ? " The Moon is here now." : ""}`}
          />
        ))}
      </CellGrid>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  ringSa: { textAlign: "center" },
  ringRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft, textAlign: "center" },
  ringCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, marginTop: 2, textAlign: "center" },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
