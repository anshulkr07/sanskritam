// The clock — the day counted from sunrise in ghatikas, palas and vipalas.
//
// The dial runs live from the learner's own sunrise. Under it a stopwatch
// counts in the same units, with a ring that swells and settles once a
// breath (a prana, four seconds), and then the ladder of units itself.
//
// The count follows the learner's script choice: Devanagari numerals unless
// they chose roman.

import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { Button } from "../../components/ui";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, onFill, script, space } from "../../theme";
import { announce } from "../../utils/announce";
import GhatiDial from "../charts/GhatiDial";
import { GHATIKA_MS, ghatiOf, PALA_MS, PRANA_MS, unitLadder, VIPALA_MS } from "../learn";
import { digits } from "../regionalNames";
import { UNITS } from "../sanskritNames";
import { romanName } from "../today";
import { Ghost, labelOn, Panel, Sa, SectionLabel } from "../ui";
import type { ChapterProps } from "./types";

const LATIN_FACE = { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" as const };
const LADDER = unitLadder();

/** Ordinary time, for comparison: "1:36.4". */
function plainTime(ms: number): string {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
}

export default function ClockChapter({ today, tone, width }: ChapterProps) {
  const { snap, clockText, prefs } = today;
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const focused = useIsFocused();

  // The stopwatch: time banked by earlier runs, and when this run began.
  const [running, setRunning] = useState(false);
  const [banked, setBanked] = useState(0);
  const startedAt = useRef(0);

  // One tick drives the dial and the stopwatch: a vipala apart at rest, a
  // tenth of a second while the stopwatch runs.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!focused) return;
    setTick(Date.now());
    const timer = setInterval(() => setTick(Date.now()), running ? 100 : VIPALA_MS);
    return () => clearInterval(timer);
  }, [focused, running]);

  // The breath: out and back once every prana while the stopwatch runs.
  const breath = useSharedValue(0.72);
  useEffect(() => {
    cancelAnimation(breath);
    if (running && !reduced) {
      const half = { duration: PRANA_MS / 2, easing: Easing.inOut(Easing.sin) };
      breath.value = 0.72;
      breath.value = withRepeat(withSequence(withTiming(1, half), withTiming(0.72, half)), -1);
    } else {
      breath.value = reduced ? 0.86 : withTiming(0.72, { duration: 200 });
    }
    return () => cancelAnimation(breath);
  }, [breath, running, reduced]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  const roman = prefs.script === "roman";
  const face = roman ? LATIN_FACE : script("bold");
  const num = (n: number, pad = 2) => {
    const s = digits(n, roman ? "latin" : "devanagari");
    return s.length >= pad ? s : digits(0, roman ? "latin" : "devanagari").repeat(pad - s.length) + s;
  };

  // Whole vipalas since sunrise: the dial only changes when this does.
  const sinceRise = snap?.dayStart ? Math.floor((tick - snap.dayStart.getTime()) / VIPALA_MS) * VIPALA_MS : null;
  const dial = useMemo(() => {
    if (sinceRise === null) return null;
    const span = Math.max(0, sinceRise);
    return { time: ghatiOf(span), ghatikas: span / GHATIKA_MS, palas: (span % GHATIKA_MS) / PALA_MS };
  }, [sinceRise]);

  const elapsed = banked + (running ? Math.max(0, tick - startedAt.current) : 0);
  const watch = ghatiOf(elapsed);

  const toggle = () => {
    if (running) {
      setBanked(banked + Math.max(0, Date.now() - startedAt.current));
      setRunning(false);
      announce("Stopped");
    } else {
      startedAt.current = Date.now();
      setTick(Date.now());
      setRunning(true);
      announce("Started");
    }
  };
  const reset = () => {
    haptics.tap();
    setRunning(false);
    setBanked(0);
    announce("Reset");
  };

  if (!snap) return <Ghost lines={4} on="page" />;

  const label = labelOn(tone);
  const size = Math.min(width - 2 * space.md, 300);
  const columns: { unit: (typeof UNITS)[number]; dialValue: number; watchValue: number }[] = [
    { unit: UNITS[3], dialValue: dial ? Math.min(59, dial.time.ghatika) : 0, watchValue: watch.ghatika },
    { unit: UNITS[2], dialValue: dial ? dial.time.pala : 0, watchValue: watch.pala },
    { unit: UNITS[0], dialValue: dial ? dial.time.vipala : 0, watchValue: watch.vipala },
  ];

  return (
    <>
      <Panel tone={tone}>
        {dial && snap.dayStart ? (
          <>
            <View style={styles.centre}>
              <GhatiDial
                size={size}
                ghatikas={dial.ghatikas}
                palas={dial.palas}
                ground={fill[tone]}
                count={num(Math.min(59, dial.time.ghatika), 1)}
                caption={`${romanName(UNITS[3])} of 60`}
                countFace={face}
              />
            </View>
            <View
              style={styles.readout}
              accessible
              accessibilityLabel={`${Math.min(59, dial.time.ghatika)} ${UNITS[3].iast}, ${dial.time.pala} ${UNITS[2].iast} and ${dial.time.vipala} ${UNITS[0].iast} since sunrise at ${clockText(snap.dayStart)}.`}
            >
              {columns.map((c) => (
                <View key={c.unit.iast} style={styles.column}>
                  <Text style={[styles.number, face]}>{num(c.dialValue)}</Text>
                  <Sa size={18} on="fill">
                    {c.unit.nom}
                  </Sa>
                  <Text style={[styles.unitRoman, { color: label }]}>{c.unit.iast}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.since}>Since sunrise at {clockText(snap.dayStart)}</Text>
          </>
        ) : (
          <Text style={styles.since}>The Sun does not rise here today, so there is no count to keep.</Text>
        )}
      </Panel>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>Worked out for {snap.place.label}</Text>

      <SectionLabel>Stopwatch</SectionLabel>
      <View style={styles.watch}>
        <View style={styles.breathBox} accessible={false} importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.breath, { borderColor: fill[tone] }, breathStyle]} />
          <View style={styles.breathText}>
            <Text style={[styles.breathCount, face]}>{num(watch.prana, 1)}</Text>
          </View>
        </View>
        <View style={styles.watchText}>
          <View
            style={styles.watchRow}
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`${watch.ghatika} ${UNITS[3].iast}, ${watch.pala} ${UNITS[2].iast}, ${watch.vipala} ${UNITS[0].iast}. ${watch.prana} breaths.`}
          >
            {columns.map((c, i) => (
              <React.Fragment key={c.unit.iast}>
                {i > 0 && <Text style={styles.colon}>:</Text>}
                <Text style={[styles.watchNumber, face]}>{num(c.watchValue)}</Text>
              </React.Fragment>
            ))}
          </View>
          <Text style={[styles.watchUnits, { fontSize: sized(13) }]}>
            {UNITS[3].iast} : {UNITS[2].iast} : {UNITS[0].iast}
          </Text>
          <Text style={[styles.watchPlain, { fontSize: sized(13) }]}>
            {watch.prana} {watch.prana === 1 ? "breath" : "breaths"} · {plainTime(elapsed)}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button label={running ? "Stop" : elapsed > 0 ? "Resume" : "Start"} size="md" onPress={toggle} style={styles.grow} />
        <Pressable
          onPress={reset}
          disabled={elapsed === 0}
          style={({ pressed }) => [styles.reset, elapsed === 0 && styles.resetOff, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: elapsed === 0 }}
          accessibilityLabel="Reset the stopwatch"
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>
      <Text style={[styles.caption, { fontSize: sized(13) }]}>The ring counts breaths: one {UNITS[1].iast} is four seconds.</Text>

      <SectionLabel>The units</SectionLabel>
      <View>
        {LADDER.map((u) => (
          <View
            key={u.roman}
            style={styles.unitRow}
            accessible
            accessibilityLabel={`${u.roman}: ${u.length}${u.made ? `, made of ${u.made}` : ""}${u.note ? `. ${u.note}` : ""}.`}
          >
            <View style={styles.unitName}>
              <Sa size={20}>{u.unit.nom}</Sa>
              <Text style={styles.unitNameRoman}>{u.unit.iast}</Text>
            </View>
            <View style={styles.unitMade}>
              <Text style={[styles.unitMadeText, { fontSize: sized(14) }]}>{u.made ? `= ${u.made}` : "The smallest here"}</Text>
              {!!u.note && <Text style={[styles.unitNote, { fontSize: sized(12.5) }]}>{u.note}</Text>}
            </View>
            <Text style={[styles.unitLength, { fontSize: sized(15) }]}>{u.length}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center" },
  readout: { flexDirection: "row", marginTop: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  column: { flex: 1, alignItems: "center" },
  number: { fontSize: 30, lineHeight: 40, color: onFill.text },
  unitRoman: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  since: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, color: onFill.soft, textAlign: "center", marginTop: space.sm },
  caption: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },

  watch: { flexDirection: "row", alignItems: "center", gap: space.md },
  breathBox: { width: 84, height: 84, alignItems: "center", justifyContent: "center" },
  breath: { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 5 },
  breathText: { alignItems: "center", justifyContent: "center" },
  breathCount: { fontSize: 22, lineHeight: 30, color: color.ink },
  watchText: { flex: 1, minWidth: 0 },
  watchRow: { flexDirection: "row", alignItems: "center" },
  watchNumber: { fontSize: 34, lineHeight: 46, color: color.ink, minWidth: 50, textAlign: "center" },
  colon: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 26, color: color.inkSoft, marginHorizontal: 2 },
  watchUnits: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft, fontStyle: "italic" },
  watchPlain: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink, marginTop: 2 },
  buttons: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  grow: { flex: 1 },
  reset: { minHeight: 46, minWidth: 96, borderRadius: 14, borderWidth: 1.5, borderColor: color.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  resetOff: { opacity: 0.4 },
  resetText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, color: color.ink },
  pressed: { opacity: 0.75 },

  unitRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 60, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.border },
  unitName: { minWidth: 104 },
  unitNameRoman: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: color.inkSoft, fontStyle: "italic" },
  unitMade: { flex: 1, minWidth: 0 },
  unitMadeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  unitNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  unitLength: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
});
