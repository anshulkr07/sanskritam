// The Moon — what a tithi is, shown by letting the learner turn the month.
//
// Three things to handle: the orbit (drag the Moon and its angle from the
// Sun becomes a tithi and a phase), the lengths of this month's thirty
// tithis (they are not equal), and the ring of 27 stars the Moon passes.
//
// All three open on the present moment and can be put back to it.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { duration } from "../../motion";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import MoonGlyph from "../charts/MoonGlyph";
import MoonOrbit from "../charts/MoonOrbit";
import SegmentRing from "../charts/SegmentRing";
import TithiBars from "../charts/TithiBars";
import { spanText } from "../clock";
import { elongation } from "../engine";
import { moonModel, moonReading, starAt, tithiGloss } from "../learn";
import { NAKSHATRAS } from "../sanskritNames";
import { romanName, tithiParts } from "../today";
import { Failed, Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred, useTween } from "../ui";
import type { ChapterProps } from "./types";

/** The Moon's unlit side on a slate fill. */
const SHADE = "#1C2B4F";
const STARS = Array.from({ length: 27 }, (_, i) => ({ from: i / 27, to: (i + 1) / 27 }));

export default function MoonChapter({ today, tone, width }: ChapterProps) {
  const { snap, now, whenText } = today;
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const tween = useTween();

  // The engine is loaded once there is a snapshot.
  const live = useMemo(() => (snap ? elongation(now) : 0), [snap, now]);
  const star = useMemo(() => (snap ? starAt(now) : null), [snap, now]);

  // null follows the sky; a number is where the learner has put the Moon.
  const [held, setHeld] = useState<number | null>(null);
  const angle = held ?? live;
  const lastTithi = useRef(-1);

  const lunationStart = snap ? snap.lunation.start.getTime() : 0;
  const { value: month, failed } = useDeferred(() => (snap ? moonModel(snap.lunation) : null), [lunationStart]);
  const [bar, setBar] = useState<number | null>(null);
  const [pickedStar, setPickedStar] = useState<number | null>(null);

  if (failed) return <Failed />;
  if (!snap || !star) return <Ghost lines={4} on="page" />;

  const reading = moonReading(angle);
  const label = labelOn(tone);
  const orbit = Math.min(width - 2 * space.md, 320);

  const moveTo = (deg: number) => {
    tween.stop();
    const tithi = Math.floor(deg / 12);
    if (tithi !== lastTithi.current) {
      lastTithi.current = tithi;
      haptics.tap();
    }
    setHeld(deg);
  };
  const step = (by: 1 | -1) => {
    haptics.tap();
    tween.stop();
    // To the middle of the next tithi, or the one before.
    const next = (((Math.floor(angle / 12) + by) % 30) + 30) % 30;
    setHeld(next * 12 + 6);
  };
  const backToNow = () => {
    haptics.tap();
    if (held === null) return;
    if (reduced) {
      setHeld(null);
      return;
    }
    // The short way round.
    const from = held;
    const delta = ((live - from + 540) % 360) - 180;
    tween.run(from, from + delta, duration.slow, (v) => setHeld(((v % 360) + 360) % 360), () => setHeld(null));
  };

  const runningBar = snap.tithi.number - 1;
  const shownBar = bar ?? runningBar;
  const shown = month ? month.bars[shownBar] : null;
  const shownParts = shown ? tithiParts(shown.number) : null;

  const starIndex = pickedStar ?? star.index;
  const starName = NAKSHATRAS[starIndex];

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <MoonOrbit
            size={orbit}
            angle={angle}
            onAngle={moveTo}
            onStep={step}
            valueText={`${romanName(reading.name)}, ${tithiGloss(reading.tithi)}, ${reading.litPercent} percent lit`}
          />
        </View>

        <View style={styles.readout} accessible accessibilityLabel={`${romanName(reading.name)}. ${tithiGloss(reading.tithi)}. The Moon is ${Math.round(angle)} degrees ahead of the Sun and ${reading.litPercent} percent lit.`}>
          <MoonGlyph elongation={angle} size={68} lit={onFill.text} shade={SHADE} />
          <View style={styles.readoutText}>
            <Sa size={26} weight="bold" on="fill">
              {reading.name.nom}
            </Sa>
            {reading.day !== 15 && (
              <Sa size={18} on="fill" style={styles.soft}>
                {reading.pakshaSa}
              </Sa>
            )}
            <Text style={styles.readoutRoman}>
              {romanName(reading.name)}
              {reading.day === 15 ? "" : ` · ${reading.pakshaRoman}`}
            </Text>
          </View>
        </View>

        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>Moon's lead</Text>
            <Text style={styles.factValue}>{Math.round(angle)}°</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>Tithi</Text>
            <Text style={styles.factValue}>{reading.tithi} of 30</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factLabel, { color: label }]}>Lit</Text>
            <Text style={styles.factValue}>{reading.litPercent}%</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={() => step(-1)} style={({ pressed }) => [styles.round, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Previous tithi">
            <Ionicons name="chevron-back" size={22} color={onFill.text} />
          </Pressable>
          <Pressable
            onPress={backToNow}
            disabled={held === null}
            style={({ pressed }) => [styles.nowButton, held === null && styles.nowButtonOff, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled: held === null }}
            accessibilityLabel={held === null ? "Showing the Moon now" : "Back to the Moon now"}
          >
            <Text style={[styles.nowText, { color: held === null ? onFill.text : fill[tone] }]}>{held === null ? "Now" : "Back to now"}</Text>
          </Pressable>
          <Pressable onPress={() => step(1)} style={({ pressed }) => [styles.round, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Next tithi">
            <Ionicons name="chevron-forward" size={22} color={onFill.text} />
          </Pressable>
        </View>
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Drag the Moon round its ring.</Text>

      <SectionLabel>This month's tithis</SectionLabel>
      <Text style={[styles.rule, { fontSize: sized(15) }]}>Each is the same 12 degrees, but not the same length.</Text>
      {month && shown && shownParts ? (
        <>
          <TithiBars
            bars={month.bars}
            selected={shownBar}
            running={runningBar}
            onSelect={(i) => {
              if (i !== shownBar) haptics.tap();
              setBar(i);
            }}
            valueText={`${romanName(shownParts.name)}, ${tithiGloss(shown.number)}, ${spanText(shown.end.getTime() - shown.start.getTime())}`}
          />
          <View style={styles.barDetail}>
            <Sa size={20} style={styles.barSa}>
              {shownParts.name.nom}
            </Sa>
            <View style={styles.barText}>
              <Text style={[styles.barTitle, { fontSize: sized(15) }]}>
                {romanName(shownParts.name)} · {spanText(shown.end.getTime() - shown.start.getTime())}
                {shownBar === runningBar ? " · now" : ""}
              </Text>
              <Text style={[styles.barWhen, { fontSize: sized(13) }]}>
                {whenText(shown.start)} to {whenText(shown.end)}
              </Text>
            </View>
          </View>
          <Text style={[styles.caption, { fontSize: sized(13) }]}>
            Shortest {spanText(month.shortest * 3600000)}, longest {spanText(month.longest * 3600000)}. Slide along the bars.
          </Text>
        </>
      ) : (
        <Ghost lines={3} on="page" />
      )}

      <SectionLabel>The Moon's star</SectionLabel>
      <Text style={[styles.rule, { fontSize: sized(15) }]}>The Moon passes 27 stars in a month, about one a day.</Text>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={orbit}
            thickness={30}
            margin={8}
            segments={STARS}
            selected={starIndex}
            onSelect={(i) => {
              if (i !== starIndex) haptics.tap();
              setPickedStar(i);
            }}
            marker={star.longitude / 360}
            ground={fill[tone]}
            accessibilityLabel="The 27 stars on the Moon's path"
            valueText={`${romanName(starName)}, ${starIndex + 1} of 27${starIndex === star.index ? ", where the Moon is now" : ""}`}
          >
            <Sa size={22} weight="bold" on="fill" style={styles.ringSa}>
              {starName.nom}
            </Sa>
            <Text style={styles.ringRoman}>{romanName(starName)}</Text>
            <Text style={[styles.ringCount, { color: label }]}>
              {starIndex + 1} of 27{starIndex === star.index ? " · now" : ""}
            </Text>
          </SegmentRing>
        </View>
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The line marks the Moon. Touch the ring to read each star.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  readout: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xs },
  readoutText: { flex: 1, minWidth: 0 },
  soft: { color: onFill.soft },
  readoutRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft },
  facts: { flexDirection: "row", marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  fact: { flex: 1 },
  factLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  factValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 18, color: onFill.text },
  controls: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  round: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: onFill.text, alignItems: "center", justifyContent: "center" },
  nowButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center" },
  nowButtonOff: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: onFill.faint },
  nowText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75 },

  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  rule: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },

  barDetail: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56 },
  barSa: { minWidth: 112 },
  barText: { flex: 1, minWidth: 0 },
  barTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  barWhen: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  ringSa: { textAlign: "center" },
  ringRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.soft, textAlign: "center" },
  ringCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, marginTop: 2 },
});
