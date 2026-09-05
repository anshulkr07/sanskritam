/**
 * Sanskritam — Guru rig contract (UI_HANDOVER U1-3)
 *
 * Wire format: the .riv ViewModel `GuruInputs` uses -100..100 for signed
 * inputs and 0..100 for unsigned ones. This module keeps the app-facing
 * contract normalised (-1..1 / 0..1) and converts at the boundary, so the
 * rig's internal ranges never leak into screen code.
 *
 * ── Who owns what ────────────────────────────────────────────────────────
 * Verified against every timeline in the file. The split is clean, and it is
 * the reason the app can drive the face at any time without fighting Rive:
 *
 *   Timelines (TutorSM layer 1)  guru_root x/y/sx/sy/r  — body bob, breath, sway
 *                                head_group y           — head bob only
 *                                jataL/jataR_group r    — hair secondary
 *                                mala_group r           — necklace secondary
 *
 *   Data binding (this module)   head_group r  <- headTurn
 *                                iris x/y      <- gazeX / gazeY
 *                                brow y        <- browRaise
 *                                jaw_group r   <- mouthOpen
 *                                glow shape    <- glow
 *                                ...every one of the above scaled by `intensity`
 *
 *   Blink layer (TutorSM layer 2) lidL/lidR sy  <- blink trigger
 *
 * No timeline keys head rotation, gaze, brows or jaw. Nothing overwrites what
 * this module writes, and nothing this module writes disturbs the body loops.
 * The corollary is that the idle timeline contains NO head turning at all — if
 * the director is not running, he bobs and breathes but never looks around.
 */
import { useCallback, useMemo, useRef } from 'react';
import {
  useRiveNumber,
  useRiveTrigger,
  type ViewModelInstance,
} from '@rive-app/react-native';

/** Matches `state` 0..6 on the GuruInputs ViewModel. Order is load-bearing. */
export enum AvatarState {
  Idle = 0,
  Speaking = 1,
  Thinking = 2,
  Listening = 3,
  Celebrating = 4,
  Encouraging = 5,
  Patient = 6,
}

/**
 * States whose timeline is a one-shot, and how long it runs. Everything else
 * loops. When one of these finishes, Rive holds the last frame — the state
 * machine has no transition out of it except a change to `state` — so the app
 * has to move him on. <Guru> does this for you (see its `revertTo` prop).
 */
export const ONE_SHOT_MS: Partial<Record<AvatarState, number>> = {
  [AvatarState.Celebrating]: 1200,  // celebrating, 72 frames @ 60 fps
  [AvatarState.Encouraging]: 1500,  // encouraging, 90 frames @ 60 fps
};

/**
 * Whether the rig can render a mouth. **Yes, as of the viseme plates.**
 *
 * It was `false` for a while, and worth remembering why: `mouthOpen` rotates
 * `jaw_group`, but the lips in the source art are painted shut, so rotating
 * only slid a sealed line around — and past about `mouthOpen` 20 it opened a
 * grey seam across his cheek where the jaw plate separates from the head
 * plate. Driving it during speech flickered that tear at 6-9 Hz.
 *
 * The mouth now comes from six plates swapped over the face (`viseme.ts`),
 * which is how 2D lip sync is actually done. `mouthOpen` and its jaw rotation
 * are left bound but unused: the plates carry the mouth, and any jaw rotation
 * would slide the face beneath a static patch.
 */
export const MOUTH_RIG_READY = true;

export interface GuruRig {
  setState(s: AvatarState): void;
  headTurn(v: number): void;   // -1..1
  gazeX(v: number): void;      // -1..1
  gazeY(v: number): void;      // -1..1
  browRaise(v: number): void;  // 0..1
  smile(v: number): void;      // 0..1
  mouthOpen(v: number): void;  // 0..1
  /** Which mouth plate is showing, 0..6 — see Viseme in viseme.ts. Passed
   *  through raw, not scaled: this one is an index, not a magnitude. A
   *  fractional value cross-fades between adjacent plates. */
  viseme(v: number): void;
  /** Which hand gesture is showing, 0..4 — see Gesture in director.ts.
   *  Fractional values fade, which is how the driver gets a soft entrance
   *  out of a discrete opacity binding. */
  gesture(v: number): void;
  /** 0..100. 0 sits the hands ~12px low, 100 is their rest position, so
   *  springing this is what makes a gesture rise into frame. */
  gestureRise(v: number): void;
  glow(v: number): void;       // 0..1
  intensity(v: number): void;  // 0..1  (0.5 = the .riv's neutral response)
  blink(): void;
  /** True once the ViewModel instance is bound and writes actually land. */
  readonly ready: boolean;
  /** Did any setter change a value since the last call? Clears the flag. */
  consumeDirty(): boolean;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
const signed = (v: number) => clamp(v, -1, 1) * 100;
const unit = (v: number) => clamp(v, 0, 1) * 100;

/** Writes below this (in 0..100 units) are dropped: sub-pixel on every screen
 *  and each one is a JS->native hop at up to 30 Hz across six properties. */
const EPSILON = 0.4;

export function useGuruRig(vmi: ViewModelInstance | null | undefined): GuruRig {
  const state     = useRiveNumber('state', vmi);
  const headTurn  = useRiveNumber('headTurn', vmi);
  const gazeX     = useRiveNumber('gazeX', vmi);
  const gazeY     = useRiveNumber('gazeY', vmi);
  const browRaise = useRiveNumber('browRaise', vmi);
  const smile     = useRiveNumber('smile', vmi);
  const mouthOpen = useRiveNumber('mouthOpen', vmi);
  const glow      = useRiveNumber('glow', vmi);
  const intensity = useRiveNumber('intensity', vmi);
  const viseme    = useRiveNumber('viseme', vmi);
  const gesture   = useRiveNumber('gesture', vmi);
  const gestRise  = useRiveNumber('gestureRise', vmi);
  const blink     = useRiveTrigger('blink', vmi);

  const last = useRef<Record<string, number>>({});
  const dirty = useRef(false);

  const write = useCallback(
    (key: string, setValue: (v: number) => void, next: number) => {
      const prev = last.current[key];
      // `viseme` and `state` are indices on a 0..6 scale, not 0..100
      // magnitudes — the magnitude epsilon would swallow a whole plate change.
      const eps =
        key === 'viseme' || key === 'state' || key === 'gesture' ? 0.02 : EPSILON;
      if (prev !== undefined && Math.abs(prev - next) < eps) return;
      last.current[key] = next;
      dirty.current = true;
      setValue(next);
    },
    [],
  );

  const ready = !!vmi;

  return useMemo<GuruRig>(
    () => ({
      setState:  (s) => write('state', state.setValue, s),
      headTurn:  (v) => write('headTurn', headTurn.setValue, signed(v)),
      gazeX:     (v) => write('gazeX', gazeX.setValue, signed(v)),
      gazeY:     (v) => write('gazeY', gazeY.setValue, signed(v)),
      browRaise: (v) => write('browRaise', browRaise.setValue, unit(v)),
      smile:     (v) => write('smile', smile.setValue, unit(v)),
      mouthOpen: (v) => write('mouthOpen', mouthOpen.setValue, unit(v)),
      glow:      (v) => write('glow', glow.setValue, unit(v)),
      intensity: (v) => write('intensity', intensity.setValue, unit(v)),
      viseme:    (v) => write('viseme', viseme.setValue, clamp(v, 0, 6)),
      gesture:   (v) => write('gesture', gesture.setValue, clamp(v, 0, 4)),
      gestureRise: (v) => write('gestureRise', gestRise.setValue, clamp(v, 0, 100)),
      blink:     () => { dirty.current = true; blink.trigger(); },
      ready,
      consumeDirty: () => {
        const d = dirty.current;
        dirty.current = false;
        return d;
      },
    }),
    // The hook results are stable per-instance; re-memo only when the binding
    // itself changes, so the director's effect does not restart every render.
    [ready, write], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
