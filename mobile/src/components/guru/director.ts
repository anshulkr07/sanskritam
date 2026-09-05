/**
 * Sanskritam — Guru director
 *
 * Everything that makes him look alive rather than merely animated.
 *
 * The .riv timelines give the body: breathing, a slow sway, the jata and mala
 * trailing behind it. They do not turn his head, move his eyes, lift his brows
 * or open his jaw — those four are the app's, exclusively (see rig.ts). This
 * module is what fills them in, procedurally, so the behaviour never repeats
 * the way an 8-second loop does.
 *
 * Three ideas do most of the work:
 *
 *  1. Eyes lead, head follows (rive_ui.md 2.8). A saccade lands in ~120 ms;
 *     the head starts 50 ms later and takes ~600 ms to arrive, on a slightly
 *     underdamped spring so it overshoots a few percent and settles (2.4).
 *  2. Nothing is periodic. The idle drift is three sines whose periods share
 *     no common factor, so the pattern does not visibly recur (2.6).
 *  3. Amplitude is a function of size, not taste. At chat-avatar size the
 *     irises move less than one pixel, so a look-at target is spent on the
 *     neck instead (see presentation.ts for the measurements).
 */
import { useEffect, useRef } from 'react';
import { AvatarState, MOUTH_RIG_READY, type GuruRig } from './rig';
import { profileFor, type GuruPresentation } from './presentation';

const TAU = Math.PI * 2;

type Spring = { x: number; v: number };

/**
 * Exact step of a damped harmonic oscillator.
 *
 * The obvious `v += (target-x)*k*dt - v*c*dt` is tempting and wrong here: the
 * director ticks at 24-30 Hz, and a spring fast enough to land a saccade in
 * ~150 ms has c*dt > 1 at that rate, which flips the velocity sign every step
 * and rings or diverges. This closed form is stable at any dt and gives the
 * same motion whether the device is running at 24 or 120 Hz.
 *
 * @param w  undamped angular frequency (rad/s) — how fast it wants to move
 * @param z  damping ratio — 1 is critical, below 1 overshoots and settles
 */
const spring = (s: Spring, target: number, w: number, z: number, dt: number) => {
  const d = s.x - target;
  const e = Math.exp(-z * w * dt);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const A = d;
    const B = (s.v + z * w * d) / wd;
    const c = Math.cos(wd * dt);
    const sn = Math.sin(wd * dt);
    s.x = target + e * (A * c + B * sn);
    s.v = e * (-z * w * (A * c + B * sn) + wd * (-A * sn + B * c));
  } else {
    // critically damped
    const B = s.v + w * d;
    s.x = target + e * (d + B * dt);
    s.v = e * (s.v - B * w * dt);
  }
};

/** Eyes: land a saccade in ~150 ms with almost no overshoot. */
const EYE_W = 26, EYE_Z = 0.95;
/** Head: heavy. Overshoots ~9% and settles over ~1 s (rive_ui.md 2.4). */
const HEAD_W = 6.4, HEAD_Z = 0.62;
/** Brows: quick but soft. */
const BROW_W = 9.5, BROW_Z = 0.85;

interface StateMood {
  /** Where he tends to look. y > 0 is downward. */
  bias: [number, number];
  /** How far a saccade may stray from that bias. */
  wander: number;
  /** Multiplier on the ambient saccade interval. */
  pace: number;
  brow: number;
  smile: number;
  glow: number;
}

const MOODS: Record<AvatarState, StateMood> = {
  // Looks around the room. This is the only state that truly wanders.
  [AvatarState.Idle]:        { bias: [0, 0],      wander: 1.0, pace: 1.0,  brow: 0.08, smile: 0.15, glow: 0.0 },
  // Speech gaze: mostly on the listener, with regular glances away.
  [AvatarState.Speaking]:    { bias: [0, 0.1],    wander: 0.55, pace: 0.7, brow: 0.3,  smile: 0.28, glow: 0.12 },
  // Up and away — the universal "working on it" direction.
  [AvatarState.Thinking]:    { bias: [0.35, -0.5], wander: 0.4, pace: 1.7, brow: 0.0,  smile: 0.05, glow: 0.0 },
  // Attentive: locked on, small frequent adjustments, brows slightly lifted.
  [AvatarState.Listening]:   { bias: [0, 0.12],   wander: 0.28, pace: 0.55, brow: 0.24, smile: 0.2,  glow: 0.06 },
  [AvatarState.Celebrating]: { bias: [0, -0.25],  wander: 0.9, pace: 0.45, brow: 0.85, smile: 0.95, glow: 0.85 },
  [AvatarState.Encouraging]: { bias: [0, 0.05],   wander: 0.45, pace: 0.8, brow: 0.5,  smile: 0.6,  glow: 0.35 },
  // Deliberately the stillest state. rive_ui.md 11: no impatience here.
  [AvatarState.Patient]:     { bias: [0, 0.08],   wander: 0.16, pace: 2.4, brow: 0.1,  smile: 0.22, glow: 0.0 },
};

export interface DirectorOptions {
  state: AvatarState;
  presentation: GuruPresentation;
  /** Skips all ambient motion. States and their static poses still apply. */
  reduceMotion?: boolean;
  /** Override the look-at target, -1..1 each. Use when he should track a
   *  real thing on screen (a card, the keyboard, the user's tap). */
  lookAt?: { x: number; y: number } | null;
  /** Called after a tick that actually wrote something. */
  onCommit?: () => void;
}

export function useGuruDirector(rig: GuruRig, opts: DirectorOptions) {
  const { state, presentation, reduceMotion = false, lookAt = null, onCommit } = opts;

  const rigRef = useRef(rig);   rigRef.current = rig;
  const optRef = useRef(opts);  optRef.current = opts;

  useEffect(() => {
    if (!rig.ready) return;

    const p = profileFor(presentation);
    rigRef.current.intensity(p.intensity);

    // Static pose for reduce-motion: adopt the mood, then stop.
    if (reduceMotion) {
      const m = MOODS[state];
      rigRef.current.headTurn(0);
      rigRef.current.gazeX(0);
      rigRef.current.gazeY(0);
      rigRef.current.browRaise(m.brow);
      rigRef.current.smile(m.smile);
      rigRef.current.glow(m.glow);
      if (rigRef.current.consumeDirty()) onCommit?.();
      return;
    }

    const eyeX: Spring = { x: 0, v: 0 };
    const eyeY: Spring = { x: 0, v: 0 };
    const headX: Spring = { x: 0, v: 0 };
    const brow: Spring = { x: MOODS[state].brow, v: 0 };

    let targetX = 0;
    let targetY = 0;
    let headTarget = 0;
    let nextSaccade = 0;
    let browBlip = 0;

    const t0 = Date.now();
    let last = t0;
    let acc = 0;
    const step = 1 / p.tickHz;
    let raf = 0;

    const pickSaccade = (t: number, m: StateMood) => {
      const src = optRef.current.lookAt;
      if (src) {
        // Tracking something real: small corrective drift around it only.
        targetX = src.x + (Math.random() - 0.5) * 0.12;
        targetY = src.y + (Math.random() - 0.5) * 0.08;
      } else if (Math.random() < p.returnBias) {
        // Come back to where he was looking. Real gaze is look-away /
        // look-back, not a random walk, and without this he reads as vacant.
        targetX = m.bias[0] + (Math.random() * 2 - 1) * 0.1;
        targetY = m.bias[1] + (Math.random() * 2 - 1) * 0.07;
      } else {
        targetX = m.bias[0] + (Math.random() * 2 - 1) * m.wander;
        targetY = m.bias[1] + (Math.random() * 2 - 1) * m.wander * 0.5;
      }
      targetX = Math.max(-1, Math.min(1, targetX));
      targetY = Math.max(-1, Math.min(1, targetY));
      // The head commits to the move ~50 ms after the eyes do (2.8), and only
      // partly — at chat size that fraction is most of the visible motion.
      setTimeout(() => { headTarget = targetX; }, 50);
      // A brow flick on some saccades. Every one would read as a tic.
      if (Math.random() < 0.22) browBlip = 0.18 + Math.random() * 0.16;
      const [lo, hi] = p.saccadeInterval;
      nextSaccade = t + (lo + Math.random() * (hi - lo)) * m.pace;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = Date.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;          // returned from background; do not lurch
      acc += dt;
      if (acc < step) return;
      const h = acc;
      acc = 0;

      const t = (now - t0) / 1000;
      const m = MOODS[optRef.current.state];
      const r = rigRef.current;

      if (t >= nextSaccade) pickSaccade(t, m);

      // Never-repeating drift: periods 7.3 / 4.1 / 2.6 s share no factor.
      const drift =
        (0.55 * Math.sin((TAU * t) / 7.3) +
         0.30 * Math.sin((TAU * t) / 4.1 + 1.7) +
         0.15 * Math.sin((TAU * t) / 2.6 + 0.4)) * p.driftAmplitude;
      const driftY =
        (0.6 * Math.sin((TAU * t) / 9.7 + 2.2) +
         0.4 * Math.sin((TAU * t) / 3.3)) * p.driftAmplitude * 0.4;

      spring(eyeX, targetX, EYE_W, EYE_Z, h);
      spring(eyeY, targetY, EYE_W, EYE_Z, h);
      spring(headX, headTarget * p.gazeToHead + drift, HEAD_W, HEAD_Z, h);
      browBlip *= Math.exp(-h / 0.35);     // decay by time, not by tick count
      spring(brow, m.brow + browBlip, BROW_W, BROW_Z, h);

      r.gazeX(eyeX.x * p.gazeScale);
      r.gazeY((eyeY.x + driftY) * p.gazeScale);
      r.headTurn(headX.x);
      r.browRaise(brow.x * p.browScale);
      r.smile(m.smile);
      r.glow(m.glow);

      if (r.consumeDirty()) optRef.current.onCommit?.();
    };

    pickSaccade(0, MOODS[state]);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rig.ready, state, presentation, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Stochastic blink.
 * Every 3-7 s, randomised, with an occasional double. A fixed interval is the
 * single most robot-like thing a mascot can do, so the jitter is the point.
 * The .riv's blink layer already staggers the two lids by 2 frames and uses
 * fast-out / slow-in, so one trigger produces an asymmetric blink (10.4).
 */
export function useStochasticBlink(rig: GuruRig, enabled = true) {
  const rigRef = useRef(rig);
  rigRef.current = rig;
  useEffect(() => {
    if (!enabled || !rig.ready) return;
    let timer: ReturnType<typeof setTimeout>;
    let double: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        rigRef.current.blink();
        if (Math.random() < 0.18) {
          double = setTimeout(() => rigRef.current.blink(), 160 + Math.random() * 90);
        }
        schedule();
      }, 3000 + Math.random() * 4000);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(double); };
  }, [enabled, rig.ready]);
}

/**
 * Speech aperture (U1-3 step 3).
 *
 * The `speaking` timeline does not key the jaw — it only bobs the body — so
 * this hook is the ONLY thing that moves his mouth. Without it he talks with
 * a closed mouth. (An earlier note in this file claimed the timeline owned
 * `mouthOpen` and that this had to stay disabled; that was wrong, and it is
 * why lip sync appeared to do nothing.)
 *
 * Pass `amplitude` once TTS is wired and it drives the jaw directly. Until
 * then it falls back to a 6-9 Hz flutter with varied aperture — irregular on
 * purpose, because a steady sine reads as a puppet.
 */
export function useSpeechAperture(
  rig: GuruRig,
  opts: { speaking: boolean; amplitude?: () => number; onCommit?: () => void },
) {
  const { speaking, amplitude, onCommit } = opts;
  const rigRef = useRef(rig);   rigRef.current = rig;
  const ampRef = useRef(amplitude); ampRef.current = amplitude;
  const cbRef = useRef(onCommit);   cbRef.current = onCommit;

  useEffect(() => {
    if (!rig.ready) return;
    // The rig has no mouth to open yet, and driving it tears a seam. See
    // MOUTH_RIG_READY in rig.ts — real lip sync arrives via viseme.ts.
    if (!MOUTH_RIG_READY) { rigRef.current.mouthOpen(0); cbRef.current?.(); return; }
    if (!speaking) { rigRef.current.mouthOpen(0); cbRef.current?.(); return; }

    let raf = 0;
    let value = 0;
    let target = 0;
    let nextFlutter = 0;
    let lastT = 0;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (lastT === 0) { lastT = t; return; }
      const r = rigRef.current;
      const live = ampRef.current;
      const dt = Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      // Time-based approach, so the mouth moves at the same speed on a 60 Hz
      // and a 120 Hz screen. tau 22 ms: fast enough for a consonant.
      const a = 1 - Math.exp(-dt / 0.022);
      if (live) {
        value += (Math.max(0, Math.min(1, live())) - value) * a;
      } else {
        if (t > nextFlutter) {
          // Varied aperture, not a fixed pair of values: vowels are wide,
          // consonants are barely a twitch.
          target = 0.12 + Math.random() * 0.86;
          nextFlutter = t + 1000 / (6 + Math.random() * 3);
        }
        value += (target - value) * a;
      }
      r.mouthOpen(value);
      if (r.consumeDirty()) cbRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      rigRef.current.mouthOpen(0);
      cbRef.current?.();
    };
  }, [speaking, rig.ready]);
}

/**
 * Hand gestures.
 *
 * The four plates live under `guru_root`, behind `head_group` and in front of
 * `mala_group` — so his hands pass in front of the necklace but never over his
 * beard, which is where they belong.
 */
export enum Gesture {
  None = 0,
  Anjali = 1,   // namaste — greeting, session start
  Abhaya = 2,   // palm forward — reassurance, a correct answer
  Offer = 3,    // upturned palm — presenting, explaining
  Point = 4,    // index finger — emphasis, "first..."
}

/**
 * Gesture timing. Three constants, all tunable.
 *
 * `GESTURE_W` / `GESTURE_Z` shape the rise. **Z is 1.0 — critically damped, no
 * overshoot — and that is deliberate.** An earlier version used 0.5, which
 * overshoots 16%: the hand shot past the pose and bounced back. That reads as
 * springy and wrong for a figure whose whole character is stillness. Snappy
 * overshoot suits a light, quick mascot; a guru settling into a mudrā should
 * decelerate and stop. At w = 7 the hand is 90% of the way there in 0.55 s.
 *
 * The travel itself is 100 artboard px, set by the `g_y2_*` converters in the
 * .riv, plus a 22 px sideways arc on the one-handed gestures so the hand swings
 * in rather than sliding straight up.
 */
const GESTURE_W = 7;
const GESTURE_Z = 1.0;
/** Fade-in time constant. Slow enough that the hand is already moving when it
 *  becomes visible, rather than popping in and then travelling. */
const GESTURE_FADE = 0.10;

/**
 * Drives `gesture` and `gestureRise`.
 *
 * Two things worth knowing about how this works:
 *
 *  - **The fade is free.** Each plate's opacity is
 *    `max(0, 1 - |gesture - n|) * 100`, so ramping `gesture` from 0 to 1
 *    fades plate 1 in. Nothing extra was needed in the .riv for it.
 *  - **Changes route through 0.** Ramping straight from 1 to 4 would sweep
 *    through 2 and 3 and flash two poses nobody asked for, so a switch fades
 *    the old gesture out first and the new one in after.
 *
 * The rise is a separate spring on `gestureRise`, slightly underdamped, so the
 * hands overshoot a few pixels and settle rather than sliding to a halt.
 */
export function useGestureDriver(
  rig: GuruRig,
  opts: { gesture: Gesture; reduceMotion?: boolean; onCommit?: () => void },
) {
  const { gesture, reduceMotion = false, onCommit } = opts;
  const rigRef = useRef(rig); rigRef.current = rig;
  const cbRef = useRef(onCommit); cbRef.current = onCommit;
  const wantRef = useRef(gesture); wantRef.current = gesture;

  useEffect(() => {
    if (!rig.ready) return;

    if (reduceMotion) {
      rigRef.current.gestureRise(100);
      rigRef.current.gesture(gesture);
      if (rigRef.current.consumeDirty()) cbRef.current?.();
      return;
    }

    let raf = 0;
    let value = gesture;                       // fractional, drives the fade
    const rise: Spring = { x: gesture ? 100 : 0, v: 0 };
    let last = Date.now();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = Date.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const want = wantRef.current;
      // If a different gesture is showing, retreat to 0 before advancing.
      const aim = want !== 0 && value > 0.02 && Math.abs(value - want) > 0.02
        ? 0
        : want;

      value += (aim - value) * (1 - Math.exp(-dt / GESTURE_FADE));
      if (Math.abs(value - aim) < 0.01) value = aim;

      spring(rise, want !== 0 && value > 0.02 ? 100 : 0, GESTURE_W, GESTURE_Z, dt);

      const r = rigRef.current;
      r.gesture(value);
      r.gestureRise(rise.x);
      if (r.consumeDirty()) cbRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rig.ready, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
}
