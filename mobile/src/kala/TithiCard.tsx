// TithiCard — today's date in the learner's own calendar, on Home.
//
// The Moon as it looks now inside a ring of the month's thirty tithis, the
// date in Sanskrit (or roman, or the wall calendar of the learner's region),
// a bar that fills as the tithi runs out, and when the next one begins. All
// of it is worked out on the phone (useToday), ticks once a minute, and needs
// no network, no location permission and no particular backend.
//
// Look: one deep solid fill with cream text (HANDOVER section 2), the tithi's
// number large and faint behind it the way the game tiles carry their letter.
// While the first reading is made the card holds its shape, never a made-up
// date. Tapping it opens Kāla (screens/Kala.tsx), where the date is explained
// and the calendar can be changed.
//
// Devanagari on the card is never below 18pt (HANDOVER section 0).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useMotionDuration } from "../hooks/useReducedMotion";
import { duration, easing } from "../motion";
import { haptics } from "../services/haptics";
import { ensureScriptFont } from "../services/scriptFonts";
import { fill, onFill, script, shadow, space } from "../theme";
import { faceFor, isRegionalScript } from "./faces";
import MoonDial from "./MoonDial";
import { useToday } from "./useToday";
import type { KalaPlace } from "./traditions";
import MoonCountdown from "../home/MoonCountdown";
import { homeMoment, homeSkyDetails, homeTime } from "../home/todayDetails";

const DIAL = 76;

const HEADLINE_SIZE = {
  sanskrit: { fontSize: 25, lineHeight: 38 },
  roman: { fontSize: 22, lineHeight: 30 },
  regional: { fontSize: 23, lineHeight: 36 },
} as const;

export default function TithiCard({ calendarPlace }: { calendarPlace?: KalaPlace | null }) {
  const focused = useIsFocused();
  const today = useToday(focused, calendarPlace);
  const { view, snap, now, failed, place } = today;
  const navigation = useNavigation();
  const [, setFontTick] = useState(0);
  const [explained, setExplained] = useState(false);
  const sky = useMemo(() => snap ? homeSkyDetails(snap) : null, [snap]);
  const tz = place.place.tz;
  const ends = snap ? `Ends ${homeMoment(snap.tithi.end, tz, now)}` : "";

  // The learner's own script is registered the first time it is shown.
  const regionalScript = view && isRegionalScript(view.headlineScript) ? view.headlineScript : null;
  useEffect(() => {
    if (!regionalScript) return;
    let alive = true;
    void ensureScriptFont(regionalScript).then(() => {
      if (alive) setFontTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [regionalScript]);

  // The bar fills to where the tithi stands, then creeps with each minute.
  const fillMs = useMotionDuration(duration.slow);
  const progress = useSharedValue(0);
  const target = view ? view.progress : 0;
  useEffect(() => {
    progress.value = withTiming(target, { duration: fillMs, easing: easing.standard });
  }, [progress, target, fillMs]);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.round(progress.value * 1000) / 10}%` }));

  const open = () => {
    haptics.tap();
    if (failed) today.retry();
    else navigation.navigate("Kala");
  };

  const headlineKind: keyof typeof HEADLINE_SIZE =
    !view || view.headlineScript === "sanskrit" ? "sanskrit" : view.headlineScript === "roman" ? "roman" : "regional";
  // The numeral behind the card: Devanagari in the display face, anything
  // else in the heavy roman or the learner's own face.
  const watermarkStyle = !view
    ? null
    : view.watermarkScript === "devanagari"
      ? script("bold")
      : isRegionalScript(view.watermarkScript)
        ? [styles.watermarkPlain, faceFor(view.watermarkScript)]
        : styles.watermarkPlain;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.placeHead}>
          <Ionicons name="location-outline" size={14} color={onFill.soft} />
          <Text style={styles.placeName}>{place.place.label}</Text>
        </View>
      <Pressable
        onPress={open}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={
          failed ? "Today's date could not be worked out. Tap to retry." : view ? `${view.gloss}. ${ends}. Then ${view.nextRoman}. ${place.place.label}.` : "Today's date, loading"
        }
        accessibilityHint={failed ? undefined : "Opens the calendar"}
      >
        {view && (
          <Text style={[styles.watermark, watermarkStyle]} accessible={false} importantForAccessibility="no">
            {view.watermark}
          </Text>
        )}

        {failed ? (
          <View style={styles.failRow}>
            <Ionicons name="refresh" size={18} color={onFill.text} />
            <Text style={styles.failText}>Couldn't work out today's date. Tap to retry.</Text>
          </View>
        ) : !view ? (
          <View style={styles.top}>
            <View style={styles.dialGhost} />
            <View style={styles.topText}>
              <View style={[styles.ghostBar, { width: "40%", height: 10 }]} />
              <View style={[styles.ghostBar, { width: "85%", height: 24, marginTop: 10 }]} />
              <View style={[styles.ghostBar, { width: "65%", height: 12, marginTop: 10 }]} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.top}>
              <MoonDial elongation={view.elongation} tithiNumber={view.tithiNumber} size={DIAL} />
              <View style={styles.topText}>
                <View style={styles.eyebrowRow}>
                  <Text style={[styles.eyebrowSa, script("semibold")]}>{view.eyebrow}</Text>
                  <Text style={styles.eyebrow}>Today</Text>
                </View>
                <Text style={[styles.headline, faceFor(view.headlineScript), HEADLINE_SIZE[headlineKind]]} numberOfLines={2}>
                  {view.headline}
                </Text>
                {!!view.sub && (
                  <Text style={[styles.sub, script("semibold")]} numberOfLines={2}>
                    {view.sub}
                  </Text>
                )}
                <Text style={styles.gloss} numberOfLines={2}>
                  {view.gloss}
                </Text>
              </View>
            </View>

            <View style={styles.track}>
              <Animated.View style={[styles.bar, barStyle]} />
            </View>
            <View style={styles.untilRow}>
              <Text style={styles.until}>{ends}</Text>
              <Text style={styles.then}>
                then{" "}
                {!!view.nextScript && <Text style={[styles.thenSa, script("semibold")]}>{view.nextScript} </Text>}
                {view.nextRoman}
              </Text>
            </View>

            <View style={styles.meta}>
              <View style={styles.metaItems}>
                <Text style={[styles.metaText, view.weekdayScript === "devanagari" ? [script("semibold"), styles.metaSa] : view.weekdayScript === "roman" ? null : [faceFor(view.weekdayScript), styles.metaNative]]}>
                  {view.weekdayText}
                </Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{view.nakshatra}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{view.year}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={onFill.text} />
            </View>
          </>
        )}
      </Pressable>
      {!!view && <>
        <View style={styles.sunRow}>
          <View style={styles.sunItem}>
            <Ionicons name="sunny-outline" size={18} color={onFill.gold} />
            <View><Text style={styles.sunLabel}>Sunrise</Text><Text style={styles.sunTime}>{sky?.sun ? homeTime(sky.sun.sunrise, tz) : "Unavailable"}</Text></View>
          </View>
          <View style={styles.sunItem}>
            <Ionicons name="moon-outline" size={18} color={onFill.gold} />
            <View><Text style={styles.sunLabel}>Sunset</Text><Text style={styles.sunTime}>{sky?.sun ? homeTime(sky.sun.sunset, tz) : "Unavailable"}</Text></View>
          </View>
        </View>
        {!!sky?.moon && <MoonCountdown moon={sky.moon} now={now} tz={tz} />}
        <Pressable onPress={() => setExplained((value) => !value)} style={styles.explainToggle} accessibilityRole="button" accessibilityState={{ expanded: explained }}>
          <Text style={styles.explainTitle}>What does it mean?</Text>
          <Ionicons name={explained ? "chevron-up" : "chevron-down"} size={18} color={onFill.text} />
        </Pressable>
        {explained && <View style={styles.explanations}>
          {[
            ["Tithi · lunar day", "A tithi follows the changing angle between the Sun and Moon. Each 12° step is one lunar day, so its length can be shorter or longer than 24 hours. The end time above tells you when the next tithi begins."],
            ["Paksha · half of the lunar month", `This is day ${view.tithiNumber <= 15 ? view.tithiNumber : view.tithiNumber - 15} of the ${view.tithiNumber <= 15 ? "waxing (Shukla)" : "waning (Krishna)"} half. In Shukla Paksha, the lit Moon grows toward Poornima; in Krishna Paksha, it shrinks toward Amavasya. Each half has 15 tithis.`],
            ["Poornima & Amavasya", "Poornima is the full-moon lunar day; Amavasya is the new-moon lunar day. The countdown shows when that tithi begins in your selected city's time zone. The exact full or new Moon occurs at the end of that lunar day."],
            ["Nakshatra · the Moon's sky region", `${view.nakshatra} is the region the Moon is passing through. The traditional calendar divides the Moon's path into 27 such regions. This is a calendar marker that changes as the Moon travels.`],
            ["Month, weekday & year", `The heading uses your selected calendar tradition. Its month and year can differ from the everyday Gregorian calendar; ${view.year} is that tradition's year. The traditional weekday runs from one local sunrise to the next.`],
            ["Sunrise & sunset", "These times are calculated for the city shown above and written in its local time. Sunrise starts the traditional day; sunset ends its daylight hours. Times change with both the season and the location."],
          ].map(([label, text]) => <View key={label} style={styles.explanation}><Text style={styles.explanationLabel}>{label}</Text><Text style={styles.explanationText}>{text}</Text></View>)}
        </View>}
      </>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fill.slate,
    borderRadius: 10,
    padding: space.md,
    marginBottom: space.sm,
    overflow: "hidden",
    minHeight: 188,
    ...shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  watermark: {
    position: "absolute",
    right: 12,
    top: -26,
    fontSize: 104,
    lineHeight: 135,
    color: "rgba(255,248,238,0.14)",
  },
  watermarkPlain: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 92, lineHeight: 120, top: -18 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  topText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: onFill.gold,
  },
  eyebrowRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  eyebrowSa: { fontSize: 18, lineHeight: 26, color: onFill.gold },
  headline: { color: onFill.text },
  sub: { fontSize: 18, lineHeight: 27, color: onFill.text },
  gloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 13, lineHeight: 18, color: onFill.soft },
  track: { height: 4, borderRadius: 0, backgroundColor: onFill.faint, marginTop: 14, overflow: "hidden" },
  bar: { height: 4, borderRadius: 0, backgroundColor: onFill.text },
  untilRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: space.sm },
  until: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.text },
  then: { flex: 1, textAlign: "right", fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft },
  thenSa: { fontSize: 18, lineHeight: 26, color: onFill.text },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: onFill.faint,
  },
  metaItems: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.xs, rowGap: 2 },
  metaText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.text },
  metaSa: { fontSize: 18, lineHeight: 26 },
  metaNative: { fontSize: 15, lineHeight: 22 },
  dot: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: "rgba(255,248,238,0.5)" },
  placeHead: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: space.sm },
  placeName: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12, color: onFill.soft, flexShrink: 1 },
  sunRow: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: space.sm, paddingTop: space.sm, marginTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  sunItem: { flex: 1, minWidth: 110, flexDirection: "row", alignItems: "center", gap: space.xs },
  sunLabel: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 11, color: onFill.soft },
  sunTime: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, color: onFill.text },
  explainToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: onFill.faint, gap: space.sm },
  explainTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 13, color: onFill.text },
  explanations: { gap: space.sm, paddingBottom: space.xs },
  explanation: { gap: 3 },
  explanationLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 13, color: onFill.gold },
  explanationText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12, lineHeight: 19, color: onFill.text },
  failRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 156 },
  failText: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.text },
  dialGhost: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, borderWidth: 3.5, borderColor: onFill.faint },
  ghostBar: { borderRadius: 0, backgroundColor: onFill.faint },
});
