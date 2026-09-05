/**
 * ⚠ RIVE PATH — DORMANT.
 *
 * This component needs `assets/guru.riv`, which does not exist: export is gated
 * behind Rive's paid plan. Metro resolves `require()` at bundle time, so
 * importing this file (directly or via the barrel) will FAIL THE BUILD with an
 * "unable to resolve asset" error until that file is present.
 *
 * The shipping renderer is `GuruNative.tsx`, which needs no runtime and no
 * export. Keep this file as the reference for what the .riv drives; delete it,
 * or wire it up, once you have exported.
 */
/**
 * Sanskritam — Guru mascot (UI_HANDOVER U1-4)
 *
 * One component for both placements. Give it a `size` (chat avatar) or let it
 * fill its parent (full screen); it measures itself, picks a presentation
 * profile, and scales the performance to what is actually legible at that
 * size. Screens should render <Guru state={...} /> and nothing else.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useViewModelInstance,
} from '@rive-app/react-native';
import { AvatarState, MOUTH_RIG_READY, ONE_SHOT_MS, useGuruRig } from './rig';
import { useVisemeDriver } from './viseme';
import {
  Gesture,
  useGestureDriver,
  useGuruDirector,
  useStochasticBlink,
  useSpeechAperture,
} from './director';
import { presentationFor, profileFor, type GuruPresentation } from './presentation';

export type GuruProps = {
  state: AvatarState;
  /** Fixed square size in px. Omit to fill the parent and measure at layout. */
  size?: number;
  /** 0..1 live TTS level. Gates the mouth shapes rather than driving them:
   *  the shapes come from `speech`, the energy from the signal, so timing
   *  drift still closes his mouth in the quiet parts. */
  amplitude?: () => number;
  /** What he is currently saying, and for how long. Devanagari is read
   *  directly — no forced alignment needed. Without it the mouth falls back
   *  to an irregular shape walk, which is not lip sync but is not a closed
   *  mouth either. */
  speech?: { text?: string; durationMs?: number } | null;
  /** Point him at something on screen, -1..1 each (y positive = down). */
  lookAt?: { x: number; y: number } | null;
  /** Hand gesture. Rises into frame and settles; `Gesture.None` lowers it. */
  gesture?: Gesture;
  /** Force a profile instead of deriving it from the measured size. */
  presentation?: GuruPresentation;
  /**
   * `celebrating` (1.2 s) and `encouraging` (1.5 s) are one-shots in the .riv:
   * when they finish they hold their last frame until something changes the
   * state, so left alone he freezes mid-cheer. This component returns to
   * `revertTo` on its own once the one-shot is done. Pass `null` to keep the
   * held pose and drive the change yourself.
   */
  revertTo?: AvatarState | null;
  /** Fired when a one-shot state finishes, whether or not it auto-reverts. */
  onTransientEnd?: (finished: AvatarState) => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  fit?: Fit;
};

export function Guru({
  state,
  size,
  amplitude,
  speech = null,
  lookAt = null,
  gesture = Gesture.None,
  presentation,
  revertTo = AvatarState.Idle,
  onTransientEnd,
  onPress,
  style,
  fit = Fit.Contain,
}: GuruProps) {
  const { riveRef, setHybridRef } = useRive();
  const { riveFile, error: fileError } = useRiveFile(
    require('../../../assets/guru.riv'),
  );

  const { instance } = useViewModelInstance(riveFile, {
    async: true,
    artboardName: 'GuruPortrait',
    onInit: (vmi) => {
      // Neutral pose before the first frame so he never flashes a stale value.
      vmi.numberProperty('state')?.set(AvatarState.Idle);
      vmi.numberProperty('mouthOpen')?.set(0);
      vmi.numberProperty('headTurn')?.set(0);
      vmi.numberProperty('gazeX')?.set(0);
      vmi.numberProperty('gazeY')?.set(0);
      vmi.numberProperty('glow')?.set(0);
    },
  });

  const [measured, setMeasured] = useState(size ?? 0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (size) return;
      const { width, height } = e.nativeEvent.layout;
      const next = Math.min(width, height);
      setMeasured((prev) => (Math.abs(prev - next) > 8 ? next : prev));
    },
    [size],
  );

  const active = size ?? measured;
  const profile = presentation ?? presentationFor(active || 220);

  const rig = useGuruRig(instance);
  const commit = useCallback(() => riveRef.current?.playIfNeeded(), [riveRef]);
  const reduceMotion = useReduceMotion();

  // The state input is the one write the director does not own. One-shots
  // get a timer so he does not hold a frozen cheer forever.
  const [effective, setEffective] = useState(state);
  React.useEffect(() => setEffective(state), [state]);

  React.useEffect(() => {
    if (!rig.ready) return;
    rig.setState(effective);
    commit();
    const ms = ONE_SHOT_MS[effective];
    if (!ms) return;
    const timer = setTimeout(() => {
      onTransientEnd?.(effective);
      if (revertTo !== null) setEffective(revertTo);
    }, ms);
    return () => clearTimeout(timer);
  }, [effective, rig.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useGuruDirector(rig, {
    state: effective,
    presentation: profile,
    reduceMotion,
    lookAt,
    onCommit: commit,
  });
  useStochasticBlink(rig, !reduceMotion);
  useGestureDriver(rig, { gesture, reduceMotion, onCommit: commit });
  useSpeechAperture(rig, {
    speaking: effective === AvatarState.Speaking,
    amplitude,
    onCommit: commit,
  });
  useVisemeDriver(rig, {
    speaking: effective === AvatarState.Speaking,
    text: speech?.text,
    durationMs: speech?.durationMs,
    amplitude,
    minMs: profileFor(profile).visemeMinMs,
    onViseme: (v) => {
      if (!MOUTH_RIG_READY) return;
      rig.viseme(v);
      commit();
    },
  });

  const box = useMemo<ViewStyle>(
    () => (size ? { width: size, height: size } : { flex: 1 }),
    [size],
  );

  if (fileError) return <View style={[box, style]} />;

  const content = (
    <View style={[styles.wrap, box, style]} onLayout={onLayout}>
      {riveFile ? (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          dataBind={instance ?? undefined}
          artboardName="GuruPortrait"
          stateMachineName="TutorSM"
          fit={fit}
          alignment={Alignment.Center}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="image"
      accessibilityLabel="Guru"
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
}

export function useReduceMotion() {
  const [on, setOn] = useState(false);
  React.useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
