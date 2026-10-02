// Today — the five limbs of the day, its hours, and the week around it.
//
// The five limbs (weekday, tithi, star, yoga, karana) each show what is
// running, how far through it the moment is, and when it gives way. The day
// wheel lays the same day out over 24 hours with the stretches an almanac
// lists as auspicious and inauspicious (the words are Drik Panchang's). The week strip shows the rule that names a day: the tithi
// running at its sunrise.
//
// Everything is worked out on the phone for the learner's place.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, space } from "../../theme";
import DayWheel from "../charts/DayWheel";
import MoonGlyph from "../charts/MoonGlyph";
import { minutesOfDayAt, spanText } from "../clock";
import type { WindowKey } from "../engine";
import { limbsAt, tithiGloss, todayModel, windowAt, type Limb } from "../learn";
import { WINDOWS, WORDS } from "../sanskritNames";
import { romanName, tithiParts, WEEKDAYS_EN } from "../today";
import { Failed, Ghost, labelOn, Panel, Sa, SectionLabel, useDeferred } from "../ui";
import type { ChapterProps } from "./types";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TodayChapter({ today, tone, width }: ChapterProps) {
  const { snap, now, clockText, whenText } = today;
  const { sized } = useTypeScale();
  const [picked, setPicked] = useState<WindowKey | null>(null);

  // The slow part: taken when the snapshot changes, and again when a yoga or
  // karana ends inside the snapshot's life.
  const [epoch, setEpoch] = useState(0);
  const nowRef = useRef(now);
  nowRef.current = now;
  const { value: model, failed } = useDeferred(() => (snap ? todayModel(snap, nowRef.current) : null), [snap, epoch]);
  useEffect(() => {
    if (!snap || !model) return;
    const t = now.getTime();
    if (t >= model.validUntil.getTime() && t < snap.validUntil.getTime()) setEpoch((e) => e + 1);
  }, [snap, model, now]);

  const limbs = useMemo(() => (snap && model ? limbsAt(snap, model, now) : null), [snap, model, now]);

  if (failed) return <Failed />;
  if (!snap || !model || !limbs) return <Ghost lines={4} on="page" />;

  const tz = snap.place.tz;
  const minute = (d: Date) => minutesOfDayAt(d, tz);
  const running = windowAt(model.windows, now);
  const sun = model.sun;
  const daylight = sun ? now.getTime() >= sun.sunrise.getTime() && now.getTime() < sun.sunset.getTime() : false;
  const wheel = Math.min(width - 2 * space.md, 320);
  const label = labelOn(tone);

  return (
    <>
      <SectionLabel>The five limbs</SectionLabel>
      <View>
        {limbs.map((l) => (
          <LimbRow key={l.key} limb={l} until={l.end ? clockText(l.end) : ""} bar={fill[tone]} sized={sized} />
        ))}
      </View>

      <SectionLabel>The day</SectionLabel>
      <Panel tone={tone}>
        {sun ? (
          <>
            <View style={styles.wheel}>
              <DayWheel
                size={wheel}
                sunrise={minute(sun.sunrise)}
                sunset={minute(sun.sunset)}
                windows={model.windows.map((w) => ({ key: w.key, good: w.good, from: minute(w.start), to: minute(w.end) }))}
                now={minute(now)}
                selected={picked}
                ground={fill[tone]}
                time={clockText(now)}
                state={running ? romanName(WINDOWS[running.key]) : daylight ? "Day" : "Night"}
              />
            </View>

            <View style={styles.sunRow}>
              <View style={styles.sunCell}>
                <Sa size={18} on="fill">
                  {WORDS.suryodaya.nom}
                </Sa>
                <Text style={[styles.sunLabel, { color: label }]}>Sunrise</Text>
                <Text style={styles.sunValue}>{clockText(sun.sunrise)}</Text>
              </View>
              <View style={styles.sunCell}>
                <Sa size={18} on="fill">
                  {WORDS.suryasta.nom}
                </Sa>
                <Text style={[styles.sunLabel, { color: label }]}>Sunset</Text>
                <Text style={styles.sunValue}>{clockText(sun.sunset)}</Text>
              </View>
              <View style={[styles.sunCell, styles.sunCellLast]}>
                <Text style={[styles.sunLabel, { color: label }]}>Daylight</Text>
                <Text style={styles.sunValue}>{spanText(sun.sunset.getTime() - sun.sunrise.getTime())}</Text>
              </View>
            </View>

            <View style={styles.legend} accessible accessibilityLabel="On the wheel a solid line is an auspicious stretch and a broken line an inauspicious one.">
              <View style={styles.legendItem}>
                <View style={styles.legendSolid} />
                <Text style={styles.legendText}>Auspicious</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendBroken}>
                  <View style={styles.legendDash} />
                  <View style={styles.legendDash} />
                  <View style={styles.legendDash} />
                </View>
                <Text style={styles.legendText}>Inauspicious</Text>
              </View>
            </View>

            {model.windows.map((w) => {
              const on = picked === w.key;
              const name = WINDOWS[w.key];
              const span = `${clockText(w.start)} to ${clockText(w.end)}`;
              const isRunning = running?.key === w.key;
              return (
                <Pressable
                  key={w.key}
                  onPress={() => {
                    haptics.tap();
                    setPicked(on ? null : w.key);
                  }}
                  style={({ pressed }) => [styles.windowRow, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${romanName(name)}. ${w.good ? "Auspicious" : "Inauspicious"}. ${span}${isRunning ? ". Running now" : ""}.`}
                  accessibilityHint="Shows it on the wheel"
                >
                  <Ionicons name={w.good ? "checkmark-circle" : "remove-circle-outline"} size={22} color={on ? onFill.gold : onFill.text} />
                  <View style={styles.windowText}>
                    <Sa size={18} on="fill" style={on ? { color: onFill.gold } : undefined}>
                      {name.nom}
                    </Sa>
                    <Text style={styles.windowRoman}>
                      {romanName(name)}
                      {isRunning ? " · now" : ""}
                    </Text>
                  </View>
                  <Text style={[styles.windowSpan, on && styles.picked]}>{span}</Text>
                </Pressable>
              );
            })}
          </>
        ) : (
          <Text style={styles.sunValue}>The Sun does not rise and set here today.</Text>
        )}
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Worked out for {snap.place.label}</Text>

      <SectionLabel>The week</SectionLabel>
      <Text style={[styles.rule, { fontSize: sized(15) }]}>A day takes the tithi running at its sunrise.</Text>
      <View style={styles.week}>
        {model.week.map((c) => {
          const t = tithiParts(c.tithi);
          const isToday = c.offset === 0;
          return (
            <View
              key={c.offset}
              style={[styles.dayCell, isToday && { backgroundColor: fill.ink }]}
              accessible
              accessibilityLabel={`${isToday ? "Today, " : ""}${WEEKDAYS_EN[c.weekday]} ${c.date.d}. ${romanName(t.name)}, ${tithiGloss(c.tithi)}.`}
            >
              <Text style={[styles.dayName, isToday && styles.onInk]} numberOfLines={1}>
                {WEEKDAYS_SHORT[c.weekday]}
              </Text>
              <Text style={[styles.dayDate, isToday && styles.onInk]}>{c.date.d}</Text>
              <MoonGlyph elongation={c.elongation} size={26} lit={color.gold} shade={isToday ? "#6B5A4E" : fill.slate} />
              <Text style={[styles.dayTithi, isToday && styles.onInk]}>{t.day}</Text>
            </View>
          );
        })}
      </View>
      {model.slips.map((s) => {
        const name = romanName(tithiParts(s.tithi).name);
        return (
          <Text key={`${s.kind}${s.tithi}`} style={[styles.caption, { fontSize: sized(13) }]}>
            {s.kind === "lost"
              ? `${name} is skipped: it runs ${whenText(s.start)} to ${whenText(s.end)}, between two sunrises.`
              : `${name} holds two sunrises, so two days carry it.`}
          </Text>
        );
      })}

      <SectionLabel>Coming up</SectionLabel>
      <View>
        {model.upcoming.map((u) => (
          <View key={u.key} style={styles.upRow} accessible accessibilityLabel={`${u.title}. ${whenText(u.at)}.`}>
            <Sa size={20} style={styles.upSa}>
              {u.sa}
            </Sa>
            <View style={styles.upText}>
              <Text style={[styles.upTitle, { fontSize: sized(15) }]}>{u.title}</Text>
              <Text style={[styles.upWhen, { fontSize: sized(13) }]}>{whenText(u.at)}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function LimbRow({ limb, until, bar, sized }: { limb: Limb; until: string; bar: string; sized: (pt: number) => number }) {
  return (
    <View
      style={styles.limb}
      accessible
      accessibilityLabel={`${romanName(limb.term)}: ${limb.roman}. ${limb.gloss}.${until ? ` Until ${until}.` : ""}`}
    >
      <View style={styles.limbTop}>
        <View style={styles.limbTerm}>
          <Sa size={18} style={styles.limbTermSa}>
            {limb.term.nom}
          </Sa>
          <Text style={styles.limbTermRoman}>{limb.term.iast}</Text>
        </View>
        <View style={styles.limbValue}>
          <Sa size={22} weight="bold">
            {limb.name.nom}
          </Sa>
          <Text style={[styles.limbRoman, { fontSize: sized(14) }]}>
            {limb.roman}
            <Text style={styles.limbGloss}> · {limb.gloss}</Text>
          </Text>
        </View>
        {!!until && (
          <View style={styles.limbUntil}>
            <Text style={styles.untilLabel}>until</Text>
            <Text style={[styles.untilTime, { fontSize: sized(14) }]}>{until}</Text>
          </View>
        )}
      </View>
      <View style={styles.track}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: bar, width: `${Math.round(limb.progress * 1000) / 10}%` }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  limb: { paddingTop: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  limbTop: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  // A width to line the rows up; wider only when the text is set larger.
  limbTerm: { minWidth: 88 },
  limbTermSa: { color: color.inkSoft },
  limbTermRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: color.inkSoft, fontStyle: "italic" },
  limbValue: { flex: 1, minWidth: 0 },
  limbRoman: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  limbGloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  limbUntil: { alignItems: "flex-end", paddingTop: 4 },
  untilLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11.5, color: color.inkSoft },
  untilTime: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  track: { height: 3, borderRadius: 2, backgroundColor: color.border, marginTop: space.xs, overflow: "hidden" },

  wheel: { alignItems: "center" },
  sunRow: { flexDirection: "row", marginTop: space.xs, borderTopWidth: 1, borderTopColor: onFill.faint, paddingTop: space.sm },
  sunCell: { flex: 1, minWidth: 0 },
  sunCellLast: { justifyContent: "flex-end" },
  sunLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  sunValue: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, color: onFill.text },

  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: 4, marginTop: space.md, marginBottom: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSolid: { width: 22, height: 5, borderRadius: 2, backgroundColor: onFill.text },
  legendBroken: { flexDirection: "row", gap: 3 },
  legendDash: { width: 5, height: 5, backgroundColor: onFill.text },
  legendText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft },

  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 56,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: onFill.faint,
  },
  pressed: { opacity: 0.75 },
  windowText: { flex: 1, minWidth: 0 },
  windowRoman: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, color: onFill.soft },
  windowSpan: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 14, color: onFill.text },
  // Colour is never the only signal: the picked row is underlined too.
  picked: { color: onFill.gold, textDecorationLine: "underline" },

  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  rule: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },

  week: { flexDirection: "row", gap: 4 },
  dayCell: { flex: 1, alignItems: "center", gap: 3, paddingVertical: space.xs, borderRadius: 10 },
  dayName: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 11.5, color: color.inkSoft },
  dayDate: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, color: color.ink },
  dayTithi: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, color: color.ink },
  onInk: { color: onFill.text },

  upRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56, borderBottomWidth: 1, borderBottomColor: color.border },
  upSa: { minWidth: 112 },
  upText: { flex: 1, minWidth: 0 },
  upTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  upWhen: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
});
