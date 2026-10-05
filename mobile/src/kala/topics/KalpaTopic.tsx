// The kalpa — a day of Brahmā, and where in that day this moment falls.
//
// The chart is Brahmā's day as a sky: the Sun climbs from dawn to where the
// present stands, a little short of noon, over the fourteen Manus' ages.
// Under it, his hundred-year life with its two halves, and the kalpa's name
// taken apart.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { color, fill, onFill, space } from "../../theme";
import { brahmaModel, MANU_NOW, percentText } from "../basics";
import { FillButton, NowLine, Steps, useArrival } from "../basicsUi";
import BrahmaDay from "../charts/BrahmaDay";
import { grouped } from "../learn";
import { SPANS, WORDS } from "../sanskritNames";
import { cap, ordinal } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

export default function KalpaTopic({ today, tone, width }: TopicProps) {
  const { snap } = today;
  const { sized } = useTypeScale();
  const model = snap ? brahmaModel(snap.years.kali) : null;
  const { progress, play } = useArrival(model !== null, 1800);

  if (!snap || !model) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const inner = width - 2 * space.md;
  const gone = Math.round(model.yearsGone * progress);

  return (
    <>
      <Panel tone={tone}>
        <BrahmaDay width={inner} pieces={model.pieces} manu={MANU_NOW} at={model.day01} progress={progress} ground={fill[tone]} />
        <View style={styles.facts} accessible accessibilityLabel={`${grouped(model.yearsGone)} years of this day of Brahmā have gone, ${percentText(model.day01)}. ${grouped(model.toNoon)} years to noon.`}>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>Gone</Text>
            <Text style={styles.factValue}>{grouped(gone)}</Text>
            <Text style={styles.factNote}>years, {percentText(model.day01 * progress)}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>To noon</Text>
            <Text style={styles.factValue}>{grouped(model.toNoon)}</Text>
            <Text style={styles.factNote}>years</Text>
          </View>
        </View>

        <View style={styles.life} accessible accessibilityLabel="Brahmā's life: a hundred years in two halves. The first half is over. This is the first day of his 51st year.">
          <Text style={[styles.factLabel, { color: label }]}>Brahmā's life, 100 years</Text>
          <View style={styles.lifeBar}>
            <View style={[styles.lifeHalf, styles.lifeGone]} />
            <View style={[styles.lifeHalf, styles.lifeComing]} />
            <View style={styles.lifeMark} />
          </View>
          <View style={styles.lifeLabels}>
            <Text style={styles.lifeText}>First half, over</Text>
            <Text style={styles.lifeText}>Year 51 begins</Text>
          </View>
        </View>

        <NowLine tone={tone}>{`The ${ordinal(MANU_NOW)} Manu's age, ${percentText(model.day01)} of the way through Brahmā's day: not yet noon.`}</NowLine>
        <FillButton label="Play again" icon="refresh" onPress={play} accessibilityLabel="Let the Sun climb again" style={styles.replay} />
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The arc is the day, cut into the fourteen Manus' ages with a junction before each. Gold is the age now.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "A kalpa is one day of Brahmā, the creator: a thousand cycles of the four ages.", terms: [SPANS[2], WORDS.brahma] },
          { text: "That is 4,320,000,000 years. His night is just as long." },
          { text: "Brahmā lives a hundred years of such days and nights." },
          { text: "Half his life, a parārdha, is over. The second half has begun.", terms: [WORDS.parardha] },
          { text: "This kalpa is the first day of the second half: the first day of Brahmā's 51st year." },
          { text: "The Bhāgavata Purāṇa calls it the Boar's kalpa: the one in which Viṣṇu took the form of a boar, Varāha.", terms: [WORDS.varaha] },
        ]}
      />

      <SectionLabel>The name</SectionLabel>
      <View style={styles.name} accessible accessibilityLabel={`${cap(WORDS.shvetavarahakalpa.iast)}: śveta, white; vārāha, of the Boar; kalpa.`}>
        {[
          { sa: WORDS.shveta.dev, roman: WORDS.shveta.iast, gloss: "white" },
          { sa: WORDS.vaaraha.dev, roman: WORDS.vaaraha.iast, gloss: "of the Boar" },
          { sa: SPANS[2].dev, roman: SPANS[2].iast, gloss: "kalpa" },
        ].map((p, i) => (
          <React.Fragment key={p.roman}>
            {i > 0 && <Text style={styles.plus}>+</Text>}
            <View style={styles.part}>
              <Sa size={21} weight="bold">
                {p.sa}
              </Sa>
              <Text style={[styles.partRoman, { fontSize: sized(13) }]}>{p.roman}</Text>
              <Text style={[styles.partGloss, { fontSize: sized(12.5) }]}>{p.gloss}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={styles.whole}>
        <Sa size={22} weight="bold">
          {WORDS.shvetavarahakalpa.nom}
        </Sa>
        <Text style={[styles.partGloss, { fontSize: sized(13) }]}>Monier-Williams calls it the first day of Brahmā's month.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: "row", gap: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  fact: { flex: 1, minWidth: 0 },
  factLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  factValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18, color: onFill.text },
  factNote: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft },

  life: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint, gap: 6 },
  lifeBar: { flexDirection: "row", height: 14, borderRadius: 4, overflow: "hidden", gap: 3 },
  lifeHalf: { flex: 1, height: 14 },
  lifeGone: { backgroundColor: "rgba(255,248,238,0.62)" },
  lifeComing: { backgroundColor: "rgba(255,248,238,0.2)" },
  lifeMark: { position: "absolute", left: "50%", marginLeft: 1, top: 0, bottom: 0, width: 5, backgroundColor: onFill.gold },
  lifeLabels: { flexDirection: "row", justifyContent: "space-between" },
  lifeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft },

  replay: { marginTop: space.sm, alignSelf: "flex-start" },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  name: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", columnGap: space.xs },
  plus: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 20, color: color.inkSoft, marginTop: 6 },
  part: { minWidth: 72 },
  partRoman: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, fontStyle: "italic", marginTop: -4 },
  partGloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  whole: { borderTopWidth: 1, borderTopColor: color.border, paddingTop: space.xs, marginTop: space.xs },
});
