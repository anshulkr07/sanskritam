// The months — twelve, each named after the star its full moon falls near.
//
// The Moon grows from new to full for one month at a time, and at the full
// the star that month is named after appears beside it. Step through the
// twelve with the arrows, or tap a month card below. Then the two ways a
// month is counted, and the twelve cards.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import { monthCards } from "../basics";
import { CellGrid, FillButton, NowLine, Steps, useArrival } from "../basicsUi";
import MoonGlyph from "../charts/MoonGlyph";
import { MonthCard } from "../HubCards";
import { traditionMonth } from "../learn";
import { MONTHS, NAKSHATRAS, WORDS } from "../sanskritNames";
import { cap, romanName } from "../today";
import { traditionById } from "../traditions";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { TopicProps } from "./types";

/** The Moon's unlit side on a deep fill. */
const SHADE = "rgba(0,0,0,0.32)";

export default function MasaTopic({ today, tone, month: openOn, scrollToTop }: TopicProps) {
  const { snap } = today;
  const { sized } = useTypeScale();
  const current = snap ? traditionMonth(snap) : null;
  const cards = monthCards(current);
  const [shown, setShown] = useState<number | null>(openOn ?? null);
  const index = shown ?? current?.month ?? 0;
  const { progress, play } = useArrival(snap !== null, 1700);

  if (!snap || !current) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const card = cards[index];
  const full = progress >= 0.92;
  const purnimanta = traditionById(today.prefs.tradition).monthEnd === "purnimanta";

  const go = (i: number) => {
    setShown(((i % 12) + 12) % 12);
    play();
  };

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.hero} accessible accessibilityLabel={`${card.roman}: its full moon falls near ${card.starText}.`}>
          <View style={styles.moonBox}>
            <MoonGlyph elongation={Math.max(1, 180 * progress)} size={124} lit={onFill.text} shade={SHADE} />
            {full && (
              <View style={styles.star}>
                <Ionicons name="star" size={20} color={onFill.gold} />
              </View>
            )}
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroLabel, { color: label }]}>Month {index + 1} of 12</Text>
            <Sa size={28} weight="bold" on="fill">
              {card.name.nom}
            </Sa>
            <Text style={styles.heroRoman}>{card.roman}</Text>
            <Text style={[styles.heroLabel, styles.gap, { color: label }]}>{full ? "Full moon near" : "Moon growing"}</Text>
            {full ? (
              <>
                <Sa size={19} on="fill">
                  {card.stars.map((s) => s.nom).join(" · ")}
                </Sa>
                <Text style={styles.heroRoman}>{card.starText}</Text>
              </>
            ) : (
              <Text style={styles.heroRoman}>{Math.round(180 * progress)}° from the Sun</Text>
            )}
          </View>
        </View>

        <View style={styles.controls}>
          <FillButton icon="chevron-back" onPress={() => go(index - 1)} accessibilityLabel={`Previous month, ${cards[(index + 11) % 12].roman}`} />
          <Text style={styles.controlText} numberOfLines={2}>
            {card.about}
          </Text>
          <FillButton icon="chevron-forward" onPress={() => go(index + 1)} accessibilityLabel={`Next month, ${cards[(index + 1) % 12].roman}`} />
        </View>

        <NowLine tone={tone}>{`${current.adhika ? "Added " : ""}${cap(MONTHS[current.month].iast)}, in your calendar.`}</NowLine>
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Step through the months to see each one's star.</Text>

      <SectionLabel>Step by step</SectionLabel>
      <Steps
        tone={tone}
        steps={[
          { text: "Māsa means a month, and also the Moon.", terms: [WORDS.masa] },
          { text: "A lunar month is one round of the Moon's phases: about 29½ days, thirty tithis." },
          { text: "Some calendars count it from new moon to new moon, others from full moon to full moon." },
          { text: `Each month is named after a star its full moon falls near: ${cap(MONTHS[0].iast)} after ${romanName(NAKSHATRAS[13])}, ${cap(MONTHS[7].iast)} after ${romanName(NAKSHATRAS[2])}.`, terms: [MONTHS[0], NAKSHATRAS[13]] },
          { text: "Pāṇini's grammar has a rule for these names (4.2.21): a month called after the full moon in it." },
          { text: "Twelve months fall about 11 days short of the Sun's year, so about every 32½ months one is added.", terms: [WORDS.adhika] },
        ]}
      />

      <SectionLabel>Two ways to count a month</SectionLabel>
      <Reckonings purnimanta={purnimanta} sized={sized} />

      <SectionLabel>The twelve months</SectionLabel>
      <CellGrid>
        {cards.map((m) => (
          <MonthCard
            key={m.index}
            month={m}
            width={sized(16) >= 24 ? "100%" : "48.5%"}
            onPress={() => {
              haptics.tap();
              go(m.index);
              scrollToTop?.();
            }}
          />
        ))}
      </CellGrid>
    </>
  );
}

/** One month's span both ways: the same name over a new-moon month and a
 *  full-moon one, half a month apart. The learner's own is marked. */
function Reckonings({ purnimanta, sized }: { purnimanta: boolean; sized: (pt: number) => number }) {
  // Along the track: full moon, new moon, full moon, new moon.
  const marks = [180, 0, 180, 0];
  const rows = [
    { key: "amanta", title: "New moon to new moon", from: 1 / 3, to: 1, yours: !purnimanta },
    { key: "purnimanta", title: "Full moon to full moon", from: 0, to: 2 / 3, yours: purnimanta },
  ];
  return (
    <View accessible accessibilityLabel={`A month counted two ways. New moon to new moon, or full moon to full moon, half a month earlier. In the full-moon count the dark half already has the next month's name. Yours: ${purnimanta ? "full moon to full moon" : "new moon to new moon"}.`}>
      <View style={styles.marks}>
        {marks.map((e, i) => (
          <View key={i} style={[styles.mark, { left: `${(i / 3) * 100}%` }]}>
            <MoonGlyph elongation={e === 0 ? 0.1 : 180} size={20} lit={color.gold} shade={fill.slate} />
          </View>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.reckon}>
          <View style={styles.reckonHead}>
            <Text style={[styles.reckonTitle, { fontSize: sized(14) }]}>{r.title}</Text>
            {r.yours && <Text style={styles.yours}>Yours</Text>}
          </View>
          <View style={styles.reckonTrack}>
            <View style={[styles.reckonBar, { left: `${r.from * 100}%`, width: `${(r.to - r.from) * 100}%`, backgroundColor: r.yours ? fill.ink : fill.slate }]}>
              <Text style={styles.reckonBarText} numberOfLines={1}>
                One month
              </Text>
            </View>
          </View>
        </View>
      ))}
      <Text style={[styles.caption, { fontSize: sized(13), marginTop: 4 }]}>Where a month ends at the full moon, its dark half already carries the next month's name.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: space.md },
  moonBox: { width: 124, height: 124 },
  star: { position: "absolute", right: -10, top: -8 },
  heroText: { flex: 1, minWidth: 0 },
  heroLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  gap: { marginTop: space.xs },
  heroRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft, marginTop: -4 },
  controls: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  controlText: { flex: 1, textAlign: "center", fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14.5, color: onFill.text },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  marks: { height: 24, marginHorizontal: 10 },
  mark: { position: "absolute", marginLeft: -10 },
  reckon: { marginTop: space.xs },
  reckonHead: { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: 4 },
  reckonTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  yours: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: onFill.text,
    backgroundColor: fill.ink,
    borderRadius: 6,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  reckonTrack: { height: 30, marginHorizontal: 10, borderRadius: 6, backgroundColor: color.border },
  reckonBar: { position: "absolute", top: 0, bottom: 0, borderRadius: 6, justifyContent: "center", paddingHorizontal: 8 },
  reckonBarText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12.5, color: onFill.text },
});
