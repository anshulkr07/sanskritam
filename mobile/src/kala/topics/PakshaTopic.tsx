// The two halves — the bright half and the dark half of a month.
//
// The Moon runs through the month's thirty tithis from the new moon to
// today's, growing and then shrinking, while a light moves along the strip
// of thirty: the bright half on the top row, the dark half under it.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, onFill, space } from "../../theme";
import { FillButton, NowLine, Steps, useArrival } from "../basicsUi";
import MoonGlyph from "../charts/MoonGlyph";
import { elongation, nextMoonPhase } from "../engine";
import { moonReading } from "../learn";
import { PAKSHAS, TITHIS, WORDS } from "../sanskritNames";
import { cap, ordinal } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

const SHADE = "rgba(0,0,0,0.34)";

export default function PakshaTopic({ today, tone }: TopicProps) {
  const { snap, now, whenText } = today;
  const { sized } = useTypeScale();
  const live = useMemo(() => (snap ? elongation(now) : null), [snap, now]);
  // The next full or new moon: looked up once a minute, not every frame.
  const next = useMemo(() => (live === null ? null : nextMoonPhase(now, moonReading(live).half === 0 ? 180 : 0)), [live, now]);
  const { progress, play } = useArrival(live !== null, 2400);

  if (!snap || live === null) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const angle = live * progress;
  const reading = moonReading(angle);
  const todayReading = moonReading(live);
  const halfName = (h: 0 | 1) => (h === 0 ? "bright" : "dark");

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.hero}>
          <MoonGlyph elongation={Math.max(0.5, angle)} size={112} lit={onFill.text} shade={SHADE} />
          <View style={styles.heroText} accessible accessibilityLabel={`The ${halfName(reading.half)} half, tithi ${reading.day} of 15. ${reading.litPercent} percent lit.`}>
            <Sa size={22} weight="bold" on="fill">
              {reading.pakshaSa}
            </Sa>
            <Text style={styles.heroRoman}>
              {cap(halfName(reading.half))} half · tithi {reading.day} of 15
            </Text>
            <Text style={[styles.lit, { color: label }]}>{reading.litPercent}% lit</Text>
          </View>
        </View>

        {[0, 1].map((h) => (
          <View key={h} style={styles.stripRow} accessible accessibilityLabel={`The ${halfName(h as 0 | 1)} half: fifteen tithis, the Moon ${h === 0 ? "growing" : "shrinking"}.`}>
            <Text style={[styles.stripLabel, { color: label }]}>{h === 0 ? "Bright" : "Dark"}</Text>
            <View style={styles.strip}>
              {Array.from({ length: 15 }, (_, i) => {
                const n = h * 15 + i + 1;
                const on = n === reading.tithi;
                const isToday = n === todayReading.tithi && progress >= 1;
                return <StripMoon key={n} tithi={n} ringed={on || isToday} />;
              })}
            </View>
          </View>
        ))}

        <NowLine tone={tone}>
          {`The ${halfName(todayReading.half)} half, tithi ${todayReading.day} of 15.${next ? ` ${todayReading.half === 0 ? "Full" : "New"} moon ${whenText(next)}.` : ""}`}
        </NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Run the month again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The ringed moon is the tithi now.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Pakṣa means a wing, or a side. A month has two: halves of fifteen tithis each.", terms: [WORDS.paksha] },
          { text: "Śukla pakṣa, the bright half, runs from new moon to full moon as the Moon grows.", terms: [PAKSHAS[0]] },
          { text: "Kṛṣṇa pakṣa, the dark half, runs from full moon back to new as it shrinks.", terms: [PAKSHAS[1]] },
          { text: "The Manusmṛti calls a month one day and night of the ancestors: the dark half their day, the bright half their night." },
          { text: `A date gives the half, then the tithi: ${PAKSHAS[1].iast} ${TITHIS[4].iast} is the ${ordinal(5)} of the dark half.` },
        ]}
      />
    </>
  );
}

/** One tithi on the strip. Kept apart so a frame of the run redraws only
 *  the two moons whose ring moved. */
const StripMoon = React.memo(function StripMoon({ tithi, ringed }: { tithi: number; ringed: boolean }) {
  return (
    <View style={[styles.dot, ringed && styles.dotOn]}>
      <MoonGlyph elongation={(tithi - 0.5) * 12} size={15} lit={onFill.text} shade={SHADE} />
    </View>
  );
});

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
  heroText: { flex: 1, minWidth: 0 },
  heroRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft, marginTop: -4 },
  lit: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, marginTop: 4 },
  stripRow: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingVertical: 5, borderTopWidth: 1, borderTopColor: onFill.faint },
  stripLabel: { width: 46, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  strip: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  dot: { width: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  dotOn: { borderColor: onFill.gold },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
