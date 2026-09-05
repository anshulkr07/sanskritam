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
 * Sanskritam — Guru meditation scene (full screen)
 *
 * The GuruMeditate artboard: a seated, still figure whose life comes from a
 * 4-second breath, a slow sway, a warm halo that swells with the breath, and
 * four incense motes drifting up on periods of 8 / 4 / 2.7 s so the loop never
 * lines up with itself.
 *
 * ── Why the backdrop lives here and not only in the .riv ─────────────────
 * The artboard is 600x600. A phone screen is roughly 9:19.5. `Fit.Cover` on a
 * square artboard would crop away most of his width, so the scene has to be
 * `Fit.Contain` — which letterboxes. The artboard carries its own vertical
 * gradient, so the fix is to continue exactly that gradient into the letterbox
 * instead of guessing: the stops below are the artboard's, and `locations`
 * places them over the artboard's real on-screen band, then holds the end
 * colours flat above and below it. The seam is then invisible at any aspect
 * ratio, and the .riv still looks right on its own in the editor.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useViewModelInstance,
} from '@rive-app/react-native';
import { useGuruRig } from './rig';
import { useStochasticBlink } from './director';
import { useReduceMotion } from './Guru';

/** The GuruMeditate artboard's own background gradient, top to bottom. */
const BACKDROP = ['#130f24', '#231a2e', '#3a2418', '#4a2c14'] as const;
const BACKDROP_AT = [0, 0.38, 0.78, 1] as const;

export type GuruSceneProps = {
  /** 0..1 aura strength. Raise it on a completed session, a streak, an om. */
  glow?: number;
  style?: StyleProp<ViewStyle>;
  fit?: Fit;
  /** Draw the continued backdrop behind the artboard. Turn off if the screen
   *  already has its own background and you want the guru composited onto it. */
  backdrop?: boolean;
};

export function GuruScene({
  glow = 0,
  style,
  fit = Fit.Contain,
  backdrop = true,
}: GuruSceneProps) {
  const { riveRef, setHybridRef } = useRive();
  const { riveFile, error } = useRiveFile(require('../../../assets/guru.riv'));

  const { instance } = useViewModelInstance(riveFile, {
    async: true,
    artboardName: 'GuruMeditate',
    onInit: (vmi) => vmi.numberProperty('glow')?.set(0),
  });

  const rig = useGuruRig(instance);
  const commit = useCallback(() => riveRef.current?.playIfNeeded(), [riveRef]);
  const reduceMotion = useReduceMotion();

  // He blinks here too — eyes at rest, not tracking anything, but a face that
  // never blinks reads as a photograph.
  useStochasticBlink(rig, !reduceMotion);

  React.useEffect(() => {
    if (!rig.ready) return;
    rig.glow(glow);
    commit();
  }, [glow, rig.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((p) =>
      Math.abs(p.w - width) > 1 || Math.abs(p.h - height) > 1
        ? { w: width, h: height }
        : p,
    );
  }, []);

  // Map the artboard's gradient onto the band it actually occupies.
  const locations = useMemo<readonly [number, number, ...number[]]>(() => {
    const { w, h } = box;
    if (!w || !h) return BACKDROP_AT;
    const side = Math.min(w, h);                 // Contain on a square artboard
    const top = Math.max(0, (h - side) / 2) / h;
    const span = side / h;
    const [a, b, c, d] = BACKDROP_AT.map((q) => Math.min(1, top + q * span));
    return [a, b, c, d];
  }, [box]);

  if (error) return <View style={[styles.fill, style]} />;

  return (
    <View style={[styles.fill, style]} onLayout={onLayout}>
      {backdrop ? (
        <LinearGradient
          colors={BACKDROP}
          locations={locations}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {riveFile ? (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          dataBind={instance ?? undefined}
          artboardName="GuruMeditate"
          stateMachineName="MeditateSM"
          fit={fit}
          alignment={Alignment.Center}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#130f24' },
});
