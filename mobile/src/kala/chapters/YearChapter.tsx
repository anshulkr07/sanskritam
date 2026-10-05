// The year — twelve moons against the Sun's twelve signs, and the month
// that is added when they drift apart.
//
// The wheel is the lunar year now running, Chaitra at the top. Each piece is
// one lunar month, as long as that month really is. The marks outside are
// the moments the Sun enters a sign. Every month holds one such mark except
// the added month, which holds none: that is the whole rule, and the wheel
// shows it.

import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import SegmentRing from "../charts/SegmentRing";
import { dateTextFor } from "../clock";
import { ayanaAt } from "../engine";
import { LUNAR_TWELVE_DAYS, monthLabel, RASHIS_EN, RITUS_EN, SOLAR_YEAR_DAYS, yearModel } from "../learn";
import { AYANAS, MONTHS, RASHIS, RITUS, WORDS } from "../sanskritNames";
import { cap, romanName } from "../today";
import { Failed, Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred } from "../ui";
import type { ChapterProps } from "./types";

export default function YearChapter({ today, tone, width }: ChapterProps) {
  const { snap, now } = today;
  const { sized } = useTypeScale();
  const nowRef = useRef(now);
  nowRef.current = now;
  const lunationStart = snap ? snap.lunation.start.getTime() : 0;
  const { value: year, failed } = useDeferred(() => (snap ? yearModel(nowRef.current) : null), [lunationStart]);
  const [picked, setPicked] = useState<number | null>(null);

  if (failed) return <Failed />;
  if (!snap || !year) return <Ghost lines={4} on="page" />;

  const dateText = dateTextFor(snap.place.tz, now);
  const label = labelOn(tone);
  const size = Math.min(width - 2 * space.md, 328);
  const index = Math.min(year.months.length - 1, picked ?? year.current);
  const month = year.months[index];
  const name = monthLabel(month.lunation);
  const marker = Math.min(1, Math.max(0, (now.getTime() - year.start.getTime()) / (year.end.getTime() - year.start.getTime())));

  // The six seasons, two named months each. An added month shares its
  // season with the month it is named after.
  const seasons = [0, 1, 2, 3, 4, 5]
    .map((r) => {
      const ms = year.months.filter((m) => m.ritu === r);
      return ms.length > 0 ? { ritu: r, from: ms[0].from, to: ms[ms.length - 1].to } : null;
    })
    .filter((b): b is { ritu: number; from: number; to: number } => b !== null);

  const ayana = ayanaAt(now);
  const bars = [
    { key: "moons", title: "Twelve moons", days: LUNAR_TWELVE_DAYS, tone: fill.slate },
    { key: "sun", title: "The Sun's year", days: SOLAR_YEAR_DAYS, tone: fill.gold },
    { key: "this", title: `This year, ${year.months.length} months`, days: year.days, tone: fill[tone] },
  ];
  const widest = Math.max(...bars.map((b) => b.days));

  return (
    <>
      <Panel tone={tone}>
        <View style={styles.centre}>
          <SegmentRing
            size={size}
            thickness={32}
            margin={30}
            segments={year.months.map((m) => ({ from: m.from, to: m.to, strong: m.lunation.adhika }))}
            selected={index}
            onSelect={(i) => {
              if (i !== index) haptics.tap();
              setPicked(i);
            }}
            marker={marker}
            ticks={year.ticks.map((t) => ({ at: t.at01, label: romanName(RASHIS[t.sign]).slice(0, 3) }))}
            bands={seasons.map((b) => ({ from: b.from, to: b.to, on: b.ritu === month.ritu }))}
            ground={fill[tone]}
            accessibilityLabel="The months of this lunar year"
            valueText={`${name.roman}, month ${index + 1} of ${year.months.length}${index === year.current ? ", the month now" : ""}`}
          >
            <Sa size={22} weight="bold" on="fill" style={styles.ringSa}>
              {name.sa}
            </Sa>
            <Text style={styles.ringRoman}>{name.roman}</Text>
            <Text style={[styles.ringCount, { color: label }]}>
              {index + 1} of {year.months.length}
              {index === year.current ? " · now" : ""}
            </Text>
          </SegmentRing>
        </View>

        <View style={styles.detail} accessible accessibilityLabel={`${name.roman}. ${dateText(month.lunation.start)} to ${dateText(month.lunation.end)}. ${month.sankranti ? `The Sun enters ${romanName(RASHIS[month.sankranti.sign])} on ${dateText(month.sankranti.at)}.` : "The Sun changes no sign in this month, so it is an added month."} Season: ${romanName(RITUS[month.ritu])}, ${RITUS_EN[month.ritu]}.`}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: label }]}>New moon to new moon</Text>
            <Text style={styles.detailValue}>
              {dateText(month.lunation.start)} to {dateText(month.lunation.end)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: label }]}>{cap(WORDS.sankranti.iast)}</Text>
            {month.sankranti ? (
              <Text style={styles.detailValue}>
                Sun enters {romanName(RASHIS[month.sankranti.sign])}, the {RASHIS_EN[month.sankranti.sign]}, on {dateText(month.sankranti.at)}
              </Text>
            ) : (
              <Text style={styles.detailValue}>None. That makes it an added month.</Text>
            )}
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: label }]}>Season</Text>
            <View style={styles.seasonLine}>
              <Sa size={18} on="fill">
                {RITUS[month.ritu].nom}
              </Sa>
              <Text style={styles.detailValue}>
                {romanName(RITUS[month.ritu])} · {RITUS_EN[month.ritu]}
              </Text>
            </View>
          </View>
        </View>

        {picked !== null && index !== year.current && (
          <Pressable
            onPress={() => {
              haptics.tap();
              setPicked(null);
            }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to the month now"
          >
            <Text style={[styles.backText, { color: fill[tone] }]}>Back to this month</Text>
          </Pressable>
        )}
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>
        Outer marks: the Sun enters a sign. Inner band: the six seasons. The line is today.
      </Text>

      <SectionLabel>Why a month is added</SectionLabel>
      <View style={styles.bars}>
        {bars.map((b) => (
          <View key={b.key} accessible accessibilityLabel={`${b.title}: ${Math.round(b.days)} days.`}>
            <View style={styles.barHead}>
              <Text style={[styles.barTitle, { fontSize: sized(14) }]}>{b.title}</Text>
              <Text style={[styles.barDays, { fontSize: sized(14) }]}>{Math.round(b.days)} days</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={{ height: 12, borderRadius: 3, backgroundColor: b.tone, width: `${(b.days / widest) * 100}%` }} />
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>
        The gap of about 11 days a year adds up to a month about every 32.5 months.
      </Text>

      <SectionLabel>This year</SectionLabel>
      <View>
        <Row label="Runs" value={`${dateText(year.start)} to ${dateText(year.end)}`} sized={sized} />
        <Row label="Length" value={`${Math.round(year.days)} days, ${year.months.length} months`} sized={sized} />
        {!!today.view && today.view.year !== `Vikrama ${year.years.vikrama}` && today.view.year !== `Śaka ${year.years.shaka}` && (
          <Row label="In your calendar" value={today.view.year} sized={sized} />
        )}
        <Row label={`Vikrama, from ${cap(MONTHS[0].iast)}`} value={String(year.years.vikrama)} sized={sized} />
        <Row label="Śaka" value={String(year.years.shaka)} sized={sized} />
        <Row label="Kali" value={String(year.years.kali)} sized={sized} />
        <View style={styles.row} accessible accessibilityLabel={`The Sun's half of the year: ${romanName(AYANAS[ayana])}, the ${ayana === 0 ? "northward" : "southward"} half.`}>
          <Text style={[styles.rowLabel, { fontSize: sized(14) }]}>Sun's half</Text>
          <View style={styles.rowRight}>
            <Sa size={18}>{AYANAS[ayana].nom}</Sa>
            <Text style={[styles.rowNote, { fontSize: sized(12.5) }]}>
              {romanName(AYANAS[ayana])} · {ayana === 0 ? "northward" : "southward"} half
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

function Row({ label, value, sized }: { label: string; value: string; sized: (pt: number) => number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}.`}>
      <Text style={[styles.rowLabel, { fontSize: sized(14) }]}>{label}</Text>
      <Text style={[styles.rowValue, { fontSize: sized(15) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  ringSa: { textAlign: "center" },
  ringRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13.5, color: onFill.soft, textAlign: "center" },
  ringCount: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 12, marginTop: 2 },
  detail: { marginTop: space.xs },
  detailRow: { paddingVertical: space.xs, borderTopWidth: 1, borderTopColor: onFill.faint },
  detailLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  detailValue: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14.5, lineHeight: 20, color: onFill.text },
  seasonLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: space.xs },
  back: { minHeight: 46, borderRadius: 12, backgroundColor: onFill.text, alignItems: "center", justifyContent: "center", marginTop: space.xs },
  backText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15 },
  pressed: { opacity: 0.75 },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  bars: { gap: space.sm },
  barHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  barTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  barDays: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  barTrack: { height: 12, borderRadius: 3, backgroundColor: color.border },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, minHeight: 48, borderBottomWidth: 1, borderBottomColor: color.border },
  rowLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  rowValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, flexShrink: 1, textAlign: "right" },
  rowRight: { alignItems: "flex-end", flexShrink: 1 },
  rowNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
