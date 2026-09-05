/**
 * Sanskritam — Guru, rendered natively.
 *
 * The same rig as the Rive build, composited from layered <Image>s with
 * Reanimated transforms. Every coordinate comes from `guruLayers.ts`, which
 * was lifted from the .riv, so this looks identical — it just doesn't need
 * the runtime, or the export.
 *
 * ── Why this isn't a 30 Hz JS loop ───────────────────────────────────────
 * The Rive version ran a requestAnimationFrame loop that wrote six properties
 * every tick. Porting that shape directly would make every motion hostage to
 * the JS thread, and this lives in a chat screen that scrolls — the guru would
 * stutter exactly when the user is doing something.
 *
 * So the split is: **JS picks targets, the UI thread interpolates.** A saccade
 * timer fires every 1.6–4 s and hands Reanimated a new gaze target; the spring
 * runs entirely on the UI thread. Breathing and idle drift are `withRepeat`
 * loops that JS never touches after mount. Blinks are a three-step sequence
 * fired from a timer. The only per-frame JS is the mouth during speech, and
 * that is a plate swap at 8–12 Hz, not a transform.
 *
 * The spring constants are the same ones tuned on the Rive build, converted
 * from (omega, zeta) to Reanimated's (stiffness, damping): stiffness = omega^2,
 * damping = 2 * zeta * omega.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Image, Pressable, StyleSheet, View,
  type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming, Easing,
  type SharedValue,
} from 'react-native-reanimated';

import {
  ART, PIVOT, LAYERS, LIDS, VISEMES, VISEME_BOX, GESTURES, GESTURE_TRAVEL,
  ki, HEAD_DEG, IRIS_DX, IRIS_DY, BROW_L_DY, BROW_R_DY, groupBox, place,
} from './guruLayers';
import { presentationFor, profileFor, type GuruPresentation } from './presentation';
import { Viseme, scheduleVisemes, visemesFor } from './viseme';

export enum AvatarState {
  Idle = 0, Speaking = 1, Thinking = 2, Listening = 3,
  Celebrating = 4, Encouraging = 5, Patient = 6,
}
export enum Gesture { None = 0, Anjali = 1, Abhaya = 2, Offer = 3, Point = 4 }

/** The screens already derive a lowercase string state, so accept that too and
 *  save every call site a conversion. */
export type AvatarStateName =
  | 'idle' | 'speaking' | 'thinking' | 'listening'
  | 'celebrating' | 'encouraging' | 'patient';
const BY_NAME: Record<AvatarStateName, AvatarState> = {
  idle: AvatarState.Idle, speaking: AvatarState.Speaking, thinking: AvatarState.Thinking,
  listening: AvatarState.Listening, celebrating: AvatarState.Celebrating,
  encouraging: AvatarState.Encouraging, patient: AvatarState.Patient,
};
const asState = (s: AvatarState | AvatarStateName): AvatarState =>
  typeof s === 'string' ? BY_NAME[s] : s;

/** Same table as the Rive director. bias is where he tends to look. */
const MOODS: Record<AvatarState, {
  bias: [number, number]; wander: number; pace: number; brow: number; glow: number;
}> = {
  [AvatarState.Idle]:        { bias: [0, 0],       wander: 1.0,  pace: 1.0,  brow: 0.08, glow: 0 },
  [AvatarState.Speaking]:    { bias: [0, 0.10],    wander: 0.55, pace: 0.7,  brow: 0.30, glow: 0.12 },
  [AvatarState.Thinking]:    { bias: [0.35, -0.5], wander: 0.40, pace: 1.7,  brow: 0.0,  glow: 0 },
  [AvatarState.Listening]:   { bias: [0, 0.12],    wander: 0.28, pace: 0.55, brow: 0.24, glow: 0.06 },
  [AvatarState.Celebrating]: { bias: [0, -0.25],   wander: 0.90, pace: 0.45, brow: 0.85, glow: 0.85 },
  [AvatarState.Encouraging]: { bias: [0, 0.05],    wander: 0.45, pace: 0.8,  brow: 0.50, glow: 0.35 },
  [AvatarState.Patient]:     { bias: [0, 0.08],    wander: 0.16, pace: 2.4,  brow: 0.10, glow: 0 },
};

/** celebrating / encouraging are one-shots in the original rig; keep the same
 *  contract so screens behave identically either way. */
export const ONE_SHOT_MS: Partial<Record<AvatarState, number>> = {
  [AvatarState.Celebrating]: 1200,
  [AvatarState.Encouraging]: 1500,
};

const EYE_SPRING   = { stiffness: 300, damping: 33, mass: 1 };  // omega 17, zeta .95 — lands in ~150 ms
const HEAD_SPRING  = { stiffness: 41,  damping: 8,  mass: 1 };  // omega 6.4, zeta .62 — heavy, ~9% overshoot
const BROW_SPRING  = { stiffness: 90,  damping: 16, mass: 1 };
const RISE_SPRING  = { stiffness: 49,  damping: 14, mass: 1 };  // omega 7, zeta 1.0 — NO overshoot, see notes

export type GuruNativeProps = {
  state: AvatarState | AvatarStateName;
  /** Square size in px. Omit to fill the parent and measure on layout. */
  size?: number;
  /** What he is saying, and for how long. Devanagari is read directly. */
  speech?: { text?: string; durationMs?: number } | null;
  /** 0..1 live level. Gates the shapes rather than driving them. */
  amplitude?: () => number;
  gesture?: Gesture;
  presentation?: GuruPresentation;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GuruNative({
  state: stateProp, size, speech = null, amplitude, gesture = Gesture.None,
  presentation, onPress, style,
}: GuruNativeProps) {
  const [measured, setMeasured] = useState(size ?? 0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    if (size) return;
    const { width, height } = e.nativeEvent.layout;
    const next = Math.min(width, height);
    setMeasured((p) => (Math.abs(p - next) > 8 ? next : p));
  }, [size]);

  const S = size ?? measured;
  const k = S / ART;
  const profileName = presentation ?? presentationFor(S || 220);
  const P = profileFor(profileName);
  const KI = ki(P.intensity);

  const reduceMotion = useReduceMotion();
  const state = asState(stateProp);

  // one-shot states return to Idle on their own, same as the Rive component
  const [effective, setEffective] = useState(state);
  useEffect(() => setEffective(state), [state]);
  useEffect(() => {
    const ms = ONE_SHOT_MS[effective];
    if (!ms) return;
    const t = setTimeout(() => setEffective(AvatarState.Idle), ms);
    return () => clearTimeout(t);
  }, [effective]);

  // ── shared values ──────────────────────────────────────────────────────
  const gazeX = useSharedValue(0);       // -100..100
  const gazeY = useSharedValue(0);
  const headSac = useSharedValue(0);     // saccade contribution
  const headDrift = useSharedValue(0);   // never-repeating idle wander
  const brow = useSharedValue(8);        // 0..100
  const lidL = useSharedValue(0);        // 0 open, 1 shut
  const lidR = useSharedValue(0);
  const visIdx = useSharedValue(0);      // 0..6
  const gIdx = useSharedValue(0);        // 0..4, fractional to fade
  const gRise = useSharedValue(100);     // 0..100
  const glow = useSharedValue(0);
  const breathSX = useSharedValue(1);
  const breathSY = useSharedValue(1);
  const sway = useSharedValue(0);

  const ready = S > 0;

  // ── ambient body: started once, never touched by JS again ──────────────
  useEffect(() => {
    if (!ready || reduceMotion) return;
    const ease = Easing.inOut(Easing.sin);
    breathSY.value = withRepeat(withSequence(
      withTiming(1.012, { duration: 1700, easing: ease }),
      withTiming(1.0,   { duration: 2300, easing: ease })), -1, false);
    breathSX.value = withRepeat(withSequence(
      withTiming(0.990, { duration: 1700, easing: ease }),
      withTiming(1.0,   { duration: 2300, easing: ease })), -1, false);
    sway.value = withRepeat(withSequence(
      withTiming(1.1,  { duration: 1600, easing: ease }),
      withTiming(-1.1, { duration: 1600, easing: ease })), -1, true);
    // drift periods are deliberately incommensurate with the breath so the
    // whole thing never visibly repeats
    headDrift.value = withRepeat(withSequence(
      withTiming(P.driftAmplitude * 100,  { duration: 3650, easing: ease }),
      withTiming(-P.driftAmplitude * 100, { duration: 3650, easing: ease })), -1, true);
    return () => {
      [breathSY, breathSX, sway, headDrift].forEach(cancelAnimation);
    };
  }, [ready, reduceMotion, P.driftAmplitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── saccades: JS picks a target, the UI thread springs to it ───────────
  useEffect(() => {
    if (!ready || reduceMotion) return;
    const m = MOODS[effective];
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      let tx: number, ty: number;
      if (Math.random() < P.returnBias) {
        // look back to where he was — real gaze is away/back, not a random walk
        tx = m.bias[0] + (Math.random() * 2 - 1) * 0.10;
        ty = m.bias[1] + (Math.random() * 2 - 1) * 0.07;
      } else {
        tx = m.bias[0] + (Math.random() * 2 - 1) * m.wander;
        ty = m.bias[1] + (Math.random() * 2 - 1) * m.wander * 0.5;
      }
      tx = Math.max(-1, Math.min(1, tx));
      ty = Math.max(-1, Math.min(1, ty));
      gazeX.value = withSpring(tx * 100, EYE_SPRING);
      gazeY.value = withSpring(ty * 100, EYE_SPRING);
      // the head commits ~50 ms after the eyes, and only partly (2.8)
      headSac.value = withDelay(50, withSpring(tx * 100 * P.gazeToHead, HEAD_SPRING));
      if (Math.random() < 0.22) {
        const blip = (0.18 + Math.random() * 0.16) * 100;
        brow.value = withSequence(
          withSpring(m.brow * 100 + blip, BROW_SPRING),
          withDelay(220, withSpring(m.brow * 100, BROW_SPRING)));
      }
      const [lo, hi] = P.saccadeInterval;
      timer = setTimeout(step, (lo + Math.random() * (hi - lo)) * m.pace * 1000);
    };
    step();
    return () => clearTimeout(timer);
  }, [ready, reduceMotion, effective, profileName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── mood pose ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const m = MOODS[effective];
    brow.value = withSpring(m.brow * 100, BROW_SPRING);
    glow.value = withTiming(m.glow, { duration: 260 });
  }, [ready, effective]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── blink: 3–7 s, jittered, with the lids 2 frames out of step ─────────
  useEffect(() => {
    if (!ready || reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    let dbl: ReturnType<typeof setTimeout>;
    const fire = () => {
      const shut = () => withSequence(
        withTiming(1, { duration: 70,  easing: Easing.out(Easing.quad) }),   // fast out
        withDelay(35, withTiming(0, { duration: 130, easing: Easing.in(Easing.quad) })));  // slow in
      lidL.value = shut();
      lidR.value = withDelay(33, shut());          // never in lockstep (10.4)
    };
    const schedule = () => {
      timer = setTimeout(() => {
        fire();
        if (Math.random() < 0.18) dbl = setTimeout(fire, 160 + Math.random() * 90);
        schedule();
      }, 3000 + Math.random() * 4000);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(dbl); };
  }, [ready, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── mouth ──────────────────────────────────────────────────────────────
  const ampRef = useRef(amplitude); ampRef.current = amplitude;
  const speaking = effective === AvatarState.Speaking;
  const text = speech?.text;
  const durationMs = speech?.durationMs;

  useEffect(() => {
    if (!ready || !speaking) { visIdx.value = 0; return; }

    const sched = text && durationMs
      ? scheduleVisemes(visemesFor(text), durationMs, { minMs: P.visemeMinMs })
      : null;
    const t0 = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;

    const apply = (v: Viseme) => {
      const amp = ampRef.current?.();
      // Quiet moments close the mouth whatever the text expected — the shapes
      // come from the script, the energy from the signal.
      let out = v;
      if (amp !== undefined && v !== Viseme.Rest) {
        if (amp < 0.06) out = Viseme.Rest;
        else if (amp < 0.22 && v === Viseme.AAH) out = Viseme.AA;
      }
      visIdx.value = out;
    };

    const tick = () => {
      const t = Date.now() - t0;
      if (sched) {
        while (i + 1 < sched.length && sched[i + 1].at <= t) i++;
        apply(t > (durationMs ?? 0) ? Viseme.Rest : sched[i].v);
        const nextAt = sched[i + 1]?.at;
        timer = setTimeout(tick, nextAt === undefined ? 120 : Math.max(16, nextAt - t));
      } else {
        // no text: an irregular shape walk at 6–9 Hz. Not lip sync, but not a
        // closed mouth either, and never a fixed cycle.
        const pool = [Viseme.AA, Viseme.AAH, Viseme.EE, Viseme.OH, Viseme.OO, Viseme.AA];
        apply(pool[(Math.random() * pool.length) | 0]);
        timer = setTimeout(tick, 1000 / (6 + Math.random() * 3));
      }
    };
    tick();
    return () => { clearTimeout(timer); visIdx.value = 0; };
  }, [ready, speaking, text, durationMs, P.visemeMinMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── gestures ───────────────────────────────────────────────────────────
  const prevG = useRef<Gesture>(Gesture.None);
  useEffect(() => {
    if (!ready) return;
    const to = gesture;
    const from = prevG.current;
    prevG.current = to;
    if (reduceMotion) { gIdx.value = to; gRise.value = 100; return; }

    const raise = () => {
      gRise.value = 0;
      gIdx.value = withTiming(to, { duration: 110 });
      gRise.value = withSpring(100, RISE_SPRING);
    };
    if (to === Gesture.None) {
      gIdx.value = withTiming(0, { duration: 160 });
      gRise.value = withSpring(0, RISE_SPRING);
    } else if (from !== Gesture.None && from !== to) {
      // route through 0 — ramping 1 -> 4 would sweep through 2 and 3 and flash
      // two poses nobody asked for
      gIdx.value = withTiming(0, { duration: 130 });
      const t = setTimeout(raise, 140);
      return () => clearTimeout(t);
    } else {
      raise();
    }
  }, [ready, gesture, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── styles ─────────────────────────────────────────────────────────────
  const rootStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: breathSX.value },
      { scaleY: breathSY.value },
      { rotateZ: `${sway.value}deg` },
    ],
  }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${(headSac.value + headDrift.value) * HEAD_DEG * KI}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.7,
    transform: [{ scale: 0.9 + glow.value * 0.18 }],
  }));
  const irisLStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gazeX.value * IRIS_DX * KI * k },
                { translateY: gazeY.value * IRIS_DY * KI * k }],
  }));
  const irisRStyle = irisLStyle;
  const browLStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -brow.value * BROW_L_DY * KI * k }],
  }));
  const browRStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -brow.value * BROW_R_DY * KI * k }],
  }));

  const box = useMemo<ViewStyle>(() => (size ? { width: size, height: size } : { flex: 1 }), [size]);

  const content = (
    <View style={[styles.wrap, box, style]} onLayout={onLayout}>
      {ready ? (
        <Animated.View style={[groupBox(...PIVOT.root, k), rootStyle]}>
          <Animated.Image source={LAYERS.glow.src}
            style={[place(LAYERS.glow, ...PIVOT.root, k), glowStyle]} resizeMode="stretch" />
          <Image source={LAYERS.body.src}
            style={place(LAYERS.body, ...PIVOT.root, k)} resizeMode="stretch" />

          <MalaGroup k={k} />

          {GESTURES.map((g, i) => (
            <GesturePlate key={i} index={i} g={g} k={k} gIdx={gIdx} gRise={gRise} />
          ))}

          <Animated.View style={[groupBox(...PIVOT.head, k), headStyle]}>
            <Image source={LAYERS.headCore.src} style={place(LAYERS.headCore, ...PIVOT.head, k)} resizeMode="stretch" />
            <JataGroup k={k} />
            <JawGroup k={k} />
            <Image source={LAYERS.facePatch.src} style={place(LAYERS.facePatch, ...PIVOT.head, k)} resizeMode="stretch" />
            <Animated.Image source={LAYERS.irisL.src} style={[place(LAYERS.irisL, ...PIVOT.head, k), irisLStyle]} resizeMode="stretch" />
            <Animated.Image source={LAYERS.irisR.src} style={[place(LAYERS.irisR, ...PIVOT.head, k), irisRStyle]} resizeMode="stretch" />
            <Image source={LAYERS.lashL.src} style={place(LAYERS.lashL, ...PIVOT.head, k)} resizeMode="stretch" />
            <Image source={LAYERS.lashR.src} style={place(LAYERS.lashR, ...PIVOT.head, k)} resizeMode="stretch" />
            <Animated.Image source={LAYERS.browL.src} style={[place(LAYERS.browL, ...PIVOT.head, k), browLStyle]} resizeMode="stretch" />
            <Animated.Image source={LAYERS.browR.src} style={[place(LAYERS.browR, ...PIVOT.head, k), browRStyle]} resizeMode="stretch" />
            {LIDS.map((l, i) => <Lid key={i} lid={l} k={k} v={i === 0 ? lidL : lidR} />)}
            {VISEMES.map((src, i) => <VisemePlate key={i} src={src} index={i + 1} k={k} v={visIdx} />)}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="image" accessibilityLabel="Guru" hitSlop={8}>
      {content}
    </Pressable>
  );
}

/* ── sub-groups (each needs its own pivot box) ───────────────────────────── */

const MalaGroup = ({ k }: { k: number }) => (
  <View style={groupBox(...PIVOT.mala, k)} pointerEvents="none">
    <Image source={LAYERS.mala.src} style={place(LAYERS.mala, ...PIVOT.mala, k)} resizeMode="stretch" />
  </View>
);
const JataGroup = ({ k }: { k: number }) => (
  <>
    <View style={groupBox(...PIVOT.jataL, k, ...PIVOT.head)} pointerEvents="none">
      <Image source={LAYERS.jataL.src} style={place(LAYERS.jataL, ...PIVOT.jataL, k)} resizeMode="stretch" />
    </View>
    <View style={groupBox(...PIVOT.jataR, k, ...PIVOT.head)} pointerEvents="none">
      <Image source={LAYERS.jataR.src} style={place(LAYERS.jataR, ...PIVOT.jataR, k)} resizeMode="stretch" />
    </View>
  </>
);
const JawGroup = ({ k }: { k: number }) => (
  <View style={groupBox(...PIVOT.jaw, k, ...PIVOT.head)} pointerEvents="none">
    <Image source={LAYERS.jaw.src} style={place(LAYERS.jaw, ...PIVOT.jaw, k)} resizeMode="stretch" />
  </View>
);

/** Eyelid — revealed downward by animating height, so the plate squashes from
 *  the top rather than sliding over the eye. */
function Lid({ lid, k, v }: { lid: typeof LIDS[number]; k: number; v: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ height: Math.max(0.01, lid.h * k * v.value), opacity: v.value > 0.001 ? 1 : 0 }));
  return (
    <Animated.Image
      source={lid.src}
      resizeMode="stretch"
      style={[{
        position: 'absolute',
        left: (lid.cx - (PIVOT.head[0] - ART / 2)) * k - (lid.w * k) / 2,
        top:  (lid.top - (PIVOT.head[1] - ART / 2)) * k,
        width: lid.w * k,
      }, st]}
    />
  );
}

/** One mouth plate. Opacity is `max(0, 1 - |viseme - n|)`, the same formula the
 *  .riv used — integers hard-swap, a fractional value cross-fades. */
function VisemePlate({ src, index, k, v }: { src: number; index: number; k: number; v: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(v.value - index)) }));
  return (
    <Animated.Image source={src} resizeMode="stretch"
      style={[place(VISEME_BOX, ...PIVOT.head, k), st]} />
  );
}

/** One hand plate. Rises 100 units with a sideways arc, critically damped. */
function GesturePlate({ index, g, k, gIdx, gRise }: {
  index: number; g: typeof GESTURES[number]; k: number;
  gIdx: SharedValue<number>; gRise: SharedValue<number>;
}) {
  const n = index + 1;
  const st = useAnimatedStyle(() => {
    const drop = (100 - gRise.value) / 100;
    return {
      opacity: Math.max(0, 1 - Math.abs(gIdx.value - n)),
      transform: [
        { translateX: g.arc * drop * k },
        { translateY: GESTURE_TRAVEL * drop * k },
      ],
    };
  });
  return (
    <Animated.Image source={g.src} resizeMode="stretch"
      style={[place(g, ...PIVOT.root, k), st]} />
  );
}

export function useReduceMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setOn(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => { alive = false; sub.remove(); };
  }, []);
  return on;
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
