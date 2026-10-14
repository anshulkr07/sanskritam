// VocalTract — an animated mid-sagittal cross-section of the mouth and throat.
//
// Tapping a varṇa plays the sound and runs the articulation gesture that makes
// it: the tongue travels to its place, seals, pressure builds, the closure
// releases. The four things that distinguish the columns of the sparśa grid
// are each a visible channel:
//
//   place       → where along the roof the tongue makes contact (क throat … प lips)
//   voicing     → when the vocal folds start buzzing. Voiced stops hum THROUGH
//                 the closure; voiceless ones only start after the release.
//                 That lag is the whole ग/क contrast and it is hard to hear.
//   aspiration  → how long the puff of air lasts after the burst (क vs ख)
//   nasality    → the soft palate drops and the air leaves through the nose (ङ)
//
// The tongue path is rebuilt on the UI thread each frame from the 9-number
// constriction profile in phonetics.ts; everything else animates as plain
// numeric props. Reduce Motion pins the diagram at the closure pose.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  FLOOR_X, FLOOR_Y, I0, I1, N, PLACE_COLORS, PLACE_I, PLACE_LABEL, PLACE_ORDER,
  PROFILES, ROOF_X, ROOF_Y, STATIONS, VELUM_I,
  airAt, articAt, articulationSummary, flagsOf, phaseAt, pressAt, roofAt,
  velumAt, voiceAt,
  type Articulation,
} from "../phonetics";
import { color, font, radius, script, space } from "../theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FOLD_REST = "#A9836A";   // folds apart and still
const FOLD_VOICED = "#CA4715"; // folds buzzing

// ── Static geometry, computed once on the JS thread ───────────────────

/** Catmull-Rom through a flat [x0,y0,x1,y1,…] list. */
function curveThrough(xs: number[], ys: number[], from: number, to: number, lead: boolean): string {
  "worklet";
  const step = to >= from ? 1 : -1;
  const n = Math.abs(to - from) + 1;
  const ix = (k: number) => from + step * Math.max(0, Math.min(n - 1, k));
  let d = lead ? `M${xs[ix(0)].toFixed(1)},${ys[ix(0)].toFixed(1)}` : "";
  for (let k = 0; k < n - 1; k++) {
    const a = ix(Math.max(k - 1, 0)), b = ix(k), c = ix(k + 1), e = ix(Math.min(k + 2, n - 1));
    d += `C${(xs[b] + (xs[c] - xs[a]) / 6).toFixed(1)},${(ys[b] + (ys[c] - ys[a]) / 6).toFixed(1)}`
       + ` ${(xs[c] - (xs[e] - xs[b]) / 6).toFixed(1)},${(ys[c] - (ys[e] - ys[b]) / 6).toFixed(1)}`
       + ` ${xs[c].toFixed(1)},${ys[c].toFixed(1)}`;
  }
  return d;
}

const ROOF_D = curveThrough(ROOF_X, ROOF_Y, 0, N - 1, true);
const FLOOR_D = curveThrough(FLOOR_X, FLOOR_Y, 0, N - 1, true);
const LIP_TOP: [number, number] = [ROOF_X[N - 1] + 16, ROOF_Y[N - 1] + 4];
const LIP_BOT: [number, number] = [FLOOR_X[N - 1] + 18, FLOOR_Y[N - 1] - 4];
const LIP_TRAVEL = 14.5; // each lip moves this far; together they seal the mouth
const LIP_MID: [number, number] = [(LIP_TOP[0] + LIP_BOT[0]) / 2, (LIP_TOP[1] + LIP_BOT[1]) / 2];

/** The airway: the whole tube from larynx to lips. Fixed — the lips cap it. */
const AIRWAY_D =
  ROOF_D
  + `L${LIP_TOP[0].toFixed(1)},${LIP_TOP[1].toFixed(1)}`
  + `L${LIP_BOT[0].toFixed(1)},${LIP_BOT[1].toFixed(1)}`
  + `L${FLOOR_X[N - 1].toFixed(1)},${FLOOR_Y[N - 1].toFixed(1)}`
  + curveThrough(FLOOR_X, FLOOR_Y, N - 1, 0, false)
  + "Z";

const NASAL_D =
  "M66,100 C78,62 120,42 172,36 C208,32 240,36 256,42 L260,64 "
  + "C242,58 210,56 180,60 C134,66 98,80 82,110 Z";

const VELUM_HINGE = roofAt(VELUM_I);
const I0_IDX = Math.round(I0 * (N - 1));
const I1_IDX = Math.round(I1 * (N - 1));

// ── Worklet helpers ───────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  "worklet";
  return a + (b - a) * t;
}
/** Catmull-Rom through the 9 constriction stations. */
function constrictionAt(profile: number[], f: number): number {
  "worklet";
  const n = STATIONS.length;
  if (f <= STATIONS[0]) return profile[0];
  if (f >= STATIONS[n - 1]) return profile[n - 1];
  let i = 0;
  while (i < n - 2 && STATIONS[i + 1] < f) i++;
  const t = (f - STATIONS[i]) / (STATIONS[i + 1] - STATIONS[i]);
  const p0 = profile[Math.max(i - 1, 0)], p1 = profile[i];
  const p2 = profile[i + 1], p3 = profile[Math.min(i + 2, n - 1)];
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// ── Phase captions ────────────────────────────────────────────────────

const PHASES = ["approach", "closure", "release", "after", "rest"] as const;
type Phase = (typeof PHASES)[number];

function captionFor(phase: Phase, a: Articulation): string {
  const where = PLACE_LABEL[a.place]?.where ?? a.place;
  switch (phase) {
    case "approach":
      return a.labial ? "The lips come together." : `The tongue moves to ${where}.`;
    case "closure":
      if (a.nasal) return "Held shut, but the soft palate drops and the air escapes through the nose.";
      if (a.manner === "stop") return `Sealed at ${where}. Pressure builds behind the closure.`;
      if (a.manner === "fricative") return `A narrow gap at ${where}. The air hisses through.`;
      return `Close to ${where}, without touching.`;
    case "release":
      if (a.nasal) return "The hum keeps going out through the nose.";
      if (a.manner !== "stop") return "The airflow continues.";
      return a.aspirated
        ? "Release: a burst, then a clear puff of breath."
        : "Release: a clean burst, no puff.";
    case "after":
      return a.voiced
        ? "Voice is already present; it continues into the vowel."
        : "Voice begins after release. Listen for the delay.";
    default:
      return "Back to rest.";
  }
}

// ── Component ─────────────────────────────────────────────────────────

interface VocalTractProps {
  articulation: Articulation;
  char: string;
  iast: string;
  /** Changes on every tap; each change replays the gesture. */
  playToken: number;
  /**
   * Panel mode: just the drawing and one caption line, no card, no header,
   * no summary. The screen supplies the letter, controls and slow toggle.
   */
  compact?: boolean;
  /** Controlled slow motion (compact mode). Uncontrolled when omitted. */
  slow?: boolean;
}

const BASE_MS = 9500;
const SLOW_MS = 16000;

export default function VocalTract({
  articulation: a,
  char,
  iast,
  playToken,
  compact = false,
  slow: slowProp,
}: VocalTractProps) {
  const reduced = useReducedMotion();
  const [slowState, setSlow] = useState(false);
  const slow = slowProp ?? slowState;
  const [phase, setPhase] = useState<Phase>(reduced ? "closure" : "rest");
  const tint = PLACE_COLORS[a.place] ?? color.saffron;

  const t = useSharedValue(reduced ? 0.42 : 0);
  const profile = useSharedValue(a.profile);
  const flags = useSharedValue(flagsOf(a));

  useEffect(() => {
    profile.value = a.profile;
    flags.value = flagsOf(a);
  }, [a, profile, flags]);

  const run = useCallback(() => {
    if (reduced) { t.value = 0.42; setPhase("closure"); return; }
    t.value = 0;
    t.value = withTiming(1, { duration: slow ? SLOW_MS : BASE_MS, easing: Easing.linear });
  }, [reduced, slow, t]);

  useEffect(run, [playToken, run]);

  // ── Channels, all derived from the single clock `t` ────────────────
  // A continuant (vowel, semivowel, sibilant) has no burst, so it holds its
  // posture the way a nasal does rather than snapping open.
  const artic = useDerivedValue(() => articAt(t.value, flags.value));
  const press = useDerivedValue(() => pressAt(t.value, flags.value));
  const air = useDerivedValue(() => airAt(t.value, flags.value));
  const voice = useDerivedValue(() => voiceAt(t.value, flags.value));
  const velumOpen = useDerivedValue(() => velumAt(t.value, flags.value));
  const lipClose = useDerivedValue(() => (flags.value.labial ? artic.value : 0));

  // Phase index → caption, hopped to the JS thread only when it changes.
  const phaseIndex = useDerivedValue(() => phaseAt(t.value, flags.value));
  useAnimatedReaction(
    () => phaseIndex.value,
    (i, prev) => { if (i !== prev) runOnJS(setPhase)(PHASES[i]); },
    [],
  );

  // ── Animated shapes ───────────────────────────────────────────────
  const tongueProps = useAnimatedProps(() => {
    const p = profile.value;
    const k = artic.value;
    const xs: number[] = [], ys: number[] = [];
    for (let i = I0_IDX; i <= I1_IDX; i++) {
      const f = i / (N - 1);
      const rest = constrictionAt(PROFILES.rest, f);
      const c = Math.max(0, Math.min(1, lerp(rest, constrictionAt(p, f), k)));
      xs.push(lerp(FLOOR_X[i], ROOF_X[i], c));
      ys.push(lerp(FLOOR_Y[i], ROOF_Y[i], c));
    }
    const surface = curveThrough(xs, ys, 0, xs.length - 1, true);
    const underside = curveThrough(FLOOR_X, FLOOR_Y, I1_IDX, I0_IDX, false);
    return { d: `${surface}L${FLOOR_X[I1_IDX].toFixed(1)},${FLOOR_Y[I1_IDX].toFixed(1)}${underside}Z` };
  });

  const velumProps = useAnimatedProps(() => {
    const o = velumOpen.value;
    const hx = VELUM_HINGE[0], hy = VELUM_HINGE[1];
    return {
      d: `M${hx},${hy}C${lerp(hx - 12, hx + 11, o).toFixed(1)},${lerp(hy - 11, hy + 20, o).toFixed(1)}`
        + ` ${lerp(hx - 23, hx + 13, o).toFixed(1)},${lerp(hy - 16, hy + 39, o).toFixed(1)}`
        + ` ${lerp(hx - 30, hx + 10, o).toFixed(1)},${lerp(hy - 16, hy + 52, o).toFixed(1)}`,
    };
  });

  const upperLipProps = useAnimatedProps(() => ({
    d: `M${ROOF_X[N - 1]},${ROOF_Y[N - 1]}L${LIP_TOP[0]},${(LIP_TOP[1] + LIP_TRAVEL * lipClose.value).toFixed(1)}`,
  }));
  const lowerLipProps = useAnimatedProps(() => ({
    d: `M${FLOOR_X[N - 1]},${FLOOR_Y[N - 1]}L${LIP_BOT[0]},${(LIP_BOT[1] - LIP_TRAVEL * lipClose.value).toFixed(1)}`,
  }));

  const target = a.labial ? LIP_MID : roofAt(PLACE_I[a.place] ?? 0.6);
  const pressureProps = useAnimatedProps(() => ({
    r: 10 + 13 * press.value,
    opacity: 0.2 * press.value,
  }));
  const voiceGlowProps = useAnimatedProps(() => ({
    r: 13 + 7 * voice.value,
    opacity: 0.2 * voice.value,
  }));
  const foldProps = useAnimatedProps(() => {
    const v = voice.value * 4;
    return {
      d: `M48,${(233 - v).toFixed(1)}L94,${(236 - v).toFixed(1)}M48,${(247 + v).toFixed(1)}L94,${(244 + v).toFixed(1)}`,
      stroke: interpolateColor(voice.value, [0, 1], [FOLD_REST, FOLD_VOICED]),
    };
  });
  const puffProps = useAnimatedProps(() => {
    const w = air.value;
    return {
      opacity: 0.6 * w,
      d: `M${LIP_MID[0] + 16},${LIP_MID[1]}q12,-8 ${(16 + 22 * w).toFixed(0)},-3`
        + `q-10,8 -${(11 + 15 * w).toFixed(0)},10Z`,
    };
  });
  const nasalProps = useAnimatedProps(() => ({ opacity: 0.3 + 0.6 * velumOpen.value }));
  const activeMarkerProps = useAnimatedProps(() => ({ r: 5 + 2.5 * artic.value }));

  const label = PLACE_LABEL[a.place] ?? { sa: a.place, en: a.place, where: a.place };
  const summary = useMemo(() => articulationSummary(a, char), [a, char]);

  const stage = (
      <View
        style={styles.stage}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
      >
        <Svg width="100%" height="100%" viewBox="0 0 300 260">
          <AnimatedPath d={NASAL_D} fill="#E4EEF6" stroke="#C3D6E5" strokeWidth={1} animatedProps={nasalProps} />
          <Path d={AIRWAY_D} fill="#E4EEF6" stroke="#C3D6E5" strokeWidth={1} />

          <AnimatedCircle cx={target[0] - 28} cy={target[1] + 44} fill={tint} animatedProps={pressureProps} />

          <AnimatedPath
            animatedProps={tongueProps}
            fill={tint} fillOpacity={0.9} stroke={tint} strokeWidth={1.5} strokeLinejoin="round"
          />

          <Path d={ROOF_D} stroke="#A9836A" strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <Path d={FLOOR_D} stroke="#A9836A" strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <AnimatedPath animatedProps={velumProps} stroke="#A9836A" strokeWidth={6} fill="none" strokeLinecap="round" />

          <AnimatedPath animatedProps={upperLipProps} stroke="#E3C3A6" strokeWidth={13} strokeLinecap="round" fill="none" />
          <AnimatedPath animatedProps={lowerLipProps} stroke="#E3C3A6" strokeWidth={13} strokeLinecap="round" fill="none" />

          {/* Larynx: the vocal folds live here. They buzz when voicing is on. */}
          <Rect x={40} y={222} width={62} height={34} rx={14} fill="#E4EEF6" stroke="#A9836A" strokeWidth={1.6} />
          <AnimatedCircle cx={71} cy={239} fill={color.saffronText} animatedProps={voiceGlowProps} />
          <AnimatedPath animatedProps={foldProps} strokeWidth={4} strokeLinecap="round" fill="none" />

          {/* Place markers along the roof — the five rows of the grid, in order. */}
          {PLACE_ORDER.map((p) => {
            const pt = p === "oshthya" ? LIP_MID : roofAt(PLACE_I[p]);
            const on = p === a.place;
            if (on) {
              return (
                <AnimatedCircle
                  key={p} cx={pt[0]} cy={pt[1]} fill={PLACE_COLORS[p]} animatedProps={activeMarkerProps}
                />
              );
            }
            return (
              <Circle
                key={p} cx={pt[0]} cy={pt[1]} r={4}
                fill={color.white} stroke={PLACE_COLORS[p]} strokeWidth={2} opacity={0.5}
              />
            );
          })}

          <AnimatedPath animatedProps={puffProps} fill={color.saffronText} />
        </Svg>
      </View>
  );

  // Panel mode (the alphabet screen pins this above the letters): the drawing
  // and a one-line caption. The screen owns the letter, replay and slow.
  if (compact) {
    return (
      <View>
        {stage}
        <Text style={[styles.caption, styles.captionCompact]} numberOfLines={3}>
          {captionFor(phase, a)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            <Text style={script("bold")}>{char}</Text>
            <Text style={styles.titleIast}>  {iast}</Text>
          </Text>
          <Text style={[styles.place, { color: tint }]}>
            {label.sa} · {label.en}
          </Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={run}
            accessibilityRole="button"
            accessibilityLabel="Replay the articulation"
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <Text style={styles.chipText}>Replay</Text>
          </Pressable>
          <Pressable
            onPress={() => setSlow((s) => !s)}
            accessibilityRole="switch"
            accessibilityState={{ checked: slow }}
            accessibilityLabel="Slow motion"
            style={({ pressed }) => [
              styles.chip, slow && { backgroundColor: tint, borderColor: tint }, pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, slow && { color: color.white }]}>Slow</Text>
          </Pressable>
        </View>
      </View>
      {stage}
      <Text style={styles.caption}>{captionFor(phase, a)}</Text>
      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.lg,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerText: { flex: 1 },
  title: { fontSize: font.sizes.lg, color: color.ink },
  titleIast: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  place: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, marginTop: 2 },
  controls: { flexDirection: "row", gap: space.xs },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipPressed: { opacity: 0.6 },
  chipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.xs, color: color.inkSoft },
  stage: { width: "100%", aspectRatio: 300 / 260, marginTop: space.xs },
  caption: {
    fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm,
    color: color.ink, marginTop: space.xs, minHeight: 36, lineHeight: 18,
  },
  // Compact: a smaller caption whose height is reserved (three lines), so the
  // letters below never shift as the phases change.
  captionCompact: { fontSize: font.sizes.xs, lineHeight: 15, minHeight: 45, marginTop: 4 },
  summary: {
    fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.xs,
    color: color.inkSoft, marginTop: 2, lineHeight: 16,
  },
});
