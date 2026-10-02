// Six calendars — one moment, dated six ways, and the four choices that
// make the difference.
//
// The list is the same chooser as the calendar sheet, with each tradition's
// date for this moment in its own script: picking a row makes it the
// learner's calendar everywhere, the Home card included. The table under it
// lays the six side by side on the four choices, with the learner's row
// picked out.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { ensureScriptFont } from "../../services/scriptFonts";
import { color, fill, onFill, outline, space } from "../../theme";
import { faceFor } from "../faces";
import { traditionDates } from "../learn";
import { setKalaPrefs } from "../prefs";
import { MONTHS, RASHIS } from "../sanskritNames";
import { cap, romanName } from "../today";
import { TRADITIONS, type Knobs, type TraditionId } from "../traditions";
import { Failed, Ghost, SectionLabel, useDeferred } from "../ui";
import type { ChapterProps } from "./types";

const COLUMNS: { key: keyof Knobs; head: string; spoken: string }[] = [
  { key: "months", head: "Months", spoken: "months follow the" },
  { key: "monthEnd", head: "End at", spoken: "a month ends at the" },
  { key: "yearStart", head: "Year from", spoken: "the year opens with" },
  { key: "era", head: "Era", spoken: "years are counted in" },
];

/** What each setting of a choice is called in the table. */
const CELL: { [K in keyof Knobs]: Record<Knobs[K], string> } = {
  months: { moon: "Moon", sun: "Sun" },
  monthEnd: { newMoon: "New moon", fullMoon: "Full moon", sign: "Sign change" },
  yearStart: {
    chaitra: cap(MONTHS[0].iast),
    karttika: cap(MONTHS[7].iast),
    mesha: romanName(RASHIS[0]),
    simha: romanName(RASHIS[4]),
  },
  era: { vikrama: "Vikrama", shaka: "Śaka", cycle: "60 years", kollam: "Kollam", bangabda: "Baṅgābda" },
};

function cell<K extends keyof Knobs>(key: K, knobs: Knobs): string {
  return CELL[key][knobs[key]];
}

export default function CalendarsChapter({ today }: ChapterProps) {
  const { snap, now, clockText, prefs } = today;
  const { sized } = useTypeScale();
  const [, setFontTick] = useState(0);

  // Choosing a tradition retakes the snapshot. The six dates do not depend
  // on that choice, so the last reading stays up while the new one is made.
  const baseRef = useRef(snap);
  if (snap) baseRef.current = snap;
  const base = baseRef.current;
  const nowRef = useRef(now);
  nowRef.current = now;
  const baseKey = base ? `${base.at.getTime()}` : "";
  const { value: dates, failed } = useDeferred(() => (base ? traditionDates(base, nowRef.current, clockText) : null), [baseKey]);

  // The four regional faces are registered the first time they are shown.
  useEffect(() => {
    let alive = true;
    for (const t of TRADITIONS) {
      if (t.regional) {
        void ensureScriptFont(t.regional).then(() => {
          if (alive) setFontTick((n) => n + 1);
        });
      }
    }
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <Failed />;
  if (!dates) return <Ghost lines={5} on="page" />;

  const pick = (id: TraditionId) => {
    haptics.tap();
    setKalaPrefs({ tradition: id });
  };

  return (
    <>
      <SectionLabel>This moment, six ways</SectionLabel>
      <View accessibilityRole="radiogroup">
        {dates.map((d) => {
          const on = d.id === prefs.tradition;
          return (
            <Pressable
              key={d.id}
              onPress={() => pick(d.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLabel={`${d.label}. ${d.gloss.replace(/ · /g, ", ")}. ${d.year}.`}
              accessibilityHint={on ? undefined : "Makes this your calendar"}
            >
              <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { fontSize: sized(12.5) }]}>
                  {d.label}
                  {on ? " · yours" : ""}
                </Text>
                <Text style={[styles.headline, faceFor(d.headlineScript), { fontSize: sized(21, { sanskrit: true }), lineHeight: Math.round(sized(21, { sanskrit: true }) * 1.5) }]}>
                  {d.headline}
                </Text>
                <Text style={[styles.gloss, { fontSize: sized(13) }]}>
                  {d.gloss} · {d.year}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>
        Where a month ends at the full moon, the dark half takes the next month's name.
      </Text>

      <SectionLabel>Four choices</SectionLabel>
      <View>
        <View style={styles.tableHead} accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={styles.nameCol} />
          {COLUMNS.map((c) => (
            <View key={c.key} style={styles.col}>
              <Text style={styles.headCell}>{c.head}</Text>
            </View>
          ))}
        </View>
        {TRADITIONS.map((t) => {
          const on = t.id === prefs.tradition;
          return (
            <View
              key={t.id}
              style={[styles.tableRow, on && styles.tableRowOn]}
              accessible
              accessibilityLabel={`${t.label}${on ? ", your calendar" : ""}: ${COLUMNS.map((c) => `${c.spoken} ${cell(c.key, t.knobs)}`).join(", ")}.`}
            >
              <View style={styles.nameCol}>
                <Text style={[styles.cell, styles.cellName, on && styles.cellOn]}>{t.short}</Text>
              </View>
              {COLUMNS.map((c) => (
                <View key={c.key} style={styles.col}>
                  <Text style={[styles.cell, on && styles.cellOn]}>{cell(c.key, t.knobs)}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The sky is the same for all six. Only these four settings differ.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 64, paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: color.border },
  pressed: { opacity: 0.7 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: outline, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: onFill.text },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft },
  headline: { color: color.ink },
  gloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  tableHead: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 6, paddingBottom: 6 },
  headCell: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", color: color.inkSoft },
  nameCol: { width: 64 },
  col: { flex: 1, minWidth: 0, paddingRight: 4 },
  tableRow: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: color.border },
  tableRowOn: { backgroundColor: fill.ink, borderRadius: 8, borderTopColor: fill.ink },
  cell: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, lineHeight: 16, color: color.ink },
  cellName: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
  cellOn: { color: onFill.text },
});
