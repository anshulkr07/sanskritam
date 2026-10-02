// useRingGesture — put a finger on a ring and turn it.
//
// The charts in Kāla are circles inside a scrolling page, so the gesture
// only takes the touch when it lands on the ring itself: a finger anywhere
// else in the chart's square still scrolls the page. Once it has the touch
// it reports the angle under the finger (0 at the top, clockwise) each time
// that angle moves a step, and never more often.
//
// The same handler serves a tap: touching the ring reports its angle at once.
// Every chart that uses this also has buttons or an adjustable role, so
// nothing depends on being able to drag.

import { useCallback, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

interface Options {
  /** The side of the square the ring is drawn in. */
  size: number;
  /** The band that takes the touch, as radii from the centre. */
  inner: number;
  outer: number;
  /** The angle under the finger, in whole steps. */
  onAngle: (deg: number) => void;
  /** The finger lifted. */
  onEnd?: () => void;
  /** Degrees per report. */
  step?: number;
}

export function useRingGesture({ size, inner, outer, onAngle, onEnd, step = 1 }: Options) {
  // The worklets keep one stable function each; the screen's own callbacks
  // may change every render.
  const angleRef = useRef(onAngle);
  angleRef.current = onAngle;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const emit = useCallback((deg: number) => angleRef.current(deg), []);
  const finish = useCallback(() => endRef.current?.(), []);

  const last = useSharedValue(-1);
  const armed = useSharedValue(false);

  return useMemo(() => {
    const c = size / 2;
    const report = (x: number, y: number) => {
      "worklet";
      const deg = ((Math.atan2(x - c, c - y) * 180) / Math.PI + 360) % 360;
      const stepped = (Math.round(deg / step) * step) % 360;
      if (stepped !== last.value) {
        last.value = stepped;
        runOnJS(emit)(stepped);
      }
    };
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((e, state) => {
        "worklet";
        const t = e.allTouches[0];
        const r = t ? Math.sqrt((t.x - c) * (t.x - c) + (t.y - c) * (t.y - c)) : -1;
        if (t && r >= inner && r <= outer) {
          armed.value = true;
          last.value = -1;
          state.activate();
          report(t.x, t.y);
        } else {
          armed.value = false;
          state.fail();
        }
      })
      .onTouchesMove((e, state) => {
        "worklet";
        if (!armed.value) return;
        state.activate();
        const t = e.allTouches[0];
        if (t) report(t.x, t.y);
      })
      .onFinalize(() => {
        "worklet";
        if (armed.value) {
          armed.value = false;
          runOnJS(finish)();
        }
      });
  }, [size, inner, outer, step, emit, finish, last, armed]);
}
