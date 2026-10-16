import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

export type ReadingAppearance = { illustrated: boolean; imageOpacity: number; textOpacity: number; textColor: string | null };
export const DEFAULT_READING_APPEARANCE: ReadingAppearance = { illustrated: true, imageOpacity: 0.48, textOpacity: 1, textColor: null };
const KEY = "shabd.read.appearance.v1";
export function normalizeReadingAppearance(value: Partial<ReadingAppearance> | null): ReadingAppearance {
  const number = (n: unknown, fallback: number, min: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(1, n)) : fallback;
  return {
    illustrated: typeof value?.illustrated === "boolean" ? value.illustrated : true,
    imageOpacity: number(value?.imageOpacity, 0.48, 0),
    textOpacity: number(value?.textOpacity, 1, 0.5),
    textColor: typeof value?.textColor === "string" && /^#[a-f\d]{6}$/i.test(value.textColor) ? value.textColor : null,
  };
}
export function useReadingAppearance() {
  const [appearance, setAppearance] = useState(DEFAULT_READING_APPEARANCE);
  const changed = useRef(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY).then(raw => { if (raw && alive && !changed.current) setAppearance(normalizeReadingAppearance(JSON.parse(raw))); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const update = (patch: Partial<ReadingAppearance>) => {
    changed.current = true;
    setAppearance(current => {
      const next = normalizeReadingAppearance({ ...current, ...patch });
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  return { appearance, updateAppearance: update };
}
