// Type-scale context (U5-2): a "Larger text" setting that scales the app's
// OWN type ramp independently of the OS setting — many older users never
// discover the OS one. The preference persists to AsyncStorage and applies as
// a multiplier over `theme.font.sizes`, with a FLOOR of 18pt for Sanskrit body
// text (Devanagari conjuncts lose resolution fast — §U5-2).
//
// Usage: `const scale = useTypeScale();` then `fontSize: font.sizes.base * scale`.
// All screens that read font sizes through the hook honour the setting.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TEXT_SIZE_KEY = "shabd.pref.textSize";

export type TextSize = "S" | "M" | "L" | "XL";

/** Multiplier per named setting. XL ≈ the 200% system-scale audit target. */
export const TYPE_SCALE: Record<TextSize, number> = {
  S: 0.9,
  M: 1.0,
  L: 1.25,
  XL: 1.6,
};

/** Devanagari body text never renders below this size (U5-2). */
export const SANSKRIT_MIN_PT = 18;

interface TypeScaleState {
  scale: number;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  /** Scale a font size, enforcing the Devanagari floor when asked. */
  sized: (pt: number, opts?: { sanskrit?: boolean }) => number;
}

const TypeScaleContext = createContext<TypeScaleState | undefined>(undefined);

export function TypeScaleProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>("M");

  useEffect(() => {
    AsyncStorage.getItem(TEXT_SIZE_KEY)
      .then((v) => {
        if (v === "S" || v === "M" || v === "L" || v === "XL") setTextSizeState(v);
      })
      .catch(() => {});
  }, []);

  const setTextSize = (s: TextSize) => {
    setTextSizeState(s);
    AsyncStorage.setItem(TEXT_SIZE_KEY, s).catch(() => {});
  };

  const value = useMemo<TypeScaleState>(() => {
    const scale = TYPE_SCALE[textSize];
    return {
      scale,
      textSize,
      setTextSize,
      sized: (pt: number, opts?: { sanskrit?: boolean }) => {
        const scaled = pt * scale;
        if (opts?.sanskrit) return Math.max(scaled, SANSKRIT_MIN_PT);
        return scaled;
      },
    };
  }, [textSize]);

  return (
    <TypeScaleContext.Provider value={value}>
      {children}
    </TypeScaleContext.Provider>
  );
}

export function useTypeScale(): TypeScaleState {
  const ctx = useContext(TypeScaleContext);
  // Outside a provider (tests, isolated components) behave as the default M.
  if (!ctx) {
    return {
      scale: 1,
      textSize: "M",
      setTextSize: () => {},
      sized: (pt: number, opts?: { sanskrit?: boolean }) =>
        opts?.sanskrit ? Math.max(pt, SANSKRIT_MIN_PT) : pt,
    };
  }
  return ctx;
}
