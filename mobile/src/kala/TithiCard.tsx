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
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useMotionDuration } from "../hooks/useReducedMotion";
import { duration, easing } from "../motion";
import { haptics } from "../services/haptics";
import { ensureScriptFont } from "../services/scriptFonts";
import { fill, onFill, radius, script, shadow, space } from "../theme";
import { faceFor, isRegionalScript } from "./faces";
import MoonDial from "./MoonDial";
import { useToday } from "./useToday";

const DIAL = 76;

const HEADLINE_SIZE = {
  sanskrit: { fontSize: 25, lineHeight: 38 },
  roman: { fontSize: 22, lineHeight: 30 },
  regional: { fontSize: 23, lineHeight: 36 },
} as const;

export default function TithiCard() {
  const focused = useIsFocused();
  const today = useToday(focused);
  const { view, failed } = today;
  const navigation = useNavigation();
  const [, setFontTick] = useState(0);

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
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={
          failed ? "Today's date could not be worked out. Tap to retry." : view ? view.label : "Today's date, loading"
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
              <Text style={styles.until}>{view.until}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fill.slate,
    borderRadius: radius.lg,
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
  track: { height: 4, borderRadius: 2, backgroundColor: onFill.faint, marginTop: 14, overflow: "hidden" },
  bar: { height: 4, borderRadius: 2, backgroundColor: onFill.text },
  untilRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: space.sm },
  until: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.text },
  then: { flexShrink: 1, textAlign: "right", fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12.5, color: onFill.soft },
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
  failRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 156 },
  failText: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 14, color: onFill.text },
  dialGhost: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, borderWidth: 3.5, borderColor: onFill.faint },
  ghostBar: { borderRadius: 4, backgroundColor: onFill.faint },
});
