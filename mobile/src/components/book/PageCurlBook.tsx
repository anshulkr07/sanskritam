// PageCurlBook — a book whose pages curl like paper (the Read tab).
//
// At rest every page is a live view: words tap, verses scroll, the gloss
// opens. Take hold of a page and it becomes a sheet of paper — a snapshot of
// the page (Skia makeImageFromView) bent round a cylinder under the finger by
// the curl shader (curlMath), its back showing, its shadow falling on the page
// beneath, which is the live next page showing through wherever the sheet has
// lifted. Drag it back and forth; pull diagonally to lift a corner; let go and
// travel + velocity decide whether it falls or settles back. Dragging the
// other way brings the previous sheet back in from the spine.
//
// Rules this component honours:
//   - Snapshots are taken at REST, never on touch-down (iOS renders them with
//     afterScreenUpdates — too slow for a finger). A page whose look changes
//     (gloss, scroll) calls invalidate() and is re-shot a moment later.
//   - Turn maths runs in worklets; React state changes only when a turn
//     starts or settles (§3.5). The gesture is built once — a gesture
//     recreated mid-flight cancels the flight.
//   - Buttons, the slider and the contents turn pages through `index`; a jump
//     of many pages turns ONE leaf, never a riffle.
//   - Every automatic turn and the cover's opening finish at a tap (§3.7).
//     Reduce Motion turns pages instantly (§3.4). Where Skia cannot snapshot
//     views (web) the book still turns visibly — a directional slide instead
//     of the curl — so a turn is never a silent swap except under Reduce
//     Motion.
//   - The words stay reachable to screen readers: the book is not one
//     adjustable element (that would swallow its word chips). Every settled
//     turn is announced; buttons and slider remain the tap path.

import { LinearGradient } from "expo-linear-gradient";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  runOnJS,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { duration, easing, spring } from "../../motion";
import { haptics } from "../../services/haptics";
import { radius, shadow } from "../../theme";
import { announce } from "../../utils/announce";
import { COVER_CLOTH, ENDPAPER } from "./BookCover";
import { CURL_SUPPORTED, CurlLayer, snapshot } from "./CurlLayer";
import {
  SHOW_THROUGH,
  curlGeometry,
  curlRadiusFor,
  fullTravel,
  type SheetBack,
  type SheetImage,
} from "./curlMath";

/** The back of a page: warm paper, a little ink showing through. */
const PAPER_BACK: SheetBack = [0.984, 0.953, 0.886, SHOW_THROUGH];
const PAGE_EDGE = "#F1E4C8";

// Release: past 35% of the width turns; a fling needs only 12%.
const COMMIT_P = 0.35;
const FLING_P = 0.12;
const FLING_V = 700;
/** A leaf that can't turn (last page) gives this much, then springs back. */
const RUBBER = 0.15;
/** Quiet time before a changed page is re-shot (lets a gloss fade finish). */
const RESHOOT_MS = 300;
/** Time a freshly mounted jump target gets to draw before it is shot. */
const MOUNT_MS = 100;
/** A cover is board, not paper: it bends in a wider arc. */
const COVER_STIFFNESS = 2.5;
/** Page-block showing to the right of the page, inside the board. */
const EDGE_INSET = 8;

const IDLE = 0;
const FORWARD = 1;
const BACK = -1;
/** `hidden` values: a page index, or one of these. */
const NOTHING = -1;
const COVER_SLOT = -2;

interface BookPage {
  /** What this page shows changed — re-shoot its sheet once it is still. */
  invalidate: () => void;
}

const BookPageContext = createContext<BookPage>({ invalidate: () => {} });

/** For a page rendered inside PageCurlBook. */
export function useBookPage(): BookPage {
  return useContext(BookPageContext);
}

interface PageCurlBookProps {
  /** Controlled page. A change turns one leaf to it (or swaps, without motion). */
  index: number;
  count: number;
  /** A turn settled on page i — by hand, button, slider or contents. */
  onIndexChange: (i: number) => void;
  renderPage: (i: number) => ReactNode;
  /** The cover face. When given, the book opens by turning it away (read on mount). */
  cover?: ReactNode;
  /** Screen-reader name of page i, e.g. "Bhagavad Gītā 5.36". */
  labelFor?: (i: number) => string;
  reducedMotion?: boolean;
}

function clamp(i: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(i)) return 0;
  const n = Math.floor(i);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(count - 1, n));
}

/** A callback with a stable identity that always runs the latest render's body. */
function useLatest<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

export default function PageCurlBook({
  index,
  count,
  onIndexChange,
  renderPage,
  cover,
  labelFor,
  reducedMotion = false,
}: PageCurlBookProps) {
  // Without motion, pages swap instantly. Without Skia (web) there is no
  // curl to draw, so turns slide instead — still visible, still at a tap.
  const noMotion = reducedMotion;
  const curlOK = CURL_SUPPORTED;
  const useCurl = !noMotion && curlOK;
  const fallback = !noMotion && !curlOK;

  const [cur, setCur] = useState(() => clamp(index, count));
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Direction of the last settled step — the fallback slide's direction.
  const [lastDir, setLastDir] = useState<1 | -1>(1);
  // One-off slide for a curl-mode turn with no snapshot to curl: the sheet
  // is missing, so the swap slides instead of landing silently. Set for the
  // swap commit, cleared once the book is at rest.
  const [slideOnce, setSlideOnce] = useState<1 | -1 | null>(null);
  // A jump of more than one page mounts its target beside the current page.
  const [jump, setJump] = useState<{ target: number; dir: number } | null>(null);
  const [coverOn, setCoverOn] = useState(() => !!cover && !noMotion);
  // An automatic turn (button, jump, cover) is running: a tap finishes it.
  const [autoTurning, setAutoTurning] = useState(false);
  // Bumped when a turn settles; the sheet comes down once that render is on screen.
  const [settledTick, setSettledTick] = useState(0);

  const curRef = useRef(cur);
  curRef.current = cur;
  const indexRef = useRef(index);
  indexRef.current = index;
  const countRef = useRef(count);
  countRef.current = count;
  const useCurlRef = useRef(useCurl);
  useCurlRef.current = useCurl;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  // Animated turns allowed at all (off under Reduce Motion).
  const canAnimateRef = useRef(!reducedMotion);
  canAnimateRef.current = !reducedMotion;
  const coverOnRef = useRef(coverOn);
  coverOnRef.current = coverOn;
  const coverStarted = useRef(false);
  const autoTurn = useRef<{ travel: number; target: number | "cover" } | null>(null);

  // The turn, on the UI thread.
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const turning = useSharedValue(IDLE);
  // The hand's direction, decided on first movement (0 = undecided).
  // On Android, gesture-handler's PanGestureHandler.activate() calls
  // resetProgress() first, so translationX is exactly 0 in onStart and reading
  // its sign there always picks BACK. Deciding in onUpdate fixes page turns.
  const dir = useSharedValue(0);
  const travel = useSharedValue(0);
  const lift = useSharedValue(0);
  const grabY = useSharedValue(0);
  const maxRadius = useSharedValue(curlRadiusFor(0));
  const hidden = useSharedValue(NOTHING);
  const back = useSharedValue<SheetBack>(PAPER_BACK);
  const curShared = useSharedValue(cur);
  const countShared = useSharedValue(count);
  const allowed = useSharedValue(false);
  const ignored = useSharedValue(false);
  const released = useSharedValue(true);
  // Snapshots of the current and previous pages, and the sheet on screen now.
  const curImg = useSharedValue<SheetImage | null>(null);
  const prevImg = useSharedValue<SheetImage | null>(null);
  const sheet = useSharedValue<SheetImage | null>(null);

  useEffect(() => {
    curShared.value = cur;
  }, [cur, curShared]);
  useEffect(() => {
    countShared.value = count;
  }, [count, countShared]);

  const shape = useDerivedValue(() =>
    curlGeometry(width.value, height.value, grabY.value, travel.value, lift.value, maxRadius.value),
  );

  const announcePage = useLatest((at: number) => {
    const label = labelFor?.(at);
    announce(`Page ${at + 1} of ${countRef.current}${label ? `, ${label}` : ""}`);
  });

  // ── Snapshots ─────────────────────────────────────────────────────

  const nodes = useRef(new Map<string, View>());
  const binders = useRef(new Map<string, (node: View | null) => void>());
  const bind = useCallback((key: string) => {
    let b = binders.current.get(key);
    if (!b) {
      b = (node: View | null) => {
        if (node) nodes.current.set(key, node);
        else nodes.current.delete(key);
      };
      binders.current.set(key, b);
    }
    return b;
  }, []);

  const shoot = useCallback(async (key: string): Promise<SheetImage | null> => {
    const node = nodes.current.get(key);
    return node ? snapshot(node) : null;
  }, []);

  // A replaced image may still be on screen for a frame; it is freed at rest.
  const retired = useRef(new Set<SheetImage>());
  const keep = useCallback((into: SharedValue<SheetImage | null>, img: SheetImage | null) => {
    const old = into.value;
    into.value = img;
    if (old && old !== img) retired.current.add(old);
  }, []);
  const freeRetired = useCallback(() => {
    const inUse = [curImg.value, prevImg.value, sheet.value];
    for (const img of retired.current) {
      if (inUse.includes(img)) continue;
      img.dispose();
      retired.current.delete(img);
    }
  }, [curImg, prevImg, sheet]);

  const reshootTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shootRest = useLatest(async () => {
    if (!useCurlRef.current || turning.value !== IDLE) return;
    const at = curRef.current;
    let page: SheetImage | null = null;
    let before: SheetImage | null = null;
    try {
      [page, before] = await Promise.all([
        shoot(`p${at}`),
        at > 0 ? shoot(`p${at - 1}`) : Promise.resolve(null),
      ]);
    } catch {
      // A throwing camera never breaks the book — turns just slide.
      if (page) retired.current.add(page);
      if (before) retired.current.add(before);
      return;
    }
    if (curRef.current !== at || turning.value !== IDLE) {
      // The book moved on while the camera ran: these show the wrong moment.
      if (page) retired.current.add(page);
      if (before) retired.current.add(before);
      return;
    }
    keep(curImg, page);
    keep(prevImg, before);
    freeRetired();
  });

  const invalidate = useCallback(() => {
    if (!useCurlRef.current) return;
    if (reshootTimer.current) clearTimeout(reshootTimer.current);
    reshootTimer.current = setTimeout(() => {
      reshootTimer.current = null;
      shootRest();
    }, RESHOOT_MS);
  }, [shootRest]);

  // A page taken hold of before its sheet was ready: shoot it now, and put it
  // in the hand if the hand is still there. Never throws — the hand just
  // turns without a sheet (the release settles, possibly with the slide).
  const shootSheet = useLatest(async (d: number) => {
    const at = curRef.current;
    let img: SheetImage | null = null;
    try {
      img = await shoot(`p${d === FORWARD ? at : at - 1}`);
    } catch {
      return;
    }
    if (!img) return;
    keep(d === FORWARD ? curImg : prevImg, img);
    if (turning.value === d && !released.value && curRef.current === at && sheet.value === null) {
      sheet.value = img;
      if (d === FORWARD) hidden.value = at;
    }
  });

  // ── Turns ─────────────────────────────────────────────────────────

  /** Lays a sheet over the book for a turn; returns the fully-turned travel. */
  const laySheet = useLatest((d: number, img: SheetImage, r: number, y: number, hide: number) => {
    const full = fullTravel(width.value, r);
    maxRadius.value = r;
    grabY.value = y;
    lift.value = 0;
    travel.value = d === FORWARD ? 0 : full;
    sheet.value = img;
    hidden.value = hide;
    return full;
  });

  const settle = useLatest((target: number, turned: boolean) => {
    autoTurn.current = null;
    setAutoTurning(false);
    setJump(null);
    if (!Number.isFinite(target)) return;
    const at = clamp(target, countRef.current);
    if (turned && at !== curRef.current) {
      if (fallbackRef.current) {
        setLastDir(at > curRef.current ? 1 : -1);
      } else if (canAnimateRef.current && sheet.value === null) {
        // A curl-mode turn with no sheet up (snapshot missing): borrow the
        // slide for this one swap instead of landing silently.
        setSlideOnce(at > curRef.current ? 1 : -1);
      }
      curRef.current = at;
      setCur(at);
      onIndexChange(at);
      announcePage(at);
    }
    setSettledTick((n) => n + 1);
  });

  const finishCover = useLatest(() => {
    autoTurn.current = null;
    setAutoTurning(false);
    setCoverOn(false);
    setSettledTick((n) => n + 1);
  });

  // One leaf to `target`, by itself (buttons, slider, contents). Curl only —
  // callers route elsewhere when there is no curl to turn with. Snapshot
  // failures settle (with the one-off slide) instead of throwing: an
  // exception here would leave `turning` claimed and brick every later turn.
  const turnTo = useLatest(async (d: number, target: number) => {
    if (!useCurlRef.current) {
      settle(target, true);
      return;
    }
    const at = curRef.current;
    let img: SheetImage | null;
    try {
      if (d === FORWARD) {
        img = curImg.value;
        if (!img) {
          img = await shoot(`p${at}`);
          keep(curImg, img);
        }
      } else if (target === at - 1 && prevImg.value) {
        img = prevImg.value;
      } else {
        img = await shoot(`p${target}`);
        // A one-off sheet, freed once it is off screen.
        if (img) retired.current.add(img);
      }
    } catch {
      img = null;
    }
    if (!img || width.value === 0) {
      settle(target, true);
      return;
    }
    setSlideOnce(null);
    haptics.tap();
    const r = curlRadiusFor(width.value);
    const full = laySheet(d, img, r, height.value * 0.7, d === FORWARD ? at : NOTHING);
    const to = d === FORWARD ? full : 0;
    autoTurn.current = { travel: to, target };
    setAutoTurning(true);
    travel.value = withTiming(to, { duration: duration.turn, easing: easing.standard }, (finished) => {
      if (finished) runOnJS(settle)(target, true);
    });
  });

  const followIndex = useLatest(() => {
    const at = curRef.current;
    const target = clamp(indexRef.current, countRef.current);
    if (target === at || turning.value !== IDLE || coverOnRef.current) return;
    if (!Number.isFinite(target)) return;
    // Reduce Motion, or no measured page yet: arrive instantly.
    if (noMotion || width.value === 0) {
      curRef.current = target;
      setCur(target);
      announcePage(target);
      return;
    }
    // No Skia snapshots on this platform: swap the live page and let the
    // fallback slide animate the turn — never a silent swap.
    if (fallbackRef.current) {
      setLastDir(target > at ? 1 : -1);
      curRef.current = target;
      setCur(target);
      announcePage(target);
      return;
    }
    const d = target > at ? FORWARD : BACK;
    // Claim the book before anything asynchronous.
    turning.value = d;
    if (Math.abs(target - at) === 1) turnTo(d, target);
    else setJump({ target, dir: d });
  });

  const toRest = useLatest(() => {
    sheet.value = null;
    hidden.value = NOTHING;
    travel.value = 0;
    lift.value = 0;
    back.value = PAPER_BACK;
    maxRadius.value = curlRadiusFor(width.value);
    turning.value = IDLE;
    freeRetired();
    invalidate();
    // The one-off slide (if any) has been consumed by the swap — clear it so
    // a later curl landing doesn't slide. The entering animation already
    // captured its config at mount, so clearing never cancels it.
    setSlideOnce(null);
    // A page asked for mid-turn (a second tap on Next) is honoured now.
    followIndex();
  });

  useEffect(() => {
    if (settledTick === 0) return;
    // Two frames, so the re-ordered live pages are on screen before the sheet goes.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => toRest());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [settledTick, toRest]);

  useEffect(() => {
    followIndex();
  }, [index, count, followIndex]);

  useEffect(() => {
    if (!jump) return;
    // The target is mounted beside the current page; let it draw, then turn to it.
    const t = setTimeout(() => turnTo(jump.dir, jump.target), MOUNT_MS);
    return () => clearTimeout(t);
  }, [jump, turnTo]);

  // ── The cover ─────────────────────────────────────────────────────

  const openCover = useLatest(async () => {
    if (!coverOnRef.current || coverStarted.current) return;
    coverStarted.current = true;
    // No curl on this platform, or no motion wanted: the cover's fade-out
    // plays declaratively on unmount — just open the book.
    if (!useCurlRef.current) {
      finishCover();
      return;
    }
    turning.value = FORWARD;
    let img: SheetImage | null = null;
    try {
      img = await shoot("cover");
    } catch {
      // A throwing camera opens the book without the curl, never wedged.
      finishCover();
      return;
    }
    if (img) retired.current.add(img);
    if (!img || width.value === 0 || !coverOnRef.current) {
      finishCover();
      return;
    }
    back.value = ENDPAPER;
    const r = curlRadiusFor(width.value) * COVER_STIFFNESS;
    const full = laySheet(FORWARD, img, r, height.value * 0.62, COVER_SLOT);
    autoTurn.current = { travel: full, target: "cover" };
    setAutoTurning(true);
    travel.value = withTiming(full, { duration: duration.telling, easing: easing.standard }, (finished) => {
      if (finished) runOnJS(finishCover)();
    });
  });

  useEffect(() => {
    if (!coverOn || size.width === 0) return;
    // A beat to see the closed book, and for the cover to finish drawing.
    const t = setTimeout(() => openCover(), duration.quick);
    return () => clearTimeout(t);
  }, [coverOn, size.width, openCover]);

  useEffect(() => {
    // Reduce Motion switched on mid-opening: the book is simply open.
    if (noMotion && coverOnRef.current) finishCover();
  }, [noMotion, finishCover]);

  // A tap during an automatic turn lands it at once (§3.7).
  const skip = useLatest(() => {
    const auto = autoTurn.current;
    if (!auto) return;
    autoTurn.current = null;
    cancelAnimation(travel);
    travel.value = auto.travel;
    if (auto.target === "cover") finishCover();
    else settle(auto.target, true);
  });

  // ── The hand ──────────────────────────────────────────────────────

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(count > 1)
        // Horizontal travel only: vertical drags scroll the verse, taps tap words.
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin((e) => {
          if (turning.value === IDLE) grabY.value = Math.max(0, Math.min(height.value, e.y));
        })
        .onStart(() => {
          released.value = false;
          // A turn already under way (a button, a jump, the cover) keeps the book.
          ignored.value = turning.value !== IDLE;
          if (ignored.value) return;
          // Direction stays undecided here: translationX is 0 on Android at
          // activation (see `dir` above), so it is decided in onUpdate.
          dir.value = 0;
        })
        .onUpdate((e) => {
          if (ignored.value) return;
          if (dir.value === 0) {
            // First real movement decides the direction (2dp dead zone).
            if (Math.abs(e.translationX) < 2) return;
            const d = e.translationX < 0 ? FORWARD : BACK;
            dir.value = d;
            const at = curShared.value;
            allowed.value = d === FORWARD ? at < countShared.value - 1 : at > 0;
            turning.value = d;
            const r = curlRadiusFor(width.value);
            maxRadius.value = r;
            lift.value = 0;
            travel.value = d === FORWARD ? 0 : fullTravel(width.value, r);
            if (useCurl && (d === FORWARD || allowed.value)) {
              const img = d === FORWARD ? curImg.value : prevImg.value;
              sheet.value = img;
              hidden.value = img && d === FORWARD ? at : NOTHING;
              if (!img) runOnJS(shootSheet)(d);
            }
          }
          const w = width.value;
          if (turning.value === FORWARD) {
            const pulled = Math.min(0, e.translationX);
            travel.value = allowed.value ? pulled : Math.max(-0.12 * w, pulled * RUBBER);
          } else if (allowed.value) {
            // The previous sheet starts past the spine and comes home at twice
            // the hand's pace, so a full swipe lays it flat.
            travel.value = Math.min(0, fullTravel(w, maxRadius.value) + 2 * Math.max(0, e.translationX));
          }
          lift.value = e.translationY;
        })
        .onEnd((e) => {
          if (ignored.value) return;
          // No turn started (a tap, or a gesture that never moved): nothing
          // to settle, just mark released.
          if (dir.value === 0) {
            released.value = true;
            return;
          }
          released.value = true;
          const d = turning.value;
          const w = width.value || 1;
          const moved = d === FORWARD ? -e.translationX : e.translationX;
          const fling = d === FORWARD ? e.velocityX < -FLING_V : e.velocityX > FLING_V;
          const commit = allowed.value && (moved > COMMIT_P * w || (fling && moved > FLING_P * w));
          const target = curShared.value + (commit ? d : 0);
          if (commit) runOnJS(haptics.tap)();
          if (!useCurl) {
            runOnJS(settle)(target, commit);
            return;
          }
          const full = fullTravel(w, maxRadius.value);
          const to = d === FORWARD ? (commit ? full : 0) : commit ? 0 : full;
          travel.value = withSpring(
            to,
            {
              ...spring.snappy,
              velocity: d === FORWARD ? e.velocityX : 2 * e.velocityX,
              overshootClamping: true,
            },
            (finished) => {
              if (finished) runOnJS(settle)(target, commit);
            },
          );
        })
        .onFinalize(() => {
          // Interrupted before a clean release: lay the sheet back down.
          // A gesture that never moved started no turn: just mark released.
          if (dir.value === 0) {
            released.value = true;
            return;
          }
          if (ignored.value || released.value || turning.value === IDLE) return;
          released.value = true;
          const back = turning.value === FORWARD ? 0 : fullTravel(width.value, maxRadius.value);
          travel.value = withTiming(back, { duration: duration.quick }, (finished) => {
            if (finished) runOnJS(settle)(curShared.value, false);
          });
        }),
    // Built once per shape: every handler reads shared values or stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count > 1, useCurl],
  );

  // ── Layout ────────────────────────────────────────────────────────

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      width.value = w;
      height.value = h;
      setSize((s) => (s.width === w && s.height === h ? s : { width: w, height: h }));
    },
    [width, height],
  );

  useEffect(() => {
    if (size.width === 0) return;
    if (turning.value === IDLE) maxRadius.value = curlRadiusFor(size.width);
    invalidate();
  }, [size, invalidate, turning, maxRadius]);

  useEffect(() => {
    if (count > 0 && curRef.current > count - 1) {
      curRef.current = count - 1;
      setCur(count - 1);
    }
  }, [count]);

  // Free every snapshot with the book, once the canvas has let go of them.
  useEffect(
    () => () => {
      if (reshootTimer.current) clearTimeout(reshootTimer.current);
      const all = new Set<SheetImage>(retired.current);
      for (const img of [curImg.value, prevImg.value, sheet.value]) if (img) all.add(img);
      requestAnimationFrame(() => all.forEach((img) => img.dispose()));
    },
    [curImg, prevImg, sheet],
  );

  const page = useMemo<BookPage>(() => ({ invalidate }), [invalidate]);

  const slots: { i: number; live: boolean }[] = [];
  if (useCurl) {
    const before = jump && jump.dir === BACK ? jump.target : cur - 1;
    const after = jump && jump.dir === FORWARD ? jump.target : cur + 1;
    if (before >= 0) slots.push({ i: before, live: false });
    if (after < count) slots.push({ i: after, live: false });
  }
  if (cur < count) slots.push({ i: cur, live: !coverOn });

  // The page-block to the right thins as the book is read.
  const safeCur = Number.isFinite(cur) ? cur : 0;
  const remaining = Math.max(0, count - 1 - safeCur);
  const edges =
    remaining === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((remaining / Math.max(1, count - 1)) * 4)));

  // No curl on this platform: turns slide instead, in the direction of
  // travel. A curl-mode turn with no snapshot borrows the same slide for its
  // one swap (slideOnce). Reduce Motion keeps the instant swap (no
  // entering/exiting).
  const slideDir = fallback ? lastDir : slideOnce;
  const pageEntering =
    slideDir === null || slideDir === undefined
      ? undefined
      : slideDir === 1
        ? SlideInRight.duration(duration.base)
        : SlideInLeft.duration(duration.base);
  const pageExiting =
    slideDir === null || slideDir === undefined
      ? undefined
      : slideDir === 1
        ? SlideOutLeft.duration(duration.base)
        : SlideOutRight.duration(duration.base);

  return (
    <BookPageContext.Provider value={page}>
      <View style={styles.board}>
        {Array.from({ length: edges }, (_, k) => (
          <View key={k} style={[styles.edge, { right: 3 + k * 2 }]} />
        ))}
        <View style={styles.frame} onLayout={onLayout}>
          <GestureDetector gesture={pan}>
            <View style={styles.fill} collapsable={false}>
              {slots.map(({ i, live }) => (
                <Slot
                  key={`p${i}`}
                  hideAs={i}
                  hidden={hidden}
                  live={live}
                  bind={bind(`p${i}`)}
                  entering={pageEntering}
                  exiting={pageExiting}
                >
                  {renderPage(i)}
                </Slot>
              ))}
              {coverOn ? (
                <Slot
                  key="cover"
                  hideAs={COVER_SLOT}
                  hidden={hidden}
                  live
                  bind={bind("cover")}
                  entering={fallback ? FadeIn.duration(duration.base) : undefined}
                  exiting={fallback ? FadeOut.duration(duration.quick) : undefined}
                >
                  {cover}
                </Slot>
              ) : null}
              {useCurl && size.width > 0 ? (
                <CurlLayer
                  width={size.width}
                  height={size.height}
                  image={sheet}
                  shape={shape}
                  back={back}
                />
              ) : null}
              {/* The gutter: pages darken where they bend into the binding. */}
              <LinearGradient
                colors={["rgba(59,46,37,0.16)", "rgba(59,46,37,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gutter}
                pointerEvents="none"
              />
              {autoTurning ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={skip}
                  accessibilityRole="button"
                  accessibilityLabel="Finish turning the page"
                />
              ) : null}
            </View>
          </GestureDetector>
        </View>
      </View>
    </BookPageContext.Provider>
  );
}

// One page in the stack. Only the page under a turning sheet hides — matched
// by identity, not by role, so a re-ordered slot never inherits a stale hide.
function Slot({
  hideAs,
  hidden,
  live,
  bind,
  entering,
  exiting,
  children,
}: {
  hideAs: number;
  hidden: SharedValue<number>;
  live: boolean;
  bind: (node: View | null) => void;
  entering?: React.ComponentProps<typeof Animated.View>["entering"];
  exiting?: React.ComponentProps<typeof Animated.View>["exiting"];
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ opacity: hidden.value === hideAs ? 0 : 1 }));
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      entering={entering}
      exiting={exiting}
      pointerEvents={live ? "auto" : "none"}
      importantForAccessibility={live ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!live}
    >
      {/* The snapshot target: a plain, never-flattened view inside the fade. */}
      <View ref={bind} collapsable={false} style={styles.fill}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    backgroundColor: COVER_CLOTH,
    borderRadius: radius.md,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 3,
    paddingRight: EDGE_INSET + 3,
    ...shadow.card,
  },
  edge: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: PAGE_EDGE,
  },
  frame: { flex: 1 },
  fill: { flex: 1 },
  gutter: { position: "absolute", left: 0, top: 0, bottom: 0, width: 22 },
});
