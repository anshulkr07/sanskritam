// The yugas — four ages named after the four throws of a die.
//
// Four dice fall in turn, showing four, three, two and one, each with its
// age's name; then each age's length grows out under it in the same 4 : 3 :
// 2 : 1. The last, Kali, is now.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { BounceInDown } from "react-native-reanimated";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, onFill, space } from "../../theme";
import { FillButton, NowLine, Steps, useArrival } from "../basicsUi";
import { grouped, yugaModel } from "../learn";
import { SPANS, WORDS, YUGAS } from "../sanskritNames";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

/** Where the dots sit on a die face, by count, in a 3 x 3 grid. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
};

const DIE = 54;

function Die({ dots, pip }: { dots: number; pip: string }) {
  const cell = DIE / 3;
  return (
    <View style={styles.die}>
      {PIPS[dots].map(([x, y]) => (
        <View key={`${x}${y}`} style={[styles.pip, { backgroundColor: pip, left: x * cell + cell / 2 - 5.5, top: y * cell + cell / 2 - 5.5 }]} />
      ))}
    </View>
  );
}

export default function YugaTopic({ today, tone }: TopicProps) {
  const { snap } = today;
  const { sized } = useTypeScale();
  const kali = snap ? snap.years.kali : null;
  const model = useMemo(() => (kali === null ? null : yugaModel(kali)), [kali]);
  const { progress, play, reduced } = useArrival(model !== null, 2000);
  const [throwKey, setThrowKey] = useState(0);

  if (!model) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  // The bars wait for the dice: they grow over the second half of the run.
  const grow = reduced ? 1 : Math.max(0, Math.min(1, (progress - 0.35) / 0.65));

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.dice} accessible accessibilityLabel="Four dice: four dots for Kṛta, three for Tretā, two for Dvāpara, one for Kali.">
          {model.yugas.map((y, i) => (
            <Animated.View key={`${y.roman}${throwKey}`} entering={reduced ? undefined : BounceInDown.delay(i * 220).duration(700)} style={styles.dieColumn}>
              <Die dots={y.share} pip={fill[tone]} />
              <Text style={styles.dieName}>{y.roman.replace(/yuga$/, "")}</Text>
              <Text style={[styles.dieShare, { color: label }]}>
                {y.share} {y.share === 1 ? "dot" : "dots"}
              </Text>
            </Animated.View>
          ))}
        </View>

        {model.yugas.map((y, i) => (
          <View key={y.roman} style={styles.ageRow} accessible accessibilityLabel={`${y.roman}: ${grouped(y.years)} years, ${y.share} parts of ten${i === 3 ? ". The age now" : ""}.`}>
            <View style={styles.ageHead}>
              <Sa size={19} on="fill" style={i === 3 ? { color: onFill.gold } : undefined}>
                {y.name.nom}
              </Sa>
              <Text style={[styles.ageYears, i === 3 && styles.now]}>
                {grouped(y.years)}
                {i === 3 ? " · now" : ""}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(y.share / 4) * 100 * grow}%`, backgroundColor: i === 3 ? onFill.gold : onFill.text }]} />
            </View>
          </View>
        ))}

        <NowLine tone={tone}>{`The Kali age, year ${grouped(model.kali)} of ${grouped(model.yugas[3].years)}. ${grouped(model.kaliLeft)} to go.`}</NowLine>
        <FillButton
          label="Throw again"
          icon="refresh"
          onPress={() => {
            setThrowKey((k) => k + 1);
            play();
          }}
          accessibilityLabel="Throw the dice again"
          style={styles.replay}
        />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Lengths in years, as the Sūrya Siddhānta and the Bhāgavata Purāṇa count them.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "A yuga is an age. Four ages make one cycle, a mahāyuga.", terms: [WORDS.yuga, SPANS[0]] },
          { text: "The ages are named after the four throws of a die, the sides marked with four, three, two and one dots." },
          { text: "Their lengths keep the same ratio, 4 : 3 : 2 : 1. Together they make 4,320,000 years." },
          { text: "The Manusmṛti says dharma stands on four feet in the first age, and loses one foot in each age after it." },
          { text: "We live in the last age, Kali. It began in 3102 BCE and lasts 432,000 years.", terms: [YUGAS[3]] },
          { text: `${grouped(model.kali)} of its years have gone. ${grouped(model.kaliLeft)} remain.` },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dice: { flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm },
  dieColumn: { flex: 1, alignItems: "center", gap: 4 },
  die: { width: DIE, height: DIE, borderRadius: 12, backgroundColor: onFill.text },
  pip: { position: "absolute", width: 11, height: 11, borderRadius: 6 },
  dieName: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.text, marginTop: 4 },
  dieShare: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11.5 },

  ageRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: onFill.faint },
  ageHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  ageYears: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.text },
  // Colour is never the only signal: the age now also says so.
  now: { color: onFill.gold },
  track: { height: 10, borderRadius: 3, backgroundColor: onFill.faint, overflow: "hidden", marginTop: 2 },
  bar: { height: 10, borderRadius: 3 },
  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
