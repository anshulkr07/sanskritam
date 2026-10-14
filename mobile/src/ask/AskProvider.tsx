// AskProvider (U11-1) — ask-anywhere, app-wide.
//
// One provider owns the AskSheet and a floating, draggable bubble. Any screen
// can register what it is showing with useAskContext(surface, subject); a tap
// on the bubble then asks about THAT without the learner typing a word of
// context. With nothing registered the sheet still opens and takes a general
// question, so the bubble is never a dead button.
//
// Constraints (U11-1):
//  - >=44x44pt, reachable one-handed (§U5-4), draggable to either edge so it
//    can be moved off whatever it covers.
//  - It MOVES OUT OF THE WAY: hidden while the sheet is open, while the drawer
//    is open, on screens that own the bottom of the display (Talk, Writing,
//    the daily word), and on Login. A screen can also hide it (a verdict
//    animation) via useAsk().setSuppressed(true) — never blocks the learner.
//  - NEVER a seventh tab (U8-1): it is an overlay affordance, not navigation.
//  - Reduce Motion drops the spring on release; the bubble still snaps.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AskSheet, { type AskContext } from "../components/AskSheet";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { color, shadow } from "../theme";

export type { AskContext };

type ContextUpdate = AskContext | null | ((current: AskContext | null) => AskContext | null);

interface AskApi {
  /** Open the sheet. Without an argument it asks about what the screen registered. */
  open: (ctx?: AskContext) => void;
  /** Hide the bubble (verdict animations, modals that must own the screen). */
  setSuppressed: (suppressed: boolean) => void;
  /** Hide the bubble for a named reason, so several can hide it independently. */
  setHiddenBy: (key: string, hidden: boolean) => void;
  /** Register (or clear) what the current screen shows. Prefer useAskContext. */
  setContext: (update: ContextUpdate) => void;
}

const NOOP_API: AskApi = {
  open: () => {},
  setSuppressed: () => {},
  setHiddenBy: () => {},
  setContext: () => {},
};

const AskContext_ = createContext<AskApi | undefined>(undefined);

export function useAsk(): AskApi {
  // Screens render inside the provider; a missing one is a wiring bug, and a
  // no-op is safer than crashing a lesson.
  return useContext(AskContext_) ?? NOOP_API;
}

/**
 * Tell Ask what this screen is showing. Set on focus, cleared on blur, and
 * only cleared if it is still this screen's own value, so switching screens
 * can never leave the bubble asking about the previous one.
 */
export function useAskContext(surface: string, subject: string): void {
  const { setContext } = useAsk();
  useFocusEffect(
    useCallback(() => {
      const mine: AskContext = { surface, subject };
      setContext(mine);
      return () => setContext((cur) => (cur === mine ? null : cur));
    }, [surface, subject, setContext]),
  );
}

/** Screens that own the bottom of the display; the bubble would cover them. */
const HIDDEN_ROUTES = new Set([
  "Group",
  "Conversation",
  "Writing",
  "DailyWord",
  // Full-screen game and reading surfaces (Play hub stays askable).
  "Book",
  "ShabdaRush",
  "Smriti",
  "VarnaJaal",
  "PracticeRound",
]);

const BUBBLE = 56;
const MARGIN = 12;
const STORE_KEY = "shabd.ask.bubble";

export function AskProvider({
  children,
  routeName,
}: {
  children: React.ReactNode;
  /** The focused route's name, from the navigation container. */
  routeName?: string;
}) {
  const { onboarded } = useAuth();
  const [context, setContextState] = useState<AskContext | null>(null);
  const [sheet, setSheet] = useState<AskContext | null>(null);
  const [open, setOpen] = useState(false);
  const [hiders, setHiders] = useState<Record<string, boolean>>({});

  const openSheet = useCallback(
    (ctx?: AskContext) => {
      haptics.tap();
      setSheet(ctx ?? context ?? { surface: "general", subject: "" });
      setOpen(true);
    },
    [context],
  );
  const close = useCallback(() => setOpen(false), []);

  const setContext = useCallback((update: ContextUpdate) => {
    setContextState((cur) => (typeof update === "function" ? update(cur) : update));
  }, []);
  const setHiddenBy = useCallback((key: string, hidden: boolean) => {
    setHiders((h) => (!!h[key] === hidden ? h : { ...h, [key]: hidden }));
  }, []);
  const setSuppressed = useCallback((s: boolean) => setHiddenBy("screen", s), [setHiddenBy]);

  const api = useMemo<AskApi>(
    () => ({ open: openSheet, setSuppressed, setHiddenBy, setContext }),
    [openSheet, setSuppressed, setHiddenBy, setContext],
  );

  const hiddenByScreen = Object.values(hiders).some(Boolean);
  const showBubble =
    onboarded && !open && !hiddenByScreen && !(routeName && HIDDEN_ROUTES.has(routeName));

  // The capture root for "This screen": the bubble and the sheet stay out of
  // the picture, so capture can run with the sheet already open. The ref
  // keeps its native view (collapsable false) for react-native-view-shot.
  const contentRef = useRef<View | null>(null);

  return (
    <AskContext_.Provider value={api}>
      <View ref={contentRef} collapsable={false} style={{ flex: 1 }}>
        {children}
      </View>
      {showBubble ? <AskBubble onPress={() => openSheet()} /> : null}
      <AskSheet visible={open} context={sheet} onClose={close} contentRef={contentRef} />
    </AskContext_.Provider>
  );
}

// ─── The bubble ───────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
}

function AskBubble({ onPress }: { onPress: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // The bubble's top edge stays between the header area and just above the
  // tab bar (about 64dp) plus its own height.
  const minY = insets.top + 72;
  const maxY = Math.max(minY, height - insets.bottom - 64 - 72);
  const leftX = MARGIN;
  const rightX = width - BUBBLE - MARGIN;

  const x = useSharedValue(rightX);
  const y = useSharedValue(maxY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const lifted = useSharedValue(0);

  // Restore where the learner left it.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const saved = JSON.parse(raw) as { side?: string; y?: number };
        if (typeof saved.y === "number") y.value = Math.max(minY, Math.min(maxY, saved.y));
        x.value = saved.side === "left" ? leftX : rightX;
      })
      .catch(() => {
        /* storage unavailable: keep the default spot */
      });
    return () => {
      alive = false;
    };
    // Restored once; later window changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep it on screen if the window changes (split screen, unfolding).
  useEffect(() => {
    y.value = Math.max(minY, Math.min(maxY, y.value));
    x.value = x.value + BUBBLE / 2 > width / 2 ? rightX : leftX;
  }, [width, height, minY, maxY, rightX, leftX, x, y]);

  const persist = useCallback((side: "left" | "right", top: number) => {
    AsyncStorage.setItem(STORE_KEY, JSON.stringify({ side, y: top })).catch(() => {});
  }, []);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      lifted.value = 1;
    })
    .onUpdate((e) => {
      x.value = startX.value + e.translationX;
      y.value = clamp(startY.value + e.translationY, minY, maxY);
    })
    .onEnd(() => {
      const side = x.value + BUBBLE / 2 > width / 2 ? "right" : "left";
      const target = side === "right" ? rightX : leftX;
      x.value = reduced ? target : withSpring(target, { damping: 20, stiffness: 240 });
      lifted.value = 0;
      runOnJS(persist)(side, y.value);
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: 1 + lifted.value * 0.08 },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.bubbleWrap, style]}>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Ask a question"
            accessibilityHint="Opens help about what is on screen"
            style={styles.bubble}
          >
            <Ionicons name="chatbubble-ellipses" size={26} color={color.white} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: "absolute", left: 0, top: 0, width: BUBBLE, height: BUBBLE },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: color.saffronBtn,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
});
