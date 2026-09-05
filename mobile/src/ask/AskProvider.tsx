// AskProvider (U11-1) — ask-anywhere, app-wide.
//
// One provider owns the AskSheet and a floating trigger. Any screen can open
// the sheet with `useAsk().open({ surface, subject })`, carrying the context
// the learner never has to type: what screen they're on and what's on it.
//
// Design constraints (U11-1), all existing invariants:
//  - ≥44×44pt, reachable one-handed (§U5-4): sits above the tab bar on the
//    right, clear of thumbs' resting arc but never over an input or verdict.
//  - It MOVES OUT OF THE WAY: hidden entirely while the ask sheet is open,
//    and a screen can suppress it (e.g. during a verdict animation) via
//    useAsk().setSuppressed(true) — never blocks the learner (§3.7).
//  - NEVER a seventh tab (U8-1): it is an overlay affordance, not navigation.
//  - Reduce Motion removes its entrance, not its existence (§3.4): the
//    entrance animation is skipped when the OS setting is on.
//  - Not rendered during onboarding (there is nothing on screen to ask about).

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";

import AskSheet, { type AskContext } from "../components/AskSheet";
import { haptics } from "../services/haptics";
import { color, font, script, shadow, space, radius } from "../theme";

interface AskApi {
  /** Open the ask sheet with the current screen's context. */
  open: (ctx: AskContext) => void;
  /** Hide the trigger (verdict animations, modals that must own the screen). */
  setSuppressed: (suppressed: boolean) => void;
  /**
   * Screens register what they are currently showing (the submitted query,
   * the loaded verse, the challenge target). The trigger asks about THAT
   * without the learner typing a word of context.
   */
  setContext: (ctx: AskContext) => void;
}

const AskContext_ = createContext<AskApi | undefined>(undefined);

export function useAsk(): AskApi {
  const ctx = useContext(AskContext_);
  if (!ctx) {
    // Screens render inside the provider; a missing provider is a wiring bug.
    return { open: () => {}, setSuppressed: () => {}, setContext: () => {} };
  }
  return ctx;
}

export function AskProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<AskContext | null>(null);
  const [visible, setVisible] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [current, setCurrent] = useState<AskContext | null>(null);
  const reduceMotion = useReducedMotion();

  const open = useCallback((ctx: AskContext) => {
    haptics.tap();
    setSheet(ctx);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const setContext = useCallback((ctx: AskContext) => {
    setCurrent(ctx);
  }, []);

  const api = useMemo(
    () => ({ open, setSuppressed, setContext }),
    [open, setContext],
  );

  const showTrigger = !visible && !suppressed;

  return (
    <AskContext_.Provider value={api}>
      {children}
      {showTrigger ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(200)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={styles.triggerWrap}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => current && open(current)}
            onLongPress={() => {
              // No context yet? Long-press opens with a generic one so the
              // affordance is never a dead button.
              open({ surface: "home", subject: current?.subject ?? "" });
            }}
            accessibilityRole="button"
            accessibilityLabel="Ask a question about what's on screen"
            accessibilityState={{ disabled: !current }}
            style={styles.trigger}
          >
            <Text style={styles.triggerDev}>?</Text>
            <Text style={styles.triggerLabel}>Ask</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <AskSheet visible={visible} context={sheet} onClose={close} />
    </AskContext_.Provider>
  );
}

const styles = StyleSheet.create({
  triggerWrap: {
    position: "absolute",
    right: space.md,
    bottom: 108, // above the tab bar (barHeight ~84 iOS / ~64+pad Android)
  },
  trigger: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: color.saffron,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    ...shadow.button,
  },
  triggerDev: {
    ...script("bold"),
    fontSize: font.sizes.lg,
    lineHeight: font.sizes.xl,
    color: color.white,
  },
  triggerLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xs,
    color: color.white,
  },
});
